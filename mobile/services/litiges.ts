import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface Litige {
  id: string;
  commandeId: string;
  clientId: string;
  livreurId: string;
  clientNom: string;
  livreurNom: string;
  motif: string;
  description: string;
  status: 'ouvert' | 'en_cours' | 'resolu' | 'ferme';
  createdAt: Timestamp;
}

export interface CreateLitigeData {
  commandeId: string;
  clientId: string;
  livreurId: string;
  clientNom: string;
  livreurNom: string;
  motif: string;
  description: string;
}

export async function createLitige(data: CreateLitigeData): Promise<string> {
  const docRef = await addDoc(collection(db, 'litiges'), {
    ...data,
    status: 'ouvert',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export function getMyLitiges(
  userId: string,
  callback: (litiges: Litige[]) => void
): Unsubscribe {
  const qClient = query(
    collection(db, 'litiges'),
    where('clientId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const qLivreur = query(
    collection(db, 'litiges'),
    where('livreurId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  let clientLitiges: Litige[] = [];
  let livreurLitiges: Litige[] = [];

  const unsubClient = onSnapshot(qClient, (snapshot) => {
    clientLitiges = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Litige[];
    mergeLitiges();
  });

  const unsubLivreur = onSnapshot(qLivreur, (snapshot) => {
    livreurLitiges = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Litige[];
    mergeLitiges();
  });

  function mergeLitiges() {
    const map = new Map<string, Litige>();
    [...clientLitiges, ...livreurLitiges].forEach((l) => map.set(l.id, l));
    const merged = Array.from(map.values()).sort((a, b) => {
      const ta = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });
    callback(merged);
  }

  return () => {
    unsubClient();
    unsubLivreur();
  };
}
