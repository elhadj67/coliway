import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithCredential,
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
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from './firebase';
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
  immatriculation?: string;
  permis?: string;
  siret?: string;
  assurance?: string;
  note?: number;
  nombreLivraisons?: number;
  stripeCustomerId?: string;
  fcmToken?: string;
  adressesSauvegardees?: SavedAddress[];
  accountStatus?: 'en_attente' | 'approuve' | 'refuse';
  createdAt: unknown;
  updatedAt: unknown;
}

export interface SavedAddress {
  label: string;
  adresse: string;
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

  // Build profile without undefined values (Firestore rejects undefined)
  const userProfile: Record<string, unknown> = {
    uid: user.uid,
    email: email,
    nom: userData.nom,
    prenom: userData.prenom,
    telephone: userData.telephone,
    role: userData.role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (userData.vehicule) userProfile.vehicule = userData.vehicule;
  if (userData.permis) userProfile.permis = userData.permis;
  if (userData.role === 'livreur') {
    userProfile.note = 5;
    userProfile.nombreLivraisons = 0;
  }

  // Use merge to avoid overwriting data from onUserCreated Cloud Function
  await setDoc(doc(db, 'users', user.uid), userProfile, { merge: true });

  // Create livreur document via Cloud Function
  if (userData.role === 'livreur') {
    const inscrireLivreur = httpsCallable(functions, 'inscrireLivreur');
    await inscrireLivreur({
      vehicule: userData.vehicule,
      permis: userData.permis,
    });
  }

  // Send email verification
  await sendEmailVerification(user);

  return userCredential;
}

/**
 * Signs in with Google credential (ID token from Google Sign-In).
 */
export async function signInWithGoogle(idToken: string, role: UserRole = 'client'): Promise<UserCredential> {
  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(auth, credential);
  const user = userCredential.user;

  const userRef = doc(db, 'users', user.uid);
  const existingDoc = await getDoc(userRef);

  if (!existingDoc.exists()) {
    // First sign-in: create full profile
    const userProfile: Record<string, unknown> = {
      uid: user.uid,
      email: user.email || '',
      nom: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
      prenom: user.displayName ? user.displayName.split(' ')[0] : '',
      photoURL: user.photoURL || '',
      role,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (role === 'livreur') {
      userProfile.note = 5;
      userProfile.nombreLivraisons = 0;
    }

    await setDoc(userRef, userProfile);
  } else if (role === 'livreur') {
    // Existing user re-registering as livreur: update role + livreur fields
    await updateDoc(userRef, {
      role: 'livreur',
      note: existingDoc.data().note ?? 5,
      nombreLivraisons: existingDoc.data().nombreLivraisons ?? 0,
      photoURL: user.photoURL || '',
      updatedAt: serverTimestamp(),
    });
  } else {
    // Login: update photo only, don't touch role
    await updateDoc(userRef, {
      photoURL: user.photoURL || '',
      updatedAt: serverTimestamp(),
    });
  }

  // Create livreur doc if registering as livreur
  if (role === 'livreur') {
    const livreurRef = doc(db, 'livreurs', user.uid);
    const livreurDoc = await getDoc(livreurRef);
    if (!livreurDoc.exists()) {
      await setDoc(livreurRef, {
        uid: user.uid,
        vehicule: 'voiture',
        permis: '',
        siret: '',
        assurance: '',
        status: 'en_attente',
        disponible: false,
        note_moyenne: 5,
        nb_courses: 0,
        position: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

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
  if (!userDoc.exists()) {
    return null;
  }

  const profile = userDoc.data() as UserProfile;

  // For livreurs, fetch account status from the livreurs collection
  if (profile.role === 'livreur') {
    const livreurDoc = await getDoc(doc(db, 'livreurs', uid));
    if (livreurDoc.exists()) {
      const livreurData = livreurDoc.data();
      profile.accountStatus = (livreurData.status as UserProfile['accountStatus']) ?? 'en_attente';
    } else {
      profile.accountStatus = 'en_attente';
    }
  }

  return profile;
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
