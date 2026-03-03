const { logger } = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const db = admin.firestore();

// ============================================================
// inscrireLivreur - Register as a livreur
// ============================================================
exports.inscrireLivreur = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
  }

  const { vehicule, permis, siret, assurance } = request.data;

  // Validation des champs requis
  if (!vehicule || !permis) {
    throw new HttpsError(
      "invalid-argument",
      "Les champs vehicule et permis sont requis."
    );
  }

  // Validation du type de vehicule
  const vehiculesValides = ["velo", "scooter", "voiture", "camionnette"];
  if (!vehiculesValides.includes(vehicule)) {
    throw new HttpsError(
      "invalid-argument",
      `Type de vehicule invalide. Types acceptes: ${vehiculesValides.join(", ")}`
    );
  }

  try {
    // Verifier si l'utilisateur est deja inscrit comme livreur
    const existingLivreur = await db.collection("livreurs").doc(request.auth.uid).get();
    if (existingLivreur.exists) {
      throw new HttpsError(
        "already-exists",
        "Vous etes deja inscrit comme livreur."
      );
    }

    // Verifier que l'utilisateur existe dans la collection users
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Profil utilisateur introuvable.");
    }

    const livreurData = {
      uid: request.auth.uid,
      vehicule,
      permis,
      siret: siret || "",
      assurance: assurance || "",
      status: "en_attente",
      disponible: false,
      note_moyenne: 0,
      nb_courses: 0,
      position: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("livreurs").doc(request.auth.uid).set(livreurData);

    // Mettre a jour le role de l'utilisateur
    await db.collection("users").doc(request.auth.uid).update({
      role: "livreur",
    });

    logger.info("Livreur inscrit:", request.auth.uid);

    return {
      success: true,
      message: "Inscription en tant que livreur soumise. En attente de validation.",
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Erreur lors de l'inscription du livreur:", error);
    throw new HttpsError("internal", "Erreur lors de l'inscription.");
  }
});

// ============================================================
// updatePosition - Update livreur's GeoPoint position
// ============================================================
exports.updatePosition = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
  }

  const { lat, lng } = request.data;

  if (lat === undefined || lng === undefined) {
    throw new HttpsError(
      "invalid-argument",
      "Les coordonnees lat et lng sont requises."
    );
  }

  // Validation des coordonnees
  if (typeof lat !== "number" || typeof lng !== "number") {
    throw new HttpsError(
      "invalid-argument",
      "Les coordonnees doivent etre des nombres."
    );
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new HttpsError(
      "invalid-argument",
      "Coordonnees geographiques invalides."
    );
  }

  try {
    const livreurRef = db.collection("livreurs").doc(request.auth.uid);
    const livreurDoc = await livreurRef.get();

    if (!livreurDoc.exists) {
      throw new HttpsError(
        "not-found",
        "Vous n'etes pas inscrit comme livreur."
      );
    }

    const geoPoint = new admin.firestore.GeoPoint(lat, lng);

    await livreurRef.update({
      position: geoPoint,
      derniereMiseAJourPosition: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`Position mise a jour pour livreur ${request.auth.uid}: ${lat}, ${lng}`);

    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Erreur lors de la mise a jour de la position:", error);
    throw new HttpsError("internal", "Erreur lors de la mise a jour de la position.");
  }
});

// ============================================================
// toggleDisponibilite - Toggle the disponible field
// ============================================================
exports.toggleDisponibilite = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
  }

  try {
    const livreurRef = db.collection("livreurs").doc(request.auth.uid);
    const livreurDoc = await livreurRef.get();

    if (!livreurDoc.exists) {
      throw new HttpsError(
        "not-found",
        "Vous n'etes pas inscrit comme livreur."
      );
    }

    const livreurData = livreurDoc.data();

    // Verifier que le livreur est valide
    if (livreurData.status !== "valide") {
      throw new HttpsError(
        "failed-precondition",
        "Votre compte livreur doit etre valide pour changer votre disponibilite."
      );
    }

    const nouvelleDisponibilite = !livreurData.disponible;

    await livreurRef.update({
      disponible: nouvelleDisponibilite,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(
      `Disponibilite du livreur ${request.auth.uid}: ${nouvelleDisponibilite}`
    );

    return {
      success: true,
      disponible: nouvelleDisponibilite,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Erreur lors du changement de disponibilite:", error);
    throw new HttpsError("internal", "Erreur lors du changement de disponibilite.");
  }
});

// ============================================================
// noterLivreur - Rate a livreur after delivery
// ============================================================
exports.noterLivreur = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
  }

  const { commandeId, note, commentaire } = request.data;

  if (!commandeId || note === undefined) {
    throw new HttpsError(
      "invalid-argument",
      "L'identifiant de la commande et la note sont requis."
    );
  }

  // Validation de la note (1 a 5)
  if (typeof note !== "number" || note < 1 || note > 5) {
    throw new HttpsError(
      "invalid-argument",
      "La note doit etre un nombre entre 1 et 5."
    );
  }

  try {
    // Recuperer la commande
    const commandeRef = db.collection("commandes").doc(commandeId);
    const commandeDoc = await commandeRef.get();

    if (!commandeDoc.exists) {
      throw new HttpsError("not-found", "Commande introuvable.");
    }

    const commandeData = commandeDoc.data();

    // Verifier que c'est le client de la commande
    if (commandeData.clientId !== request.auth.uid) {
      throw new HttpsError(
        "permission-denied",
        "Vous ne pouvez noter que vos propres commandes."
      );
    }

    // Verifier que la commande est livree
    if (commandeData.status !== "livree") {
      throw new HttpsError(
        "failed-precondition",
        "Vous ne pouvez noter que les commandes livrees."
      );
    }

    // Verifier que la commande n'a pas deja ete notee
    if (commandeData.note !== undefined) {
      throw new HttpsError(
        "already-exists",
        "Cette commande a deja ete notee."
      );
    }

    const livreurId = commandeData.livreurId;
    if (!livreurId) {
      throw new HttpsError(
        "failed-precondition",
        "Aucun livreur associe a cette commande."
      );
    }

    // Recuperer le livreur
    const livreurRef = db.collection("livreurs").doc(livreurId);
    const livreurDoc = await livreurRef.get();

    if (!livreurDoc.exists) {
      throw new HttpsError("not-found", "Livreur introuvable.");
    }

    const livreurData = livreurDoc.data();

    // Calculer la nouvelle moyenne
    const ancienneNote = livreurData.note_moyenne || 0;
    const nbCourses = livreurData.nb_courses || 0;
    const nouvelleNote =
      (ancienneNote * nbCourses + note) / (nbCourses + 1);
    const noteMoyenneArrondie = Math.round(nouvelleNote * 100) / 100;

    // Transaction pour mettre a jour le livreur et la commande
    await db.runTransaction(async (transaction) => {
      transaction.update(livreurRef, {
        note_moyenne: noteMoyenneArrondie,
        nb_courses: nbCourses + 1,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      transaction.update(commandeRef, {
        note,
        commentaire: commentaire || "",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    // Sauvegarder l'avis dans une collection dediee
    await db.collection("avis").add({
      commandeId,
      clientId: request.auth.uid,
      livreurId,
      note,
      commentaire: commentaire || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(
      `Livreur ${livreurId} note ${note}/5 pour commande ${commandeId}`
    );

    return {
      success: true,
      note_moyenne: noteMoyenneArrondie,
      nb_courses: nbCourses + 1,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Erreur lors de la notation du livreur:", error);
    throw new HttpsError("internal", "Erreur lors de la notation.");
  }
});
