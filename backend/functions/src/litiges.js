const { logger } = require("firebase-functions");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

const db = admin.firestore();

// Configuration email (Gmail SMTP)
// Identifiants definis dans backend/functions/.env :
//   EMAIL_USER=coliwayapp@gmail.com
//   EMAIL_PASS=app_password_16_chars
function getMailTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER || "coliwayapp@gmail.com",
      pass: process.env.EMAIL_PASS || "",
    },
  });
}

// ============================================================
// onLitigeCreated - Firestore trigger: new litige/reclamation created
// ============================================================
exports.onLitigeCreated = functions
  .region("europe-west1")
  .firestore.document("litiges/{litigeId}")
  .onCreate(async (snap, context) => {
    const litige = snap.data();
    const litigeId = context.params.litigeId;

    logger.info(`Nouveau litige cree: ${litigeId}`, litige);

    try {
      // 1. Envoyer notification push a tous les admins
      const adminsSnapshot = await db
        .collection("users")
        .where("role", "==", "admin")
        .get();

      const notifPromises = [];

      for (const adminDoc of adminsSnapshot.docs) {
        const adminData = adminDoc.data();
        const adminId = adminDoc.id;

        // Sauvegarder la notification dans Firestore
        const notificationData = {
          userId: adminId,
          titre: "Nouvelle reclamation",
          message: `${litige.clientNom} a soumis une reclamation: ${litige.motif}`,
          data: {
            type: "litige",
            litigeId,
            commandeId: litige.commandeId || "",
          },
          lue: false,
          envoyee: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const notifRef = await db.collection("notifications").add(notificationData);

        // Envoyer push FCM si token disponible
        if (adminData.fcmToken) {
          const pushPromise = admin
            .messaging()
            .send({
              token: adminData.fcmToken,
              notification: {
                title: "Nouvelle reclamation",
                body: `${litige.clientNom}: ${litige.motif}`,
              },
              data: {
                notificationId: notifRef.id,
                type: "litige",
                litigeId,
                commandeId: litige.commandeId || "",
              },
              android: {
                priority: "high",
                notification: {
                  channelId: "coliway_default",
                  sound: "default",
                },
              },
            })
            .then(async () => {
              await notifRef.update({ envoyee: true });
              logger.info(`Push envoye a admin ${adminId}`);
            })
            .catch(async (err) => {
              logger.warn(`Echec push admin ${adminId}:`, err.message);
              if (
                err.code === "messaging/invalid-registration-token" ||
                err.code === "messaging/registration-token-not-registered"
              ) {
                await db.collection("users").doc(adminId).update({
                  fcmToken: admin.firestore.FieldValue.delete(),
                });
              }
            });

          notifPromises.push(pushPromise);
        }
      }

      await Promise.all(notifPromises);
      logger.info(`Notifications push envoyees a ${adminsSnapshot.size} admin(s)`);

      // 2. Envoyer un email a l'admin
      try {
        const transporter = getMailTransporter();
        const adminEmail = process.env.EMAIL_USER || "coliwayapp@gmail.com";

        const mailOptions = {
          from: `"Coliway" <${adminEmail}>`,
          to: adminEmail,
          subject: `[Coliway] Nouvelle reclamation - ${litige.motif}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #1B3A5C; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0;">Nouvelle reclamation</h2>
              </div>
              <div style="padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #6c757d; width: 140px;">ID Litige</td>
                    <td style="padding: 8px 0;">${litigeId.substring(0, 8)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #6c757d;">Client</td>
                    <td style="padding: 8px 0;">${litige.clientNom || "-"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #6c757d;">Livreur</td>
                    <td style="padding: 8px 0;">${litige.livreurNom || "-"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #6c757d;">Commande</td>
                    <td style="padding: 8px 0;">${litige.commandeId || "-"}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #6c757d;">Motif</td>
                    <td style="padding: 8px 0; color: #E74C3C; font-weight: bold;">${litige.motif}</td>
                  </tr>
                </table>
                <div style="margin-top: 16px; padding: 16px; background: #f8f9fa; border-radius: 8px;">
                  <strong style="color: #6c757d;">Description :</strong>
                  <p style="margin: 8px 0 0; color: #1a1a2e; line-height: 1.6;">${litige.description || "Aucune description"}</p>
                </div>
                <div style="margin-top: 20px; text-align: center;">
                  <a href="https://coliway-app.web.app/litiges"
                     style="display: inline-block; padding: 12px 24px; background: #1B3A5C; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    Voir dans le panel admin
                  </a>
                </div>
              </div>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        logger.info(`Email envoye a ${adminEmail} pour litige ${litigeId}`);
      } catch (emailError) {
        logger.warn("Echec envoi email:", emailError.message);
        // On ne fait pas echouer la function si l'email echoue
      }

      return { success: true };
    } catch (error) {
      logger.error("Erreur dans onLitigeCreated:", error);
      return { success: false, error: error.message };
    }
  });
