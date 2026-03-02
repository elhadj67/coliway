import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';

import Sidebar from '@/components/Sidebar';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Commandes from '@/pages/Commandes';
import Livreurs from '@/pages/Livreurs';
import Clients from '@/pages/Clients';
import Tarification from '@/pages/Tarification';
import Paiements from '@/pages/Paiements';
import Litiges from '@/pages/Litiges';

// ──────────────────────────────────────────────
// Layout with sidebar
// ──────────────────────────────────────────────
function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main
        style={{
          marginLeft: 260,
          flex: 1,
          background: '#F5F7FA',
          minHeight: '100vh',
          overflowX: 'hidden',
        }}
      >
        {children}
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────
// Loading spinner
// ──────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#F5F7FA',
      }}
    >
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: '#1B3A5C',
          marginBottom: 16,
        }}
      >
        Coli<span style={{ color: '#2E86DE' }}>way</span>
      </div>
      <div
        style={{
          width: 40,
          height: 40,
          border: '4px solid #e2e8f0',
          borderTopColor: '#2E86DE',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ──────────────────────────────────────────────
// Protected route wrapper
// ──────────────────────────────────────────────
function ProtectedRoute({
  user,
  isAdmin,
  devMode,
  children,
}: {
  user: User | null;
  isAdmin: boolean;
  devMode: boolean;
  children: React.ReactNode;
}) {
  if (!devMode && (!user || !isAdmin)) {
    return <Navigate to="/login" replace />;
  }
  return <AdminLayout>{children}</AdminLayout>;
}

// ──────────────────────────────────────────────
// App
// ──────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Detect if Firebase is configured with real credentials
  const firebaseConfigured = !auth.app.options.apiKey?.startsWith('YOUR_');
  const [devMode] = useState(!firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists() && userDoc.data()?.role === 'admin') {
            setUser(firebaseUser);
            setIsAdmin(true);
          } else {
            setUser(null);
            setIsAdmin(false);
          }
        } catch {
          setUser(firebaseUser);
          setIsAdmin(true);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  const p = { user, isAdmin, devMode };

  return (
    <Routes>
      <Route path="/login" element={
        (user && isAdmin) || devMode ? <Navigate to="/" replace /> : <Login />
      } />

      <Route path="/" element={<ProtectedRoute {...p}><Dashboard /></ProtectedRoute>} />
      <Route path="/commandes" element={<ProtectedRoute {...p}><Commandes /></ProtectedRoute>} />
      <Route path="/livreurs" element={<ProtectedRoute {...p}><Livreurs /></ProtectedRoute>} />
      <Route path="/clients" element={<ProtectedRoute {...p}><Clients /></ProtectedRoute>} />
      <Route path="/tarification" element={<ProtectedRoute {...p}><Tarification /></ProtectedRoute>} />
      <Route path="/paiements" element={<ProtectedRoute {...p}><Paiements /></ProtectedRoute>} />
      <Route path="/litiges" element={<ProtectedRoute {...p}><Litiges /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
