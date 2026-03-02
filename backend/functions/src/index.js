const admin = require("firebase-admin");

// Initialiser Firebase Admin SDK
admin.initializeApp();

// ============================================================
// Auth triggers (firebase-functions v1 for auth triggers)
// ============================================================
const auth = require("./auth");
exports.onUserCreated = auth.onUserCreated;
exports.onUserDeleted = auth.onUserDeleted;

// ============================================================
// Commandes (firebase-functions/v2 onCall)
// ============================================================
const commandes = require("./commandes");
exports.createCommande = commandes.createCommande;
exports.accepterCommande = commandes.accepterCommande;
exports.updateCommandeStatus = commandes.updateCommandeStatus;
exports.getCommandesDisponibles = commandes.getCommandesDisponibles;
exports.getCommandesClient = commandes.getCommandesClient;
exports.getCommandesLivreur = commandes.getCommandesLivreur;

// ============================================================
// Paiements (firebase-functions/v2 onCall + onRequest)
// ============================================================
const paiements = require("./paiements");
exports.createPaymentIntent = paiements.createPaymentIntent;
exports.stripeWebhook = paiements.stripeWebhook;
exports.createPaypalOrder = paiements.createPaypalOrder;
exports.capturePaypalOrder = paiements.capturePaypalOrder;

// ============================================================
// Livreurs (firebase-functions/v2 onCall)
// ============================================================
const livreurs = require("./livreurs");
exports.inscrireLivreur = livreurs.inscrireLivreur;
exports.updatePosition = livreurs.updatePosition;
exports.toggleDisponibilite = livreurs.toggleDisponibilite;
exports.noterLivreur = livreurs.noterLivreur;

// ============================================================
// Notifications (firebase-functions/v2 onCall)
// ============================================================
const notifications = require("./notifications");
exports.sendNotification = notifications.sendNotification;
exports.envoyerNotifCommande = notifications.envoyerNotifCommande;
exports.markNotificationRead = notifications.markNotificationRead;

// ============================================================
// Admin (firebase-functions/v2 onCall)
// ============================================================
const adminFunctions = require("./admin");
exports.getStats = adminFunctions.getStats;
exports.validerLivreur = adminFunctions.validerLivreur;
exports.updatePrixConfig = adminFunctions.updatePrixConfig;
exports.getAllPrixConfig = adminFunctions.getAllPrixConfig;
exports.getListeUtilisateurs = adminFunctions.getListeUtilisateurs;
exports.exportCommandes = adminFunctions.exportCommandes;
