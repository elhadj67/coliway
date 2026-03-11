/**
 * Pricing calculation module - extracted for testability.
 * Used by the client home screen for price estimation.
 * Supports separate pricing grids for particulier and professionnel clients.
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { ClientType } from './auth';

type PricingEntry = { base: number; perKm: number[]; tiers: number[] };
type PricingGrid = Record<string, PricingEntry>;

// Default pricing grids (fallback when Firestore config not available)
export const PRICING: PricingGrid = {
  enveloppe: { base: 3.50, perKm: [0.80, 0.60, 0.50], tiers: [10, 30] },
  petit:     { base: 4.50, perKm: [1.00, 0.80, 0.65], tiers: [10, 30] },
  moyen:     { base: 6.00, perKm: [1.30, 1.00, 0.85], tiers: [10, 30] },
  gros:      { base: 8.50, perKm: [1.80, 1.40, 1.15], tiers: [10, 30] },
  palette:   { base: 15.00, perKm: [3.00, 2.50, 2.00], tiers: [10, 30] },
};

export const PRICING_PRO: PricingGrid = {
  enveloppe: { base: 3.00, perKm: [0.70, 0.50, 0.40], tiers: [10, 30] },
  petit:     { base: 3.80, perKm: [0.85, 0.65, 0.55], tiers: [10, 30] },
  moyen:     { base: 5.00, perKm: [1.10, 0.85, 0.70], tiers: [10, 30] },
  gros:      { base: 7.00, perKm: [1.50, 1.15, 0.95], tiers: [10, 30] },
  palette:   { base: 12.00, perKm: [2.50, 2.00, 1.60], tiers: [10, 30] },
};

// Cached Firestore pricing
let cachedParticulier: PricingGrid | null = null;
let cachedPro: PricingGrid | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch pricing config from Firestore, with cache.
 */
export async function fetchPricingConfig(): Promise<{ particulier: PricingGrid; professionnel: PricingGrid }> {
  const now = Date.now();
  if (cachedParticulier && cachedPro && now - cacheTimestamp < CACHE_TTL) {
    return { particulier: cachedParticulier, professionnel: cachedPro };
  }

  try {
    const snap = await getDoc(doc(db, 'config', 'pricing'));
    if (snap.exists()) {
      const data = snap.data();
      if (data.particulier) cachedParticulier = data.particulier as PricingGrid;
      if (data.professionnel) cachedPro = data.professionnel as PricingGrid;
      cacheTimestamp = now;
    }
  } catch (error) {
    console.error('Error fetching pricing config:', error);
  }

  return {
    particulier: cachedParticulier || PRICING,
    professionnel: cachedPro || PRICING_PRO,
  };
}

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
 * Uses default particulier grid (synchronous fallback).
 */
export function calculatePrice(distanceKm: number, colisId: string, clientType?: ClientType): number {
  const defaultGrid = clientType === 'professionnel' ? PRICING_PRO : PRICING;
  const grid = (clientType === 'professionnel'
    ? (cachedPro || defaultGrid)
    : (cachedParticulier || defaultGrid))[colisId]
    || defaultGrid.petit;
  return computeFromGrid(distanceKm, grid);
}

/**
 * Calculate price using Firestore-configured pricing (async).
 */
export async function calculatePriceAsync(distanceKm: number, colisId: string, clientType?: ClientType): Promise<number> {
  const config = await fetchPricingConfig();
  const pricingGrid = clientType === 'professionnel' ? config.professionnel : config.particulier;
  const grid = pricingGrid[colisId] || config.particulier.petit || PRICING.petit;
  return computeFromGrid(distanceKm, grid);
}

function computeFromGrid(distanceKm: number, grid: PricingEntry): number {
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
