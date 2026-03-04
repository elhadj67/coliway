import React, { useState, useEffect } from 'react';
import { Download, Trash2, Archive } from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import Modal, { ModalButton } from '@/components/Modal';
import { getCommandes, exportData, deleteOneCommande, archiveOneCommande, deleteCommandes, archiveCommandes, Commande } from '@/services/api';

const statusTabs = [
  { key: 'toutes', label: 'Toutes' },
  { key: 'en_attente', label: 'En attente' },
  { key: 'en_transit', label: 'En cours' },
  { key: 'livree', label: 'Livrees' },
  { key: 'annulee', label: 'Annulees' },
];

const s = {
  page: { padding: '28px 32px', maxWidth: 1400 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 },
  title: { fontSize: 26, fontWeight: 700 as const, color: '#1a1a2e' },
  subtitle: { fontSize: 14, color: '#6c757d', marginTop: 2 },
  btnRow: { display: 'flex', gap: 8, flexWrap: 'wrap' as const },
  exportBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: '#1B3A5C', color: '#ffffff', borderRadius: 8, fontSize: 13, fontWeight: 600 as const, border: 'none', cursor: 'pointer', transition: 'background 0.15s' },
  archiveAllBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#f0f7ff', color: '#2E86DE', borderRadius: 8, fontSize: 13, fontWeight: 500 as const, border: '1px solid #d0e4f7', cursor: 'pointer' },
  deleteAllBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#fff5f5', color: '#E74C3C', borderRadius: 8, fontSize: 13, fontWeight: 500 as const, border: '1px solid #f5d0d0', cursor: 'pointer' },
  tabs: { display: 'flex', gap: 4, marginBottom: 20, background: '#ffffff', borderRadius: 10, padding: 4, border: '1px solid #f0f0f0', width: 'fit-content' as const, flexWrap: 'wrap' as const },
  tab: (active: boolean) => ({ padding: '8px 18px', borderRadius: 7, fontSize: 13, fontWeight: 500 as const, color: active ? '#ffffff' : '#6c757d', background: active ? '#1B3A5C' : 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.15s' }),
  detailRow: { display: 'flex', gap: 16, marginBottom: 14 },
  detailLabel: { width: 120, fontSize: 13, fontWeight: 600 as const, color: '#6c757d', flexShrink: 0 },
  detailValue: { fontSize: 13, color: '#1a1a2e' },
  actionRow: { display: 'flex', gap: 8, marginTop: 20, borderTop: '1px solid #f0f0f0', paddingTop: 16 },
  toast: { position: 'fixed' as const, bottom: 24, right: 24, background: '#1a1a2e', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500 as const, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', cursor: 'pointer', zIndex: 999 },
};

export default function Commandes() {
  const [activeTab, setActiveTab] = useState('toutes');
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ type: 'delete' | 'archive'; id?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchData = () => {
    getCommandes({ status: activeTab }).then(setCommandes);
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const filtered = activeTab === 'toutes' ? commandes : commandes.filter((c) => c.status === activeTab);

  const handleAction = async () => {
    if (!confirmModal) return;
    setLoading(true);
    try {
      if (confirmModal.id) {
        if (confirmModal.type === 'delete') await deleteOneCommande(confirmModal.id);
        else await archiveOneCommande(confirmModal.id);
        setToast(`Commande ${confirmModal.type === 'delete' ? 'supprimee' : 'archivee'}`);
      } else {
        const count = confirmModal.type === 'delete' ? await deleteCommandes() : await archiveCommandes();
        setToast(`${count} commandes ${confirmModal.type === 'delete' ? 'supprimees' : 'archivees'}`);
      }
      setSelectedCommande(null);
      fetchData();
    } catch {
      setToast('Erreur lors de l\'operation');
    } finally {
      setLoading(false);
      setConfirmModal(null);
    }
  };

  const columns: Column<Commande>[] = [
    { key: 'id', label: 'ID', sortable: true, width: 110, render: (row) => <span style={{ fontWeight: 600, color: '#2E86DE' }}>{row.id.slice(0, 8)}</span> },
    { key: 'clientNom', label: 'Client', sortable: true },
    { key: 'livreurNom', label: 'Livreur', sortable: true, render: (row) => row.livreurNom || '-' },
    { key: 'typeColis', label: 'Type', sortable: true },
    { key: 'prix', label: 'Prix', sortable: true, width: 90, render: (row) => <span style={{ fontWeight: 600 }}>{(row.prix || 0).toFixed(2)} EUR</span> },
    { key: 'status', label: 'Status', width: 110, render: (row) => <StatusBadge status={row.status} size="sm" /> },
    { key: 'createdAt', label: 'Date', sortable: true, width: 100, render: (row) => {
      const d = row.createdAt instanceof Date ? row.createdAt : row.createdAt && 'toDate' in row.createdAt ? (row.createdAt as any).toDate() : new Date();
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }},
  ];

  const handleExport = () => {
    exportData(filtered.map((c) => ({ ID: c.id, Client: c.clientNom, Livreur: c.livreurNom || '', Type: c.typeColis, Prix: c.prix, Status: c.status })), 'commandes');
  };

  return (
    <div style={s.page} className="fade-in">
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Commandes</h1>
          <p style={s.subtitle}>Gestion de toutes les commandes</p>
        </div>
        <div style={s.btnRow}>
          <button style={s.archiveAllBtn} onClick={() => setConfirmModal({ type: 'archive' })}><Archive size={15} /> Tout archiver</button>
          <button style={s.deleteAllBtn} onClick={() => setConfirmModal({ type: 'delete' })}><Trash2 size={15} /> Tout supprimer</button>
          <button style={s.exportBtn} onClick={handleExport}><Download size={16} /> CSV</button>
        </div>
      </div>

      <div style={s.tabs}>
        {statusTabs.map((tab) => (
          <button key={tab.key} style={s.tab(activeTab === tab.key)} onClick={() => setActiveTab(tab.key)}>{tab.label}</button>
        ))}
      </div>

      <DataTable<Commande> columns={columns} data={filtered} onRowClick={(row) => setSelectedCommande(row)} searchPlaceholder="Rechercher par ID, client, livreur..." />

      {/* Detail modal */}
      <Modal open={!!selectedCommande} onClose={() => setSelectedCommande(null)} title={`Commande ${selectedCommande?.id.slice(0, 8) || ''}`} width={600}>
        {selectedCommande && (
          <div>
            <div style={s.detailRow}><span style={s.detailLabel}>Status</span><StatusBadge status={selectedCommande.status} /></div>
            <div style={s.detailRow}><span style={s.detailLabel}>Client</span><span style={s.detailValue}>{selectedCommande.clientNom}</span></div>
            <div style={s.detailRow}><span style={s.detailLabel}>Livreur</span><span style={s.detailValue}>{selectedCommande.livreurNom || 'Non assigne'}</span></div>
            <div style={s.detailRow}><span style={s.detailLabel}>Type de colis</span><span style={s.detailValue}>{selectedCommande.typeColis}</span></div>
            <div style={s.detailRow}><span style={s.detailLabel}>Depart</span><span style={s.detailValue}>{selectedCommande.adresseDepart}</span></div>
            <div style={s.detailRow}><span style={s.detailLabel}>Arrivee</span><span style={s.detailValue}>{selectedCommande.adresseArrivee}</span></div>
            <div style={s.detailRow}><span style={s.detailLabel}>Prix</span><span style={{ ...s.detailValue, fontWeight: 700, fontSize: 16 }}>{(selectedCommande.prix || 0).toFixed(2)} EUR</span></div>
            <div style={s.actionRow}>
              <button style={s.archiveAllBtn} onClick={() => setConfirmModal({ type: 'archive', id: selectedCommande.id })}><Archive size={14} /> Archiver</button>
              <button style={s.deleteAllBtn} onClick={() => setConfirmModal({ type: 'delete', id: selectedCommande.id })}><Trash2 size={14} /> Supprimer</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirm modal */}
      <Modal open={!!confirmModal} onClose={() => setConfirmModal(null)} title={confirmModal?.type === 'delete' ? 'Confirmer la suppression' : 'Confirmer l\'archivage'} width={420}
        footer={<><ModalButton onClick={() => setConfirmModal(null)} variant="secondary">Annuler</ModalButton><ModalButton onClick={handleAction} variant={confirmModal?.type === 'delete' ? 'danger' : 'primary'} disabled={loading}>{loading ? 'En cours...' : confirmModal?.type === 'delete' ? 'Supprimer' : 'Archiver'}</ModalButton></>}>
        <p style={{ fontSize: 14, color: '#1a1a2e', textAlign: 'center', lineHeight: 1.6 }}>
          {confirmModal?.id
            ? `Voulez-vous ${confirmModal.type === 'delete' ? 'supprimer definitivement' : 'archiver'} cette commande ?`
            : `Voulez-vous ${confirmModal?.type === 'delete' ? 'supprimer definitivement' : 'archiver'} toutes les commandes ?`}
        </p>
      </Modal>

      {toast && <div style={s.toast} onClick={() => setToast(null)}>{toast}</div>}
    </div>
  );
}
