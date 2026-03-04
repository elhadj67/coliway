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

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface SetupIntentResponse {
  clientSecret: string;
  setupIntentId: string;
}

/**
 * Creates a Stripe SetupIntent for saving a card.
 */
export async function createSetupIntent(): Promise<SetupIntentResponse> {
  const fn = httpsCallable<Record<string, never>, SetupIntentResponse>(
    functions,
    'createSetupIntent'
  );
  const result = await fn({});
  return result.data;
}

/**
 * Lists saved payment methods (cards) for the current user.
 */
export async function listPaymentMethods(): Promise<SavedCard[]> {
  const fn = httpsCallable<Record<string, never>, SavedCard[]>(
    functions,
    'listPaymentMethods'
  );
  const result = await fn({});
  return result.data;
}

/**
 * Deletes (detaches) a saved payment method.
 */
export async function deletePaymentMethod(paymentMethodId: string): Promise<void> {
  const fn = httpsCallable<{ paymentMethodId: string }, { success: boolean }>(
    functions,
    'deletePaymentMethod'
  );
  await fn({ paymentMethodId });
}

/**
 * Creates a Stripe PaymentIntent by calling the backend cloud function.
 * Optionally pass a saved paymentMethodId to pre-attach it.
 */
export async function createPaymentIntent(
  commandeId: string,
  amount: number,
  paymentMethodId?: string
): Promise<PaymentIntentResponse> {
  const createPaymentIntentFn = httpsCallable<
    { commandeId: string; amount: number; paymentMethodId?: string },
    PaymentIntentResponse
  >(functions, 'createPaymentIntent');

  const result = await createPaymentIntentFn({ commandeId, amount, paymentMethodId });
  return result.data;
}

/**
 * Creates a PayPal payment by calling the backend cloud function.
 * Returns an approval URL for the user to complete payment in browser.
 */
export async function createPaypalPayment(
  commandeId: string,
  amount: number
): Promise<PaypalPaymentResponse> {
  const createPaypalFn = httpsCallable<
    { commandeId: string; amount: number },
    PaypalPaymentResponse
  >(functions, 'createPaypalPayment');

  const result = await createPaypalFn({ commandeId, amount });
  return result.data;
}
