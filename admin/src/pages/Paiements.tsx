import React, { useState, useEffect } from 'react';
import { Euro, CreditCard, Wallet } from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import StatsCard from '@/components/StatsCard';
import { getPaiements, Paiement } from '@/services/api';

const statusTabs = [
  { key: 'tous', label: 'Tous' },
  { key: 'reussi', label: 'Reussis' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'echoue', label: 'Echoues' },
  { key: 'rembourse', label: 'Rembourses' },
];

const methodTabs = [
  { key: 'toutes', label: 'Toutes methodes' },
  { key: 'carte', label: 'Carte bancaire' },
  { key: 'apple_pay', label: 'Apple Pay' },
  { key: 'google_pay', label: 'Google Pay' },
];

const mockPaiements: Paiement[] = [
  { id: 'PAY-3401', commandeId: 'CMD-1247', montant: 18.50, methode: 'carte', status: 'reussi', createdAt: new Date('2026-02-28T14:32:00') },
  { id: 'PAY-3400', commandeId: 'CMD-1246', montant: 24.00, methode: 'apple_pay', status: 'reussi', createdAt: new Date('2026-02-28T13:15:00') },
  { id: 'PAY-3399', commandeId: 'CMD-1245', montant: 12.00, methode: 'carte', status: 'en_cours', createdAt: new Date('2026-02-28T12:48:00') },
  { id: 'PAY-3398', commandeId: 'CMD-1244', montant: 35.50, methode: 'google_pay', status: 'reussi', createdAt: new Date('2026-02-28T11:20:00') },
  { id: 'PAY-3397', commandeId: 'CMD-1243', montant: 15.00, methode: 'carte', status: 'reussi', createdAt: new Date('2026-02-28T10:45:00') },
  { id: 'PAY-3396', commandeId: 'CMD-1242', montant: 22.00, methode: 'carte', status: 'rembourse', createdAt: new Date('2026-02-28T09:30:00') },
  { id: 'PAY-3395', commandeId: 'CMD-1241', montant: 85.00, methode: 'carte', status: 'reussi', createdAt: new Date('2026-02-28T08:15:00') },
  { id: 'PAY-3394', commandeId: 'CMD-1240', montant: 28.00, methode: 'apple_pay', status: 'reussi', createdAt: new Date('2026-02-27T16:40:00') },
  { id: 'PAY-3393', commandeId: 'CMD-1239', montant: 16.50, methode: 'google_pay', status: 'reussi', createdAt: new Date('2026-02-27T15:10:00') },
  { id: 'PAY-3392', commandeId: 'CMD-1238', montant: 42.00, methode: 'carte', status: 'echoue', createdAt: new Date('2026-02-27T14:22:00') },
  { id: 'PAY-3391', commandeId: 'CMD-1237', montant: 9.50, methode: 'carte', status: 'reussi', createdAt: new Date('2026-02-27T12:55:00') },
  { id: 'PAY-3390', commandeId: 'CMD-1236', montant: 14.00, methode: 'apple_pay', status: 'echoue', createdAt: new Date('2026-02-27T11:30:00') },
];

const methodeLabels: Record<string, string> = {
  carte: 'Carte bancaire',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
};

const s = {
  page: { padding: '28px 32px', maxWidth: 1400 },
  header: { marginBottom: 24 },
  title: { fontSize: 26, fontWeight: 700 as const, color: '#1a1a2e' },
  subtitle: { fontSize: 14, color: '#6c757d', marginTop: 2 },
  statsRow: { display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' as const },
  filtersRow: { display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' as const, alignItems: 'center' },
  filterLabel: { fontSize: 13, fontWeight: 600 as const, color: '#6c757d' },
  tabs: {
    display: 'flex', gap: 4, background: '#ffffff',
    borderRadius: 10, padding: 4, border: '1px solid #f0f0f0', width: 'fit-content' as const,
  },
  tab: (active: boolean) => ({
    padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 500 as const,
    color: active ? '#ffffff' : '#6c757d', background: active ? '#1B3A5C' : 'transparent',
    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
  }),
};

export default function Paiements() {
  const [paiements, setPaiements] = useState<Paiement[]>(mockPaiements);
  const [statusFilter, setStatusFilter] = useState('tous');
  const [methodFilter, setMethodFilter] = useState('toutes');

  useEffect(() => {
    getPaiements().then((data) => {
      if (data.length > 0) setPaiements(data);
    });
  }, []);

  const filtered = paiements.filter((p) => {
    const matchStatus = statusFilter === 'tous' || p.status === statusFilter;
    const matchMethod = methodFilter === 'toutes' || p.methode === methodFilter;
    return matchStatus && matchMethod;
  });

  const totalReussi = paiements
    .filter((p) => p.status === 'reussi')
    .reduce((sum, p) => sum + p.montant, 0);
  const totalEnCours = paiements
    .filter((p) => p.status === 'en_cours')
    .reduce((sum, p) => sum + p.montant, 0);
  const totalRembourse = paiements
    .filter((p) => p.status === 'rembourse')
    .reduce((sum, p) => sum + p.montant, 0);

  const columns: Column<Paiement>[] = [
    { key: 'id', label: 'ID', sortable: true, width: 110, render: (row) => (
      <span style={{ fontWeight: 600, color: '#1B3A5C' }}>{row.id}</span>
    )},
    { key: 'commandeId', label: 'Commande', sortable: true, render: (row) => (
      <span style={{ color: '#2E86DE', fontWeight: 500 }}>{row.commandeId}</span>
    )},
    { key: 'montant', label: 'Montant', sortable: true, width: 110, render: (row) => (
      <span style={{ fontWeight: 700 }}>{row.montant.toFixed(2)} EUR</span>
    )},
    { key: 'methode', label: 'Methode', sortable: true, render: (row) => (
      methodeLabels[row.methode] || row.methode
    )},
    { key: 'status', label: 'Status', width: 110, render: (row) => (
      <StatusBadge status={row.status} size="sm" />
    )},
    { key: 'createdAt', label: 'Date', sortable: true, width: 140, render: (row) => {
      const d = row.createdAt instanceof Date ? row.createdAt : new Date();
      return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }},
  ];

  return (
    <div style={s.page} className="fade-in">
      <div style={s.header}>
        <h1 style={s.title}>Paiements</h1>
        <p style={s.subtitle}>Suivi des transactions et revenus</p>
      </div>

      {/* Stats */}
      <div style={s.statsRow}>
        <StatsCard icon={Euro} label="Total encaisse" value={totalReussi} suffix=" EUR" color="#27AE60" />
        <StatsCard icon={CreditCard} label="En attente" value={totalEnCours} suffix=" EUR" color="#F39C12" />
        <StatsCard icon={Wallet} label="Rembourse" value={totalRembourse} suffix=" EUR" color="#E74C3C" />
      </div>

      {/* Filters */}
      <div style={s.filtersRow}>
        <span style={s.filterLabel}>Status:</span>
        <div style={s.tabs}>
          {statusTabs.map((tab) => (
            <button key={tab.key} style={s.tab(statusFilter === tab.key)} onClick={() => setStatusFilter(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>
        <span style={{ ...s.filterLabel, marginLeft: 8 }}>Methode:</span>
        <div style={s.tabs}>
          {methodTabs.map((tab) => (
            <button key={tab.key} style={s.tab(methodFilter === tab.key)} onClick={() => setMethodFilter(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable<Paiement>
        columns={columns}
        data={filtered}
        searchPlaceholder="Rechercher par ID, commande..."
      />
    </div>
  );
}
