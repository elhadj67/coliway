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
  Menu,
  X,
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

export default function Sidebar() {
  const navigate = useNavigate();
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    navigate('/login');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          zIndex: 200,
          width: 42,
          height: 42,
          borderRadius: 10,
          background: '#1B3A5C',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
        className="sidebar-hamburger"
      >
        <Menu size={22} />
      </button>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          onClick={closeMobile}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 299,
          }}
          className="sidebar-overlay"
        />
      )}

      {/* Sidebar */}
      <div
        className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}
        style={{
          width: 260,
          height: '100vh',
          background: 'linear-gradient(180deg, #1B3A5C 0%, #132a44 100%)',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 300,
          boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
          transition: 'transform 0.25s ease',
        }}
      >
        {/* Mobile close button */}
        <button
          onClick={closeMobile}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          className="sidebar-close"
        >
          <X size={18} />
        </button>

        {/* Logo */}
        <div style={{
          padding: '20px 16px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img src="/logo.png" alt="Coliway" style={{ width: 170, height: 'auto' }} />
          </div>
          <div style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            fontWeight: 500,
          }}>Administration</div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          {navItems.map((item, idx) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={closeMobile}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 14px',
                borderRadius: 8,
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.7)',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all 0.2s ease',
                marginBottom: 2,
                textDecoration: 'none',
                ...(isActive
                  ? { background: 'rgba(46,134,222,0.2)', boxShadow: 'inset 3px 0 0 #2E86DE' }
                  : hoveredIndex === idx
                    ? { background: 'rgba(255,255,255,0.08)', color: '#ffffff' }
                    : {}),
              })}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
              <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.4 }} />
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '11px 14px',
              borderRadius: 8,
              color: 'rgba(255,255,255,0.6)',
              fontSize: 14,
              fontWeight: 500,
              width: '100%',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              border: 'none',
              background: 'none',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(231,76,60,0.2)';
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

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 768px) {
          .sidebar-hamburger { display: flex !important; }
          .sidebar-close { display: flex !important; }
          .sidebar { transform: translateX(-100%); }
          .sidebar.sidebar-open { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
