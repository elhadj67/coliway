import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { OrderStatus } from '@/constants/config';

export interface OrderAddress {
  adresse: string;
  latitude: number;
  longitude: number;
  codePostal?: string;
  ville?: string;
}

export interface OrderData {
  clientId: string;
  typeColis: string;
  poids: number;
  description: string;
  adresseEnlevement: OrderAddress;
  adresseLivraison: OrderAddress;
  destinataireNom: string;
  destinataireTelephone: string;
  instructions?: string;
  assurance: boolean;
  prixEstime: number;
}

export interface Order extends OrderData {
  id: string;
  livreurId?: string;
  status: OrderStatus;
  prixFinal?: number;
  noteLivreur?: number;
  codeConfirmation?: string;
  photoPreuve?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  acceptedAt?: Timestamp;
  deliveredAt?: Timestamp;
}

/**
 * Creates a new order by calling the createCommande cloud function.
 */
export async function createOrder(orderData: OrderData): Promise<string> {
  const createCommande = httpsCallable<OrderData, { commandeId: string }>(
    functions,
    'createCommande'
  );
  const result = await createCommande(orderData);
  return result.data.commandeId;
}

/**
 * Subscribes to real-time updates for a client's orders.
 * Returns an unsubscribe function.
 */
export function getClientOrders(
  clientId: string,
  callback: (orders: Order[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'commandes'),
    where('clientId', '==', clientId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const orders: Order[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Order[];
    callback(orders);
  });
}

/**
 * Subscribes to real-time updates for a livreur's assigned orders.
 * Returns an unsubscribe function.
 */
export function getLivreurOrders(
  livreurId: string,
  callback: (orders: Order[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'commandes'),
    where('livreurId', '==', livreurId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const orders: Order[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Order[];
    callback(orders);
  });
}

/**
 * Subscribes to real-time updates for available orders (status 'en_attente').
 * Returns an unsubscribe function.
 */
export function getAvailableOrders(
  callback: (orders: Order[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'commandes'),
    where('status', '==', 'en_attente'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const orders: Order[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as Order[];
    callback(orders);
  });
}

/**
 * Accepts an order by calling the accepterCommande cloud function.
 */
export async function acceptOrder(
  orderId: string,
  livreurId: string
): Promise<void> {
  const accepterCommande = httpsCallable<
    { commandeId: string; livreurId: string },
    void
  >(functions, 'accepterCommande');
  await accepterCommande({ commandeId: orderId, livreurId });
}

/**
 * Updates the status of an order by calling the updateCommandeStatus cloud function.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<void> {
  const updateCommandeStatus = httpsCallable<
    { commandeId: string; status: OrderStatus },
    void
  >(functions, 'updateCommandeStatus');
  await updateCommandeStatus({ commandeId: orderId, status });
}

/**
 * Subscribes to real-time updates for a single order.
 * Returns an unsubscribe function.
 */
export function subscribeToOrder(
  orderId: string,
  callback: (order: Order | null) => void
): Unsubscribe {
  const orderRef = doc(db, 'commandes', orderId);

  return onSnapshot(orderRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as Order);
    } else {
      callback(null);
    }
  });
}

/**
 * Rates a delivery by updating the order and the livreur's average rating.
 */
export async function rateDelivery(
  orderId: string,
  livreurId: string,
  rating: number
): Promise<void> {
  // Update the order with the rating
  const orderRef = doc(db, 'commandes', orderId);
  await updateDoc(orderRef, {
    noteLivreur: rating,
    updatedAt: serverTimestamp(),
  });

  // Update the livreur's note in their user document
  const livreurRef = doc(db, 'users', livreurId);
  const livreurDoc = await getDoc(livreurRef);

  if (livreurDoc.exists()) {
    const livreurData = livreurDoc.data();
    const currentNote = livreurData.note || 5;
    const nombreLivraisons = livreurData.nombreLivraisons || 0;

    // Calculate new weighted average
    const newNote =
      (currentNote * nombreLivraisons + rating) / (nombreLivraisons + 1);

    await updateDoc(livreurRef, {
      note: Math.round(newNote * 10) / 10,
      nombreLivraisons: nombreLivraisons + 1,
      updatedAt: serverTimestamp(),
    });
  }
}
