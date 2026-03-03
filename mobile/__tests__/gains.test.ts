/**
 * Tests for the earnings (gains) calculation and filtering logic.
 *
 * The pure functions are copied from app/(livreur)/gains.tsx so they can be
 * tested in isolation without rendering the React component.
 *
 * Covers:
 *   GAINS-01 : getEarnings = price * 0.80
 *   GAINS-02 : orderInPeriod 'today'
 *   GAINS-03 : orderInPeriod 'week'
 *   GAINS-04 : orderInPeriod 'month'
 *   GAINS-05 : getDailyEarnings returns last 7 days data
 *   GAINS-06 : Only 'livree' orders counted
 *   GAINS-07 : getEarnings for annulee order with prixEstime=0 returns 0
 *   GAINS-08 : getCommission is exactly 20% of price
 */

// ---------------------------------------------------------------------------
// Mocks -- keep Firebase from loading real modules
// ---------------------------------------------------------------------------

jest.mock('@/services/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  functions: {},
  storage: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(),
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

// ---------------------------------------------------------------------------
// Types replicated from the app
// ---------------------------------------------------------------------------

interface OrderAddress {
  adresse: string;
  latitude: number;
  longitude: number;
}

interface FakeTimestamp {
  toDate(): Date;
  seconds: number;
}

interface TestOrder {
  id: string;
  clientId: string;
  typeColis: string;
  poids: number;
  description: string;
  adresseEnlevement: OrderAddress;
  adresseLivraison: OrderAddress;
  destinataireNom: string;
  destinataireTelephone: string;
  assurance: boolean;
  prixEstime: number;
  prixFinal?: number;
  status: string;
  createdAt: FakeTimestamp;
  updatedAt: FakeTimestamp;
  deliveredAt?: FakeTimestamp;
}

// ---------------------------------------------------------------------------
// Pure functions copied from gains.tsx
// ---------------------------------------------------------------------------

const COMMISSION_RATE = 0.20;

type PeriodKey = 'today' | 'week' | 'month' | 'total';

function getStartOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function orderInPeriod(order: TestOrder, period: PeriodKey): boolean {
  if (period === 'total') return true;

  const orderDate = order.deliveredAt
    ? order.deliveredAt.toDate()
    : order.createdAt
    ? order.createdAt.toDate()
    : null;

  if (!orderDate) return false;

  let startDate: Date;
  switch (period) {
    case 'today':
      startDate = getStartOfDay();
      break;
    case 'week':
      startDate = getStartOfWeek();
      break;
    case 'month':
      startDate = getStartOfMonth();
      break;
    default:
      return true;
  }

  return orderDate >= startDate;
}

function getEarnings(order: TestOrder): number {
  const price = order.prixFinal || order.prixEstime || 0;
  return price * (1 - COMMISSION_RATE);
}

function getCommission(order: TestOrder): number {
  const price = order.prixFinal || order.prixEstime || 0;
  return price * COMMISSION_RATE;
}

interface DayEarnings {
  day: string;
  amount: number;
}

function getDailyEarnings(orders: TestOrder[]): DayEarnings[] {
  const map = new Map<string, number>();

  orders.forEach((order) => {
    const dateObj = order.deliveredAt
      ? order.deliveredAt.toDate()
      : order.createdAt?.toDate();
    if (!dateObj) return;

    const key = dateObj.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    });
    const prev = map.get(key) || 0;
    map.set(key, prev + getEarnings(order));
  });

  return Array.from(map.entries())
    .map(([day, amount]) => ({ day, amount }))
    .slice(-7); // Last 7 days with data
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ts(date: Date): FakeTimestamp {
  return {
    toDate: () => date,
    seconds: Math.floor(date.getTime() / 1000),
  };
}

function makeOrder(overrides: Partial<TestOrder> = {}): TestOrder {
  const now = new Date();
  return {
    id: 'order-1',
    clientId: 'client-1',
    typeColis: 'petit',
    poids: 2,
    description: 'Test order',
    adresseEnlevement: {
      adresse: '10 Rue A, Paris',
      latitude: 48.85,
      longitude: 2.35,
    },
    adresseLivraison: {
      adresse: '20 Rue B, Paris',
      latitude: 48.86,
      longitude: 2.30,
    },
    destinataireNom: 'Dupont',
    destinataireTelephone: '+33600000000',
    assurance: false,
    prixEstime: 20,
    status: 'livree',
    createdAt: ts(now),
    updatedAt: ts(now),
    deliveredAt: ts(now),
    ...overrides,
  };
}

// ===========================================================================
// TESTS
// ===========================================================================

describe('Gains - Earnings and Filtering', () => {
  // GAINS-01
  test('GAINS-01: getEarnings returns price * 0.80', () => {
    const order = makeOrder({ prixEstime: 100 });
    expect(getEarnings(order)).toBe(80);

    const order2 = makeOrder({ prixEstime: 50 });
    expect(getEarnings(order2)).toBe(40);

    // prixFinal takes precedence over prixEstime
    const order3 = makeOrder({ prixEstime: 50, prixFinal: 60 });
    expect(getEarnings(order3)).toBe(48); // 60 * 0.80
  });

  // GAINS-02
  test('GAINS-02: orderInPeriod "today" filters correctly', () => {
    // Order delivered now -> in period
    const orderToday = makeOrder({ deliveredAt: ts(new Date()) });
    expect(orderInPeriod(orderToday, 'today')).toBe(true);

    // Order delivered yesterday -> NOT in period
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);
    const orderYesterday = makeOrder({ deliveredAt: ts(yesterday) });
    expect(orderInPeriod(orderYesterday, 'today')).toBe(false);
  });

  // GAINS-03
  test('GAINS-03: orderInPeriod "week" filters correctly', () => {
    // Order delivered now -> in period
    const orderThisWeek = makeOrder({ deliveredAt: ts(new Date()) });
    expect(orderInPeriod(orderThisWeek, 'week')).toBe(true);

    // Order delivered 30 days ago -> NOT in period
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const orderOld = makeOrder({ deliveredAt: ts(thirtyDaysAgo) });
    expect(orderInPeriod(orderOld, 'week')).toBe(false);
  });

  // GAINS-04
  test('GAINS-04: orderInPeriod "month" filters correctly', () => {
    // Order delivered today -> in period
    const orderThisMonth = makeOrder({ deliveredAt: ts(new Date()) });
    expect(orderInPeriod(orderThisMonth, 'month')).toBe(true);

    // Order delivered 60 days ago -> NOT in period
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const orderOld = makeOrder({ deliveredAt: ts(sixtyDaysAgo) });
    expect(orderInPeriod(orderOld, 'month')).toBe(false);

    // 'total' always returns true regardless of date
    expect(orderInPeriod(orderOld, 'total')).toBe(true);
  });

  // GAINS-05
  test('GAINS-05: getDailyEarnings returns at most last 7 days of data', () => {
    const orders: TestOrder[] = [];
    // Create 10 orders each on a distinct day
    for (let i = 0; i < 10; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(12, 0, 0, 0);
      orders.push(
        makeOrder({
          id: `order-${i}`,
          deliveredAt: ts(d),
          prixEstime: 25,
        }),
      );
    }

    const result = getDailyEarnings(orders);

    // slice(-7) means at most 7 entries
    expect(result.length).toBeLessThanOrEqual(7);
    // Each entry should have a day label and a positive amount
    result.forEach((entry) => {
      expect(typeof entry.day).toBe('string');
      expect(typeof entry.amount).toBe('number');
      expect(entry.amount).toBeGreaterThan(0);
    });
  });

  // GAINS-06
  test('GAINS-06: Only "livree" orders are counted (filter logic from component)', () => {
    const allOrders: TestOrder[] = [
      makeOrder({ id: 'o1', status: 'livree', prixEstime: 20 }),
      makeOrder({ id: 'o2', status: 'en_attente', prixEstime: 30 }),
      makeOrder({ id: 'o3', status: 'acceptee', prixEstime: 25 }),
      makeOrder({ id: 'o4', status: 'livree', prixEstime: 40 }),
      makeOrder({ id: 'o5', status: 'annulee', prixEstime: 10 }),
    ];

    // Replicate the filter from GainsScreen useEffect
    const deliveredOrders = allOrders.filter((o) => o.status === 'livree');

    expect(deliveredOrders).toHaveLength(2);
    expect(deliveredOrders.map((o) => o.id)).toEqual(['o1', 'o4']);

    const totalEarnings = deliveredOrders.reduce(
      (sum, o) => sum + getEarnings(o),
      0,
    );
    // (20 + 40) * 0.80 = 48
    expect(totalEarnings).toBe(48);
  });

  // GAINS-07
  test('GAINS-07: getEarnings for annulee order with prixEstime=0 returns 0', () => {
    const cancelledOrder = makeOrder({
      status: 'annulee',
      prixEstime: 0,
      prixFinal: undefined,
    });

    expect(getEarnings(cancelledOrder)).toBe(0);
    expect(getCommission(cancelledOrder)).toBe(0);
  });

  // GAINS-08
  test('GAINS-08: getCommission is exactly 20% of price', () => {
    const order1 = makeOrder({ prixEstime: 100 });
    expect(getCommission(order1)).toBe(20);

    const order2 = makeOrder({ prixEstime: 50 });
    expect(getCommission(order2)).toBe(10);

    const order3 = makeOrder({ prixFinal: 75, prixEstime: 50 });
    expect(getCommission(order3)).toBe(15); // 75 * 0.20

    // Earnings + commission must equal the original price
    const price = 100;
    const order4 = makeOrder({ prixEstime: price });
    expect(getEarnings(order4) + getCommission(order4)).toBe(price);
  });
});
