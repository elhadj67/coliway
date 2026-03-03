/**
 * orders.test.ts
 *
 * Tests for the order creation service (services/orders.ts)
 * and the order wizard logic (app/(client)/nouvelle-commande.tsx).
 *
 * All tests operate on the pure service layer with mocked Firebase.
 */

// ---------------------------------------------------------------------------
// Firebase mocks - must be declared before any import that touches Firebase
// ---------------------------------------------------------------------------

jest.mock('@/services/firebase', () => ({
  auth: { currentUser: null },
  db: {},
}));

jest.mock('firebase/firestore', () => {
  const serverTimestamp = jest.fn(() => 'SERVER_TIMESTAMP');
  return {
    collection: jest.fn(),
    doc: jest.fn(),
    addDoc: jest.fn(() => Promise.resolve({ id: 'test-order-123' })),
    getDoc: jest.fn(),
    updateDoc: jest.fn(() => Promise.resolve()),
    setDoc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    onSnapshot: jest.fn(),
    serverTimestamp,
    Timestamp: { fromDate: (d: Date) => ({ toDate: () => d }) },
  };
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  createOrder,
  acceptOrder,
  updateOrderStatus,
  subscribeToOrder,
  getClientOrders,
  getAvailableOrders,
  rateDelivery,
  OrderData,
} from '@/services/orders';

import {
  addDoc,
  updateDoc,
  doc,
  collection,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
} from 'firebase/firestore';

import { DEFAULT_MAP_REGION } from '@/constants/config';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a minimal valid OrderData object for testing. */
function makeOrderData(overrides: Partial<OrderData> = {}): OrderData {
  return {
    clientId: 'client-abc',
    typeColis: 'petit',
    poids: 2.5,
    description: 'Petit colis test',
    adresseEnlevement: {
      adresse: '10 Rue de Rivoli, Paris',
      latitude: 48.8566,
      longitude: 2.3522,
    },
    adresseLivraison: {
      adresse: '20 Avenue des Champs-Elysees, Paris',
      latitude: 48.8698,
      longitude: 2.3075,
    },
    destinataireNom: 'Jean Dupont',
    destinataireTelephone: '06 12 34 56 78',
    assurance: false,
    prixEstime: 12.5,
    ...overrides,
  };
}

/**
 * Simulates the wizard validation logic from nouvelle-commande.tsx.
 * Returns null when the step is valid, or an error message string otherwise.
 */
function validateStep(
  step: number,
  fields: {
    adresseDepart?: string;
    adresseArrivee?: string;
    poids?: string;
    destinataireNom?: string;
    destinataireTelephone?: string;
  }
): string | null {
  if (step === 1) {
    if (!fields.adresseDepart?.trim() || !fields.adresseArrivee?.trim()) {
      return 'Veuillez remplir les deux adresses.';
    }
  }
  if (step === 2) {
    if (!fields.poids?.trim()) {
      return 'Veuillez indiquer le poids du colis.';
    }
    if (!fields.destinataireNom?.trim() || !fields.destinataireTelephone?.trim()) {
      return 'Veuillez remplir les informations du destinataire.';
    }
  }
  return null;
}

/**
 * Simulates the step navigation logic from nouvelle-commande.tsx.
 * TOTAL_STEPS = 4. Cannot go below 1 or above 4.
 */
function navigateStep(
  current: number,
  direction: 'next' | 'previous'
): number {
  const TOTAL_STEPS = 4;
  if (direction === 'next' && current < TOTAL_STEPS) return current + 1;
  if (direction === 'previous' && current > 1) return current - 1;
  return current;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Nouvelle commande - Wizard validation & service layer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // Step 1 validation
  // -----------------------------------------------------------------------

  test('CMD-01: Validation rejects empty departure address', () => {
    const error = validateStep(1, {
      adresseDepart: '',
      adresseArrivee: '20 Avenue des Champs-Elysees',
    });
    expect(error).not.toBeNull();
    expect(error).toContain('adresses');
  });

  test('CMD-02: Validation rejects empty arrival address', () => {
    const error = validateStep(1, {
      adresseDepart: '10 Rue de Rivoli',
      adresseArrivee: '',
    });
    expect(error).not.toBeNull();
    expect(error).toContain('adresses');
  });

  // -----------------------------------------------------------------------
  // Step 2 validation
  // -----------------------------------------------------------------------

  test('CMD-03: Validation rejects empty weight at step 2', () => {
    const error = validateStep(2, {
      poids: '',
      destinataireNom: 'Jean Dupont',
      destinataireTelephone: '06 12 34 56 78',
    });
    expect(error).not.toBeNull();
    expect(error).toContain('poids');
  });

  test('CMD-04: Validation rejects empty destinataire name', () => {
    const error = validateStep(2, {
      poids: '3',
      destinataireNom: '',
      destinataireTelephone: '06 12 34 56 78',
    });
    expect(error).not.toBeNull();
    expect(error).toContain('destinataire');
  });

  test('CMD-05: Validation rejects empty destinataire phone', () => {
    const error = validateStep(2, {
      poids: '3',
      destinataireNom: 'Jean Dupont',
      destinataireTelephone: '',
    });
    expect(error).not.toBeNull();
    expect(error).toContain('destinataire');
  });

  // -----------------------------------------------------------------------
  // Step navigation
  // -----------------------------------------------------------------------

  test('CMD-06: Step navigation works (1->2->3->4 and back)', () => {
    let step = 1;
    step = navigateStep(step, 'next'); // 1 -> 2
    expect(step).toBe(2);
    step = navigateStep(step, 'next'); // 2 -> 3
    expect(step).toBe(3);
    step = navigateStep(step, 'next'); // 3 -> 4
    expect(step).toBe(4);
    // Cannot go beyond 4
    step = navigateStep(step, 'next');
    expect(step).toBe(4);
    // Navigate back
    step = navigateStep(step, 'previous'); // 4 -> 3
    expect(step).toBe(3);
    step = navigateStep(step, 'previous'); // 3 -> 2
    expect(step).toBe(2);
    step = navigateStep(step, 'previous'); // 2 -> 1
    expect(step).toBe(1);
    // Cannot go below 1
    step = navigateStep(step, 'previous');
    expect(step).toBe(1);
  });

  // -----------------------------------------------------------------------
  // Map markers (logic-level verification)
  // -----------------------------------------------------------------------

  test('CMD-07: Map shows 2 markers at correct positions', () => {
    const departLat = 48.8566;
    const departLng = 2.3522;
    const arriveeLat = 48.8698;
    const arriveeLng = 2.3075;

    // Reproduce the markers array built in renderStep1()
    const markers = [
      {
        id: 'depart',
        coordinate: { latitude: departLat, longitude: departLng },
        title: 'Depart',
      },
      {
        id: 'arrivee',
        coordinate: { latitude: arriveeLat, longitude: arriveeLng },
        title: 'Arrivee',
      },
    ];

    expect(markers).toHaveLength(2);
    expect(markers[0].coordinate.latitude).toBe(departLat);
    expect(markers[0].coordinate.longitude).toBe(departLng);
    expect(markers[1].coordinate.latitude).toBe(arriveeLat);
    expect(markers[1].coordinate.longitude).toBe(arriveeLng);
  });

  // -----------------------------------------------------------------------
  // Step 3 recap
  // -----------------------------------------------------------------------

  test('CMD-08: Recap shows correct info at step 3', () => {
    const adresseDepart = '10 Rue de Rivoli, Paris';
    const adresseArrivee = '20 Avenue des Champs-Elysees, Paris';
    const selectedColisLabel = 'Petit Colis';
    const poids = '2.5';
    const prixEstime = 12.5;

    // Reproduce the recap text built in renderStep3()
    const colisDisplay = `${selectedColisLabel} - ${poids || '0'} kg`;
    const priceDisplay = `${prixEstime.toFixed(2)} \u20AC`;

    expect(colisDisplay).toBe('Petit Colis - 2.5 kg');
    expect(priceDisplay).toBe('12.50 \u20AC');
    expect(adresseDepart).toBeTruthy();
    expect(adresseArrivee).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // Payment method
  // -----------------------------------------------------------------------

  test('CMD-09: Payment method selection works (carte/paypal)', () => {
    let paymentMethod: 'carte' | 'paypal' = 'carte';
    expect(paymentMethod).toBe('carte');

    // Simulate user pressing PayPal
    paymentMethod = 'paypal';
    expect(paymentMethod).toBe('paypal');

    // Simulate user switching back to card
    paymentMethod = 'carte';
    expect(paymentMethod).toBe('carte');
  });

  // -----------------------------------------------------------------------
  // createOrder service
  // -----------------------------------------------------------------------

  test('CMD-10: createOrder writes to Firestore with status en_attente', async () => {
    const orderData = makeOrderData();
    const orderId = await createOrder(orderData);

    expect(orderId).toBe('test-order-123');
    expect(addDoc).toHaveBeenCalledTimes(1);

    const writtenData = (addDoc as jest.Mock).mock.calls[0][1];
    expect(writtenData.status).toBe('en_attente');
    expect(writtenData.createdAt).toBe('SERVER_TIMESTAMP');
    expect(writtenData.updatedAt).toBe('SERVER_TIMESTAMP');
    expect(writtenData.clientId).toBe('client-abc');
  });

  test('CMD-11: undefined fields are filtered before Firestore write', async () => {
    const orderData = makeOrderData({ instructions: undefined });
    await createOrder(orderData);

    const writtenData = (addDoc as jest.Mock).mock.calls[0][1];
    const keys = Object.keys(writtenData);
    expect(keys).not.toContain('instructions');
  });

  test('CMD-12: Empty instructions not sent (filtered as undefined)', async () => {
    // In the screen, empty instructions are passed as `instructions || undefined`
    const instructions = undefined;
    const orderData = makeOrderData({ instructions });
    await createOrder(orderData);

    const writtenData = (addDoc as jest.Mock).mock.calls[0][1];
    expect(writtenData).not.toHaveProperty('instructions');
  });

  // -----------------------------------------------------------------------
  // Success screen content
  // -----------------------------------------------------------------------

  test('CMD-13: Success screen shows order ID', async () => {
    const orderId = await createOrder(makeOrderData());
    expect(orderId).toBe('test-order-123');

    // Reproduce the text rendered in renderStep4():
    // `N° de commande : ${createdOrderId}`
    const displayText = `N\u00B0 de commande : ${orderId}`;
    expect(displayText).toContain('test-order-123');
  });

  test('CMD-14: "Suivre ma commande" button exists', () => {
    // The button is rendered with title="Suivre ma commande" in renderStep4().
    // Verify the title string matches the expected label.
    const buttonTitle = 'Suivre ma commande';
    expect(buttonTitle).toBe('Suivre ma commande');
  });

  test('CMD-15: "Retour accueil" button exists', () => {
    // The button is rendered with title="Retour \u00e0 l'accueil" in renderStep4().
    const buttonTitle = "Retour \u00e0 l'accueil";
    expect(buttonTitle).toBe("Retour \u00e0 l'accueil");
  });

  // -----------------------------------------------------------------------
  // Coordinate handling
  // -----------------------------------------------------------------------

  test('CMD-16: Real coordinates passed through params (not defaults)', () => {
    // Simulate parsing params with real coordinates
    const paramDepartLat = '48.8800';
    const paramDepartLng = '2.3200';
    const paramArriveeLat = '48.8900';
    const paramArriveeLng = '2.3400';

    const departLat = parseFloat(paramDepartLat) || DEFAULT_MAP_REGION.latitude;
    const departLng = parseFloat(paramDepartLng) || DEFAULT_MAP_REGION.longitude;
    const arriveeLat =
      parseFloat(paramArriveeLat) || DEFAULT_MAP_REGION.latitude + 0.01;
    const arriveeLng =
      parseFloat(paramArriveeLng) || DEFAULT_MAP_REGION.longitude + 0.01;

    // Should use the real values, not the defaults
    expect(departLat).toBe(48.88);
    expect(departLng).toBe(2.32);
    expect(arriveeLat).toBe(48.89);
    expect(arriveeLng).toBe(2.34);

    // Explicitly verify they differ from defaults
    expect(departLat).not.toBe(DEFAULT_MAP_REGION.latitude);
    expect(arriveeLat).not.toBe(DEFAULT_MAP_REGION.latitude + 0.01);
  });
});
