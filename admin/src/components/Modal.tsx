import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: number;
  footer?: React.ReactNode;
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(2px)',
    animation: 'fadeIn 0.15s ease',
  },
  modal: (width: number) => ({
    background: '#ffffff',
    borderRadius: 14,
    width: '90%',
    maxWidth: width,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    animation: 'scaleIn 0.2s ease',
  }),
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 24px',
    borderBottom: '1px solid #f0f0f0',
  },
  title: {
    fontSize: 17,
    fontWeight: 600 as const,
    color: '#1a1a2e',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.15s',
    color: '#6c757d',
    border: 'none',
    background: 'none',
  },
  body: {
    padding: '20px 24px',
    overflowY: 'auto' as const,
    flex: 1,
  },
  footer: {
    padding: '14px 24px',
    borderTop: '1px solid #f0f0f0',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
  },
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  width = 560,
  footer,
}: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal(width)} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h3 style={styles.title}>{title}</h3>
          <button
            style={styles.closeBtn}
            onClick={onClose}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'none';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>{children}</div>

        {/* Footer */}
        {footer && <div style={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}

// Button helpers for Modal footers
export function ModalButton({
  children,
  onClick,
  variant = 'secondary',
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const colors = {
    primary: { bg: '#1B3A5C', color: '#fff', hoverBg: '#244a72' },
    secondary: { bg: '#f0f0f0', color: '#1a1a2e', hoverBg: '#e2e2e2' },
    danger: { bg: '#E74C3C', color: '#fff', hoverBg: '#c0392b' },
  };
  const c = colors[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '9px 20px',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        background: c.bg,
        color: c.color,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = c.hoverBg;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = c.bg;
      }}
    >
      {children}
    </button>
  );
}
