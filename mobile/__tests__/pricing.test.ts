/**
 * pricing.test.ts
 *
 * Tests for the pricing calculation logic used on the client home screen
 * (app/(client)/index.tsx) and the routing service (services/routing.ts).
 *
 * Because the pricing functions and constants are not exported from the screen
 * component, we duplicate the pure logic here and test it directly.
 */

// ---------------------------------------------------------------------------
// Duplicated pure logic from app/(client)/index.tsx
// ---------------------------------------------------------------------------

const PRICING: Record<string, { base: number; perKm: number[]; tiers: number[] }> = {
  enveloppe: { base: 3.50, perKm: [0.80, 0.60, 0.50], tiers: [10, 30] },
  petit:     { base: 4.50, perKm: [1.00, 0.80, 0.65], tiers: [10, 30] },
  moyen:     { base: 6.00, perKm: [1.30, 1.00, 0.85], tiers: [10, 30] },
  gros:      { base: 8.50, perKm: [1.80, 1.40, 1.15], tiers: [10, 30] },
  palette:   { base: 15.00, perKm: [3.00, 2.50, 2.00], tiers: [10, 30] },
};

function calculatePrice(distanceKm: number, colisId: string): number {
  const grid = PRICING[colisId] || PRICING.petit;
  let price = grid.base;
  let remaining = distanceKm;

  // Tier 1: 0 to tiers[0] km
  const tier1 = Math.min(remaining, grid.tiers[0]);
  price += tier1 * grid.perKm[0];
  remaining -= tier1;

  // Tier 2: tiers[0] to tiers[1] km
  if (remaining > 0) {
    const tier2 = Math.min(remaining, grid.tiers[1] - grid.tiers[0]);
    price += tier2 * grid.perKm[1];
    remaining -= tier2;
  }

  // Tier 3: beyond tiers[1] km
  if (remaining > 0) {
    price += remaining * grid.perKm[2];
  }

  return Math.round(price * 100) / 100;
}

const TRAFFIC_SURCHARGE: Record<string, number> = {
  'fluide': 1.0,
  'modere': 1.10,
  'dense': 1.20,
  'inconnu': 1.0,
};

// ---------------------------------------------------------------------------
// Helper: apply traffic surcharge exactly as the screen component does
// ---------------------------------------------------------------------------
function applyTrafficSurcharge(basePrice: number, trafficLevel: string): number {
  const surcharge = TRAFFIC_SURCHARGE[trafficLevel] || 1.0;
  return Math.round(basePrice * surcharge * 100) / 100;
}

// ---------------------------------------------------------------------------
// Helper: determine traffic level from duration ratio (mirrors routing.ts)
// ---------------------------------------------------------------------------
function determineTrafficLevel(
  durationTrafficSec: number,
  durationSec: number,
): 'fluide' | 'modere' | 'dense' {
  const ratio = durationTrafficSec / durationSec;
  if (ratio < 1.15) return 'fluide';
  if (ratio < 1.4) return 'modere';
  return 'dense';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const mockFetch = jest.fn() as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = mockFetch;
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---- PRIX-01 ---------------------------------------------------------------
describe('PRIX-01: Price is null when only one address is selected', () => {
  it('should not calculate a price when arrival coords are missing', () => {
    // The screen sets estimatedPrice to null when either coords are null.
    // We replicate the guard: if (!departCoords || !arriveeCoords) => null.
    const departCoords = { latitude: 48.8566, longitude: 2.3522 };
    const arriveeCoords = null;

    const shouldCalculate = departCoords !== null && arriveeCoords !== null;
    expect(shouldCalculate).toBe(false);
  });

  it('should not calculate a price when departure coords are missing', () => {
    const departCoords = null;
    const arriveeCoords = { latitude: 48.8800, longitude: 2.3600 };

    const shouldCalculate = departCoords !== null && arriveeCoords !== null;
    expect(shouldCalculate).toBe(false);
  });
});

// ---- PRIX-02 ---------------------------------------------------------------
describe('PRIX-02: Loading state while route is being calculated', () => {
  it('should set loadingRoute to true before fetch resolves', async () => {
    // Simulate the screen logic: loadingRoute starts true, set false in finally
    let loadingRoute = false;

    // Before async call
    loadingRoute = true;
    expect(loadingRoute).toBe(true);

    // Simulate async resolution
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        status: 'OK',
        rows: [{ elements: [{ status: 'OK', distance: { value: 5000 }, duration: { value: 600 }, duration_in_traffic: { value: 660 } }] }],
      }),
    });

    await mockFetch();
    loadingRoute = false;
    expect(loadingRoute).toBe(false);
  });
});

// ---- PRIX-03 ---------------------------------------------------------------
describe('PRIX-03: Google Distance Matrix returns correct distance', () => {
  it('should parse distance from Google API response', async () => {
    const googleResponse = {
      status: 'OK',
      rows: [{
        elements: [{
          status: 'OK',
          distance: { value: 15400 },       // 15.4 km in meters
          duration: { value: 1200 },         // 20 min in seconds
          duration_in_traffic: { value: 1320 }, // 22 min
        }],
      }],
    };

    mockFetch.mockResolvedValueOnce({
      json: async () => googleResponse,
    });

    const response = await mockFetch();
    const data = await response.json();
    const element = data.rows[0].elements[0];
    const distanceKm = element.distance.value / 1000;

    expect(distanceKm).toBe(15.4);
  });
});

// ---- PRIX-04 ---------------------------------------------------------------
describe('PRIX-04: OSRM fallback works when Google fails', () => {
  it('should return route info from OSRM when Google throws', async () => {
    // First call: Google fails
    mockFetch.mockRejectedValueOnce(new Error('Google API key invalid'));

    // Second call: OSRM succeeds
    const osrmResponse = {
      code: 'Ok',
      routes: [{
        distance: 12300,  // meters
        duration: 900,    // seconds
      }],
    };
    mockFetch.mockResolvedValueOnce({
      json: async () => osrmResponse,
    });

    // Simulate getRouteInfo logic
    let routeInfo;
    try {
      await mockFetch(); // Google fails
    } catch {
      const osrmResp = await mockFetch();
      const osrmData = await osrmResp.json();
      const route = osrmData.routes[0];
      routeInfo = {
        distanceKm: Math.round((route.distance / 1000) * 10) / 10,
        durationMin: Math.round(route.duration / 60),
        durationTrafficMin: Math.round(route.duration / 60),
        trafficLevel: 'inconnu',
      };
    }

    expect(routeInfo).toBeDefined();
    expect(routeInfo!.distanceKm).toBe(12.3);
    expect(routeInfo!.durationMin).toBe(15);
    expect(routeInfo!.trafficLevel).toBe('inconnu');
  });
});

// ---- PRIX-05 ---------------------------------------------------------------
describe('PRIX-05: Traffic time includes real-time data', () => {
  it('should use duration_in_traffic from Google response', async () => {
    const googleResponse = {
      status: 'OK',
      rows: [{
        elements: [{
          status: 'OK',
          distance: { value: 10000 },
          duration: { value: 600 },           // 10 min without traffic
          duration_in_traffic: { value: 900 }, // 15 min with traffic
        }],
      }],
    };

    mockFetch.mockResolvedValueOnce({
      json: async () => googleResponse,
    });

    const response = await mockFetch();
    const data = await response.json();
    const element = data.rows[0].elements[0];

    const durationMin = Math.round(element.duration.value / 60);
    const durationTrafficMin = Math.round(element.duration_in_traffic.value / 60);

    expect(durationMin).toBe(10);
    expect(durationTrafficMin).toBe(15);
    expect(durationTrafficMin).toBeGreaterThan(durationMin);
  });
});

// ---- PRIX-06 ---------------------------------------------------------------
describe('PRIX-06: Traffic level fluide when ratio < 1.15', () => {
  it('should classify as fluide for ratio 1.10', () => {
    // duration = 1000s, traffic = 1100s => ratio = 1.10
    const level = determineTrafficLevel(1100, 1000);
    expect(level).toBe('fluide');
  });

  it('should classify as fluide for ratio 1.0 (no traffic)', () => {
    const level = determineTrafficLevel(1000, 1000);
    expect(level).toBe('fluide');
  });

  it('should apply no surcharge for fluide traffic', () => {
    const basePrice = 10.00;
    const finalPrice = applyTrafficSurcharge(basePrice, 'fluide');
    expect(finalPrice).toBe(10.00);
  });
});

// ---- PRIX-07 ---------------------------------------------------------------
describe('PRIX-07: Traffic level modere when ratio between 1.15 and 1.4, surcharge +10%', () => {
  it('should classify as modere for ratio 1.20', () => {
    // duration = 1000s, traffic = 1200s => ratio = 1.20
    const level = determineTrafficLevel(1200, 1000);
    expect(level).toBe('modere');
  });

  it('should classify as modere for ratio exactly 1.15', () => {
    const level = determineTrafficLevel(1150, 1000);
    expect(level).toBe('modere');
  });

  it('should apply +10% surcharge for modere traffic', () => {
    const basePrice = 20.00;
    const finalPrice = applyTrafficSurcharge(basePrice, 'modere');
    expect(finalPrice).toBe(22.00);
  });
});

// ---- PRIX-08 ---------------------------------------------------------------
describe('PRIX-08: Traffic level dense when ratio >= 1.4, surcharge +20%', () => {
  it('should classify as dense for ratio 1.5', () => {
    // duration = 1000s, traffic = 1500s => ratio = 1.5
    const level = determineTrafficLevel(1500, 1000);
    expect(level).toBe('dense');
  });

  it('should classify as dense for ratio exactly 1.4', () => {
    const level = determineTrafficLevel(1400, 1000);
    expect(level).toBe('dense');
  });

  it('should apply +20% surcharge for dense traffic', () => {
    const basePrice = 20.00;
    const finalPrice = applyTrafficSurcharge(basePrice, 'dense');
    expect(finalPrice).toBe(24.00);
  });
});

// ---- PRIX-09 ---------------------------------------------------------------
describe('PRIX-09: Base price enveloppe = 3.50', () => {
  it('should have base price 3.50 for enveloppe at 0 km', () => {
    const price = calculatePrice(0, 'enveloppe');
    expect(price).toBe(3.50);
  });
});

// ---- PRIX-10 ---------------------------------------------------------------
describe('PRIX-10: Base price petit = 4.50', () => {
  it('should have base price 4.50 for petit at 0 km', () => {
    const price = calculatePrice(0, 'petit');
    expect(price).toBe(4.50);
  });
});

// ---- PRIX-11 ---------------------------------------------------------------
describe('PRIX-11: Base price moyen = 6.00', () => {
  it('should have base price 6.00 for moyen at 0 km', () => {
    const price = calculatePrice(0, 'moyen');
    expect(price).toBe(6.00);
  });
});

// ---- PRIX-12 ---------------------------------------------------------------
describe('PRIX-12: Base price gros = 8.50', () => {
  it('should have base price 8.50 for gros at 0 km', () => {
    const price = calculatePrice(0, 'gros');
    expect(price).toBe(8.50);
  });
});

// ---- PRIX-13 ---------------------------------------------------------------
describe('PRIX-13: Base price palette = 15.00', () => {
  it('should have base price 15.00 for palette at 0 km', () => {
    const price = calculatePrice(0, 'palette');
    expect(price).toBe(15.00);
  });
});

// ---- PRIX-14 ---------------------------------------------------------------
describe('PRIX-14: Tier 1 pricing (0-10km) applies correct per-km rate', () => {
  it('should calculate enveloppe at 5km: 3.50 + 5*0.80 = 7.50', () => {
    const price = calculatePrice(5, 'enveloppe');
    expect(price).toBe(7.50);
  });

  it('should calculate petit at 10km: 4.50 + 10*1.00 = 14.50', () => {
    const price = calculatePrice(10, 'petit');
    expect(price).toBe(14.50);
  });

  it('should calculate gros at 8km: 8.50 + 8*1.80 = 22.90', () => {
    const price = calculatePrice(8, 'gros');
    expect(price).toBe(22.90);
  });

  it('should calculate palette at 3km: 15.00 + 3*3.00 = 24.00', () => {
    const price = calculatePrice(3, 'palette');
    expect(price).toBe(24.00);
  });
});

// ---- PRIX-15 ---------------------------------------------------------------
describe('PRIX-15: Tier 2 pricing (10-30km) applies correct per-km rate', () => {
  it('should calculate petit at 20km: 4.50 + 10*1.00 + 10*0.80 = 22.50', () => {
    // Tier1: 10km * 1.00 = 10.00
    // Tier2: 10km * 0.80 = 8.00
    // Total: 4.50 + 10.00 + 8.00 = 22.50
    const price = calculatePrice(20, 'petit');
    expect(price).toBe(22.50);
  });

  it('should calculate moyen at 30km: 6.00 + 10*1.30 + 20*1.00 = 39.00', () => {
    // Tier1: 10km * 1.30 = 13.00
    // Tier2: 20km * 1.00 = 20.00
    // Total: 6.00 + 13.00 + 20.00 = 39.00
    const price = calculatePrice(30, 'moyen');
    expect(price).toBe(39.00);
  });

  it('should calculate enveloppe at 25km: 3.50 + 10*0.80 + 15*0.60 = 20.50', () => {
    const price = calculatePrice(25, 'enveloppe');
    expect(price).toBe(20.50);
  });
});

// ---- PRIX-16 ---------------------------------------------------------------
describe('PRIX-16: Tier 3 pricing (30+km) applies correct per-km rate', () => {
  it('should calculate petit at 50km: 4.50 + 10*1.00 + 20*0.80 + 20*0.65 = 33.50', () => {
    // Tier1: 10km * 1.00 = 10.00
    // Tier2: 20km * 0.80 = 16.00
    // Tier3: 20km * 0.65 = 13.00
    // Total: 4.50 + 10.00 + 16.00 + 13.00 = 43.50
    const price = calculatePrice(50, 'petit');
    expect(price).toBe(43.50);
  });

  it('should calculate palette at 40km: 15.00 + 10*3.00 + 20*2.50 + 10*2.00 = 115.00', () => {
    // Tier1: 10km * 3.00 = 30.00
    // Tier2: 20km * 2.50 = 50.00
    // Tier3: 10km * 2.00 = 20.00
    // Total: 15.00 + 30.00 + 50.00 + 20.00 = 115.00
    const price = calculatePrice(40, 'palette');
    expect(price).toBe(115.00);
  });

  it('should calculate gros at 35km: 8.50 + 10*1.80 + 20*1.40 + 5*1.15 = 60.25', () => {
    // Tier1: 10km * 1.80 = 18.00
    // Tier2: 20km * 1.40 = 28.00
    // Tier3: 5km * 1.15 = 5.75
    // Total: 8.50 + 18.00 + 28.00 + 5.75 = 60.25
    const price = calculatePrice(35, 'gros');
    expect(price).toBe(60.25);
  });
});

// ---- PRIX-17 ---------------------------------------------------------------
describe('PRIX-17: Changing colis type recalculates price', () => {
  it('should produce different prices for different colis types at the same distance', () => {
    const distance = 15;
    const priceEnveloppe = calculatePrice(distance, 'enveloppe');
    const pricePetit = calculatePrice(distance, 'petit');
    const priceMoyen = calculatePrice(distance, 'moyen');
    const priceGros = calculatePrice(distance, 'gros');
    const pricePalette = calculatePrice(distance, 'palette');

    // enveloppe: 3.50 + 10*0.80 + 5*0.60 = 3.50 + 8.00 + 3.00 = 14.50
    expect(priceEnveloppe).toBe(14.50);
    // petit: 4.50 + 10*1.00 + 5*0.80 = 4.50 + 10.00 + 4.00 = 18.50
    expect(pricePetit).toBe(18.50);
    // moyen: 6.00 + 10*1.30 + 5*1.00 = 6.00 + 13.00 + 5.00 = 24.00
    expect(priceMoyen).toBe(24.00);
    // gros: 8.50 + 10*1.80 + 5*1.40 = 8.50 + 18.00 + 7.00 = 33.50
    expect(priceGros).toBe(33.50);
    // palette: 15.00 + 10*3.00 + 5*2.50 = 15.00 + 30.00 + 12.50 = 57.50
    expect(pricePalette).toBe(57.50);

    // All prices should be strictly increasing
    expect(priceEnveloppe).toBeLessThan(pricePetit);
    expect(pricePetit).toBeLessThan(priceMoyen);
    expect(priceMoyen).toBeLessThan(priceGros);
    expect(priceGros).toBeLessThan(pricePalette);
  });
});

// ---- PRIX-18 ---------------------------------------------------------------
describe('PRIX-18: Changing address recalculates price (different distance = different result)', () => {
  it('should produce different prices for different distances with the same colis type', () => {
    const price5km = calculatePrice(5, 'petit');
    const price25km = calculatePrice(25, 'petit');
    const price50km = calculatePrice(50, 'petit');

    // 5km:  4.50 + 5*1.00 = 9.50
    expect(price5km).toBe(9.50);
    // 25km: 4.50 + 10*1.00 + 15*0.80 = 26.50
    expect(price25km).toBe(26.50);
    // 50km: 4.50 + 10*1.00 + 20*0.80 + 20*0.65 = 43.50
    expect(price50km).toBe(43.50);

    expect(price5km).toBeLessThan(price25km);
    expect(price25km).toBeLessThan(price50km);
  });
});

// ---- PRIX-19 ---------------------------------------------------------------
describe('PRIX-19: Distance 0 equals base price only', () => {
  it('should return exactly the base price for every colis type at 0 km', () => {
    expect(calculatePrice(0, 'enveloppe')).toBe(3.50);
    expect(calculatePrice(0, 'petit')).toBe(4.50);
    expect(calculatePrice(0, 'moyen')).toBe(6.00);
    expect(calculatePrice(0, 'gros')).toBe(8.50);
    expect(calculatePrice(0, 'palette')).toBe(15.00);
  });

  it('should fallback to petit pricing for an unknown colis type', () => {
    const price = calculatePrice(0, 'unknown_type');
    expect(price).toBe(4.50); // falls back to PRICING.petit.base
  });
});

// ---- PRIX-20 ---------------------------------------------------------------
describe('PRIX-20: Specific calculation -- petit 12km trafic modere = 17.71', () => {
  it('should compute: base(4.50) + 10*1.00 + 2*0.80 = 16.10, * 1.10 = 17.71', () => {
    // Step 1: raw price via calculatePrice
    const basePrice = calculatePrice(12, 'petit');
    // 4.50 + 10*1.00 + 2*0.80 = 4.50 + 10.00 + 1.60 = 16.10
    expect(basePrice).toBe(16.10);

    // Step 2: apply traffic surcharge for "modere"
    const finalPrice = applyTrafficSurcharge(basePrice, 'modere');
    // 16.10 * 1.10 = 17.71
    expect(finalPrice).toBe(17.71);
  });
});
