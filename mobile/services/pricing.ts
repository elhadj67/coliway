/**
 * Pricing calculation module - extracted for testability.
 * Used by the client home screen for price estimation.
 */

// Pricing grid per colis type
export const PRICING: Record<string, { base: number; perKm: number[]; tiers: number[] }> = {
  enveloppe: { base: 3.50, perKm: [0.80, 0.60, 0.50], tiers: [10, 30] },
  petit:     { base: 4.50, perKm: [1.00, 0.80, 0.65], tiers: [10, 30] },
  moyen:     { base: 6.00, perKm: [1.30, 1.00, 0.85], tiers: [10, 30] },
  gros:      { base: 8.50, perKm: [1.80, 1.40, 1.15], tiers: [10, 30] },
  palette:   { base: 15.00, perKm: [3.00, 2.50, 2.00], tiers: [10, 30] },
};

// Traffic surcharge multiplier
export const TRAFFIC_SURCHARGE: Record<string, number> = {
  'fluide': 1.0,
  'modéré': 1.10,  // +10%
  'dense': 1.20,   // +20%
  'inconnu': 1.0,
};

// Minimum delivery time in minutes
export const MIN_DELIVERY_TIME = 5;

/**
 * Calculate price based on distance and colis type using tiered pricing.
 */
export function calculatePrice(distanceKm: number, colisId: string): number {
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

/**
 * Apply traffic surcharge to a base price.
 */
export function applyTrafficSurcharge(basePrice: number, trafficLevel: string): number {
  const surcharge = TRAFFIC_SURCHARGE[trafficLevel] || 1.0;
  return Math.round(basePrice * surcharge * 100) / 100;
}
