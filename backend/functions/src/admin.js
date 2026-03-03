const { logger } = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const db = admin.firestore();

// ============================================================
// Helper: verifyAdmin - Check that the user has admin role
// ============================================================
async function verifyAdmin(auth) {
  if (!auth) {
    throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
  }

  const userDoc = await db.collection("users").doc(auth.uid).get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "Profil utilisateur introuvable.");
  }

  const userData = userDoc.data();

  if (userData.role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Acces reserve aux administrateurs."
    );
  }

  return userData;
}

// ============================================================
// getStats - Dashboard statistics
// ============================================================
exports.getStats = onCall({ region: "europe-west1" }, async (request) => {
  await verifyAdmin(request.auth);

  try {
    // Recuperer les statistiques en parallele
    const [
      commandesSnapshot,
      livreursSnapshot,
      clientsSnapshot,
    ] = await Promise.all([
      db.collection("commandes").get(),
      db.collection("livreurs").where("status", "==", "valide").get(),
      db.collection("users").where("role", "==", "client").get(),
    ]);

    // Calculer les stats des commandes
    let caTotal = 0;
    const commandesParStatus = {
      en_attente: 0,
      acceptee: 0,
      en_cours: 0,
      livree: 0,
      annulee: 0,
    };

    commandesSnapshot.forEach((doc) => {
      const data = doc.data();
      const status = data.status;

      if (commandesParStatus[status] !== undefined) {
        commandesParStatus[status]++;
      }

      // CA = somme des commandes livrees
      if (status === "livree" && data.prix) {
        caTotal += data.prix;
      }
    });

    // Compter les livreurs actifs (valides + disponibles)
    let livreursActifs = 0;
    livreursSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.disponible) {
        livreursActifs++;
      }
    });

    const stats = {
      totalCommandes: commandesSnapshot.size,
      caTotal: Math.round(caTotal * 100) / 100,
      nbLivreursValides: livreursSnapshot.size,
      nbLivreursActifs: livreursActifs,
      nbClients: clientsSnapshot.size,
      commandesParStatus,
    };

    logger.info("Stats du dashboard recuperees.");

    return { success: true, stats };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Erreur lors de la recuperation des stats:", error);
    throw new HttpsError("internal", "Erreur lors de la recuperation des statistiques.");
  }
});

// ============================================================
// validerLivreur - Approve or refuse a livreur
// ============================================================
exports.validerLivreur = onCall({ region: "europe-west1" }, async (request) => {
  await verifyAdmin(request.auth);

  const { livreurId, decision, motif } = request.data;

  if (!livreurId || !decision) {
    throw new HttpsError(
      "invalid-argument",
      "L'identifiant du livreur et la decision sont requis."
    );
  }

  if (!["valide", "refuse"].includes(decision)) {
    throw new HttpsError(
      "invalid-argument",
      "La decision doit etre 'valide' ou 'refuse'."
    );
  }

  try {
    const livreurRef = db.collection("livreurs").doc(livreurId);
    const livreurDoc = await livreurRef.get();

    if (!livreurDoc.exists) {
      throw new HttpsError("not-found", "Livreur introuvable.");
    }

    const livreurData = livreurDoc.data();

    if (livreurData.status !== "en_attente") {
      throw new HttpsError(
        "failed-precondition",
        `Ce livreur a deja ete traite (status actuel: ${livreurData.status}).`
      );
    }

    const updateData = {
      status: decision,
      validePar: request.auth.uid,
      valideAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (motif) {
      updateData.motifDecision = motif;
    }

    await livreurRef.update(updateData);

    // Si refuse, remettre le role a client
    if (decision === "refuse") {
      await db.collection("users").doc(livreurId).update({
        role: "client",
      });
    }

    logger.info(
      `Livreur ${livreurId} ${decision} par admin ${request.auth.uid}`
    );

    return {
      success: true,
      livreurId,
      decision,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Erreur lors de la validation du livreur:", error);
    throw new HttpsError("internal", "Erreur lors de la validation du livreur.");
  }
});

// ============================================================
// updatePrixConfig - Update pricing config for a colis type
// ============================================================
exports.updatePrixConfig = onCall({ region: "europe-west1" }, async (request) => {
  await verifyAdmin(request.auth);

  const { colis_type, prix_base, prix_par_km, prix_minimum } = request.data;

  if (!colis_type) {
    throw new HttpsError(
      "invalid-argument",
      "Le type de colis est requis."
    );
  }

  // Validation des prix
  if (prix_base !== undefined && (typeof prix_base !== "number" || prix_base < 0)) {
    throw new HttpsError("invalid-argument", "Le prix de base doit etre un nombre positif.");
  }

  if (prix_par_km !== undefined && (typeof prix_par_km !== "number" || prix_par_km < 0)) {
    throw new HttpsError("invalid-argument", "Le prix par km doit etre un nombre positif.");
  }

  if (prix_minimum !== undefined && (typeof prix_minimum !== "number" || prix_minimum < 0)) {
    throw new HttpsError("invalid-argument", "Le prix minimum doit etre un nombre positif.");
  }

  try {
    const configRef = db.collection("prix_config").doc(colis_type);

    const updateData = {
      colis_type,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: request.auth.uid,
    };

    if (prix_base !== undefined) updateData.prix_base = prix_base;
    if (prix_par_km !== undefined) updateData.prix_par_km = prix_par_km;
    if (prix_minimum !== undefined) updateData.prix_minimum = prix_minimum;

    await configRef.set(updateData, { merge: true });

    logger.info(`Config prix mise a jour pour: ${colis_type}`);

    return {
      success: true,
      colis_type,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Erreur lors de la mise a jour de la config prix:", error);
    throw new HttpsError("internal", "Erreur lors de la mise a jour de la configuration.");
  }
});

// ============================================================
// getAllPrixConfig - Get all pricing configurations
// ============================================================
exports.getAllPrixConfig = onCall({ region: "europe-west1" }, async (request) => {
  await verifyAdmin(request.auth);

  try {
    const snapshot = await db.collection("prix_config").get();

    const configs = [];
    snapshot.forEach((doc) => {
      configs.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, configs };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Erreur lors de la recuperation des configs prix:", error);
    throw new HttpsError("internal", "Erreur lors de la recuperation des configurations.");
  }
});

// ============================================================
// getListeUtilisateurs - Get paginated list of users
// ============================================================
exports.getListeUtilisateurs = onCall({ region: "europe-west1" }, async (request) => {
  await verifyAdmin(request.auth);

  const {
    role,
    limit: queryLimit,
    startAfter,
    orderByField,
    orderDirection,
  } = request.data || {};

  try {
    let query = db.collection("users");

    // Filtrer par role si specifie
    if (role) {
      query = query.where("role", "==", role);
    }

    // Tri
    const sortField = orderByField || "createdAt";
    const sortDir = orderDirection || "desc";
    query = query.orderBy(sortField, sortDir);

    // Pagination
    if (startAfter) {
      const startDoc = await db.collection("users").doc(startAfter).get();
      if (startDoc.exists) {
        query = query.startAfter(startDoc);
      }
    }

    // Limite
    const limit = Math.min(queryLimit || 20, 100);
    query = query.limit(limit);

    const snapshot = await query.get();

    const utilisateurs = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Ne pas exposer les tokens FCM
      delete data.fcmToken;
      utilisateurs.push({ id: doc.id, ...data });
    });

    // Determiner s'il y a une page suivante
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const hasMore = snapshot.size === limit;

    return {
      success: true,
      utilisateurs,
      hasMore,
      lastId: lastDoc ? lastDoc.id : null,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Erreur lors de la recuperation des utilisateurs:", error);
    throw new HttpsError("internal", "Erreur lors de la recuperation des utilisateurs.");
  }
});

// ============================================================
// exportCommandes - Export commandes data as JSON
// ============================================================
exports.exportCommandes = onCall({ region: "europe-west1" }, async (request) => {
  await verifyAdmin(request.auth);

  const {
    dateDebut,
    dateFin,
    status,
    limit: queryLimit,
  } = request.data || {};

  try {
    let query = db.collection("commandes").orderBy("createdAt", "desc");

    // Filtrer par date de debut
    if (dateDebut) {
      const dateDebutTimestamp = admin.firestore.Timestamp.fromDate(new Date(dateDebut));
      query = query.where("createdAt", ">=", dateDebutTimestamp);
    }

    // Filtrer par date de fin
    if (dateFin) {
      const dateFinTimestamp = admin.firestore.Timestamp.fromDate(new Date(dateFin));
      query = query.where("createdAt", "<=", dateFinTimestamp);
    }

    // Filtrer par status
    if (status) {
      query = query.where("status", "==", status);
    }

    // Limite (defaut: 1000, max: 5000)
    const limit = Math.min(queryLimit || 1000, 5000);
    query = query.limit(limit);

    const snapshot = await query.get();

    const commandes = [];
    snapshot.forEach((doc) => {
      const data = doc.data();

      // Convertir les timestamps pour l'export
      commandes.push({
        id: doc.id,
        clientId: data.clientId || "",
        livreurId: data.livreurId || "",
        colis_type: data.colis_type || "",
        poids: data.poids || "",
        description: data.description || "",
        adresse_depart: data.adresse_depart ? data.adresse_depart.adresse : "",
        adresse_depart_lat: data.adresse_depart ? data.adresse_depart.lat : "",
        adresse_depart_lng: data.adresse_depart ? data.adresse_depart.lng : "",
        adresse_arrivee: data.adresse_arrivee ? data.adresse_arrivee.adresse : "",
        adresse_arrivee_lat: data.adresse_arrivee ? data.adresse_arrivee.lat : "",
        adresse_arrivee_lng: data.adresse_arrivee ? data.adresse_arrivee.lng : "",
        distance_km: data.distance_km || 0,
        prix: data.prix || 0,
        status: data.status || "",
        paiementStatus: data.paiementStatus || "",
        note: data.note || "",
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : "",
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : "",
        livreeAt: data.livreeAt ? data.livreeAt.toDate().toISOString() : "",
        annuleeAt: data.annuleeAt ? data.annuleeAt.toDate().toISOString() : "",
      });
    });

    logger.info(`Export de ${commandes.length} commandes par admin ${request.auth.uid}`);

    return {
      success: true,
      total: commandes.length,
      commandes,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Erreur lors de l'export des commandes:", error);
    throw new HttpsError("internal", "Erreur lors de l'export des commandes.");
  }
});
