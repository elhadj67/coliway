const { logger } = require("firebase-functions");
const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const express = require("express");

const { Client, Environment, OrdersController } = require("@paypal/paypal-server-sdk");

const db = admin.firestore();

// Stripe secret key from Firebase environment config
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// PayPal config
const paypalClientId = defineSecret("PAYPAL_CLIENT_ID");
const paypalClientSecret = defineSecret("PAYPAL_CLIENT_SECRET");

function getPaypalClient() {
  const client = new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: paypalClientId.value(),
      oAuthClientSecret: paypalClientSecret.value(),
    },
    environment: Environment.Sandbox,
  });
  return new OrdersController(client);
}

// ============================================================
// Helper: getOrCreateStripeCustomer
// ============================================================
async function getOrCreateStripeCustomer(stripe, uid) {
  const userRef = db.collection("users").doc(uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "Utilisateur introuvable.");
  }

  const userData = userDoc.data();

  if (userData.stripeCustomerId) {
    return userData.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    metadata: { firebaseUID: uid },
    email: userData.email || undefined,
    name: userData.prenom && userData.nom ? `${userData.prenom} ${userData.nom}` : undefined,
  });

  await userRef.update({ stripeCustomerId: customer.id });

  return customer.id;
}

// ============================================================
// createSetupIntent - Creates a Stripe SetupIntent for saving a card
// ============================================================
exports.createSetupIntent = onCall(
  { secrets: [stripeSecretKey], region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
    }

    try {
      const stripe = require("stripe")(stripeSecretKey.value());
      const customer = await getOrCreateStripeCustomer(stripe, request.auth.uid);

      const setupIntent = await stripe.setupIntents.create({
        customer,
        payment_method_types: ["card"],
      });

      logger.info(`SetupIntent cree: ${setupIntent.id} pour user: ${request.auth.uid}`);

      return {
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("Erreur lors de la creation du SetupIntent:", error);
      throw new HttpsError("internal", "Erreur lors de la creation du SetupIntent.");
    }
  }
);

// ============================================================
// listPaymentMethods - Lists saved cards for the current user
// ============================================================
exports.listPaymentMethods = onCall(
  { secrets: [stripeSecretKey], region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
    }

    try {
      const userDoc = await db.collection("users").doc(request.auth.uid).get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "Utilisateur introuvable.");
      }

      const userData = userDoc.data();

      if (!userData.stripeCustomerId) {
        return [];
      }

      const stripe = require("stripe")(stripeSecretKey.value());
      const paymentMethods = await stripe.paymentMethods.list({
        customer: userData.stripeCustomerId,
        type: "card",
      });

      return paymentMethods.data.map((pm) => ({
        id: pm.id,
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
      }));
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("Erreur lors de la recuperation des moyens de paiement:", error);
      throw new HttpsError("internal", "Erreur lors de la recuperation des moyens de paiement.");
    }
  }
);

// ============================================================
// deletePaymentMethod - Detaches a saved payment method
// ============================================================
exports.deletePaymentMethod = onCall(
  { secrets: [stripeSecretKey], region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
    }

    const { paymentMethodId } = request.data;

    if (!paymentMethodId) {
      throw new HttpsError("invalid-argument", "L'identifiant du moyen de paiement est requis.");
    }

    try {
      const stripe = require("stripe")(stripeSecretKey.value());

      // Verify ownership
      const userDoc = await db.collection("users").doc(request.auth.uid).get();
      const userData = userDoc.data();

      if (!userData || !userData.stripeCustomerId) {
        throw new HttpsError("permission-denied", "Aucun customer Stripe associe.");
      }

      const pm = await stripe.paymentMethods.retrieve(paymentMethodId);

      if (pm.customer !== userData.stripeCustomerId) {
        throw new HttpsError("permission-denied", "Ce moyen de paiement ne vous appartient pas.");
      }

      await stripe.paymentMethods.detach(paymentMethodId);

      logger.info(`PaymentMethod supprime: ${paymentMethodId} pour user: ${request.auth.uid}`);

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("Erreur lors de la suppression du moyen de paiement:", error);
      throw new HttpsError("internal", "Erreur lors de la suppression du moyen de paiement.");
    }
  }
);

// ============================================================
// createPaymentIntent - Creates a Stripe PaymentIntent
// ============================================================
exports.createPaymentIntent = onCall(
  { secrets: [stripeSecretKey], region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
    }

    const { commandeId, methode, paymentMethodId } = request.data;

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

      // Associer un customer Stripe
      const customer = await getOrCreateStripeCustomer(stripe, request.auth.uid);

      // Creer le PaymentIntent (montant en centimes)
      const montantCentimes = Math.round(commandeData.prix * 100);

      const intentParams = {
        amount: montantCentimes,
        currency: "eur",
        customer,
        metadata: {
          commandeId: commandeId,
          clientId: request.auth.uid,
        },
        description: `Coliway - Commande ${commandeId}`,
      };

      if (paymentMethodId) {
        intentParams.payment_method = paymentMethodId;
      }

      const paymentIntent = await stripe.paymentIntents.create(intentParams);

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

      case "setup_intent.succeeded": {
        const setupIntent = event.data.object;
        const customerId = setupIntent.customer;
        const paymentMethodId = setupIntent.payment_method;
        logger.info(
          `SetupIntent reussi: carte ${paymentMethodId} enregistree pour customer ${customerId}`
        );
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
// createPaypalPayment - Creates a PayPal order and returns approval URL
// ============================================================
exports.createPaypalPayment = onCall(
  { secrets: [paypalClientId, paypalClientSecret], region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
    }

    const { commandeId } = request.data;

    if (!commandeId) {
      throw new HttpsError("invalid-argument", "L'identifiant de la commande est requis.");
    }

    try {
      const commandeRef = db.collection("commandes").doc(commandeId);
      const commandeDoc = await commandeRef.get();

      if (!commandeDoc.exists) {
        throw new HttpsError("not-found", "Commande introuvable.");
      }

      const commandeData = commandeDoc.data();

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

      // Creer l'ordre PayPal
      const ordersController = getPaypalClient();
      const montant = commandeData.prix.toFixed(2);

      const { body } = await ordersController.ordersCreate({
        body: {
          intent: "CAPTURE",
          purchaseUnits: [
            {
              amount: {
                currencyCode: "EUR",
                value: montant,
              },
              description: `Coliway - Commande ${commandeId}`,
              customId: commandeId,
            },
          ],
          applicationContext: {
            returnUrl: "coliway://payment-return",
            cancelUrl: "coliway://payment-cancel",
            brandName: "Coliway",
            userAction: "PAY_NOW",
          },
        },
      });

      const paypalOrder = JSON.parse(body);
      const approvalLink = paypalOrder.links.find((l) => l.rel === "approve");

      if (!approvalLink) {
        throw new HttpsError("internal", "Impossible de creer le lien PayPal.");
      }

      // Sauvegarder le paiement
      const paiementData = {
        commandeId,
        clientId: request.auth.uid,
        montant: commandeData.prix,
        devise: "eur",
        methode: "paypal",
        paypalOrderId: paypalOrder.id,
        status: "en_attente",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("paiements").add(paiementData);

      logger.info(`Ordre PayPal cree: ${paypalOrder.id} pour commande: ${commandeId}`);

      return {
        approvalUrl: approvalLink.href,
        paymentId: paypalOrder.id,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("Erreur lors de la creation de l'ordre PayPal:", error);
      throw new HttpsError("internal", "Erreur lors de la creation du paiement PayPal.");
    }
  }
);

// ============================================================
// capturePaypalOrder - Captures a PayPal payment after user approval
// ============================================================
exports.capturePaypalOrder = onCall(
  { secrets: [paypalClientId, paypalClientSecret], region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
    }

    const { paypalOrderId } = request.data;

    if (!paypalOrderId) {
      throw new HttpsError("invalid-argument", "L'identifiant PayPal est requis.");
    }

    try {
      // Capturer le paiement via l'API PayPal
      const ordersController = getPaypalClient();
      const { body } = await ordersController.ordersCapture({ id: paypalOrderId });
      const captureResult = JSON.parse(body);

      if (captureResult.status !== "COMPLETED") {
        throw new HttpsError("internal", "La capture PayPal a echoue.");
      }

      // Mettre a jour le paiement en base
      const paiementsSnapshot = await db
        .collection("paiements")
        .where("paypalOrderId", "==", paypalOrderId)
        .limit(1)
        .get();

      if (!paiementsSnapshot.empty) {
        const paiementDoc = paiementsSnapshot.docs[0];
        const paiementData = paiementDoc.data();

        if (paiementData.clientId !== request.auth.uid) {
          throw new HttpsError("permission-denied", "Acces refuse.");
        }

        await paiementDoc.ref.update({
          status: "reussi",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Mettre a jour la commande
        const commandeRef = db.collection("commandes").doc(paiementData.commandeId);
        await commandeRef.update({
          paiementStatus: "paye",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info(`Paiement PayPal capture: ${paypalOrderId} pour commande: ${paiementData.commandeId}`);
      }

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("Erreur lors de la capture PayPal:", error);
      throw new HttpsError("internal", "Erreur lors de la capture du paiement PayPal.");
    }
  }
);

// ============================================================
// Stripe Connect - Livreur onboarding & payouts
// ============================================================

/**
 * Creates a Stripe Connect Express account for a livreur
 * and returns an onboarding link.
 */
exports.createConnectAccount = onCall(
  { secrets: [stripeSecretKey], region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
    }

    try {
      const userRef = db.collection("users").doc(request.auth.uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "Utilisateur introuvable.");
      }

      const userData = userDoc.data();

      if (userData.role !== "livreur") {
        throw new HttpsError("permission-denied", "Seuls les livreurs peuvent creer un compte Connect.");
      }

      const stripe = require("stripe")(stripeSecretKey.value());

      // Check if already has a Connect account
      if (userData.stripeConnectAccountId) {
        // Create a new account link for re-onboarding
        const accountLink = await stripe.accountLinks.create({
          account: userData.stripeConnectAccountId,
          refresh_url: "coliway://connect-refresh",
          return_url: "coliway://connect-return",
          type: "account_onboarding",
        });

        return {
          accountId: userData.stripeConnectAccountId,
          onboardingUrl: accountLink.url,
        };
      }

      // Create Express account
      const account = await stripe.accounts.create({
        type: "express",
        country: "FR",
        capabilities: {
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: { firebaseUID: request.auth.uid },
        ...(userData.email ? { email: userData.email } : {}),
        ...(userData.prenom || userData.nom
          ? {
              individual: {
                first_name: userData.prenom || undefined,
                last_name: userData.nom || undefined,
              },
            }
          : {}),
      });

      // Save account ID to Firestore
      await userRef.update({
        stripeConnectAccountId: account.id,
        stripeConnectStatus: "pending",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Create onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: "coliway://connect-refresh",
        return_url: "coliway://connect-return",
        type: "account_onboarding",
      });

      logger.info(`Compte Connect cree: ${account.id} pour livreur: ${request.auth.uid}`);

      return {
        accountId: account.id,
        onboardingUrl: accountLink.url,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("Erreur creation compte Connect:", error);
      throw new HttpsError("internal", "Erreur lors de la creation du compte Connect.");
    }
  }
);

/**
 * Checks the status of a livreur's Stripe Connect account.
 */
exports.getConnectAccountStatus = onCall(
  { secrets: [stripeSecretKey], region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
    }

    try {
      const userDoc = await db.collection("users").doc(request.auth.uid).get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "Utilisateur introuvable.");
      }

      const userData = userDoc.data();

      if (!userData.stripeConnectAccountId) {
        return { status: "not_created" };
      }

      const stripe = require("stripe")(stripeSecretKey.value());
      const account = await stripe.accounts.retrieve(userData.stripeConnectAccountId);

      const status = account.charges_enabled && account.payouts_enabled
        ? "active"
        : account.details_submitted
        ? "pending_verification"
        : "onboarding_incomplete";

      // Update status in Firestore
      await db.collection("users").doc(request.auth.uid).update({
        stripeConnectStatus: status,
      });

      return {
        status,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("Erreur verification compte Connect:", error);
      throw new HttpsError("internal", "Erreur lors de la verification du compte.");
    }
  }
);

/**
 * Requests a payout (transfer) to a livreur's Stripe Connect account.
 */
exports.requestPayout = onCall(
  { secrets: [stripeSecretKey], region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
    }

    try {
      const userRef = db.collection("users").doc(request.auth.uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "Utilisateur introuvable.");
      }

      const userData = userDoc.data();

      if (userData.role !== "livreur") {
        throw new HttpsError("permission-denied", "Seuls les livreurs peuvent demander un versement.");
      }

      if (!userData.stripeConnectAccountId) {
        throw new HttpsError(
          "failed-precondition",
          "Vous devez d'abord configurer votre compte bancaire."
        );
      }

      const stripe = require("stripe")(stripeSecretKey.value());

      // Verify account is active
      const account = await stripe.accounts.retrieve(userData.stripeConnectAccountId);
      if (!account.payouts_enabled) {
        throw new HttpsError(
          "failed-precondition",
          "Votre compte bancaire n'est pas encore verifie. Completez l'inscription Stripe."
        );
      }

      // Calculate available balance from delivered orders not yet paid out
      const ordersSnapshot = await db
        .collection("commandes")
        .where("livreurId", "==", request.auth.uid)
        .where("status", "==", "livree")
        .where("paiementStatus", "==", "paye")
        .get();

      // Get commission rate
      let commissionRate = 0.2;
      const configSnap = await db.collection("config").doc("commission").get();
      if (configSnap.exists && typeof configSnap.data().rate === "number") {
        commissionRate = configSnap.data().rate;
      }

      // Filter orders that haven't been paid out yet
      const unpaidOrders = [];
      let availableAmount = 0;

      for (const orderDoc of ordersSnapshot.docs) {
        const orderData = orderDoc.data();
        if (!orderData.livreurPaid) {
          const price = orderData.prixFinal || orderData.prix || orderData.prixEstime || 0;
          const livreurShare = price * (1 - commissionRate);
          availableAmount += livreurShare;
          unpaidOrders.push({ id: orderDoc.id, amount: livreurShare });
        }
      }

      if (availableAmount < 1) {
        throw new HttpsError(
          "failed-precondition",
          "Solde insuffisant pour un versement (minimum 1 EUR)."
        );
      }

      const amountCentimes = Math.round(availableAmount * 100);

      // Create transfer to connected account
      const transfer = await stripe.transfers.create({
        amount: amountCentimes,
        currency: "eur",
        destination: userData.stripeConnectAccountId,
        description: `Versement Coliway - ${unpaidOrders.length} course(s)`,
        metadata: {
          livreurId: request.auth.uid,
          orderCount: unpaidOrders.length,
        },
      });

      // Mark orders as paid out
      const batch = db.batch();
      for (const order of unpaidOrders) {
        batch.update(db.collection("commandes").doc(order.id), {
          livreurPaid: true,
          livreurPaidAt: admin.firestore.FieldValue.serverTimestamp(),
          stripeTransferId: transfer.id,
        });
      }

      // Record the payout
      const payoutRef = db.collection("versements").doc();
      batch.set(payoutRef, {
        livreurId: request.auth.uid,
        montant: availableAmount,
        montantCentimes: amountCentimes,
        stripeTransferId: transfer.id,
        stripeConnectAccountId: userData.stripeConnectAccountId,
        nombreCourses: unpaidOrders.length,
        status: "effectue",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();

      logger.info(
        `Versement effectue: ${availableAmount.toFixed(2)} EUR (${unpaidOrders.length} courses) pour livreur: ${request.auth.uid}`
      );

      return {
        success: true,
        amount: availableAmount,
        transferId: transfer.id,
        orderCount: unpaidOrders.length,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("Erreur lors du versement:", error);
      throw new HttpsError("internal", "Erreur lors du versement.");
    }
  }
);

/**
 * Gets payout history for a livreur.
 */
exports.getPayoutHistory = onCall(
  { region: "europe-west1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Vous devez etre connecte.");
    }

    try {
      const snapshot = await db
        .collection("versements")
        .where("livreurId", "==", request.auth.uid)
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();

      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          montant: data.montant,
          nombreCourses: data.nombreCourses,
          status: data.status,
          createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        };
      });
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("Erreur historique versements:", error);
      throw new HttpsError("internal", "Erreur lors de la recuperation de l'historique.");
    }
  }
);
