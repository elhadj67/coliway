import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import { Lock, Mail, AlertCircle } from 'lucide-react';

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1B3A5C 0%, #2E86DE 50%, #1B3A5C 100%)',
    padding: 20,
  },
  card: {
    background: '#ffffff',
    borderRadius: 16,
    padding: '48px 40px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  logoWrap: {
    textAlign: 'center' as const,
    marginBottom: 32,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 700 as const,
    color: '#1B3A5C',
    letterSpacing: '-1px',
  },
  logoAccent: {
    color: '#2E86DE',
  },
  logoSub: {
    fontSize: 13,
    color: '#6c757d',
    marginTop: 4,
    letterSpacing: '1.5px',
    textTransform: 'uppercase' as const,
    fontWeight: 500 as const,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 18,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600 as const,
    color: '#1a1a2e',
  },
  inputWrap: {
    position: 'relative' as const,
  },
  inputIcon: {
    position: 'absolute' as const,
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#adb5bd',
  },
  input: {
    width: '100%',
    padding: '12px 14px 12px 42px',
    border: '2px solid #e2e8f0',
    borderRadius: 10,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    color: '#1a1a2e',
  },
  btn: {
    padding: '13px 24px',
    background: '#1B3A5C',
    color: '#ffffff',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 600 as const,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginTop: 6,
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: 8,
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: 500 as const,
  },
};

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // Check admin role
      const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
      if (!userDoc.exists() || userDoc.data()?.role !== 'admin') {
        await auth.signOut();
        setError('Acces refuse. Vous n\'avez pas les droits administrateur.');
        setLoading(false);
        return;
      }

      navigate('/');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Email ou mot de passe incorrect.');
      } else if (code === 'auth/too-many-requests') {
        setError('Trop de tentatives. Veuillez reessayer plus tard.');
      } else {
        setError('Erreur de connexion. Veuillez reessayer.');
      }
    }

    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.card} className="scale-in">
        {/* Logo */}
        <div style={styles.logoWrap}>
          <img src="/logo.png" alt="Coliway" style={{ width: 220, height: 'auto', marginBottom: 8 }} />
          <div style={styles.logoSub}>Administration</div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ ...styles.error, marginBottom: 18 }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Form */}
        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Adresse email</label>
            <div style={styles.inputWrap}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@coliway.fr"
                required
                style={styles.input}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#2E86DE';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(46,134,222,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Mot de passe</label>
            <div style={styles.inputWrap}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                required
                style={styles.input}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#2E86DE';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(46,134,222,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.btn,
              opacity: loading ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#244a72';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#1B3A5C';
            }}
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
