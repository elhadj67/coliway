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
export const GOOGLE_MAPS_API_KEY = 'AIzaSyBmB58zih7ICTRrycl1bVfB_OybotqKxW4';

// Google Sign-In (Web Client ID from Firebase Console > Authentication > Google provider)
export const GOOGLE_WEB_CLIENT_ID = '553047283159-vc4u3l43451agmapq90q6nscb5d8i8ro.apps.googleusercontent.com';

// API base URL (Cloud Functions)
export const API_BASE_URL = 'https://europe-west1-coliway-app.cloudfunctions.net';

// Colis types
export interface ColisType {
  id: string;
  label: string;
  icon: string;
  poidsMax: number;
  conditions: string[];
  vehiculesCompatibles: string[];
}

// Mapping type de colis → véhicules autorisés
export const COLIS_VEHICULES: Record<string, string[]> = {
  enveloppe: ['velo', 'scooter', 'moto', 'voiture', 'camionnette'],
  petit: ['velo', 'scooter', 'moto', 'voiture', 'camionnette'],
  moyen: ['voiture', 'camionnette'],
  gros: ['camionnette', 'camion'],
  palette: ['camionnette', 'camion'],
};

export const COLIS_TYPES: ColisType[] = [
  {
    id: 'enveloppe',
    label: 'Enveloppe',
    icon: 'mail',
    poidsMax: 0.5,
    vehiculesCompatibles: ['velo', 'scooter', 'moto', 'voiture', 'camionnette'],
    conditions: [
      'Documents, lettres, format A4 max',
      'Poids max : 0,5 kg',
      'Pas de contenu fragile',
    ],
  },
  {
    id: 'petit',
    label: 'Petit Colis',
    icon: 'cube-outline',
    poidsMax: 5,
    vehiculesCompatibles: ['velo', 'scooter', 'moto', 'voiture', 'camionnette'],
    conditions: [
      'Taille : type boite a chaussures',
      'Poids max : 5 kg',
      'Objets fragiles acceptes (signalez-le)',
    ],
  },
  {
    id: 'moyen',
    label: 'Moyen Colis',
    icon: 'cube',
    poidsMax: 15,
    vehiculesCompatibles: ['voiture', 'camionnette'],
    conditions: [
      'Taille : type carton de demenagement petit',
      'Poids max : 15 kg',
      'Emballage solide requis',
      'Vehicule : voiture ou camionnette',
    ],
  },
  {
    id: 'gros',
    label: 'Gros Colis',
    icon: 'archive',
    poidsMax: 30,
    vehiculesCompatibles: ['camionnette', 'camion'],
    conditions: [
      'Taille : type carton de demenagement grand',
      'Poids max : 30 kg',
      'Manutention par le livreur non garantie',
      'Emballage renforce obligatoire',
      'Vehicule : camionnette ou camion',
    ],
  },
  {
    id: 'palette',
    label: 'Palette',
    icon: 'grid',
    poidsMax: 500,
    vehiculesCompatibles: ['camionnette', 'camion'],
    conditions: [
      'Palette standard (120x80 cm)',
      'Poids max : 500 kg',
      'Vehicule : camionnette ou camion',
      'Chargement / dechargement a votre charge',
    ],
  },
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
