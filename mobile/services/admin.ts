import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface AdminStats {
  totalCA: number;
  commandesAujourdhui: number;
  livreursActifs: number;
  clientsInscrits: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  try {
    const [commandesSnap, livreursSnap, clientsSnap] = await Promise.all([
      getDocs(collection(db, 'commandes')),
      getDocs(query(collection(db, 'livreurs'), where('status', '==', 'approuve'))),
      getDocs(collection(db, 'clients')),
    ]);

    const commandes = commandesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const totalCA = commandes
      .filter((c: any) => c.status === 'livree')
      .reduce((sum: number, c: any) => sum + (c.prix || 0), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const commandesAujourdhui = commandes.filter((c: any) => {
      const d = c.createdAt instanceof Timestamp ? c.createdAt.toDate() : new Date(c.createdAt);
      return d >= today;
    }).length;

    return {
      totalCA,
      commandesAujourdhui,
      livreursActifs: livreursSnap.size,
      clientsInscrits: clientsSnap.size,
    };
  } catch {
    return {
      totalCA: 0,
      commandesAujourdhui: 0,
      livreursActifs: 0,
      clientsInscrits: 0,
    };
  }
}
