/**
 * Tests for the payment service (services/payment.ts) and the
 * profile service (services/auth.ts).
 *
 * All Firebase interactions are mocked.
 *
 * Covers:
 *   PAY-01..PAY-07     : createPaymentIntent, createPaypalPayment, confirmPayment
 *   PROFIL-01..PROFIL-06 : getUserProfile, updateProfile
 */

// ---------------------------------------------------------------------------
// Mocks -- must be declared before any imports that touch Firebase
// ---------------------------------------------------------------------------

const mockDb = {};
const mockFunctions = {};

jest.mock('@/services/firebase', () => ({
  auth: { currentUser: null },
  db: mockDb,
  functions: mockFunctions,
  storage: {},
}));

const mockDoc = jest.fn((..._args: unknown[]) => 'doc-ref');
const mockGetDoc = jest.fn();
const mockUpdateDoc = jest.fn(() => Promise.resolve());
const mockServerTimestamp = jest.fn(() => ({ _type: 'serverTimestamp' }));

jest.mock('firebase/firestore', () => ({
  doc: mockDoc,
  getDoc: mockGetDoc,
  updateDoc: mockUpdateDoc,
  setDoc: jest.fn(),
  serverTimestamp: () => mockServerTimestamp(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
  Timestamp: {
    fromDate: (d: Date) => ({
      toDate: () => d,
      seconds: Math.floor(d.getTime() / 1000),
    }),
    now: () => ({
      toDate: () => new Date(),
      seconds: Math.floor(Date.now() / 1000),
    }),
  },
}));

const mockHttpsCallable = jest.fn();

jest.mock('firebase/functions', () => ({
  httpsCallable: (...args: unknown[]) => mockHttpsCallable(...args),
  getFunctions: jest.fn(() => mockFunctions),
}));

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  onAuthStateChanged: jest.fn(),
  getAuth: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  createPaymentIntent,
  confirmPayment,
  createPaypalPayment,
} from '@/services/payment';

import {
  getUserProfile,
  updateProfile,
} from '@/services/auth';

// ---------------------------------------------------------------------------
// Reset between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockDoc.mockReturnValue('doc-ref');
  mockUpdateDoc.mockResolvedValue(undefined);
  mockServerTimestamp.mockReturnValue({ _type: 'serverTimestamp' });
});

// ===========================================================================
// 1. PAYMENT SERVICE
// ===========================================================================

describe('Payment Service', () => {
  // PAY-01
  test('PAY-01: createPaymentIntent calls httpsCallable with correct params', async () => {
    const callable = jest.fn().mockResolvedValue({
      data: {
        clientSecret: 'pi_secret_123',
        paymentIntentId: 'pi_123',
      },
    });
    mockHttpsCallable.mockReturnValue(callable);

    const result = await createPaymentIntent('cmd-1', 2500);

    expect(mockHttpsCallable).toHaveBeenCalledWith(
      mockFunctions,
      'createPaymentIntent',
    );
    expect(callable).toHaveBeenCalledWith({
      commandeId: 'cmd-1',
      amount: 2500,
    });
    expect(result).toEqual({
      clientSecret: 'pi_secret_123',
      paymentIntentId: 'pi_123',
    });
  });

  // PAY-02
  test('PAY-02: createPaypalPayment calls httpsCallable with correct params', async () => {
    const callable = jest.fn().mockResolvedValue({
      data: {
        approvalUrl: 'https://paypal.com/approve/abc',
        paymentId: 'paypal-123',
      },
    });
    mockHttpsCallable.mockReturnValue(callable);

    const result = await createPaypalPayment('cmd-2', 3000);

    expect(mockHttpsCallable).toHaveBeenCalledWith(
      mockFunctions,
      'createPaypalPayment',
    );
    expect(callable).toHaveBeenCalledWith({
      commandeId: 'cmd-2',
      amount: 3000,
    });
    expect(result).toEqual({
      approvalUrl: 'https://paypal.com/approve/abc',
      paymentId: 'paypal-123',
    });
  });

  // PAY-03
  test('PAY-03: Stripe payment creates intent successfully', async () => {
    const callable = jest.fn().mockResolvedValue({
      data: {
        clientSecret: 'pi_secret_ok',
        paymentIntentId: 'pi_ok',
      },
    });
    mockHttpsCallable.mockReturnValue(callable);

    const result = await createPaymentIntent('cmd-3', 5000);

    expect(result.clientSecret).toBe('pi_secret_ok');
    expect(result.paymentIntentId).toBe('pi_ok');
  });

  // PAY-04
  test('PAY-04: Stripe payment handles rejected card (error thrown)', async () => {
    const callable = jest.fn().mockRejectedValue(
      new Error('Your card was declined'),
    );
    mockHttpsCallable.mockReturnValue(callable);

    await expect(createPaymentIntent('cmd-4', 1000)).rejects.toThrow(
      'Your card was declined',
    );
  });

  // PAY-05
  test('PAY-05: PayPal payment returns approval URL', async () => {
    const callable = jest.fn().mockResolvedValue({
      data: {
        approvalUrl: 'https://www.sandbox.paypal.com/checkoutnow?token=XYZ',
        paymentId: 'PAYID-XYZ',
      },
    });
    mockHttpsCallable.mockReturnValue(callable);

    const result = await createPaypalPayment('cmd-5', 4200);

    expect(result.approvalUrl).toContain('paypal.com');
    expect(result.paymentId).toBe('PAYID-XYZ');
  });

  // PAY-06
  test('PAY-06: confirmPayment returns success', async () => {
    const callable = jest.fn().mockResolvedValue({
      data: { success: true },
    });
    mockHttpsCallable.mockReturnValue(callable);

    const result = await confirmPayment('pi_secret_confirm');

    expect(mockHttpsCallable).toHaveBeenCalledWith(
      mockFunctions,
      'confirmPayment',
    );
    expect(callable).toHaveBeenCalledWith({
      paymentIntentClientSecret: 'pi_secret_confirm',
    });
    expect(result).toEqual({ success: true });
  });

  // PAY-07
  test('PAY-07: confirmPayment handles timeout/error gracefully', async () => {
    const callable = jest.fn().mockRejectedValue(
      new Error('DEADLINE_EXCEEDED: timeout'),
    );
    mockHttpsCallable.mockReturnValue(callable);

    const result = await confirmPayment('pi_secret_timeout');

    // The service catches the error and returns { success: false, error: message }
    expect(result.success).toBe(false);
    expect(result.error).toBe('DEADLINE_EXCEEDED: timeout');
  });
});

// ===========================================================================
// 2. PROFILE SERVICE (from services/auth.ts)
// ===========================================================================

describe('Profile Service', () => {
  // PROFIL-01
  test('PROFIL-01: getUserProfile returns user data', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        uid: 'user-1',
        email: 'jean@example.com',
        nom: 'Dupont',
        prenom: 'Jean',
        telephone: '+33612345678',
        role: 'client',
      }),
    });

    const profile = await getUserProfile('user-1');

    expect(mockDoc).toHaveBeenCalledWith(mockDb, 'users', 'user-1');
    expect(profile).not.toBeNull();
    expect(profile!.nom).toBe('Dupont');
    expect(profile!.prenom).toBe('Jean');
    expect(profile!.email).toBe('jean@example.com');
  });

  // PROFIL-02
  test('PROFIL-02: updateProfile updates nom/prenom', async () => {
    await updateProfile('user-1', { nom: 'Martin', prenom: 'Pierre' });

    expect(mockDoc).toHaveBeenCalledWith(mockDb, 'users', 'user-1');
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({
        nom: 'Martin',
        prenom: 'Pierre',
        updatedAt: { _type: 'serverTimestamp' },
      }),
    );
  });

  // PROFIL-03
  test('PROFIL-03: updateProfile updates telephone', async () => {
    await updateProfile('user-1', { telephone: '+33699999999' });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      'doc-ref',
      expect.objectContaining({
        telephone: '+33699999999',
        updatedAt: { _type: 'serverTimestamp' },
      }),
    );
  });

  // PROFIL-04
  test('PROFIL-04: getUserProfile returns livreur-specific fields (note, vehicule)', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        uid: 'livreur-1',
        email: 'livreur@example.com',
        nom: 'Durand',
        prenom: 'Marc',
        telephone: '+33611111111',
        role: 'livreur',
        note: 4.8,
        vehicule: 'scooter',
        nombreLivraisons: 42,
      }),
    });

    const profile = await getUserProfile('livreur-1');

    expect(profile).not.toBeNull();
    expect(profile!.note).toBe(4.8);
    expect(profile!.vehicule).toBe('scooter');
    expect((profile as any).nombreLivraisons).toBe(42);
    expect(profile!.role).toBe('livreur');
  });

  // PROFIL-05
  test('PROFIL-05: updateProfile does not overwrite read-only fields (uid, email)', async () => {
    // The TypeScript signature Partial<Omit<UserProfile, 'uid' | 'email' | 'createdAt'>>
    // prevents uid/email at compile time. At runtime we verify the update payload
    // does not contain those keys.
    await updateProfile('user-1', { nom: 'Test' });

    const updatePayload = (mockUpdateDoc as jest.Mock).mock.calls[0][1];
    expect(updatePayload).not.toHaveProperty('uid');
    expect(updatePayload).not.toHaveProperty('email');
    expect(updatePayload).toHaveProperty('updatedAt');
  });

  // PROFIL-06
  test('PROFIL-06: getUserProfile returns null for non-existent user', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
      data: () => undefined,
    });

    const profile = await getUserProfile('nonexistent-uid');

    expect(profile).toBeNull();
  });
});
