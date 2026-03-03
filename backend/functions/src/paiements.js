const { logger } = require("firebase-functions");
const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const express = require("express");

const db = admin.firestore();

// Stripe secret key from Firebase environment config
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// ============================================================
// createPaymentIntent - Creates a Stripe PaymentIntent
// ============================================================
exports.createPaymentIntent = onCall(
  { secrets: [stripeSecretKey], region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
    }

    const { commandeId, methode } = request.data;

    if (!commandeId) {
      throw new HttpsError("invalid-argument", "L'identifiant de la commande est requis.");
    }

    try {
      // Recuperer la commande
      const commandeRef = db.collection("commandes").doc(commandeId);
      const commandeDoc = await commandeRef.get();

      if (!commandeDoc.exists) {
        throw new HttpsError("not-found", "Commande introuvable.");
      }

      const commandeData = commandeDoc.data();

      // Verifier que c'est bien le client de la commande
      if (commandeData.clientId !== request.auth.uid) {
        throw new HttpsError(
          "permission-denied",
          "Vous ne pouvez payer que vos propres commandes."
        );
      }

      // Verifier que la commande n'est pas deja payee
      const existingPayment = await db
        .collection("paiements")
        .where("commandeId", "==", commandeId)
        .where("status", "==", "reussi")
        .limit(1)
        .get();

      if (!existingPayment.empty) {
        throw new HttpsError("already-exists", "Cette commande a deja ete payee.");
      }

      // Initialiser Stripe
      const stripe = require("stripe")(stripeSecretKey.value());

      // Creer le PaymentIntent (montant en centimes)
      const montantCentimes = Math.round(commandeData.prix * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: montantCentimes,
        currency: "eur",
        metadata: {
          commandeId: commandeId,
          clientId: request.auth.uid,
        },
        description: `Coliway - Commande ${commandeId}`,
      });

      // Sauvegarder les infos de paiement
      const paiementData = {
        commandeId,
        clientId: request.auth.uid,
        montant: commandeData.prix,
        devise: "eur",
        methode: methode || "carte",
        stripePaymentIntentId: paymentIntent.id,
        status: "en_attente",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const paiementRef = await db.collection("paiements").add(paiementData);

      logger.info(
        `PaymentIntent cree: ${paymentIntent.id} pour commande: ${commandeId}`
      );

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paiementId: paiementRef.id,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("Erreur lors de la creation du PaymentIntent:", error);
      throw new HttpsError("internal", "Erreur lors de la creation du paiement.");
    }
  }
);

// ============================================================
// stripeWebhook - Express endpoint for Stripe webhooks
// ============================================================
const webhookApp = express();

// Stripe requires raw body for webhook signature verification
webhookApp.post("/", express.raw({ type: "application/json" }), async (req, res) => {
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    logger.error("Erreur de verification webhook Stripe:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  logger.info("Webhook Stripe recu:", event.type);

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        await handlePaymentSuccess(paymentIntent);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        await handlePaymentFailure(paymentIntent);
        break;
      }

      default:
        logger.info(`Evenement Stripe non gere: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error("Erreur lors du traitement du webhook:", error);
    return res.status(500).json({ error: "Erreur interne" });
  }
});

async function handlePaymentSuccess(paymentIntent) {
  const { commandeId } = paymentIntent.metadata;

  if (!commandeId) {
    logger.warn("PaymentIntent sans commandeId dans metadata:", paymentIntent.id);
    return;
  }

  // Mettre a jour le paiement
  const paiementsSnapshot = await db
    .collection("paiements")
    .where("stripePaymentIntentId", "==", paymentIntent.id)
    .limit(1)
    .get();

  if (!paiementsSnapshot.empty) {
    const paiementDoc = paiementsSnapshot.docs[0];
    await paiementDoc.ref.update({
      status: "reussi",
      stripeChargeId: paymentIntent.latest_charge || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Mettre a jour la commande
  const commandeRef = db.collection("commandes").doc(commandeId);
  await commandeRef.update({
    paiementStatus: "paye",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info(`Paiement reussi pour commande: ${commandeId}`);
}

async function handlePaymentFailure(paymentIntent) {
  const { commandeId } = paymentIntent.metadata;

  if (!commandeId) {
    logger.warn("PaymentIntent echoue sans commandeId:", paymentIntent.id);
    return;
  }

  // Mettre a jour le paiement
  const paiementsSnapshot = await db
    .collection("paiements")
    .where("stripePaymentIntentId", "==", paymentIntent.id)
    .limit(1)
    .get();

  if (!paiementsSnapshot.empty) {
    const paiementDoc = paiementsSnapshot.docs[0];
    await paiementDoc.ref.update({
      status: "echoue",
      erreur: paymentIntent.last_payment_error
        ? paymentIntent.last_payment_error.message
        : "Paiement echoue",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Mettre a jour la commande
  const commandeRef = db.collection("commandes").doc(commandeId);
  await commandeRef.update({
    paiementStatus: "echoue",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  logger.info(`Paiement echoue pour commande: ${commandeId}`);
}

exports.stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret], region: "europe-west1" },
  webhookApp
);

// ============================================================
// createPaypalOrder - Placeholder for PayPal order creation
// ============================================================
exports.createPaypalOrder = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
  }

  const { commandeId } = request.data;

  if (!commandeId) {
    throw new HttpsError("invalid-argument", "L'identifiant de la commande est requis.");
  }

  try {
    // Recuperer la commande
    const commandeRef = db.collection("commandes").doc(commandeId);
    const commandeDoc = await commandeRef.get();

    if (!commandeDoc.exists) {
      throw new HttpsError("not-found", "Commande introuvable.");
    }

    const commandeData = commandeDoc.data();

    // Verifier que c'est bien le client
    if (commandeData.clientId !== request.auth.uid) {
      throw new HttpsError(
        "permission-denied",
        "Vous ne pouvez payer que vos propres commandes."
      );
    }

    // TODO: Integrer l'API PayPal
    // const paypalOrder = await paypalClient.orders.create(...)

    // Placeholder: sauvegarder un paiement en attente
    const paiementData = {
      commandeId,
      clientId: request.auth.uid,
      montant: commandeData.prix,
      devise: "eur",
      methode: "paypal",
      status: "en_attente",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const paiementRef = await db.collection("paiements").add(paiementData);

    logger.info(`Ordre PayPal cree (placeholder) pour commande: ${commandeId}`);

    return {
      success: true,
      paiementId: paiementRef.id,
      message: "Integration PayPal en cours de developpement.",
      // paypalOrderId: paypalOrder.id,
      // approvalUrl: paypalOrder.links.find(l => l.rel === 'approve').href,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Erreur lors de la creation de l'ordre PayPal:", error);
    throw new HttpsError("internal", "Erreur lors de la creation du paiement PayPal.");
  }
});

// ============================================================
// capturePaypalOrder - Placeholder for PayPal payment capture
// ============================================================
exports.capturePaypalOrder = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
  }

  const { paiementId, paypalOrderId } = request.data;

  if (!paiementId) {
    throw new HttpsError("invalid-argument", "L'identifiant du paiement est requis.");
  }

  try {
    // Recuperer le paiement
    const paiementRef = db.collection("paiements").doc(paiementId);
    const paiementDoc = await paiementRef.get();

    if (!paiementDoc.exists) {
      throw new HttpsError("not-found", "Paiement introuvable.");
    }

    const paiementData = paiementDoc.data();

    // Verifier que c'est bien le client
    if (paiementData.clientId !== request.auth.uid) {
      throw new HttpsError("permission-denied", "Acces refuse.");
    }

    // TODO: Capturer le paiement via l'API PayPal
    // const capture = await paypalClient.orders.capture(paypalOrderId)

    // Placeholder: marquer comme reussi
    await paiementRef.update({
      status: "reussi",
      paypalOrderId: paypalOrderId || null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Mettre a jour la commande
    const commandeRef = db.collection("commandes").doc(paiementData.commandeId);
    await commandeRef.update({
      paiementStatus: "paye",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(
      `Paiement PayPal capture (placeholder) pour commande: ${paiementData.commandeId}`
    );

    return {
      success: true,
      message: "Integration PayPal en cours de developpement.",
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Erreur lors de la capture PayPal:", error);
    throw new HttpsError("internal", "Erreur lors de la capture du paiement PayPal.");
  }
});
