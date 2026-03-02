import React from 'react';

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  en_attente: { label: 'En attente', bg: '#FFF3CD', color: '#856404' },
  acceptee: { label: 'Acceptee', bg: '#D6EAFF', color: '#1B4F8A' },
  enlevee: { label: 'Enlevee', bg: '#F0E0FF', color: '#6C3483' },
  en_transit: { label: 'En transit', bg: '#D4F1F9', color: '#1A6B7F' },
  livree: { label: 'Livree', bg: '#D4EDDA', color: '#155724' },
  annulee: { label: 'Annulee', bg: '#F0F0F0', color: '#6c757d' },
  echouee: { label: 'Echouee', bg: '#F8D7DA', color: '#721C24' },
  // Livreur statuses
  approuve: { label: 'Approuve', bg: '#D4EDDA', color: '#155724' },
  refuse: { label: 'Refuse', bg: '#F8D7DA', color: '#721C24' },
  // Paiement statuses
  reussi: { label: 'Reussi', bg: '#D4EDDA', color: '#155724' },
  en_cours: { label: 'En cours', bg: '#D6EAFF', color: '#1B4F8A' },
  echoue: { label: 'Echoue', bg: '#F8D7DA', color: '#721C24' },
  rembourse: { label: 'Rembourse', bg: '#FFF3CD', color: '#856404' },
  // Litige statuses
  ouvert: { label: 'Ouvert', bg: '#F8D7DA', color: '#721C24' },
  resolu: { label: 'Resolu', bg: '#D4EDDA', color: '#155724' },
  ferme: { label: 'Ferme', bg: '#F0F0F0', color: '#6c757d' },
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    bg: '#F0F0F0',
    color: '#6c757d',
  };

  const padding = size === 'sm' ? '3px 8px' : '5px 12px';
  const fontSize = size === 'sm' ? 11 : 12;

  return (
    <span
      style={{
        display: 'inline-block',
        padding,
        borderRadius: 20,
        fontSize,
        fontWeight: 600,
        background: config.bg,
        color: config.color,
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
      }}
    >
      {config.label}
    </span>
  );
}
