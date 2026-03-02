import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface PaypalPaymentResponse {
  approvalUrl: string;
  paymentId: string;
}

/**
 * Creates a Stripe PaymentIntent by calling the backend cloud function.
 */
export async function createPaymentIntent(
  commandeId: string,
  amount: number
): Promise<PaymentIntentResponse> {
  const createPaymentIntentFn = httpsCallable<
    { commandeId: string; amount: number },
    PaymentIntentResponse
  >(functions, 'createPaymentIntent');

  const result = await createPaymentIntentFn({ commandeId, amount });
  return result.data;
}

/**
 * Confirms a Stripe payment using the client secret.
 * This function should be called after the user completes the payment sheet.
 * In practice, the Stripe SDK's confirmPayment is used in the component layer.
 */
export async function confirmPayment(
  paymentIntentClientSecret: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // The actual confirmation is done by the Stripe SDK in the UI layer.
    // This function serves as a wrapper for any post-confirmation logic.
    const confirmPaymentFn = httpsCallable<
      { paymentIntentClientSecret: string },
      { success: boolean }
    >(functions, 'confirmPayment');

    const result = await confirmPaymentFn({ paymentIntentClientSecret });
    return { success: result.data.success };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erreur de paiement inconnue';
    return { success: false, error: errorMessage };
  }
}

/**
 * Creates a PayPal payment (placeholder for future implementation).
 */
export async function createPaypalPayment(
  commandeId: string,
  amount: number
): Promise<PaypalPaymentResponse> {
  // Placeholder: PayPal integration will be implemented in a future version.
  // This would call a cloud function that creates a PayPal order and returns
  // an approval URL for the user to complete payment.
  const createPaypalFn = httpsCallable<
    { commandeId: string; amount: number },
    PaypalPaymentResponse
  >(functions, 'createPaypalPayment');

  const result = await createPaypalFn({ commandeId, amount });
  return result.data;
}
