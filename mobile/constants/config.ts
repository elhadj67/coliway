// Firebase configuration
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCgdQX7WfDvq-0vEsUExaGA9adljhnqx1o',
  authDomain: 'coliway-app.firebaseapp.com',
  projectId: 'coliway-app',
  storageBucket: 'coliway-app.firebasestorage.app',
  messagingSenderId: '553047283159',
  appId: '1:553047283159:web:424da47ae6b105a6722792',
} as const;

// Stripe configuration
export const STRIPE_PUBLISHABLE_KEY = 'pk_test_51T6Jr70SFdhv4iZ89AvamlfGYTZgDo6oiEp00wHgmnOx5RYokYBIdYSZ0VhLgl3tsY4SPF9EGtxVXyqy3KpiqHCB00hahnQNUT';

// Google Maps configuration
export const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';

// API base URL (Cloud Functions)
export const API_BASE_URL = 'https://europe-west1-coliway-app.cloudfunctions.net';

// Colis types
export interface ColisType {
  id: string;
  label: string;
  icon: string;
  poidsMax: number;
}

export const COLIS_TYPES: ColisType[] = [
  { id: 'enveloppe', label: 'Enveloppe', icon: 'mail', poidsMax: 0.5 },
  { id: 'petit', label: 'Petit Colis', icon: 'cube-outline', poidsMax: 5 },
  { id: 'moyen', label: 'Moyen Colis', icon: 'cube', poidsMax: 15 },
  { id: 'gros', label: 'Gros Colis', icon: 'archive', poidsMax: 30 },
  { id: 'palette', label: 'Palette', icon: 'grid', poidsMax: 500 },
];

// Order status configuration
export type OrderStatus =
  | 'en_attente'
  | 'acceptee'
  | 'enlevee'
  | 'en_transit'
  | 'livree'
  | 'annulee'
  | 'echouee';

export interface OrderStatusConfig {
  label: string;
  color: string;
}

export const ORDER_STATUS: Record<OrderStatus, OrderStatusConfig> = {
  en_attente: { label: 'En attente', color: '#F39C12' },
  acceptee: { label: 'Accept\u00e9e', color: '#2E86DE' },
  enlevee: { label: 'Enlev\u00e9e', color: '#8E44AD' },
  en_transit: { label: 'En transit', color: '#3498DB' },
  livree: { label: 'Livr\u00e9e', color: '#27AE60' },
  annulee: { label: 'Annul\u00e9e', color: '#95A5A6' },
  echouee: { label: '\u00c9chou\u00e9e', color: '#E74C3C' },
} as const;

// User roles
export type UserRole = 'client' | 'livreur' | 'admin';

// Default map region (Paris, France)
export const DEFAULT_MAP_REGION = {
  latitude: 48.8566,
  longitude: 2.3522,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
} as const;
