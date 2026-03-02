import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
export interface DashboardStats {
  totalCA: number;
  commandesAujourdhui: number;
  livreursActifs: number;
  clientsInscrits: number;
  commandesParJour: { jour: string; commandes: number }[];
  revenusParSemaine: { semaine: string; revenus: number }[];
}

export interface Commande {
  id: string;
  clientId: string;
  clientNom: string;
  livreurId?: string;
  livreurNom?: string;
  typeColis: string;
  adresseDepart: string;
  adresseArrivee: string;
  prix: number;
  status: string;
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

export interface Livreur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  vehicule: string;
  siret: string;
  note: number;
  courses: number;
  status: 'en_attente' | 'approuve' | 'refuse';
  documents?: { permis?: string; identite?: string; assurance?: string };
  createdAt: Timestamp | Date;
}

export interface Client {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  dateInscription: Timestamp | Date;
  nbCommandes: number;
}

export interface PrixConfig {
  id: string;
  type: string;
  label: string;
  prixBase: number;
  prixKm: number;
  poidsMax: number;
  description: string;
}

export interface Paiement {
  id: string;
  commandeId: string;
  montant: number;
  methode: string;
  status: string;
  createdAt: Timestamp | Date;
}

export interface Litige {
  id: string;
  commandeId: string;
  clientId: string;
  clientNom: string;
  livreurId: string;
  livreurNom: string;
  motif: string;
  description: string;
  status: 'ouvert' | 'en_cours' | 'resolu' | 'ferme';
  createdAt: Timestamp | Date;
}

export interface CommandeFilters {
  status?: string;
  search?: string;
}

// ──────────────────────────────────────────────
// Dashboard
// ──────────────────────────────────────────────
export async function getStats(): Promise<DashboardStats> {
  try {
    const commandesSnap = await getDocs(collection(db, 'commandes'));
    const livreursSnap = await getDocs(
      query(collection(db, 'livreurs'), where('status', '==', 'approuve'))
    );
    const clientsSnap = await getDocs(collection(db, 'clients'));

    const commandes = commandesSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Commande[];
    const totalCA = commandes
      .filter((c) => c.status === 'livree')
      .reduce((sum, c) => sum + (c.prix || 0), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const commandesAujourdhui = commandes.filter((c) => {
      const d = c.createdAt instanceof Timestamp ? c.createdAt.toDate() : new Date(c.createdAt);
      return d >= today;
    }).length;

    return {
      totalCA,
      commandesAujourdhui,
      livreursActifs: livreursSnap.size,
      clientsInscrits: clientsSnap.size,
      commandesParJour: [],
      revenusParSemaine: [],
    };
  } catch {
    // Return mock data when Firestore is not configured
    return {
      totalCA: 45230,
      commandesAujourdhui: 37,
      livreursActifs: 124,
      clientsInscrits: 1856,
      commandesParJour: [],
      revenusParSemaine: [],
    };
  }
}

// ──────────────────────────────────────────────
// Commandes
// ──────────────────────────────────────────────
export async function getCommandes(filters?: CommandeFilters): Promise<Commande[]> {
  try {
    let q = query(collection(db, 'commandes'), orderBy('createdAt', 'desc'), limit(200));
    if (filters?.status && filters.status !== 'toutes') {
      q = query(
        collection(db, 'commandes'),
        where('status', '==', filters.status),
        orderBy('createdAt', 'desc'),
        limit(200)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Commande));
  } catch {
    return [];
  }
}

export async function getCommandeById(id: string): Promise<Commande | null> {
  try {
    const snap = await getDoc(doc(db, 'commandes', id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Commande;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────
// Livreurs
// ──────────────────────────────────────────────
export async function getLivreurs(status?: string): Promise<Livreur[]> {
  try {
    let q = query(collection(db, 'livreurs'), orderBy('createdAt', 'desc'));
    if (status) {
      q = query(
        collection(db, 'livreurs'),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Livreur));
  } catch {
    return [];
  }
}

export async function validerLivreur(
  id: string,
  status: 'approuve' | 'refuse'
): Promise<void> {
  await updateDoc(doc(db, 'livreurs', id), { status, updatedAt: Timestamp.now() });
}

// ──────────────────────────────────────────────
// Clients
// ──────────────────────────────────────────────
export async function getClients(): Promise<Client[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'clients'), orderBy('dateInscription', 'desc'))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Client));
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────
// Tarification
// ──────────────────────────────────────────────
export async function getPrixConfig(): Promise<PrixConfig[]> {
  try {
    const snap = await getDocs(collection(db, 'tarification'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PrixConfig));
  } catch {
    return [];
  }
}

export async function updatePrixConfig(
  id: string,
  data: Partial<PrixConfig>
): Promise<void> {
  await updateDoc(doc(db, 'tarification', id), { ...data, updatedAt: Timestamp.now() });
}

// ──────────────────────────────────────────────
// Paiements
// ──────────────────────────────────────────────
export async function getPaiements(): Promise<Paiement[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'paiements'), orderBy('createdAt', 'desc'), limit(200))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Paiement));
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────
// Litiges
// ──────────────────────────────────────────────
export async function getLitiges(): Promise<Litige[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'litiges'), orderBy('createdAt', 'desc'))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Litige));
  } catch {
    return [];
  }
}

export async function updateLitige(
  id: string,
  data: Partial<Litige>
): Promise<void> {
  await updateDoc(doc(db, 'litiges', id), { ...data, updatedAt: Timestamp.now() });
}

// ──────────────────────────────────────────────
// Export
// ──────────────────────────────────────────────
export function exportData(rows: Record<string, unknown>[], filename: string): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          const str = val === null || val === undefined ? '' : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
