const { logger } = require("firebase-functions");
const functions = require("firebase-functions");
const admin = require("firebase-admin");

const db = admin.firestore();

// ============================================================
// onMessageCreated - Firestore trigger: new chat message
// Sends push notification to the other party
// ============================================================
exports.onMessageCreated = functions
  .region("europe-west1")
  .firestore.document("messages/{messageId}")
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const messageId = context.params.messageId;

    const { commandeId, senderId, text } = message;

    if (!commandeId || !senderId) {
      logger.warn(`Message ${messageId} sans commandeId ou senderId`);
      return null;
    }

    try {
      // Get the order to find client and livreur
      const commandeDoc = await db.collection("commandes").doc(commandeId).get();
      if (!commandeDoc.exists) {
        logger.warn(`Commande ${commandeId} introuvable pour notification message`);
        return null;
      }

      const commande = commandeDoc.data();
      const { clientId, livreurId } = commande;

      // Determine who to notify (the other party)
      let recipientId = null;
      if (senderId === clientId && livreurId) {
        recipientId = livreurId;
      } else if (senderId === livreurId && clientId) {
        recipientId = clientId;
      }

      if (!recipientId) {
        logger.info(`Pas de destinataire pour le message ${messageId}`);
        return null;
      }

      // Get sender name
      const senderDoc = await db.collection("users").doc(senderId).get();
      const senderName = senderDoc.exists
        ? `${senderDoc.data().prenom || ""} ${senderDoc.data().nom || ""}`.trim()
        : "Quelqu'un";

      // Get recipient FCM token
      const recipientDoc = await db.collection("users").doc(recipientId).get();
      if (!recipientDoc.exists) {
        logger.warn(`Destinataire ${recipientId} introuvable`);
        return null;
      }

      const recipientData = recipientDoc.data();
      const fcmToken = recipientData.fcmToken;

      // Truncate message text for notification
      const shortText = text.length > 100 ? text.substring(0, 100) + "..." : text;

      // Save notification in Firestore
      const notifRef = await db.collection("notifications").add({
        userId: recipientId,
        titre: `Message de ${senderName}`,
        message: shortText,
        data: {
          type: "message",
          commandeId,
          messageId,
        },
        lue: false,
        envoyee: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Send FCM push
      if (fcmToken) {
        try {
          await admin.messaging().send({
            token: fcmToken,
            notification: {
              title: `Message de ${senderName}`,
              body: shortText,
            },
            data: {
              notificationId: notifRef.id,
              type: "message",
              commandeId,
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
          logger.info(`Push message envoye a ${recipientId} de ${senderName}`);
        } catch (fcmError) {
          logger.warn(`Echec FCM pour ${recipientId}:`, fcmError.message);
          if (
            fcmError.code === "messaging/invalid-registration-token" ||
            fcmError.code === "messaging/registration-token-not-registered"
          ) {
            await db.collection("users").doc(recipientId).update({
              fcmToken: admin.firestore.FieldValue.delete(),
            });
          }
        }
      } else {
        logger.info(`Pas de token FCM pour ${recipientId}, notification sauvegardee.`);
      }

      return null;
    } catch (error) {
      logger.error(`Erreur chatNotification pour message ${messageId}:`, error);
      return null;
    }
  });
