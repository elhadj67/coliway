import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  User,
  UserCredential,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserRole } from '@/constants/config';

export interface UserProfile {
  uid: string;
  email: string;
  nom: string;
  prenom: string;
  telephone: string;
  role: UserRole;
  photoURL?: string;
  adresse?: string;
  vehicule?: string;
  permis?: string;
  note?: number;
  nombreLivraisons?: number;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface SignUpData {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  telephone: string;
  role: UserRole;
  vehicule?: string;
  permis?: string;
}

/**
 * Creates a new user account with email/password and stores profile in Firestore.
 */
export async function signUp(
  email: string,
  password: string,
  userData: Omit<SignUpData, 'email' | 'password'>
): Promise<UserCredential> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  const userProfile: Omit<UserProfile, 'uid'> & { uid: string } = {
    uid: user.uid,
    email: email,
    nom: userData.nom,
    prenom: userData.prenom,
    telephone: userData.telephone,
    role: userData.role,
    vehicule: userData.vehicule || undefined,
    permis: userData.permis || undefined,
    note: userData.role === 'livreur' ? 5 : undefined,
    nombreLivraisons: userData.role === 'livreur' ? 0 : undefined,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'users', user.uid), userProfile);

  return userCredential;
}

/**
 * Signs in a user with email and password.
 */
export async function signIn(
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Signs out the current user.
 */
export async function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}

/**
 * Sends a password reset email to the specified address.
 */
export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

/**
 * Returns the currently authenticated Firebase user, or null.
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Fetches the user profile document from Firestore.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    return userDoc.data() as UserProfile;
  }
  return null;
}

/**
 * Updates the user profile document in Firestore.
 */
export async function updateProfile(
  uid: string,
  data: Partial<Omit<UserProfile, 'uid' | 'email' | 'createdAt'>>
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
