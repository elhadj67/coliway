const { logger } = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const db = admin.firestore();

// ============================================================
// Helper: calculerPrix
// Reads prix_config collection to calculate price based on
// distance and colis type.
// ============================================================
async function calculerPrix(distance_km, colis_type) {
  try {
    const configDoc = await db.collection("prix_config").doc(colis_type).get();

    if (!configDoc.exists) {
      // Configuration par defaut si le type n'existe pas
      logger.warn(
        `Configuration de prix introuvable pour le type: ${colis_type}. Utilisation des valeurs par defaut.`
      );
      const prixBase = 5.0;
      const prixParKm = 1.5;
      return Math.round((prixBase + prixParKm * distance_km) * 100) / 100;
    }

    const config = configDoc.data();
    const prixBase = config.prix_base || 5.0;
    const prixParKm = config.prix_par_km || 1.5;
    const prixMinimum = config.prix_minimum || 5.0;

    const prixCalcule = prixBase + prixParKm * distance_km;
    const prixFinal = Math.max(prixCalcule, prixMinimum);

    return Math.round(prixFinal * 100) / 100;
  } catch (error) {
    logger.error("Erreur lors du calcul du prix:", error);
    throw new HttpsError("internal", "Erreur lors du calcul du prix.");
  }
}

// ============================================================
// createCommande - Create a new order
// ============================================================
exports.createCommande = onCall({ region: "europe-west1" }, async (request) => {
  // Verifier l'authentification
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Vous devez etre connecte pour creer une commande.");
  }

  const {
    colis_type,
    poids,
    dimensions,
    adresse_depart,
    adresse_arrivee,
    distance_km,
    description,
  } = request.data;

  // Validation des champs requis
  if (!colis_type || !adresse_depart || !adresse_arrivee || !distance_km) {
    throw new HttpsError(
      "invalid-argument",
      "Les champs colis_type, adresse_depart, adresse_arrivee et distance_km sont requis."
    );
  }

  // Validation de l'adresse de depart
  if (
    !adresse_depart.adresse ||
    adresse_depart.lat === undefined ||
    adresse_depart.lng === undefined
  ) {
    throw new HttpsError(
      "invalid-argument",
      "L'adresse de depart doit contenir adresse, lat et lng."
    );
  }

  // Validation de l'adresse d'arrivee
  if (
    !adresse_arrivee.adresse ||
    adresse_arrivee.lat === undefined ||
    adresse_arrivee.lng === undefined
  ) {
    throw new HttpsError(
      "invalid-argument",
      "L'adresse d'arrivee doit contenir adresse, lat et lng."
    );
  }

  // Validation de la distance
  if (typeof distance_km !== "number" || distance_km <= 0) {
    throw new HttpsError("invalid-argument", "La distance doit etre un nombre positif.");
  }

  // Validation du type de colis
  const typesValides = ["petit", "moyen", "grand", "fragile", "volumineux"];
  if (!typesValides.includes(colis_type)) {
    throw new HttpsError(
      "invalid-argument",
      `Type de colis invalide. Types acceptes: ${typesValides.join(", ")}`
    );
  }

  try {
    // Calculer le prix
    const prix = await calculerPrix(distance_km, colis_type);

    const commandeData = {
      clientId: request.auth.uid,
      colis_type,
      poids: poids || null,
      dimensions: dimensions || null,
      description: description || "",
      adresse_depart: {
        adresse: adresse_depart.adresse,
        lat: adresse_depart.lat,
        lng: adresse_depart.lng,
      },
      adresse_arrivee: {
        adresse: adresse_arrivee.adresse,
        lat: adresse_arrivee.lat,
        lng: adresse_arrivee.lng,
      },
      distance_km,
      prix,
      status: "en_attente",
      livreurId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("commandes").add(commandeData);
    logger.info("Commande creee:", docRef.id);

    return {
      success: true,
      commandeId: docRef.id,
      prix,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Erreur lors de la creation de la commande:", error);
    throw new HttpsError("internal", "Erreur lors de la creation de la commande.");
  }
});

// ============================================================
// accepterCommande - Livreur accepts an order
// ============================================================
exports.accepterCommande = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
  }

  const { commandeId } = request.data;

  if (!commandeId) {
    throw new HttpsError("invalid-argument", "L'identifiant de la commande est requis.");
  }

  try {
    // Verifier que l'utilisateur est un livreur valide
    const livreurDoc = await db.collection("livreurs").doc(request.auth.uid).get();
    if (!livreurDoc.exists) {
      throw new HttpsError("permission-denied", "Vous n'etes pas enregistre comme livreur.");
    }

    const livreurData = livreurDoc.data();
    if (livreurData.status !== "valide") {
      throw new HttpsError("permission-denied", "Votre compte livreur n'est pas encore valide.");
    }

    if (!livreurData.disponible) {
      throw new HttpsError(
        "failed-precondition",
        "Vous devez etre disponible pour accepter une commande."
      );
    }

    // Verifier la commande
    const commandeRef = db.collection("commandes").doc(commandeId);
    const commandeDoc = await commandeRef.get();

    if (!commandeDoc.exists) {
      throw new HttpsError("not-found", "Commande introuvable.");
    }

    const commandeData = commandeDoc.data();
    if (commandeData.status !== "en_attente") {
      throw new HttpsError(
        "failed-precondition",
        "Cette commande n'est plus disponible."
      );
    }

    // Mettre a jour la commande
    await commandeRef.update({
      livreurId: request.auth.uid,
      status: "acceptee",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`Commande ${commandeId} acceptee par livreur ${request.auth.uid}`);

    return { success: true, commandeId };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Erreur lors de l'acceptation de la commande:", error);
    throw new HttpsError("internal", "Erreur lors de l'acceptation de la commande.");
  }
});

// ============================================================
// updateCommandeStatus - Update order status through the flow
// en_attente -> acceptee -> en_cours -> livree
// Also handles 'annulee'
// ============================================================
exports.updateCommandeStatus = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
  }

  const { commandeId, nouveauStatus } = request.data;

  if (!commandeId || !nouveauStatus) {
    throw new HttpsError(
      "invalid-argument",
      "L'identifiant de la commande et le nouveau status sont requis."
    );
  }

  // Definir les transitions de status valides
  const transitionsValides = {
    en_attente: ["acceptee", "annulee"],
    acceptee: ["en_cours", "annulee"],
    en_cours: ["livree", "annulee"],
  };

  try {
    const commandeRef = db.collection("commandes").doc(commandeId);
    const commandeDoc = await commandeRef.get();

    if (!commandeDoc.exists) {
      throw new HttpsError("not-found", "Commande introuvable.");
    }

    const commandeData = commandeDoc.data();
    const statusActuel = commandeData.status;

    // Verifier les permissions
    const userId = request.auth.uid;
    const isClient = commandeData.clientId === userId;
    const isLivreur = commandeData.livreurId === userId;

    // Verifier si l'utilisateur est admin
    const userDoc = await db.collection("users").doc(userId).get();
    const isAdmin = userDoc.exists && userDoc.data().role === "admin";

    if (!isClient && !isLivreur && !isAdmin) {
      throw new HttpsError(
        "permission-denied",
        "Vous n'avez pas les droits pour modifier cette commande."
      );
    }

    // Le client ne peut qu'annuler
    if (isClient && !isAdmin && nouveauStatus !== "annulee") {
      throw new HttpsError(
        "permission-denied",
        "En tant que client, vous ne pouvez qu'annuler la commande."
      );
    }

    // Verifier que la transition est valide
    const transitionsPossibles = transitionsValides[statusActuel];
    if (!transitionsPossibles || !transitionsPossibles.includes(nouveauStatus)) {
      throw new HttpsError(
        "failed-precondition",
        `Transition de status invalide: ${statusActuel} -> ${nouveauStatus}`
      );
    }

    // Mettre a jour le status
    const updateData = {
      status: nouveauStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Si la commande est livree, ajouter la date de livraison
    if (nouveauStatus === "livree") {
      updateData.livreeAt = admin.firestore.FieldValue.serverTimestamp();
    }

    // Si la commande est annulee, ajouter la date d'annulation
    if (nouveauStatus === "annulee") {
      updateData.annuleeAt = admin.firestore.FieldValue.serverTimestamp();
      updateData.annuleePar = userId;
    }

    await commandeRef.update(updateData);

    logger.info(`Commande ${commandeId}: ${statusActuel} -> ${nouveauStatus}`);

    return {
      success: true,
      commandeId,
      ancienStatus: statusActuel,
      nouveauStatus,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Erreur lors de la mise a jour du status:", error);
    throw new HttpsError("internal", "Erreur lors de la mise a jour du status.");
  }
});

// ============================================================
// getCommandesDisponibles - Get available orders for livreurs
// ============================================================
exports.getCommandesDisponibles = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
  }

  try {
    // Verifier que l'utilisateur est un livreur
    const livreurDoc = await db.collection("livreurs").doc(request.auth.uid).get();
    if (!livreurDoc.exists) {
      throw new HttpsError("permission-denied", "Vous n'etes pas enregistre comme livreur.");
    }

    const snapshot = await db
      .collection("commandes")
      .where("status", "==", "en_attente")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const commandes = [];
    snapshot.forEach((doc) => {
      commandes.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, commandes };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Erreur lors de la recuperation des commandes disponibles:", error);
    throw new HttpsError("internal", "Erreur lors de la recuperation des commandes.");
  }
});

// ============================================================
// getCommandesClient - Get orders for a specific client
// ============================================================
exports.getCommandesClient = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
  }

  const { status, limit: queryLimit } = request.data || {};

  try {
    let query = db
      .collection("commandes")
      .where("clientId", "==", request.auth.uid)
      .orderBy("createdAt", "desc");

    if (status) {
      query = query.where("status", "==", status);
    }

    query = query.limit(queryLimit || 50);

    const snapshot = await query.get();
    const commandes = [];
    snapshot.forEach((doc) => {
      commandes.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, commandes };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Erreur lors de la recuperation des commandes client:", error);
    throw new HttpsError("internal", "Erreur lors de la recuperation des commandes.");
  }
});

// ============================================================
// getCommandesLivreur - Get orders for a specific livreur
// ============================================================
exports.getCommandesLivreur = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
  }

  const { status, limit: queryLimit } = request.data || {};

  try {
    // Verifier que l'utilisateur est un livreur
    const livreurDoc = await db.collection("livreurs").doc(request.auth.uid).get();
    if (!livreurDoc.exists) {
      throw new HttpsError("permission-denied", "Vous n'etes pas enregistre comme livreur.");
    }

    let query = db
      .collection("commandes")
      .where("livreurId", "==", request.auth.uid)
      .orderBy("createdAt", "desc");

    if (status) {
      query = query.where("status", "==", status);
    }

    query = query.limit(queryLimit || 50);

    const snapshot = await query.get();
    const commandes = [];
    snapshot.forEach((doc) => {
      commandes.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, commandes };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Erreur lors de la recuperation des commandes livreur:", error);
    throw new HttpsError("internal", "Erreur lors de la recuperation des commandes.");
  }
});

// Export helper for use in other modules
exports.calculerPrix = calculerPrix;
