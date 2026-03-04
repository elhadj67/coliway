import React, { useState, useEffect } from 'react';
import { Euro, CreditCard, Wallet, Trash2, Archive } from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import StatsCard from '@/components/StatsCard';
import Modal, { ModalButton } from '@/components/Modal';
import { getPaiements, deleteOnePaiement, archiveOnePaiement, deletePaiements, archivePaiements, Paiement } from '@/services/api';

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

const methodeLabels: Record<string, string> = {
  carte: 'Carte bancaire',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
};

const s = {
  page: { padding: '28px 32px', maxWidth: 1400 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 },
  title: { fontSize: 26, fontWeight: 700 as const, color: '#1a1a2e' },
  subtitle: { fontSize: 14, color: '#6c757d', marginTop: 2 },
  btnRow: { display: 'flex', gap: 8 },
  archiveAllBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#f0f7ff', color: '#2E86DE', borderRadius: 8, fontSize: 13, fontWeight: 500 as const, border: '1px solid #d0e4f7', cursor: 'pointer' },
  deleteAllBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#fff5f5', color: '#E74C3C', borderRadius: 8, fontSize: 13, fontWeight: 500 as const, border: '1px solid #f5d0d0', cursor: 'pointer' },
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
  detailRow: { display: 'flex', gap: 16, marginBottom: 10 },
  detailLabel: { width: 120, fontSize: 13, fontWeight: 600 as const, color: '#6c757d', flexShrink: 0 },
  detailValue: { fontSize: 13, color: '#1a1a2e' },
  actionBtns: { display: 'flex', gap: 8, marginTop: 20, borderTop: '1px solid #f0f0f0', paddingTop: 16 },
  toast: { position: 'fixed' as const, bottom: 24, right: 24, background: '#1a1a2e', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500 as const, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', cursor: 'pointer', zIndex: 999 },
};

export default function Paiements() {
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [statusFilter, setStatusFilter] = useState('tous');
  const [methodFilter, setMethodFilter] = useState('toutes');
  const [selected, setSelected] = useState<Paiement | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ type: 'delete' | 'archive'; id?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchData = () => {
    getPaiements().then(setPaiements);
  };

  useEffect(() => { fetchData(); }, []);

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

  const handleAction = async () => {
    if (!confirmModal) return;
    setLoading(true);
    try {
      if (confirmModal.id) {
        if (confirmModal.type === 'delete') await deleteOnePaiement(confirmModal.id);
        else await archiveOnePaiement(confirmModal.id);
        setToast(`Paiement ${confirmModal.type === 'delete' ? 'supprime' : 'archive'}`);
      } else {
        const count = confirmModal.type === 'delete' ? await deletePaiements() : await archivePaiements();
        setToast(`${count} paiements ${confirmModal.type === 'delete' ? 'supprimes' : 'archives'}`);
      }
      setSelected(null);
      fetchData();
    } catch {
      setToast('Erreur lors de l\'operation');
    } finally {
      setLoading(false);
      setConfirmModal(null);
    }
  };

  const columns: Column<Paiement>[] = [
    { key: 'id', label: 'ID', sortable: true, width: 110, render: (row) => (
      <span style={{ fontWeight: 600, color: '#1B3A5C' }}>{row.id.slice(0, 8)}</span>
    )},
    { key: 'commandeId', label: 'Commande', sortable: true, render: (row) => (
      <span style={{ color: '#2E86DE', fontWeight: 500 }}>{row.commandeId?.slice(0, 8) || '-'}</span>
    )},
    { key: 'montant', label: 'Montant', sortable: true, width: 110, render: (row) => (
      <span style={{ fontWeight: 700 }}>{(row.montant || 0).toFixed(2)} EUR</span>
    )},
    { key: 'methode', label: 'Methode', sortable: true, render: (row) => (
      methodeLabels[row.methode] || row.methode
    )},
    { key: 'status', label: 'Status', width: 110, render: (row) => (
      <StatusBadge status={row.status} size="sm" />
    )},
    { key: 'createdAt', label: 'Date', sortable: true, width: 140, render: (row) => {
      const d = row.createdAt instanceof Date ? row.createdAt : row.createdAt && 'toDate' in row.createdAt ? (row.createdAt as any).toDate() : new Date();
      return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }},
  ];

  return (
    <div style={s.page} className="fade-in">
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Paiements</h1>
          <p style={s.subtitle}>Suivi des transactions et revenus</p>
        </div>
        <div style={s.btnRow}>
          <button style={s.archiveAllBtn} onClick={() => setConfirmModal({ type: 'archive' })}><Archive size={15} /> Tout archiver</button>
          <button style={s.deleteAllBtn} onClick={() => setConfirmModal({ type: 'delete' })}><Trash2 size={15} /> Tout supprimer</button>
        </div>
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
        onRowClick={(row) => setSelected(row)}
        searchPlaceholder="Rechercher par ID, commande..."
      />

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Paiement ${selected?.id.slice(0, 8) || ''}`} width={500}>
        {selected && (
          <div>
            <div style={s.detailRow}><span style={s.detailLabel}>Status</span><StatusBadge status={selected.status} /></div>
            <div style={s.detailRow}><span style={s.detailLabel}>Commande</span><span style={{ ...s.detailValue, color: '#2E86DE', fontWeight: 600 }}>{selected.commandeId}</span></div>
            <div style={s.detailRow}><span style={s.detailLabel}>Montant</span><span style={{ ...s.detailValue, fontWeight: 700, fontSize: 16 }}>{(selected.montant || 0).toFixed(2)} EUR</span></div>
            <div style={s.detailRow}><span style={s.detailLabel}>Methode</span><span style={s.detailValue}>{methodeLabels[selected.methode] || selected.methode}</span></div>
            <div style={s.detailRow}><span style={s.detailLabel}>Date</span><span style={s.detailValue}>{
              (selected.createdAt instanceof Date ? selected.createdAt : (selected.createdAt as any)?.toDate?.() ?? new Date()).toLocaleString('fr-FR')
            }</span></div>
            <div style={s.actionBtns}>
              <button style={s.archiveAllBtn} onClick={() => setConfirmModal({ type: 'archive', id: selected.id })}><Archive size={14} /> Archiver</button>
              <button style={s.deleteAllBtn} onClick={() => setConfirmModal({ type: 'delete', id: selected.id })}><Trash2 size={14} /> Supprimer</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm modal */}
      <Modal open={!!confirmModal} onClose={() => setConfirmModal(null)} title={confirmModal?.type === 'delete' ? 'Confirmer la suppression' : 'Confirmer l\'archivage'} width={420}
        footer={<><ModalButton onClick={() => setConfirmModal(null)} variant="secondary">Annuler</ModalButton><ModalButton onClick={handleAction} variant={confirmModal?.type === 'delete' ? 'danger' : 'primary'} disabled={loading}>{loading ? 'En cours...' : confirmModal?.type === 'delete' ? 'Supprimer' : 'Archiver'}</ModalButton></>}>
        <p style={{ fontSize: 14, color: '#1a1a2e', textAlign: 'center', lineHeight: 1.6 }}>
          {confirmModal?.id
            ? `Voulez-vous ${confirmModal.type === 'delete' ? 'supprimer definitivement' : 'archiver'} ce paiement ?`
            : `Voulez-vous ${confirmModal?.type === 'delete' ? 'supprimer definitivement' : 'archiver'} tous les paiements ?`}
        </p>
      </Modal>

      {toast && <div style={s.toast} onClick={() => setToast(null)}>{toast}</div>}
    </div>
  );
}
