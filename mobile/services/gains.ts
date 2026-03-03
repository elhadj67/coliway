/**
 * Gains/earnings calculation module - extracted for testability.
 * Used by the livreur gains screen.
 */

import { calculateDistance } from './location';

export const COMMISSION_RATE = 0.20;

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

export function getEarnings(order: OrderForGains): number {
  const price = order.prixFinal || order.prixEstime || 0;
  return price * (1 - COMMISSION_RATE);
}

export function getCommission(order: OrderForGains): number {
  const price = order.prixFinal || order.prixEstime || 0;
  return price * COMMISSION_RATE;
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
