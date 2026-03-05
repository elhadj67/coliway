import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, FileText, Star, Trash2, Archive, AlertTriangle } from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import Modal, { ModalButton } from '@/components/Modal';
import { getLivreurs, validerLivreur, deleteOneLivreur, archiveOneLivreur, deleteLivreurs, archiveLivreurs, getLitigesByUser, Livreur, Litige } from '@/services/api';

const tabs = [
  { key: 'en_attente', label: 'En attente de validation' },
  { key: 'approuve', label: 'Approuves' },
  { key: 'refuse', label: 'Refuses' },
];

const s = {
  page: { padding: '28px 32px', maxWidth: 1400 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 },
  title: { fontSize: 26, fontWeight: 700 as const, color: '#1a1a2e' },
  subtitle: { fontSize: 14, color: '#6c757d', marginTop: 2 },
  btnRow: { display: 'flex', gap: 8 },
  archiveAllBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#f0f7ff', color: '#2E86DE', borderRadius: 8, fontSize: 13, fontWeight: 500 as const, border: '1px solid #d0e4f7', cursor: 'pointer' },
  deleteAllBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#fff5f5', color: '#E74C3C', borderRadius: 8, fontSize: 13, fontWeight: 500 as const, border: '1px solid #f5d0d0', cursor: 'pointer' },
  tabs: { display: 'flex', gap: 4, marginBottom: 20, background: '#ffffff', borderRadius: 10, padding: 4, border: '1px solid #f0f0f0', width: 'fit-content' as const, flexWrap: 'wrap' as const },
  tab: (active: boolean) => ({ padding: '8px 18px', borderRadius: 7, fontSize: 13, fontWeight: 500 as const, color: active ? '#ffffff' : '#6c757d', background: active ? '#1B3A5C' : 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.15s' }),
  detailSection: { marginBottom: 20 },
  detailSectionTitle: { fontSize: 14, fontWeight: 600 as const, color: '#1B3A5C', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' },
  detailRow: { display: 'flex', gap: 16, marginBottom: 10 },
  detailLabel: { width: 130, fontSize: 13, fontWeight: 600 as const, color: '#6c757d', flexShrink: 0 },
  detailValue: { fontSize: 13, color: '#1a1a2e' },
  docRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f8f9fa', borderRadius: 8, marginBottom: 6, fontSize: 13 },
  actionBtns: { display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' as const },
  approveBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#27AE60', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600 as const, border: 'none', cursor: 'pointer' },
  refuseBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#E74C3C', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600 as const, border: 'none', cursor: 'pointer' },
  starsWrap: { display: 'inline-flex', alignItems: 'center', gap: 2 },
  toast: { position: 'fixed' as const, bottom: 24, right: 24, background: '#1a1a2e', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500 as const, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', cursor: 'pointer', zIndex: 999 },
};

export default function Livreurs() {
  const [activeTab, setActiveTab] = useState('en_attente');
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [selected, setSelected] = useState<Livreur | null>(null);
  const [livreurLitiges, setLivreurLitiges] = useState<Litige[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ type: 'delete' | 'archive'; id?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchData = () => {
    getLivreurs(activeTab).then(setLivreurs);
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  useEffect(() => {
    if (selected) {
      getLitigesByUser(selected.id).then(setLivreurLitiges);
    } else {
      setLivreurLitiges([]);
    }
  }, [selected]);

  const filtered = livreurs.filter((l) => l.status === activeTab);

  const handleValidation = async (id: string, status: 'approuve' | 'refuse') => {
    try { await validerLivreur(id, status); } catch {}
    setLivreurs((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    setSelected(null);
    setToast(`Livreur ${status === 'approuve' ? 'approuve' : 'refuse'}`);
  };

  const handleAction = async () => {
    if (!confirmModal) return;
    setLoading(true);
    try {
      if (confirmModal.id) {
        if (confirmModal.type === 'delete') await deleteOneLivreur(confirmModal.id);
        else await archiveOneLivreur(confirmModal.id);
        setToast(`Livreur ${confirmModal.type === 'delete' ? 'supprime' : 'archive'}`);
      } else {
        const count = confirmModal.type === 'delete' ? await deleteLivreurs() : await archiveLivreurs();
        setToast(`${count} livreurs ${confirmModal.type === 'delete' ? 'supprimes' : 'archives'}`);
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

  const renderStars = (note: number) => (
    <span style={s.starsWrap}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={14} fill={i < Math.floor(note) ? '#F39C12' : 'none'} color={i < Math.floor(note) ? '#F39C12' : '#ddd'} />
      ))}
      <span style={{ marginLeft: 4, fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{note > 0 ? note.toFixed(1) : '-'}</span>
    </span>
  );

  const columns: Column<Livreur>[] = [
    { key: 'nom', label: 'Nom', sortable: true, render: (row) => <span style={{ fontWeight: 600 }}>{row.prenom} {row.nom}</span> },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'vehicule', label: 'Vehicule', sortable: true },
    { key: 'siret', label: 'SIRET' },
    { key: 'note', label: 'Note', sortable: true, width: 140, render: (row) => renderStars(row.note) },
    { key: 'courses', label: 'Courses', sortable: true, width: 80, render: (row) => <span style={{ fontWeight: 600 }}>{row.courses}</span> },
    { key: 'status', label: 'Status', width: 110, render: (row) => <StatusBadge status={row.status} size="sm" /> },
  ];

  return (
    <div style={s.page} className="fade-in">
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Livreurs</h1>
          <p style={s.subtitle}>Gestion et validation des livreurs</p>
        </div>
        <div style={s.btnRow}>
          <button style={s.archiveAllBtn} onClick={() => setConfirmModal({ type: 'archive' })}><Archive size={15} /> Tout archiver</button>
          <button style={s.deleteAllBtn} onClick={() => setConfirmModal({ type: 'delete' })}><Trash2 size={15} /> Tout supprimer</button>
        </div>
      </div>

      <div style={s.tabs}>
        {tabs.map((tab) => (
          <button key={tab.key} style={s.tab(activeTab === tab.key)} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
            {tab.key === 'en_attente' && <span style={{ marginLeft: 8, background: '#E74C3C', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{livreurs.filter((l) => l.status === 'en_attente').length}</span>}
          </button>
        ))}
      </div>

      <DataTable<Livreur> columns={columns} data={filtered} onRowClick={(row) => setSelected(row)} searchPlaceholder="Rechercher par nom, email..." />

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.prenom} ${selected.nom}` : ''} width={620}>
        {selected && (
          <div>
            <div style={s.detailSection}>
              <div style={s.detailSectionTitle}>Informations personnelles</div>
              <div style={s.detailRow}><span style={s.detailLabel}>Email</span><span style={s.detailValue}>{selected.email}</span></div>
              <div style={s.detailRow}><span style={s.detailLabel}>Telephone</span><span style={s.detailValue}>{selected.telephone}</span></div>
              <div style={s.detailRow}><span style={s.detailLabel}>Vehicule</span><span style={s.detailValue}>{selected.vehicule}</span></div>
              <div style={s.detailRow}><span style={s.detailLabel}>SIRET</span><span style={s.detailValue}>{selected.siret}</span></div>
              <div style={s.detailRow}><span style={s.detailLabel}>Note</span><span style={s.detailValue}>{renderStars(selected.note)}</span></div>
              <div style={s.detailRow}><span style={s.detailLabel}>Courses</span><span style={{ ...s.detailValue, fontWeight: 700 }}>{selected.courses}</span></div>
              <div style={s.detailRow}><span style={s.detailLabel}>Status</span><StatusBadge status={selected.status} /></div>
            </div>
            <div style={s.detailSection}>
              <div style={s.detailSectionTitle}>Documents</div>
              {selected.documents?.permis && <div style={s.docRow}><FileText size={16} color="#2E86DE" /><span>Permis de conduire</span><span style={{ marginLeft: 'auto', color: '#27AE60', fontSize: 12, fontWeight: 600 }}>Fourni</span></div>}
              {selected.documents?.identite && <div style={s.docRow}><FileText size={16} color="#2E86DE" /><span>Piece d'identite</span><span style={{ marginLeft: 'auto', color: '#27AE60', fontSize: 12, fontWeight: 600 }}>Fourni</span></div>}
              {selected.documents?.assurance && <div style={s.docRow}><FileText size={16} color="#2E86DE" /><span>Assurance</span><span style={{ marginLeft: 'auto', color: '#27AE60', fontSize: 12, fontWeight: 600 }}>Fourni</span></div>}
              {!selected.documents?.permis && !selected.documents?.identite && !selected.documents?.assurance && <div style={{ color: '#adb5bd', fontSize: 13 }}>Aucun document fourni</div>}
            </div>
            <div style={s.detailSection}>
              <div style={s.detailSectionTitle}>Litiges</div>
              {livreurLitiges.length === 0 ? (
                <div style={{ color: '#adb5bd', fontSize: 13 }}>Aucun litige</div>
              ) : livreurLitiges.map((litige) => {
                const statusColors: Record<string, string> = { ouvert: '#F39C12', en_cours: '#2E86DE', resolu: '#27AE60', ferme: '#95A5A6' };
                const statusLabels: Record<string, string> = { ouvert: 'Ouvert', en_cours: 'En cours', resolu: 'Résolu', ferme: 'Fermé' };
                const color = statusColors[litige.status] || '#F39C12';
                return (
                  <div key={litige.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #f5f5f5', fontSize: 13, gap: 8, flexWrap: 'wrap' as const }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={14} color={color} />
                      <span style={{ fontWeight: 600 }}>{litige.motif}</span>
                    </span>
                    <span style={{ color: '#6c757d', fontSize: 12 }}>{litige.commandeId.slice(0, 8)}</span>
                    <span style={{ background: color + '20', color, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{statusLabels[litige.status] || litige.status}</span>
                  </div>
                );
              })}
            </div>
            <div style={s.actionBtns}>
              {selected.status === 'en_attente' && <>
                <button style={s.approveBtn} onClick={() => handleValidation(selected.id, 'approuve')}><CheckCircle size={16} /> Approuver</button>
                <button style={s.refuseBtn} onClick={() => handleValidation(selected.id, 'refuse')}><XCircle size={16} /> Refuser</button>
              </>}
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
            ? `Voulez-vous ${confirmModal.type === 'delete' ? 'supprimer definitivement' : 'archiver'} ce livreur ?`
            : `Voulez-vous ${confirmModal?.type === 'delete' ? 'supprimer definitivement' : 'archiver'} tous les livreurs ?`}
        </p>
      </Modal>

      {toast && <div style={s.toast} onClick={() => setToast(null)}>{toast}</div>}
    </div>
  );
}
