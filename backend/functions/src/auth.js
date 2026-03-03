const { logger } = require("firebase-functions");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

const db = admin.firestore();

// ============================================================
// onUserCreated - Auth trigger: new user created
// ============================================================
exports.onUserCreated = functions.region("europe-west1").auth.user().onCreate(async (user) => {
  logger.info("Nouvel utilisateur cree:", user.uid, user.email);

  try {
    // Use merge to avoid overwriting data already written by the client
    const userData = {
      uid: user.uid,
      email: user.email || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Only set defaults if the client hasn't written them yet
    const existingDoc = await db.collection("users").doc(user.uid).get();
    if (!existingDoc.exists) {
      userData.nom = user.displayName ? user.displayName.split(" ").slice(1).join(" ") : "";
      userData.prenom = user.displayName ? user.displayName.split(" ")[0] : "";
      userData.telephone = user.phoneNumber || "";
      userData.role = "client";
      userData.photoURL = user.photoURL || "";
      userData.verified = false;
    }

    await db.collection("users").doc(user.uid).set(userData, { merge: true });
    logger.info("Document utilisateur cree avec succes pour:", user.uid);

    return { success: true };
  } catch (error) {
    logger.error("Erreur lors de la creation du document utilisateur:", error);
    throw error;
  }
});

// ============================================================
// onUserDeleted - Auth trigger: user deleted
// ============================================================
exports.onUserDeleted = functions.region("europe-west1").auth.user().onDelete(async (user) => {
  logger.info("Utilisateur supprime:", user.uid, user.email);

  const batch = db.batch();

  try {
    // Supprimer le document utilisateur
    const userRef = db.collection("users").doc(user.uid);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      batch.delete(userRef);
      logger.info("Document users supprime pour:", user.uid);
    }

    // Supprimer le document livreur si existant
    const livreurRef = db.collection("livreurs").doc(user.uid);
    const livreurDoc = await livreurRef.get();
    if (livreurDoc.exists) {
      batch.delete(livreurRef);
      logger.info("Document livreurs supprime pour:", user.uid);
    }

    // Supprimer les notifications de l'utilisateur
    const notificationsSnapshot = await db
      .collection("notifications")
      .where("userId", "==", user.uid)
      .get();

    notificationsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    logger.info("Nettoyage termine pour l'utilisateur:", user.uid);

    return { success: true };
  } catch (error) {
    logger.error("Erreur lors du nettoyage des donnees utilisateur:", error);
    throw error;
  }
});
