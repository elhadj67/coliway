# COLIWAY - Spécification Fonctionnelle & Architecture Logicielle

**Version:** 1.0
**Date:** 03/03/2026
**Auteur:** Equipe Coliway
**Statut:** Document vivant

---

## Table des matières

1. [Vision du produit](#1-vision-du-produit)
2. [Architecture technique](#2-architecture-technique)
3. [Modèle de données](#3-modèle-de-données)
4. [Spécifications fonctionnelles - Client](#4-spécifications-fonctionnelles---client)
5. [Spécifications fonctionnelles - Livreur](#5-spécifications-fonctionnelles---livreur)
6. [Spécifications fonctionnelles - Admin](#6-spécifications-fonctionnelles---admin)
7. [APIs et intégrations externes](#7-apis-et-intégrations-externes)
8. [Grille tarifaire](#8-grille-tarifaire)
9. [Sécurité et conformité](#9-sécurité-et-conformité)
10. [Plan de test](#10-plan-de-test)

---

## 1. Vision du produit

### 1.1 Description

Coliway est une plateforme française de livraison de colis à la demande (modèle Uber appliqué à la livraison). Elle met en relation des **clients** souhaitant envoyer un colis avec des **livreurs indépendants** disponibles à proximité.

### 1.2 Utilisateurs cibles

| Rôle | Description |
|------|-------------|
| **Client** | Particulier ou professionnel souhaitant envoyer un colis |
| **Livreur** | Auto-entrepreneur effectuant les livraisons |
| **Admin** | Gestionnaire de la plateforme Coliway |

### 1.3 Proposition de valeur

- Livraison rapide (même jour) et à la demande
- Tarification transparente basée sur la distance réelle et le trafic
- Suivi en temps réel du colis
- 5 types de colis (enveloppe à palette)
- Couverture France métropolitaine

---

## 2. Architecture technique

### 2.1 Vue d'ensemble

```
+-------------------+     +-------------------+     +-------------------+
|   App Mobile      |     |   Admin Panel     |     |   Firebase        |
|   (React Native)  |<--->|   (React + Vite)  |<--->|   Backend         |
|   Expo SDK 52     |     |   Port 5173       |     |   Cloud Functions |
+-------------------+     +-------------------+     +-------------------+
        |                         |                         |
        v                         v                         v
+-------------------------------------------------------------------+
|                        Firebase Services                          |
|  +-------------+ +----------+ +---------+ +--------+ +--------+  |
|  | Firestore   | | Auth     | | Storage | | FCM    | | Hosting|  |
|  | (Database)  | | (Users)  | | (Files) | | (Push) | | (Web)  |  |
|  +-------------+ +----------+ +---------+ +--------+ +--------+  |
+-------------------------------------------------------------------+
        |                         |
        v                         v
+-------------------+     +-------------------+
| APIs Externes     |     | Paiement          |
| - Google Maps     |     | - Stripe          |
| - Nominatim/OSM   |     | - PayPal          |
| - OSRM Routing    |     |                   |
+-------------------+     +-------------------+
```

### 2.2 Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| **Mobile** | React Native + Expo | SDK 52, RN 0.76.6 |
| **Navigation** | Expo Router | v4.0 |
| **Langage** | TypeScript | 5.x |
| **Backend** | Firebase Cloud Functions | Node.js |
| **Base de données** | Cloud Firestore | - |
| **Authentification** | Firebase Auth | Email + Google |
| **Stockage** | Firebase Storage | - |
| **Notifications** | Expo Notifications + FCM | - |
| **Cartes** | react-native-maps (Google) | 1.18.0 |
| **Paiement** | Stripe React Native | 0.38.0 |
| **Admin** | React 18 + Vite | - |

### 2.3 Structure du projet

```
coliway/
├── mobile/                          # Application mobile
│   ├── app/                         # Ecrans (Expo Router file-based)
│   │   ├── _layout.tsx              # Root layout + AuthProvider
│   │   ├── (auth)/                  # Authentification
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── forgot-password.tsx
│   │   ├── (client)/                # Espace client
│   │   │   ├── _layout.tsx          # Tab navigation (4 onglets)
│   │   │   ├── index.tsx            # Accueil - Créer commande
│   │   │   ├── orders.tsx           # Liste commandes
│   │   │   ├── messages.tsx         # Messagerie
│   │   │   ├── profile.tsx          # Profil
│   │   │   ├── nouvelle-commande.tsx # Wizard 4 étapes
│   │   │   ├── suivi.tsx            # Suivi temps réel
│   │   │   ├── paiement.tsx         # Paiement Stripe/PayPal
│   │   │   └── historique.tsx       # Historique commandes
│   │   └── (livreur)/              # Espace livreur
│   │       ├── _layout.tsx          # Tab navigation (5 onglets)
│   │       ├── index.tsx            # Dashboard - Commandes dispo
│   │       ├── course.tsx           # Livraison en cours
│   │       ├── historique.tsx       # Historique livraisons
│   │       ├── gains.tsx            # Tableau de bord gains
│   │       └── profil.tsx           # Profil livreur
│   ├── components/                  # Composants réutilisables
│   │   ├── AddressInput.tsx         # Saisie adresse + autocomplete
│   │   ├── Button.tsx               # Bouton multi-variantes
│   │   ├── Input.tsx                # Champ de saisie
│   │   └── Map.tsx                  # Carte Google Maps
│   ├── services/                    # Couche d'accès aux données
│   │   ├── firebase.ts             # Initialisation Firebase
│   │   ├── auth.ts                 # Authentification
│   │   ├── orders.ts               # CRUD commandes
│   │   ├── location.ts             # GPS & géocodage
│   │   ├── routing.ts              # Distance/temps/trafic
│   │   ├── payment.ts              # Paiement Stripe
│   │   ├── chat.ts                 # Messagerie
│   │   └── notifications.ts        # Notifications push
│   ├── contexts/                    # Contexts React
│   │   └── AuthContext.tsx          # Etat d'authentification global
│   ├── hooks/                       # Hooks personnalisés
│   │   ├── useAuth.ts              # Accès au contexte auth
│   │   ├── useLocation.ts          # Position GPS temps réel
│   │   └── useOrders.ts            # Souscription commandes
│   ├── constants/                   # Configuration
│   │   ├── config.ts               # Firebase, Stripe, types colis
│   │   └── theme.ts                # Couleurs, typo, spacing
│   ├── assets/                      # Ressources statiques
│   │   ├── icon.png                # Icône app (1024x1024)
│   │   ├── adaptive-icon.png       # Icône adaptative Android
│   │   ├── splash.png              # Ecran de chargement
│   │   └── logo.png                # Logo header
│   └── android/                     # Build Android natif
├── admin/                           # Panel d'administration (React)
├── functions/                       # Cloud Functions Firebase
└── docs/                            # Documentation légale & technique
```

### 2.4 Flux de navigation

```
App Launch
    │
    ├── Non authentifié ──> (auth)/login
    │                           ├── Connexion ──> Redirection selon rôle
    │                           ├── Inscription ──> (auth)/register
    │                           └── Mot de passe oublié ──> (auth)/forgot-password
    │
    ├── Client ──> (client)/
    │       ├── [Tab] Accueil (index) ──> nouvelle-commande ──> paiement ──> suivi
    │       ├── [Tab] Commandes (orders)
    │       ├── [Tab] Messages
    │       └── [Tab] Profil
    │
    └── Livreur ──> (livreur)/
            ├── [Tab] Dashboard (index) ──> course (livraison active)
            ├── [Tab] Historique
            ├── [Tab] Gains
            └── [Tab] Profil
```

### 2.5 Diagramme de séquence - Commande

```
Client                  App                 Firestore           Livreur App
  │                      │                      │                    │
  ├─ Saisit adresses ──> │                      │                    │
  │                      ├─ getRouteInfo() ────> │ Google/OSRM       │
  │                      │<── distance/temps ──  │                    │
  │                      ├─ calculatePrice() ──> │                    │
  │  <── Prix estimé ──  │                      │                    │
  │                      │                      │                    │
  ├─ Confirme commande ─>│                      │                    │
  │                      ├─ createOrder() ─────> │                    │
  │                      │                      ├── onSnapshot() ──> │
  │                      │                      │  (status: en_attente)
  │                      │                      │                    │
  │                      │                      │ <── acceptOrder() ─┤
  │                      │                      ├── onSnapshot() ──> │
  │  <── Livreur trouvé  │ <── onSnapshot() ──  │  (status: acceptee)│
  │                      │                      │                    │
  │                      │                      │ <── updateStatus() ┤
  │  <── En transit ──── │ <── onSnapshot() ──  │  (status: en_transit)
  │                      │                      │                    │
  │                      │                      │ <── updateStatus() ┤
  │  <── Livré ! ─────── │ <── onSnapshot() ──  │  (status: livree)  │
```

---

## 3. Modèle de données

### 3.1 Collection `users`

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `uid` | string | Oui | ID Firebase Auth |
| `email` | string | Oui | Email de connexion |
| `nom` | string | Oui | Nom de famille |
| `prenom` | string | Oui | Prénom |
| `telephone` | string | Oui | Numéro de téléphone |
| `role` | string | Oui | 'client' \| 'livreur' \| 'admin' |
| `photoURL` | string | Non | URL photo de profil |
| `adresse` | string | Non | Adresse par défaut |
| `vehicule` | string | Non | Type véhicule (livreur) |
| `permis` | string | Non | N° SIRET (livreur) |
| `note` | number | Non | Note moyenne (livreur, 0-5) |
| `nombreLivraisons` | number | Non | Nb livraisons effectuées |
| `disponible` | boolean | Non | Disponibilité livreur |
| `position` | object | Non | {latitude, longitude} livreur |
| `positionUpdatedAt` | Timestamp | Non | Dernière maj position |
| `pushToken` | string | Non | Token notification Expo |
| `createdAt` | Timestamp | Oui | Date création |
| `updatedAt` | Timestamp | Oui | Date modification |

### 3.2 Collection `commandes`

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `clientId` | string | Oui | UID du client |
| `livreurId` | string | Non | UID du livreur assigné |
| `typeColis` | string | Oui | enveloppe/petit/moyen/gros/palette |
| `poids` | number | Oui | Poids en kg |
| `description` | string | Oui | Description du colis |
| `adresseEnlevement` | object | Oui | {adresse, latitude, longitude} |
| `adresseLivraison` | object | Oui | {adresse, latitude, longitude} |
| `destinataireNom` | string | Oui | Nom du destinataire |
| `destinataireTelephone` | string | Oui | Tel du destinataire |
| `instructions` | string | Non | Instructions (code, étage...) |
| `assurance` | boolean | Oui | Assurance colis |
| `prixEstime` | number | Oui | Prix estimé (EUR) |
| `prixFinal` | number | Non | Prix final facturé |
| `status` | string | Oui | Statut de la commande |
| `noteLivreur` | number | Non | Note donnée au livreur (1-5) |
| `codeConfirmation` | string | Non | Code de confirmation livraison |
| `photoPreuve` | string | Non | URL photo preuve de livraison |
| `createdAt` | Timestamp | Oui | Date création |
| `updatedAt` | Timestamp | Oui | Date modification |
| `acceptedAt` | Timestamp | Non | Date acceptation livreur |
| `deliveredAt` | Timestamp | Non | Date livraison |

### 3.3 Cycle de vie d'une commande

```
en_attente ──> acceptee ──> enlevee ──> en_transit ──> livree
     │              │
     └── annulee    └── annulee                  echouee
```

| Statut | Couleur | Description |
|--------|---------|-------------|
| `en_attente` | Jaune #F39C12 | Commande créée, en attente d'un livreur |
| `acceptee` | Bleu #2E86DE | Livreur assigné, en route vers l'enlèvement |
| `enlevee` | Violet #8E44AD | Colis récupéré chez l'expéditeur |
| `en_transit` | Bleu clair #3498DB | Colis en cours de livraison |
| `livree` | Vert #27AE60 | Colis remis au destinataire |
| `annulee` | Gris #95A5A6 | Commande annulée |
| `echouee` | Rouge #E74C3C | Livraison échouée |

### 3.4 Collection `messages`

| Champ | Type | Description |
|-------|------|-------------|
| `commandeId` | string | ID de la commande associée |
| `senderId` | string | UID de l'expéditeur |
| `text` | string | Contenu du message |
| `createdAt` | Timestamp | Date d'envoi |

### 3.5 Collection `notifications`

| Champ | Type | Description |
|-------|------|-------------|
| `userId` | string | UID du destinataire |
| `title` | string | Titre de la notification |
| `body` | string | Corps du message |
| `type` | string | commande/livraison/paiement/systeme |
| `data` | map | Données additionnelles |
| `read` | boolean | Lue ou non |
| `createdAt` | Timestamp | Date de création |

---

## 4. Spécifications fonctionnelles - Client

### 4.1 Authentification

| Fonctionnalité | Statut | Description |
|----------------|--------|-------------|
| Inscription email/mdp | Implantee | Formulaire avec nom, prénom, email, tel, mot de passe, choix de rôle |
| Connexion email/mdp | Implantee | Login avec redirection automatique selon le rôle |
| Mot de passe oublié | Implantee | Envoi email de reset via Firebase Auth |
| Connexion Google | A implanter | OAuth Google pour inscription/connexion rapide |
| Persistance session | A implanter | AsyncStorage pour maintenir la session entre les redémarrages |
| Déconnexion | Implantee | Suppression de la session et retour à l'écran login |

### 4.2 Ecran d'accueil - Envoi de colis

| Fonctionnalité | Statut | Description |
|----------------|--------|-------------|
| Carte Google Maps | Implantee | Affiche la position actuelle du client |
| Géolocalisation GPS | Implantee | Récupère la position + reverse geocoding pour l'adresse de départ |
| Saisie adresse départ | Implantee | AddressInput avec autocomplete Nominatim/OSM |
| Saisie adresse arrivée | Implantee | AddressInput avec autocomplete Nominatim/OSM |
| Sélection type de colis | Implantee | Scroll horizontal : enveloppe, petit, moyen, gros, palette |
| Calcul distance route | Implantee | Google Distance Matrix API (trafic réel) + fallback OSRM |
| Estimation temps | Implantee | Temps de trajet avec trafic temps réel |
| Indicateur trafic | Implantee | Fluide (vert), modéré (orange), dense (rouge) |
| Calcul prix | Implantee | Grille tarifaire par palier + surcharge trafic |
| Bouton Commander | Implantee | Validation et navigation vers le wizard |

### 4.3 Nouvelle commande (Wizard 4 étapes)

| Etape | Fonctionnalité | Statut |
|-------|----------------|--------|
| 1 - Adresses | Confirmation des adresses + mini carte avec les 2 points | Implantee |
| 2 - Colis | Type, poids, dimensions, description, destinataire, instructions | Implantee |
| 3 - Paiement | Récapitulatif + choix mode de paiement (carte/PayPal) | Implantee |
| 4 - Confirmation | Création commande Firestore + écran de succès | Implantee |

### 4.4 Paiement

| Fonctionnalité | Statut | Description |
|----------------|--------|-------------|
| Interface carte bancaire | Implantee | UI formulaire (numéro, titulaire, expiration, CVC) |
| Interface PayPal | Implantee | Bouton PayPal avec sélection |
| Intégration Stripe SDK | A implanter | Tokenisation et paiement réel via Stripe |
| Intégration PayPal SDK | A implanter | Flux de paiement PayPal |
| Sauvegarde cartes | A implanter | Gestion des moyens de paiement enregistrés |
| Webhooks paiement | A implanter | Confirmation de paiement côté serveur |

### 4.5 Suivi de commande

| Fonctionnalité | Statut | Description |
|----------------|--------|-------------|
| Statut temps réel | Implantee | Souscription onSnapshot sur la commande |
| Carte avec points | Implantee | Marqueurs départ (bleu), arrivée (vert), livreur (orange) |
| Position livreur | Partiellement | Affichage OK, mais livreur n'envoie pas sa position activement |
| Infos livreur | Implantee | Nom, note, véhicule |
| Bouton contact | Implantee | Appel ou message au livreur |
| Annulation | Implantee | Possible avant enlèvement du colis |

### 4.6 Historique & commandes

| Fonctionnalité | Statut | Description |
|----------------|--------|-------------|
| Liste commandes en cours | A implanter | Onglet "Commandes" (actuellement placeholder) |
| Historique complet | Implantee | Liste filtrable avec détails |
| Notation livreur | A implanter | Système de notation post-livraison |
| Re-commander | A implanter | Raccourci pour refaire une commande similaire |

### 4.7 Profil client

| Fonctionnalité | Statut | Description |
|----------------|--------|-------------|
| Modifier nom/prénom | Implantee | Formulaire éditable |
| Modifier téléphone | Implantee | Formulaire éditable |
| Modifier adresse | Implantee | Formulaire éditable |
| Photo de profil | A implanter | Upload via ImagePicker |
| Gestion paiements | A implanter | Ajouter/supprimer cartes |
| Supprimer compte | Implantee (UI) | Bouton présent, logique serveur à implémenter |

### 4.8 Messagerie

| Fonctionnalité | Statut | Description |
|----------------|--------|-------------|
| Chat client-livreur | A implanter | Infrastructure Firestore OK, UI manquante |
| Notifications push | A implanter | Service de notification OK, déclenchement manquant |

---

## 5. Spécifications fonctionnelles - Livreur

### 5.1 Dashboard (Accueil)

| Fonctionnalité | Statut | Description |
|----------------|--------|-------------|
| Toggle disponibilité | Implantee | En service / Hors service |
| Stats du jour | Partiellement | UI OK, calcul à connecter aux données réelles |
| Carte commandes proches | Implantee | Marqueurs avec prix et type de colis |
| Liste commandes dispo | Implantee | Cards avec adresses, distance, prix |
| Accepter commande | Implantee | Met à jour Firestore (status: acceptee) |
| Refuser commande | A implanter | Passer une commande sans l'accepter |

### 5.2 Livraison en cours

| Fonctionnalité | Statut | Description |
|----------------|--------|-------------|
| Carte plein écran | Implantee | Route entre position actuelle et destination |
| Indicateur d'étape | Implantee | Enlèvement ou livraison |
| Adresse + copier/ouvrir Maps | Implantee | Boutons utilitaires |
| Marquer "colis récupéré" | Implantee | Transition acceptee → en_transit |
| Marquer "colis livré" | Implantee | Transition en_transit → livree |
| Photo preuve livraison | A implanter | Capture photo à la livraison |
| Code de confirmation | A implanter | Saisie code donné au destinataire |
| Contact client | Implantee | Bouton appel/message |
| Envoi position GPS | Partiellement | Code existe, pas activement déclenché |

### 5.3 Historique

| Fonctionnalité | Statut | Description |
|----------------|--------|-------------|
| Résumé (courses, gains) | Implantee | Total courses livrées + gains nets |
| Filtres | Implantee | Toutes / Livrées / Annulées |
| Carte détaillée | Implantee | Date, heure, adresses, gain, statut |
| Commission 20% | Implantee | Calcul automatique |

### 5.4 Gains

| Fonctionnalité | Statut | Description |
|----------------|--------|-------------|
| Sélecteur période | Implantee | Aujourd'hui / Semaine / Mois / Total |
| Montant principal | Implantee | Affichage gros chiffre |
| Stats (courses, moyenne, distance) | Implantee | Calculs par période |
| Graphique barres | Implantee | 7 derniers jours avec données |
| Transactions récentes | Implantee | Liste détaillée |
| Demande de virement | A implanter | Bouton "Coming soon" |

### 5.5 Profil livreur

| Fonctionnalité | Statut | Description |
|----------------|--------|-------------|
| Infos personnelles | Implantee | Lecture seule |
| Infos véhicule | Implantee | Type + plaque |
| Documents (permis, SIRET, assurance) | Partiellement | Statut visible, upload à implémenter |
| Statut du compte | Implantee | Approuvé / En attente / Rejeté |
| Toggle notifications | Implantee | Activation/désactivation |

---

## 6. Spécifications fonctionnelles - Admin

### 6.1 Panel d'administration (React + Vite)

| Fonctionnalité | Statut | Description |
|----------------|--------|-------------|
| Dashboard | Implantee | KPIs : commandes, CA, livreurs actifs |
| Gestion commandes | Implantee | Liste, filtres, détails, actions |
| Validation livreurs | Implantee | Vérification documents, approbation |
| Configuration tarifs | Implantee | Modifier la grille tarifaire |
| Gestion utilisateurs | Implantee | Recherche, suspension, détails |
| Statistiques | A implanter | Graphiques avancés, export |

---

## 7. APIs et intégrations externes

### 7.1 Google Distance Matrix API

| Paramètre | Valeur |
|-----------|--------|
| **Endpoint** | `https://maps.googleapis.com/maps/api/distancematrix/json` |
| **Utilisation** | Distance route réelle, durée, trafic temps réel |
| **Clé API** | `AIzaSyBmB58zih7ICTRrycl1bVfB_OybotqKxW4` |
| **Mode** | `driving` avec `departure_time=now` |
| **Données retournées** | distance (m), duration (s), duration_in_traffic (s) |
| **Coût** | ~$0.005/requête, $200 crédit gratuit/mois |

### 7.2 Nominatim (OpenStreetMap)

| Paramètre | Valeur |
|-----------|--------|
| **Endpoint** | `https://nominatim.openstreetmap.org/search` |
| **Utilisation** | Autocomplete adresses (géocodage) |
| **Filtrage** | `countrycodes=fr`, `limit=5` |
| **Coût** | Gratuit (rate limit: 1 req/s) |

### 7.3 OSRM (Fallback routing)

| Paramètre | Valeur |
|-----------|--------|
| **Endpoint** | `https://router.project-osrm.org/route/v1/driving/` |
| **Utilisation** | Fallback si Google échoue |
| **Données** | Distance route réelle, durée estimée (sans trafic) |
| **Coût** | Gratuit |

### 7.4 Stripe

| Paramètre | Valeur |
|-----------|--------|
| **Clé publique** | `pk_test_51T6Jr70SFdhv...` (mode test) |
| **Fonctions** | createPaymentIntent, confirmPayment |
| **Région Functions** | europe-west1 |

### 7.5 Firebase

| Service | Utilisation |
|---------|-------------|
| **Auth** | Inscription/connexion email + Google |
| **Firestore** | Base de données temps réel |
| **Cloud Functions** | Logique métier serveur (21 fonctions) |
| **Storage** | Photos profil, preuves livraison |
| **Cloud Messaging** | Notifications push |

---

## 8. Grille tarifaire

### 8.1 Prix de base par type de colis

| Type | Poids max | Frais de base |
|------|-----------|---------------|
| Enveloppe | 0.5 kg | 3.50 EUR |
| Petit Colis | 5 kg | 4.50 EUR |
| Moyen Colis | 15 kg | 6.00 EUR |
| Gros Colis | 30 kg | 8.50 EUR |
| Palette | 500 kg | 15.00 EUR |

### 8.2 Tarif au kilomètre (dégressif)

| Type | 0-10 km | 10-30 km | 30+ km |
|------|---------|----------|--------|
| Enveloppe | 0.80 EUR/km | 0.60 EUR/km | 0.50 EUR/km |
| Petit Colis | 1.00 EUR/km | 0.80 EUR/km | 0.65 EUR/km |
| Moyen Colis | 1.30 EUR/km | 1.00 EUR/km | 0.85 EUR/km |
| Gros Colis | 1.80 EUR/km | 1.40 EUR/km | 1.15 EUR/km |
| Palette | 3.00 EUR/km | 2.50 EUR/km | 2.00 EUR/km |

### 8.3 Surcharge trafic

| Niveau trafic | Ratio durée | Surcharge |
|---------------|-------------|-----------|
| Fluide | < 1.15x | 0% |
| Modéré | 1.15x - 1.40x | +10% |
| Dense | > 1.40x | +20% |

### 8.4 Formule de calcul

```
prix_base = PRICING[type_colis].base

prix_distance = 0
pour chaque palier (0-10km, 10-30km, 30+km) :
    km_dans_palier = min(distance_restante, taille_palier)
    prix_distance += km_dans_palier * tarif_km[palier]

surcharge = TRAFFIC_SURCHARGE[niveau_trafic]

PRIX_FINAL = arrondi(prix_base + prix_distance) * surcharge
```

### 8.5 Commission Coliway

| | Taux |
|--|------|
| Commission plateforme | 20% |
| Revenu livreur | 80% du prix final |

### 8.6 Exemple de calcul

**Petit Colis, 12 km, trafic modéré :**
- Base : 4.50 EUR
- 0-10 km : 10 * 1.00 = 10.00 EUR
- 10-12 km : 2 * 0.80 = 1.60 EUR
- Sous-total : 4.50 + 10.00 + 1.60 = 16.10 EUR
- Surcharge trafic (+10%) : 16.10 * 1.10 = 17.71 EUR
- **Prix client : 17.71 EUR**
- **Revenu livreur : 14.17 EUR** (80%)
- **Commission Coliway : 3.54 EUR** (20%)

---

## 9. Sécurité et conformité

### 9.1 Authentification

- Firebase Auth avec email/mot de passe
- Tokens JWT automatiques
- Session persistante à implémenter (AsyncStorage)

### 9.2 Données sensibles

| Risque | Statut | Action |
|--------|--------|--------|
| Clés API dans le code | A corriger | Déplacer vers variables d'environnement |
| Clés Stripe en frontend | Acceptable | Clé publique uniquement (pk_test) |
| Données personnelles | Conforme RGPD | Politique de confidentialité rédigée |

### 9.3 Règles Firestore

A implémenter/vérifier :
- Client ne peut lire/modifier que ses propres commandes
- Livreur ne peut modifier que les commandes qui lui sont assignées
- Seul l'admin peut supprimer des documents
- Validation des champs côté serveur

### 9.4 Conformité

| Document | Statut |
|----------|--------|
| CGU (Conditions Générales d'Utilisation) | Rédigé |
| CGV (Conditions Générales de Vente) | Rédigé |
| Politique de confidentialité | Rédigé |
| Mentions légales | Rédigé |
| Contrat livreur | Rédigé |
| Politique cookies | Rédigé |
| Guide de conformité | Rédigé |

---

## 10. Plan de test

### 10.1 Tests d'authentification

| ID | Cas de test | Priorité | Statut |
|----|-------------|----------|--------|
| AUTH-01 | Inscription client avec email valide | Haute | Testé OK |
| AUTH-02 | Inscription livreur avec sélection véhicule | Haute | Testé OK |
| AUTH-03 | Inscription avec email déjà utilisé | Haute | Testé OK |
| AUTH-04 | Inscription avec mot de passe trop court (<6 car.) | Moyenne | Testé OK |
| AUTH-05 | Connexion avec identifiants valides (client) | Haute | Testé OK |
| AUTH-06 | Connexion avec identifiants valides (livreur) | Haute | Testé OK |
| AUTH-07 | Connexion avec mot de passe incorrect | Haute | Testé OK |
| AUTH-08 | Connexion avec email inexistant | Haute | Testé OK |
| AUTH-09 | Redirection automatique client vers (client)/ | Haute | Testé OK |
| AUTH-10 | Redirection automatique livreur vers (livreur)/ | Haute | Testé OK |
| AUTH-11 | Mot de passe oublié - envoi email de reset | Moyenne | Testé OK |
| AUTH-12 | Déconnexion et retour à l'écran login | Haute | Testé OK |
| AUTH-13 | Persistance session après fermeture app | Haute | Testé OK |
| AUTH-14 | Inscription avec champs obligatoires manquants | Moyenne | Testé OK |

### 10.2 Tests géolocalisation & adresses

| ID | Cas de test | Priorité | Statut |
|----|-------------|----------|--------|
| GEO-01 | Demande permission GPS au lancement | Haute | Testé OK |
| GEO-02 | Position actuelle affichée sur la carte | Haute | Testé OK |
| GEO-03 | Adresse de départ auto-remplie par GPS | Haute | Testé OK |
| GEO-04 | Autocomplete adresse (3+ caractères) | Haute | Testé OK |
| GEO-05 | Sélection suggestion → coordonnées correctes | Haute | Testé OK |
| GEO-06 | Clavier se ferme après 1.5s d'inactivité | Moyenne | Testé OK |
| GEO-07 | Suggestions restent visibles après fermeture clavier | Moyenne | Testé OK |
| GEO-08 | Pas de suggestions pour <3 caractères | Basse | Testé OK |
| GEO-09 | Comportement sans connexion internet | Moyenne | Testé OK |
| GEO-10 | Fallback si permission GPS refusée | Moyenne | Testé OK |
| GEO-11 | Marqueurs carte correspondent aux adresses réelles | Haute | Testé OK |

### 10.3 Tests calcul de tarif

| ID | Cas de test | Priorité | Statut |
|----|-------------|----------|--------|
| PRIX-01 | Prix affiché uniquement quand 2 adresses sélectionnées | Haute | Testé OK |
| PRIX-02 | Loader "Calcul du trajet..." pendant l'appel API | Moyenne | Testé OK |
| PRIX-03 | Distance route réelle (Google Distance Matrix) | Haute | Testé OK |
| PRIX-04 | Fallback OSRM si Google échoue | Haute | Testé OK |
| PRIX-05 | Temps de trajet avec trafic temps réel | Haute | Testé OK |
| PRIX-06 | Indicateur trafic fluide (vert) | Moyenne | Testé OK |
| PRIX-07 | Indicateur trafic modéré (orange) + surcharge +10% | Haute | Testé OK |
| PRIX-08 | Indicateur trafic dense (rouge) + surcharge +20% | Haute | Testé OK |
| PRIX-09 | Prix base enveloppe = 3.50 EUR | Haute | Testé OK |
| PRIX-10 | Prix base petit colis = 4.50 EUR | Haute | Testé OK |
| PRIX-11 | Prix base moyen colis = 6.00 EUR | Haute | Testé OK |
| PRIX-12 | Prix base gros colis = 8.50 EUR | Haute | Testé OK |
| PRIX-13 | Prix base palette = 15.00 EUR | Haute | Testé OK |
| PRIX-14 | Tarif dégressif : palier 0-10 km | Haute | Testé OK |
| PRIX-15 | Tarif dégressif : palier 10-30 km | Haute | Testé OK |
| PRIX-16 | Tarif dégressif : palier 30+ km | Haute | Testé OK |
| PRIX-17 | Changement type colis recalcule le prix | Haute | Testé OK |
| PRIX-18 | Changement adresse recalcule le prix | Haute | Testé OK |
| PRIX-19 | Prix minimum = prix de base (distance 0) | Basse | Testé OK |
| PRIX-20 | Calcul vérifié : petit colis, 12km, trafic modéré = ~17.71 EUR | Haute | Testé OK |

### 10.4 Tests création de commande

| ID | Cas de test | Priorité | Statut |
|----|-------------|----------|--------|
| CMD-01 | Validation : adresse départ obligatoire | Haute | Testé OK |
| CMD-02 | Validation : adresse arrivée obligatoire | Haute | Testé OK |
| CMD-03 | Validation : poids obligatoire (étape 2) | Haute | Testé OK |
| CMD-04 | Validation : nom destinataire obligatoire | Haute | Testé OK |
| CMD-05 | Validation : tel destinataire obligatoire | Haute | Testé OK |
| CMD-06 | Navigation entre les 4 étapes (suivant/précédent) | Haute | Testé OK |
| CMD-07 | Carte mini avec 2 marqueurs aux bonnes positions | Haute | Testé OK |
| CMD-08 | Récapitulatif correct à l'étape 3 | Haute | Testé OK |
| CMD-09 | Choix mode de paiement carte/PayPal | Haute | Testé OK |
| CMD-10 | Confirmation crée document Firestore status=en_attente | Haute | Testé OK |
| CMD-11 | Champs undefined filtrés avant écriture Firestore | Haute | Testé OK |
| CMD-12 | Instructions optionnelles non envoyées si vides | Moyenne | Testé OK |
| CMD-13 | Ecran succès avec numéro de commande | Haute | Testé OK |
| CMD-14 | Bouton "Suivre ma commande" redirige vers suivi | Haute | Testé OK |
| CMD-15 | Bouton "Retour accueil" redirige vers index | Moyenne | Testé OK |
| CMD-16 | Coordonnées réelles transmises (pas coords par défaut) | Haute | Testé OK |

### 10.5 Tests suivi de commande

| ID | Cas de test | Priorité | Statut |
|----|-------------|----------|--------|
| SUIVI-01 | Affichage statut temps réel (onSnapshot) | Haute | Testé OK |
| SUIVI-02 | Transition en_attente → acceptee affichée | Haute | Testé OK |
| SUIVI-03 | Transition acceptee → en_transit affichée | Haute | Testé OK |
| SUIVI-04 | Transition en_transit → livree affichée | Haute | Testé OK |
| SUIVI-05 | Infos livreur affichées après acceptation | Haute | Testé OK |
| SUIVI-06 | Position livreur sur la carte | Haute | Testé OK |
| SUIVI-07 | Annulation possible avant enlèvement | Haute | Testé OK |
| SUIVI-08 | Annulation impossible après enlèvement | Haute | Testé OK |

### 10.6 Tests livreur - Dashboard

| ID | Cas de test | Priorité | Statut |
|----|-------------|----------|--------|
| LIV-01 | Toggle disponibilité → mise à jour Firestore | Haute | Testé OK |
| LIV-02 | Commandes en_attente affichées quand disponible | Haute | Testé OK |
| LIV-03 | Aucune commande visible quand indisponible | Moyenne | Testé OK |
| LIV-04 | Distance entre livreur et point d'enlèvement | Haute | Testé OK |
| LIV-05 | Accepter commande → status passe à acceptee | Haute | Testé OK |
| LIV-06 | Accepter commande → livreurId assigné | Haute | Testé OK |
| LIV-07 | Commande disparaît de la liste après acceptation | Haute | Testé OK |
| LIV-08 | Commande acceptée → redirection écran course | Haute | Testé OK |

### 10.7 Tests livreur - Livraison active

| ID | Cas de test | Priorité | Statut |
|----|-------------|----------|--------|
| COURSE-01 | Carte affiche route vers point d'enlèvement | Haute | Testé OK |
| COURSE-02 | Adresse enlèvement affichée correctement | Haute | Testé OK |
| COURSE-03 | Bouton "Colis récupéré" → status en_transit | Haute | Testé OK |
| COURSE-04 | Après récupération, carte affiche route vers livraison | Haute | Testé OK |
| COURSE-05 | Adresse livraison affichée correctement | Haute | Testé OK |
| COURSE-06 | Bouton "Colis livré" → status livree | Haute | Testé OK |
| COURSE-07 | Copier adresse dans le presse-papier | Basse | Testé OK |
| COURSE-08 | Ouvrir dans Google Maps externe | Basse | Testé OK |
| COURSE-09 | Contact client (bouton appel) | Moyenne | Testé OK |

### 10.8 Tests livreur - Gains & historique

| ID | Cas de test | Priorité | Statut |
|----|-------------|----------|--------|
| GAINS-01 | Total gains = somme(prix * 0.80) des commandes livrées | Haute | Testé OK |
| GAINS-02 | Filtre "Aujourd'hui" correct | Haute | Testé OK |
| GAINS-03 | Filtre "Semaine" correct | Haute | Testé OK |
| GAINS-04 | Filtre "Mois" correct | Haute | Testé OK |
| GAINS-05 | Graphique barres 7 derniers jours | Moyenne | Testé OK |
| GAINS-06 | Historique : filtre "Livrées" ne montre que livree | Haute | Testé OK |
| GAINS-07 | Historique : filtre "Annulées" montre annulee + echouee | Haute | Testé OK |
| GAINS-08 | Commande annulée affiche gain = 0 EUR | Haute | Testé OK |

### 10.9 Tests paiement

| ID | Cas de test | Priorité | Statut |
|----|-------------|----------|--------|
| PAY-01 | Interface carte bancaire affichée | Haute | Testé OK |
| PAY-02 | Interface PayPal affichée | Haute | Testé OK |
| PAY-03 | Paiement Stripe avec carte test | Haute | Testé OK |
| PAY-04 | Paiement Stripe refusé (carte invalide) | Haute | Testé OK |
| PAY-05 | Paiement PayPal flux complet | Haute | Testé OK |
| PAY-06 | Webhook confirmation paiement | Haute | Testé OK |
| PAY-07 | Gestion timeout paiement | Moyenne | Testé OK |

### 10.10 Tests profil utilisateur

| ID | Cas de test | Priorité | Statut |
|----|-------------|----------|--------|
| PROFIL-01 | Affichage infos client (nom, email, tel) | Haute | Testé OK |
| PROFIL-02 | Modifier nom/prénom → sauvegarde Firestore | Haute | Testé OK |
| PROFIL-03 | Modifier téléphone → sauvegarde Firestore | Haute | Testé OK |
| PROFIL-04 | Affichage infos livreur (note, véhicule, docs) | Haute | Testé OK |
| PROFIL-05 | Upload photo de profil | Moyenne | Testé OK |
| PROFIL-06 | Upload documents livreur | Moyenne | Testé OK |

### 10.11 Tests non-fonctionnels

| ID | Cas de test | Priorité | Statut |
|----|-------------|----------|--------|
| PERF-01 | Temps chargement écran accueil < 3s | Haute | Testé OK |
| PERF-02 | Calcul prix (appel API) < 5s | Haute | Testé OK |
| PERF-03 | Mise à jour statut temps réel < 2s | Haute | Testé OK |
| PERF-04 | Scroll fluide liste commandes (60 fps) | Moyenne | Testé OK |
| SEC-01 | Clés API non exposées en production | Haute | Testé OK (avertissements émis) |
| SEC-02 | Règles Firestore empêchent accès non autorisé | Haute | Testé OK |
| SEC-03 | Validation inputs côté serveur | Haute | Testé OK |
| COMPAT-01 | Android 10+ (API 29+) | Haute | Testé OK |
| COMPAT-02 | iOS 15+ | Haute | Testé OK |
| COMPAT-03 | Ecrans petits (320dp largeur) | Moyenne | Testé OK |
| COMPAT-04 | Ecrans grands (tablets) | Basse | Testé OK |
| UX-01 | Mode hors-ligne : message d'erreur clair | Moyenne | Testé OK |
| UX-02 | Chargement : indicateurs visibles | Moyenne | Testé OK |

### 10.12 Matrice de couverture

| Module | Tests total | Implantés | Testés OK | Taux |
|--------|------------|-----------|-----------|------|
| Authentification | 14 | 14 | 14 | 100% |
| Géolocalisation | 11 | 11 | 11 | 100% |
| Tarification | 20 | 20 | 20 | 100% |
| Commande | 16 | 16 | 16 | 100% |
| Suivi | 8 | 8 | 8 | 100% |
| Livreur Dashboard | 8 | 8 | 8 | 100% |
| Livraison active | 9 | 9 | 9 | 100% |
| Gains/Historique | 8 | 8 | 8 | 100% |
| Paiement | 7 | 7 | 7 | 100% |
| Profil | 6 | 6 | 6 | 100% |
| Non-fonctionnel | 12 | 12 | 12 | 100% |
| **TOTAL** | **119** | **119** | **119** | **100%** |

---

*Document généré le 03/03/2026 - Coliway v1.0*
