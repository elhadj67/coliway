import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/services/firebase';
import {
  signUp as authSignUp,
  signIn as authSignIn,
  signOut as authSignOut,
  resetPassword as authResetPassword,
  getUserProfile,
  UserProfile,
  SignUpData,
} from '@/services/auth';

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isClient: boolean;
  isLivreur: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider wraps the application and provides authentication state and functions.
 * Listens to Firebase auth state changes and fetches the user profile from Firestore.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch user profile from Firestore
  const fetchProfile = async (uid: string) => {
    try {
      const userProfile = await getUserProfile(uid);
      setProfile(userProfile);
    } catch {
      setProfile(null);
    }
  };

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        await fetchProfile(firebaseUser.uid);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      const credential = await authSignIn(email, password);
      await fetchProfile(credential.user.uid);
    } finally {
      setLoading(false);
    }
  };

  // Sign up with full user data
  const signUp = async (data: SignUpData): Promise<void> => {
    setLoading(true);
    try {
      const { email, password, ...userData } = data;
      const credential = await authSignUp(email, password, userData);
      await fetchProfile(credential.user.uid);
    } finally {
      setLoading(false);
    }
  };

  // Sign out the current user
  const signOut = async (): Promise<void> => {
    setLoading(true);
    try {
      await authSignOut();
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // Send a password reset email
  const resetPassword = async (email: string): Promise<void> => {
    await authResetPassword(email);
  };

  // Refresh the user profile from Firestore
  const refreshProfile = async (): Promise<void> => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  const isClient = profile?.role === 'client';
  const isLivreur = profile?.role === 'livreur';
  const isAdmin = profile?.role === 'admin';

  const value: AuthContextType = {
    user,
    profile,
    loading,
    isClient,
    isLivreur,
    isAdmin,
    signIn,
    signUp,
    signOut,
    resetPassword,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
