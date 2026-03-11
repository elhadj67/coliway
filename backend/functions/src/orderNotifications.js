const { logger } = require("firebase-functions");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

const db = admin.firestore();

// ============================================================
// onCommandeUpdated - Firestore trigger: order status changes
// Sends push notifications to client at each step
// ============================================================
exports.onCommandeUpdated = functions
  .region("europe-west1")
  .firestore.document("commandes/{commandeId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const commandeId = context.params.commandeId;

    // Only trigger on status change
    if (before.status === after.status) {
      return null;
    }

    const newStatus = after.status;
    const oldStatus = before.status;

    logger.info(
      `Commande ${commandeId}: ${oldStatus} -> ${newStatus}`
    );

    // Define notification messages per status
    const statusNotifications = {
      acceptee: {
        client: {
          titre: "Livreur trouve !",
          message:
            "Un livreur a accepte votre commande et se dirige vers le point de retrait.",
        },
      },
      enlevee: {
        client: {
          titre: "Colis recupere",
          message:
            "Le livreur a recupere votre colis et se dirige vers le destinataire.",
        },
      },
      en_transit: {
        client: {
          titre: "Colis en transit",
          message:
            "Votre colis est en route vers sa destination.",
        },
      },
      livree: {
        client: {
          titre: "Colis livre !",
          message:
            "Votre colis a ete livre avec succes. N'oubliez pas de noter votre livreur !",
        },
        livreur: {
          titre: "Livraison terminee",
          message: `La commande #${commandeId.substring(0, 8)} a ete livree avec succes.`,
        },
      },
      annulee: {
        client: {
          titre: "Commande annulee",
          message: "Votre commande a ete annulee.",
        },
        livreur: {
          titre: "Commande annulee",
          message: `La commande #${commandeId.substring(0, 8)} a ete annulee par le client.`,
        },
      },
    };

    const notifs = statusNotifications[newStatus];
    if (!notifs) {
      logger.info(`Pas de notification configuree pour le status: ${newStatus}`);
      return null;
    }

    const promises = [];

    // Notify client
    if (notifs.client && after.clientId) {
      promises.push(
        sendNotifToUser(
          after.clientId,
          notifs.client.titre,
          notifs.client.message,
          { commandeId, status: newStatus, type: "commande" }
        )
      );
    }

    // Notify livreur
    if (notifs.livreur && after.livreurId) {
      promises.push(
        sendNotifToUser(
          after.livreurId,
          notifs.livreur.titre,
          notifs.livreur.message,
          { commandeId, status: newStatus, type: "commande" }
        )
      );
    }

    await Promise.all(promises);
    logger.info(`Notifications envoyees pour commande ${commandeId} (${newStatus})`);
    return null;
  });

// ============================================================
// Helper: send notification + FCM push to a user
// ============================================================
async function sendNotifToUser(userId, titre, message, data) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      logger.warn(`Utilisateur ${userId} introuvable pour notification.`);
      return;
    }

    const userData = userDoc.data();
    const fcmToken = userData.fcmToken;

    // Save notification in Firestore
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

    // Send FCM push if token available
    if (fcmToken) {
      try {
        await admin.messaging().send({
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
        });

        await notifRef.update({ envoyee: true });
        logger.info(`Push envoye a ${userId}: ${titre}`);
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
      }
    } else {
      logger.info(`Pas de token FCM pour ${userId}, notification sauvegardee.`);
    }
  } catch (error) {
    logger.error(`Erreur notification pour ${userId}:`, error);
  }
}
