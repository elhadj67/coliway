import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  deleteDoc,
  writeBatch,
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
function toDate(val: Timestamp | Date | unknown): Date {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return new Date(val as string);
}

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

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
      return toDate(c.createdAt) >= today;
    }).length;

    // Commandes par jour (7 derniers jours)
    const commandesParJour: { jour: string; commandes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const count = commandes.filter((c) => {
        const cd = toDate(c.createdAt);
        return cd >= d && cd < next;
      }).length;
      commandesParJour.push({ jour: JOURS[d.getDay()], commandes: count });
    }

    // Revenus par semaine (8 dernieres semaines)
    const revenusParSemaine: { semaine: string; revenus: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const endOfWeek = new Date();
      endOfWeek.setDate(endOfWeek.getDate() - i * 7);
      endOfWeek.setHours(23, 59, 59, 999);
      const startOfWeek = new Date(endOfWeek);
      startOfWeek.setDate(startOfWeek.getDate() - 6);
      startOfWeek.setHours(0, 0, 0, 0);
      const revenus = commandes
        .filter((c) => {
          if (c.status !== 'livree') return false;
          const cd = toDate(c.createdAt);
          return cd >= startOfWeek && cd <= endOfWeek;
        })
        .reduce((sum, c) => sum + (c.prix || 0), 0);
      revenusParSemaine.push({ semaine: `S${8 - i}`, revenus: Math.round(revenus) });
    }

    return {
      totalCA,
      commandesAujourdhui,
      livreursActifs: livreursSnap.size,
      clientsInscrits: clientsSnap.size,
      commandesParJour,
      revenusParSemaine,
    };
  } catch {
    return {
      totalCA: 0,
      commandesAujourdhui: 0,
      livreursActifs: 0,
      clientsInscrits: 0,
      commandesParJour: [],
      revenusParSemaine: [],
    };
  }
}

export interface RecentCommande {
  id: string;
  clientNom: string;
  livreurNom: string;
  prix: number;
  status: string;
  heure: string;
}

export async function getRecentCommandes(): Promise<RecentCommande[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'commandes'), orderBy('createdAt', 'desc'), limit(10))
    );
    return snap.docs.map((d) => {
      const data = d.data();
      const date = toDate(data.createdAt);
      return {
        id: d.id,
        clientNom: data.clientNom || '-',
        livreurNom: data.livreurNom || '-',
        prix: data.prix || 0,
        status: data.status || 'en_attente',
        heure: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };
    });
  } catch {
    return [];
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

export async function deleteOneCommande(id: string): Promise<void> {
  await deleteDoc(doc(db, 'commandes', id));
}

export async function archiveOneCommande(id: string): Promise<void> {
  const snap = await getDoc(doc(db, 'commandes', id));
  if (snap.exists()) {
    await setDoc(doc(db, 'commandes_archive', id), { ...snap.data(), archivedAt: Timestamp.now() });
    await deleteDoc(doc(db, 'commandes', id));
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

export async function deleteOneLivreur(id: string): Promise<void> {
  await deleteDoc(doc(db, 'livreurs', id));
}

export async function archiveOneLivreur(id: string): Promise<void> {
  const snap = await getDoc(doc(db, 'livreurs', id));
  if (snap.exists()) {
    await setDoc(doc(db, 'livreurs_archive', id), { ...snap.data(), archivedAt: Timestamp.now() });
    await deleteDoc(doc(db, 'livreurs', id));
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

export async function deleteOneClient(id: string): Promise<void> {
  await deleteDoc(doc(db, 'clients', id));
}

export async function archiveOneClient(id: string): Promise<void> {
  const snap = await getDoc(doc(db, 'clients', id));
  if (snap.exists()) {
    await setDoc(doc(db, 'clients_archive', id), { ...snap.data(), archivedAt: Timestamp.now() });
    await deleteDoc(doc(db, 'clients', id));
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
// Commission
// ──────────────────────────────────────────────
export async function getCommissionRate(): Promise<number> {
  try {
    const snap = await getDoc(doc(db, 'config', 'commission'));
    if (snap.exists()) {
      const data = snap.data();
      if (typeof data.rate === 'number') return data.rate;
    }
    return 0.20;
  } catch {
    return 0.20;
  }
}

export async function updateCommissionRate(rate: number): Promise<void> {
  await setDoc(doc(db, 'config', 'commission'), { rate, updatedAt: Timestamp.now() }, { merge: true });
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
// Suppression & archivage
// ──────────────────────────────────────────────

async function batchDelete(collectionName: string): Promise<number> {
  const snap = await getDocs(collection(db, collectionName));
  if (snap.empty) return 0;
  const batchSize = 500;
  let count = 0;
  for (let i = 0; i < snap.docs.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = snap.docs.slice(i, i + batchSize);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    count += chunk.length;
  }
  return count;
}

async function batchArchive(sourceCollection: string): Promise<number> {
  const snap = await getDocs(collection(db, sourceCollection));
  if (snap.empty) return 0;
  const archiveName = `${sourceCollection}_archive`;
  const batchSize = 500;
  let count = 0;
  for (let i = 0; i < snap.docs.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = snap.docs.slice(i, i + batchSize);
    chunk.forEach((d) => {
      batch.set(doc(db, archiveName, d.id), {
        ...d.data(),
        archivedAt: Timestamp.now(),
      });
      batch.delete(d.ref);
    });
    await batch.commit();
    count += chunk.length;
  }
  return count;
}

export async function deleteCommandes(): Promise<number> {
  return batchDelete('commandes');
}

export async function archiveCommandes(): Promise<number> {
  return batchArchive('commandes');
}

export async function deleteLivreurs(): Promise<number> {
  return batchDelete('livreurs');
}

export async function archiveLivreurs(): Promise<number> {
  return batchArchive('livreurs');
}

export async function deleteClients(): Promise<number> {
  return batchDelete('clients');
}

export async function archiveClients(): Promise<number> {
  return batchArchive('clients');
}

export async function deleteOnePaiement(id: string): Promise<void> {
  await deleteDoc(doc(db, 'paiements', id));
}

export async function archiveOnePaiement(id: string): Promise<void> {
  const snap = await getDoc(doc(db, 'paiements', id));
  if (snap.exists()) {
    await setDoc(doc(db, 'paiements_archive', id), { ...snap.data(), archivedAt: Timestamp.now() });
    await deleteDoc(doc(db, 'paiements', id));
  }
}

export async function deletePaiements(): Promise<number> {
  return batchDelete('paiements');
}

export async function archivePaiements(): Promise<number> {
  return batchArchive('paiements');
}

export async function deleteOneLitige(id: string): Promise<void> {
  await deleteDoc(doc(db, 'litiges', id));
}

export async function archiveOneLitige(id: string): Promise<void> {
  const snap = await getDoc(doc(db, 'litiges', id));
  if (snap.exists()) {
    await setDoc(doc(db, 'litiges_archive', id), { ...snap.data(), archivedAt: Timestamp.now() });
    await deleteDoc(doc(db, 'litiges', id));
  }
}

export async function deleteLitiges(): Promise<number> {
  return batchDelete('litiges');
}

export async function archiveLitiges(): Promise<number> {
  return batchArchive('litiges');
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
