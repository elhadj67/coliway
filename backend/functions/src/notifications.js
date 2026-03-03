const { logger } = require("firebase-functions");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const db = admin.firestore();

// ============================================================
// sendNotification - Send FCM push notification to a user
// ============================================================
exports.sendNotification = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
  }

  const { userId, titre, message, data } = request.data;

  if (!userId || !titre || !message) {
    throw new HttpsError(
      "invalid-argument",
      "Les champs userId, titre et message sont requis."
    );
  }

  try {
    // Recuperer le token FCM de l'utilisateur
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      throw new HttpsError("not-found", "Utilisateur introuvable.");
    }

    const userData = userDoc.data();
    const fcmToken = userData.fcmToken;

    // Sauvegarder la notification dans Firestore
    const notificationData = {
      userId,
      titre,
      message,
      data: data || {},
      lue: false,
      envoyee: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const notifRef = await db.collection("notifications").add(notificationData);

    // Envoyer la notification push si le token existe
    if (fcmToken) {
      try {
        const fcmMessage = {
          token: fcmToken,
          notification: {
            title: titre,
            body: message,
          },
          data: {
            notificationId: notifRef.id,
            ...(data || {}),
          },
          android: {
            priority: "high",
            notification: {
              channelId: "coliway_default",
              sound: "default",
            },
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: 1,
              },
            },
          },
        };

        await admin.messaging().send(fcmMessage);

        // Marquer comme envoyee
        await notifRef.update({ envoyee: true });

        logger.info(`Notification envoyee a ${userId}: ${titre}`);
      } catch (fcmError) {
        logger.warn(
          `Echec d'envoi de la notification FCM pour ${userId}:`,
          fcmError.message
        );

        // Si le token est invalide, le supprimer
        if (
          fcmError.code === "messaging/invalid-registration-token" ||
          fcmError.code === "messaging/registration-token-not-registered"
        ) {
          await db.collection("users").doc(userId).update({
            fcmToken: admin.firestore.FieldValue.delete(),
          });
          logger.info(`Token FCM invalide supprime pour ${userId}`);
        }
      }
    } else {
      logger.info(
        `Pas de token FCM pour ${userId}. Notification sauvegardee uniquement.`
      );
    }

    return {
      success: true,
      notificationId: notifRef.id,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Erreur lors de l'envoi de la notification:", error);
    throw new HttpsError("internal", "Erreur lors de l'envoi de la notification.");
  }
});

// ============================================================
// envoyerNotifCommande - Send notification for order status changes
// ============================================================
exports.envoyerNotifCommande = onCall({ region: "europe-west1" }, async (request) => {
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

  try {
    // Recuperer la commande
    const commandeDoc = await db.collection("commandes").doc(commandeId).get();

    if (!commandeDoc.exists) {
      throw new HttpsError("not-found", "Commande introuvable.");
    }

    const commandeData = commandeDoc.data();

    // Definir les messages selon le status
    const messages = {
      acceptee: {
        client: {
          titre: "Commande acceptee",
          message: "Un livreur a accepte votre commande et va bientot la prendre en charge.",
        },
      },
      en_cours: {
        client: {
          titre: "Livraison en cours",
          message: "Votre colis est en cours de livraison.",
        },
      },
      livree: {
        client: {
          titre: "Commande livree",
          message: "Votre colis a ete livre avec succes. N'oubliez pas de noter votre livreur !",
        },
        livreur: {
          titre: "Livraison terminee",
          message: `La commande ${commandeId.substring(0, 8)} a ete livree avec succes.`,
        },
      },
      annulee: {
        client: {
          titre: "Commande annulee",
          message: "Votre commande a ete annulee.",
        },
        livreur: {
          titre: "Commande annulee",
          message: `La commande ${commandeId.substring(0, 8)} a ete annulee.`,
        },
      },
    };

    const statusMessages = messages[nouveauStatus];
    if (!statusMessages) {
      logger.info(`Pas de notification configuree pour le status: ${nouveauStatus}`);
      return { success: true, message: "Aucune notification a envoyer." };
    }

    const notificationsEnvoyees = [];

    // Notifier le client
    if (statusMessages.client && commandeData.clientId) {
      const clientNotif = await envoyerNotifUtilisateur(
        commandeData.clientId,
        statusMessages.client.titre,
        statusMessages.client.message,
        { commandeId, status: nouveauStatus, type: "commande" }
      );
      notificationsEnvoyees.push({ userId: commandeData.clientId, ...clientNotif });
    }

    // Notifier le livreur
    if (statusMessages.livreur && commandeData.livreurId) {
      const livreurNotif = await envoyerNotifUtilisateur(
        commandeData.livreurId,
        statusMessages.livreur.titre,
        statusMessages.livreur.message,
        { commandeId, status: nouveauStatus, type: "commande" }
      );
      notificationsEnvoyees.push({ userId: commandeData.livreurId, ...livreurNotif });
    }

    return {
      success: true,
      notifications: notificationsEnvoyees,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Erreur lors de l'envoi des notifications de commande:", error);
    throw new HttpsError("internal", "Erreur lors de l'envoi des notifications.");
  }
});

// ============================================================
// Helper: envoyerNotifUtilisateur (internal use)
// ============================================================
async function envoyerNotifUtilisateur(userId, titre, message, data) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      logger.warn(`Utilisateur ${userId} introuvable pour notification.`);
      return { success: false, reason: "Utilisateur introuvable" };
    }

    const userData = userDoc.data();
    const fcmToken = userData.fcmToken;

    // Sauvegarder la notification
    const notificationData = {
      userId,
      titre,
      message,
      data: data || {},
      lue: false,
      envoyee: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const notifRef = await db.collection("notifications").add(notificationData);

    // Envoyer via FCM si token disponible
    if (fcmToken) {
      try {
        const fcmMessage = {
          token: fcmToken,
          notification: {
            title: titre,
            body: message,
          },
          data: {
            notificationId: notifRef.id,
            ...Object.fromEntries(
              Object.entries(data || {}).map(([k, v]) => [k, String(v)])
            ),
          },
          android: {
            priority: "high",
            notification: {
              channelId: "coliway_default",
              sound: "default",
            },
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: 1,
              },
            },
          },
        };

        await admin.messaging().send(fcmMessage);
        await notifRef.update({ envoyee: true });

        return { success: true, notificationId: notifRef.id };
      } catch (fcmError) {
        logger.warn(`Echec FCM pour ${userId}:`, fcmError.message);

        if (
          fcmError.code === "messaging/invalid-registration-token" ||
          fcmError.code === "messaging/registration-token-not-registered"
        ) {
          await db.collection("users").doc(userId).update({
            fcmToken: admin.firestore.FieldValue.delete(),
          });
        }

        return { success: false, notificationId: notifRef.id, reason: "FCM echoue" };
      }
    }

    return {
      success: true,
      notificationId: notifRef.id,
      fcmEnvoyee: false,
    };
  } catch (error) {
    logger.error(`Erreur notification pour ${userId}:`, error);
    return { success: false, reason: error.message };
  }
}

// ============================================================
// markNotificationRead - Mark a notification as read
// ============================================================
exports.markNotificationRead = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
  }

  const { notificationId } = request.data;

  if (!notificationId) {
    throw new HttpsError(
      "invalid-argument",
      "L'identifiant de la notification est requis."
    );
  }

  try {
    const notifRef = db.collection("notifications").doc(notificationId);
    const notifDoc = await notifRef.get();

    if (!notifDoc.exists) {
      throw new HttpsError("not-found", "Notification introuvable.");
    }

    const notifData = notifDoc.data();

    // Verifier que la notification appartient a l'utilisateur
    if (notifData.userId !== request.auth.uid) {
      throw new HttpsError(
        "permission-denied",
        "Vous ne pouvez marquer que vos propres notifications."
      );
    }

    await notifRef.update({
      lue: true,
      lueAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`Notification ${notificationId} marquee comme lue.`);

    return { success: true };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Erreur lors du marquage de la notification:", error);
    throw new HttpsError("internal", "Erreur lors du marquage de la notification.");
  }
});
