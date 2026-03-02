import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  serverTimestamp,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface ChatMessage {
  id: string;
  commandeId: string;
  senderId: string;
  text: string;
  createdAt: Timestamp;
}

/**
 * Sends a message in the chat for a specific commande.
 */
export async function sendMessage(
  commandeId: string,
  senderId: string,
  text: string
): Promise<string> {
  const messagesRef = collection(db, 'messages');
  const docRef = await addDoc(messagesRef, {
    commandeId,
    senderId,
    text,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Subscribes to real-time updates for messages of a specific commande.
 * Messages are ordered by creation time ascending.
 * Returns an unsubscribe function.
 */
export function subscribeToMessages(
  commandeId: string,
  callback: (messages: ChatMessage[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'messages'),
    where('commandeId', '==', commandeId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages: ChatMessage[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as ChatMessage[];
    callback(messages);
  });
}

/**
 * Gets all messages for a specific commande (one-time fetch).
 */
export async function getMessages(
  commandeId: string
): Promise<ChatMessage[]> {
  const q = query(
    collection(db, 'messages'),
    where('commandeId', '==', commandeId),
    orderBy('createdAt', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as ChatMessage[];
}
