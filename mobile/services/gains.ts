/**
 * Gains/earnings calculation module - extracted for testability.
 * Used by the livreur gains screen.
 */

import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db } from './firebase';
import { functions } from './firebase';
import { calculateDistance } from './location';

export const COMMISSION_RATE = 0.20;

export async function fetchCommissionRate(): Promise<number> {
  try {
    const snap = await getDoc(doc(db, 'config', 'commission'));
    if (snap.exists()) {
      const data = snap.data();
      if (typeof data.rate === 'number') return data.rate;
    }
    return COMMISSION_RATE;
  } catch {
    return COMMISSION_RATE;
  }
}

export type PeriodKey = 'today' | 'week' | 'month' | 'total';

export interface OrderForGains {
  prixFinal?: number;
  prixEstime?: number;
  status: string;
  deliveredAt?: { toDate: () => Date } | null;
  createdAt?: { toDate: () => Date } | null;
  adresseEnlevement: { latitude: number; longitude: number };
  adresseLivraison: { latitude: number; longitude: number };
}

export function getStartOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getStartOfWeek(): Date {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getStartOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function orderInPeriod(order: OrderForGains, period: PeriodKey): boolean {
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

export function getEarnings(order: OrderForGains, commissionRate: number = COMMISSION_RATE): number {
  const price = order.prixFinal || order.prixEstime || 0;
  return price * (1 - commissionRate);
}

export function getCommission(order: OrderForGains, commissionRate: number = COMMISSION_RATE): number {
  const price = order.prixFinal || order.prixEstime || 0;
  return price * commissionRate;
}

export function getOrderDistance(order: OrderForGains): number {
  return calculateDistance(
    {
      latitude: order.adresseEnlevement.latitude,
      longitude: order.adresseEnlevement.longitude,
    },
    {
      latitude: order.adresseLivraison.latitude,
      longitude: order.adresseLivraison.longitude,
    }
  );
}

// ============================================================
// Stripe Connect - Payout functions
// ============================================================

export interface ConnectAccountResponse {
  accountId: string;
  onboardingUrl: string;
}

export interface ConnectAccountStatus {
  status: 'not_created' | 'onboarding_incomplete' | 'pending_verification' | 'active';
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
}

export interface PayoutResponse {
  success: boolean;
  amount: number;
  transferId: string;
  orderCount: number;
}

export interface PayoutRecord {
  id: string;
  montant: number;
  nombreCourses: number;
  status: string;
  createdAt: string | null;
}

export async function createConnectAccount(): Promise<ConnectAccountResponse> {
  const fn = httpsCallable<Record<string, never>, ConnectAccountResponse>(
    functions,
    'createConnectAccount'
  );
  const result = await fn({});
  return result.data;
}

export async function getConnectAccountStatus(): Promise<ConnectAccountStatus> {
  const fn = httpsCallable<Record<string, never>, ConnectAccountStatus>(
    functions,
    'getConnectAccountStatus'
  );
  const result = await fn({});
  return result.data;
}

export async function requestPayout(): Promise<PayoutResponse> {
  const fn = httpsCallable<Record<string, never>, PayoutResponse>(
    functions,
    'requestPayout'
  );
  const result = await fn({});
  return result.data;
}

export async function getPayoutHistory(): Promise<PayoutRecord[]> {
  const fn = httpsCallable<Record<string, never>, PayoutRecord[]>(
    functions,
    'getPayoutHistory'
  );
  const result = await fn({});
  return result.data;
}
