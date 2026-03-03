/**
 * tracking.test.ts
 *
 * Tests for order tracking, status transitions, and position updates.
 * Covers services/orders.ts (subscribeToOrder, acceptOrder, updateOrderStatus)
 * and services/location.ts (updateLivreurPosition).
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
    doc: jest.fn(() => 'mock-doc-ref'),
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

// Mock expo-location so the location service module can be imported
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  geocodeAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  Accuracy: { High: 6 },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  subscribeToOrder,
  acceptOrder,
  updateOrderStatus,
} from '@/services/orders';

import { updateLivreurPosition } from '@/services/location';

import {
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Order tracking & status transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -----------------------------------------------------------------------
  // SUIVI-01: subscribeToOrder calls onSnapshot with correct doc reference
  // -----------------------------------------------------------------------

  test('SUIVI-01: subscribeToOrder calls onSnapshot with correct doc reference', () => {
    const callback = jest.fn();
    subscribeToOrder('order-xyz', callback);

    // doc() should have been called to create a reference to 'commandes/order-xyz'
    expect(doc).toHaveBeenCalledWith(
      expect.anything(), // db
      'commandes',
      'order-xyz'
    );

    // onSnapshot should have been called with that doc ref and a callback
    expect(onSnapshot).toHaveBeenCalledTimes(1);
    const snapshotArgs = (onSnapshot as jest.Mock).mock.calls[0];
    // First arg is the doc reference returned by doc()
    expect(snapshotArgs[0]).toBe('mock-doc-ref');
    // Second arg is a function (the snapshot listener)
    expect(typeof snapshotArgs[1]).toBe('function');
  });

  // -----------------------------------------------------------------------
  // SUIVI-02: acceptOrder sets status to 'acceptee'
  // -----------------------------------------------------------------------

  test('SUIVI-02: acceptOrder sets status to acceptee', async () => {
    await acceptOrder('order-abc', 'livreur-001');

    expect(updateDoc).toHaveBeenCalledTimes(1);
    const updateData = (updateDoc as jest.Mock).mock.calls[0][1];
    expect(updateData.status).toBe('acceptee');
  });

  // -----------------------------------------------------------------------
  // SUIVI-03: updateOrderStatus('en_transit') works correctly
  // -----------------------------------------------------------------------

  test('SUIVI-03: updateOrderStatus en_transit works correctly', async () => {
    await updateOrderStatus('order-abc', 'en_transit');

    expect(updateDoc).toHaveBeenCalledTimes(1);
    const updateData = (updateDoc as jest.Mock).mock.calls[0][1];
    expect(updateData.status).toBe('en_transit');
    expect(updateData.updatedAt).toBe('SERVER_TIMESTAMP');
    // en_transit should NOT add deliveredAt
    expect(updateData).not.toHaveProperty('deliveredAt');
  });

  // -----------------------------------------------------------------------
  // SUIVI-04: updateOrderStatus('livree') adds deliveredAt timestamp
  // -----------------------------------------------------------------------

  test('SUIVI-04: updateOrderStatus livree adds deliveredAt timestamp', async () => {
    await updateOrderStatus('order-abc', 'livree');

    expect(updateDoc).toHaveBeenCalledTimes(1);
    const updateData = (updateDoc as jest.Mock).mock.calls[0][1];
    expect(updateData.status).toBe('livree');
    expect(updateData.deliveredAt).toBe('SERVER_TIMESTAMP');
    expect(updateData.updatedAt).toBe('SERVER_TIMESTAMP');
  });

  // -----------------------------------------------------------------------
  // SUIVI-05: acceptOrder sets livreurId on the order
  // -----------------------------------------------------------------------

  test('SUIVI-05: acceptOrder sets livreurId on the order', async () => {
    await acceptOrder('order-abc', 'livreur-007');

    expect(updateDoc).toHaveBeenCalledTimes(1);
    const updateData = (updateDoc as jest.Mock).mock.calls[0][1];
    expect(updateData.livreurId).toBe('livreur-007');
    expect(updateData.acceptedAt).toBe('SERVER_TIMESTAMP');
    expect(updateData.updatedAt).toBe('SERVER_TIMESTAMP');
  });

  // -----------------------------------------------------------------------
  // SUIVI-06: updateLivreurPosition writes position to Firestore
  // -----------------------------------------------------------------------

  test('SUIVI-06: updateLivreurPosition writes position to Firestore', async () => {
    const position = { latitude: 48.8566, longitude: 2.3522 };
    await updateLivreurPosition('livreur-001', position);

    // doc() should target the 'users' collection
    expect(doc).toHaveBeenCalledWith(
      expect.anything(), // db
      'users',
      'livreur-001'
    );

    expect(updateDoc).toHaveBeenCalledTimes(1);
    const updateData = (updateDoc as jest.Mock).mock.calls[0][1];
    expect(updateData.position).toEqual({
      latitude: 48.8566,
      longitude: 2.3522,
    });
    expect(updateData.positionUpdatedAt).toBe('SERVER_TIMESTAMP');
  });

  // -----------------------------------------------------------------------
  // SUIVI-07: updateOrderStatus('annulee') works for cancellation
  // -----------------------------------------------------------------------

  test('SUIVI-07: updateOrderStatus annulee works for cancellation', async () => {
    await updateOrderStatus('order-abc', 'annulee');

    expect(updateDoc).toHaveBeenCalledTimes(1);
    const updateData = (updateDoc as jest.Mock).mock.calls[0][1];
    expect(updateData.status).toBe('annulee');
    expect(updateData.updatedAt).toBe('SERVER_TIMESTAMP');
    // annulee should NOT add deliveredAt
    expect(updateData).not.toHaveProperty('deliveredAt');
  });

  // -----------------------------------------------------------------------
  // SUIVI-08: Status transitions are validated
  // -----------------------------------------------------------------------

  test('SUIVI-08: Status transitions - full lifecycle through service calls', async () => {
    // Simulate the complete order lifecycle via the service layer.
    // Each call resets mocks so we can inspect individually.

    // 1. acceptOrder: en_attente -> acceptee
    await acceptOrder('order-lifecycle', 'livreur-42');
    let updateData = (updateDoc as jest.Mock).mock.calls[0][1];
    expect(updateData.status).toBe('acceptee');
    expect(updateData.livreurId).toBe('livreur-42');
    expect(updateData.acceptedAt).toBe('SERVER_TIMESTAMP');

    jest.clearAllMocks();

    // 2. updateOrderStatus: acceptee -> en_transit
    await updateOrderStatus('order-lifecycle', 'en_transit');
    updateData = (updateDoc as jest.Mock).mock.calls[0][1];
    expect(updateData.status).toBe('en_transit');
    expect(updateData).not.toHaveProperty('deliveredAt');

    jest.clearAllMocks();

    // 3. updateOrderStatus: en_transit -> livree
    await updateOrderStatus('order-lifecycle', 'livree');
    updateData = (updateDoc as jest.Mock).mock.calls[0][1];
    expect(updateData.status).toBe('livree');
    expect(updateData.deliveredAt).toBe('SERVER_TIMESTAMP');

    // Verify doc was targeted at 'commandes/order-lifecycle'
    expect(doc).toHaveBeenCalledWith(
      expect.anything(),
      'commandes',
      'order-lifecycle'
    );
  });
});
