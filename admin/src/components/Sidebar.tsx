import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { auth } from '@/services/firebase';
import { signOut } from 'firebase/auth';
import {
  LayoutDashboard,
  Package,
  Truck,
  Users,
  DollarSign,
  CreditCard,
  AlertTriangle,
  LogOut,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/commandes', label: 'Commandes', icon: Package },
  { to: '/livreurs', label: 'Livreurs', icon: Truck },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/tarification', label: 'Tarification', icon: DollarSign },
  { to: '/paiements', label: 'Paiements', icon: CreditCard },
  { to: '/litiges', label: 'Litiges', icon: AlertTriangle },
];

const styles = {
  sidebar: {
    width: 260,
    height: '100vh',
    background: 'linear-gradient(180deg, #1B3A5C 0%, #132a44 100%)',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'fixed' as const,
    left: 0,
    top: 0,
    zIndex: 100,
    boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
  },
  logoSection: {
    padding: '20px 16px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 10,
  },
  logoBg: {
    background: '#ffffff',
    borderRadius: 12,
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: {
    width: 170,
    height: 'auto' as const,
  },
  logoSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
    fontWeight: 500 as const,
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    overflowY: 'auto' as const,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '11px 14px',
    borderRadius: 8,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: 500 as const,
    transition: 'all 0.2s ease',
    marginBottom: 2,
    textDecoration: 'none',
  },
  navLinkActive: {
    background: 'rgba(46,134,222,0.2)',
    color: '#ffffff',
    boxShadow: 'inset 3px 0 0 #2E86DE',
  },
  navLinkHover: {
    background: 'rgba(255,255,255,0.08)',
    color: '#ffffff',
  },
  chevron: {
    marginLeft: 'auto',
    opacity: 0.4,
  },
  footer: {
    padding: '16px 12px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '11px 14px',
    borderRadius: 8,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: 500 as const,
    width: '100%',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
  },
};

export default function Sidebar() {
  const navigate = useNavigate();
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    navigate('/login');
  };

  return (
    <div style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logoSection}>
        <div style={styles.logoBg}>
          <img src="/logo.png" alt="Coliway" style={styles.logoImg} />
        </div>
        <div style={styles.logoSub}>Administration</div>
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        {navItems.map((item, idx) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive ? styles.navLinkActive : {}),
              ...(hoveredIndex === idx && !isActive ? styles.navLinkHover : {}),
            })}
          >
            <item.icon size={19} />
            <span>{item.label}</span>
            <ChevronRight size={14} style={styles.chevron} />
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div style={styles.footer}>
        <button
          onClick={handleLogout}
          style={styles.logoutBtn}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              'rgba(231,76,60,0.2)';
            (e.currentTarget as HTMLButtonElement).style.color = '#E74C3C';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'none';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)';
          }}
        >
          <LogOut size={19} />
          <span>Se deconnecter</span>
        </button>
      </div>
    </div>
  );
}
