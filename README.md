# Coliway

<p align="center">
  <img src="assets/logo.png" alt="Coliway Logo" width="200"/>
</p>

<p align="center">
  <strong>Une solution de livraison pour tous</strong>
</p>

<p align="center">
  Plateforme de mise en relation entre clients et livreurs pour la livraison de colis partout en France.
</p>

---

## Fonctionnalites

### Client
- Commande de livraison en quelques clics
- Choix du type de colis (enveloppe, petit, moyen, gros, palette)
- Estimation du prix en temps reel
- Suivi du livreur sur la carte en temps reel
- Chat en direct avec le livreur
- Paiement securise par carte (Stripe)
- Historique des commandes et notation du livreur

### Livreur
- Dashboard des commandes disponibles a proximite
- Accepter/refuser les courses
- Navigation GPS vers le point d'enlevement et de livraison
- Suivi des gains et historique des courses
- Mode disponible/indisponible

### Administration
- Dashboard avec KPIs (chiffre d'affaires, commandes, livreurs actifs)
- Gestion et validation des livreurs
- Configuration de la tarification par type de colis
- Suivi des commandes et paiements
- Gestion des litiges et remboursements

---

## Architecture

```
coliway/
├── mobile/          # Application mobile (React Native + Expo)
├── backend/         # Cloud Functions (Node.js + Firebase)
├── admin/           # Panel d'administration (React + Vite)
├── docs/            # Documentation legale
└── assets/          # Logo et ressources
```

## Stack technique

| Composant | Technologies |
|-----------|-------------|
| **Mobile** | React Native, Expo SDK 52, Expo Router, TypeScript |
| **Backend** | Node.js, Firebase Cloud Functions, Firestore, Firebase Auth |
| **Admin** | React 18, Vite, TypeScript, Recharts |
| **Paiement** | Stripe (PaymentIntents, Webhooks) |
| **Notifications** | Firebase Cloud Messaging (FCM) |
| **Carte** | React Native Maps, Google Places API |

---

## Installation

### Prerequisites
- Node.js 20+
- npm
- Expo CLI (`npm install -g expo-cli`)
- Firebase CLI (`npm install -g firebase-tools`)

### Application mobile

```bash
cd mobile
npm install
npx expo start
```

### Panel d'administration

```bash
cd admin
npm install
npm run dev
```

### Backend (Cloud Functions)

```bash
cd backend/functions
npm install
firebase deploy --only functions
```

---

## Configuration

### Firebase
Le projet utilise Firebase avec les services suivants :
- **Authentication** : Email/mot de passe + Google
- **Firestore** : Base de donnees temps reel
- **Cloud Functions** : API backend (21 fonctions)
- **Storage** : Stockage de fichiers
- **Cloud Messaging** : Notifications push

### Stripe
- Mode test configure avec cles de test
- Webhook pour la confirmation des paiements
- Support des cartes de credit via PaymentIntents

---

## Comptes de test

| Role | Email | Mot de passe |
|------|-------|-------------|
| Client | test@coliway.fr | Test123456 |
| Admin | admin@coliway.fr | Admin123456 |
| Livreur | livreur@coliway.fr | Livreur123456 |

---

## Documentation legale

Les documents suivants sont disponibles dans le dossier `docs/` :

- [Conditions Generales d'Utilisation](docs/CGU.md)
- [Conditions Generales de Vente](docs/CGV.md)
- [Politique de Confidentialite](docs/Politique-Confidentialite.md)
- [Mentions Legales](docs/Mentions-Legales.md)
- [Contrat Livreur](docs/Contrat-Livreur.md)
- [Politique de Cookies](docs/Politique-Cookies.md)
- [Guide de Conformite](docs/Guide-Conformite.md)

---

## Tarification

| Type de colis | Prix de base | Prix/km | Poids max |
|---------------|-------------|---------|-----------|
| Enveloppe | 3.50 EUR | 0.80 EUR | 0.5 kg |
| Petit colis | 5.00 EUR | 1.00 EUR | 5 kg |
| Moyen colis | 8.00 EUR | 1.50 EUR | 15 kg |
| Gros colis | 15.00 EUR | 2.00 EUR | 30 kg |
| Palette | 50.00 EUR | 3.50 EUR | 500 kg |

---

## Licence

Projet prive - Tous droits reserves.
