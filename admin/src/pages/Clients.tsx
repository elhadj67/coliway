import React, { useState, useEffect } from 'react';
import { Mail, Phone, Calendar, Package, Trash2, Archive, AlertTriangle } from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import Modal, { ModalButton } from '@/components/Modal';
import { getClients, getCommandes, deleteOneClient, archiveOneClient, deleteClients, archiveClients, getLitigesByUser, Client, Commande, Litige } from '@/services/api';
import StatusBadge from '@/components/StatusBadge';

const s = {
  page: { padding: '28px 32px', maxWidth: 1400 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 },
  title: { fontSize: 26, fontWeight: 700 as const, color: '#1a1a2e' },
  subtitle: { fontSize: 14, color: '#6c757d', marginTop: 2 },
  btnRow: { display: 'flex', gap: 8 },
  archiveAllBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#f0f7ff', color: '#2E86DE', borderRadius: 8, fontSize: 13, fontWeight: 500 as const, border: '1px solid #d0e4f7', cursor: 'pointer' },
  deleteAllBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#fff5f5', color: '#E74C3C', borderRadius: 8, fontSize: 13, fontWeight: 500 as const, border: '1px solid #f5d0d0', cursor: 'pointer' },
  detailSection: { marginBottom: 20 },
  detailSectionTitle: { fontSize: 14, fontWeight: 600 as const, color: '#1B3A5C', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' },
  infoCard: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8f9fa', borderRadius: 8, marginBottom: 6, fontSize: 13 },
  orderRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #f5f5f5', fontSize: 13, gap: 8, flexWrap: 'wrap' as const },
  actionBtns: { display: 'flex', gap: 8, marginTop: 20, borderTop: '1px solid #f0f0f0', paddingTop: 16 },
  toast: { position: 'fixed' as const, bottom: 24, right: 24, background: '#1a1a2e', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500 as const, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', cursor: 'pointer', zIndex: 999 },
};

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const [clientOrders, setClientOrders] = useState<Commande[]>([]);
  const [clientLitiges, setClientLitiges] = useState<Litige[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ type: 'delete' | 'archive'; id?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchData = () => {
    getClients().then(setClients);
  };

  useEffect(() => { fetchData(); }, []);

  // When a client is selected, fetch their orders and litiges
  useEffect(() => {
    if (selected) {
      getCommandes({}).then((all) => {
        setClientOrders(all.filter((c) => c.clientId === selected.id).slice(0, 5));
      });
      getLitigesByUser(selected.id).then(setClientLitiges);
    } else {
      setClientOrders([]);
      setClientLitiges([]);
    }
  }, [selected]);

  const handleAction = async () => {
    if (!confirmModal) return;
    setLoading(true);
    try {
      if (confirmModal.id) {
        if (confirmModal.type === 'delete') await deleteOneClient(confirmModal.id);
        else await archiveOneClient(confirmModal.id);
        setToast(`Client ${confirmModal.type === 'delete' ? 'supprime' : 'archive'}`);
      } else {
        const count = confirmModal.type === 'delete' ? await deleteClients() : await archiveClients();
        setToast(`${count} clients ${confirmModal.type === 'delete' ? 'supprimes' : 'archives'}`);
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

  const columns: Column<Client>[] = [
    { key: 'nom', label: 'Nom', sortable: true, render: (row) => <span style={{ fontWeight: 600 }}>{row.prenom} {row.nom}</span> },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'telephone', label: 'Telephone' },
    { key: 'dateInscription', label: 'Inscription', sortable: true, render: (row) => {
      const d = row.dateInscription instanceof Date ? row.dateInscription : row.dateInscription && 'toDate' in row.dateInscription ? (row.dateInscription as any).toDate() : new Date();
      return d.toLocaleDateString('fr-FR');
    }},
    { key: 'nbCommandes', label: 'Commandes', sortable: true, width: 110, render: (row) => <span style={{ fontWeight: 700, color: row.nbCommandes > 10 ? '#27AE60' : '#1a1a2e' }}>{row.nbCommandes}</span> },
  ];

  return (
    <div style={s.page} className="fade-in">
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Clients</h1>
          <p style={s.subtitle}>Gestion des comptes clients</p>
        </div>
        <div style={s.btnRow}>
          <button style={s.archiveAllBtn} onClick={() => setConfirmModal({ type: 'archive' })}><Archive size={15} /> Tout archiver</button>
          <button style={s.deleteAllBtn} onClick={() => setConfirmModal({ type: 'delete' })}><Trash2 size={15} /> Tout supprimer</button>
        </div>
      </div>

      <DataTable<Client> columns={columns} data={clients} onRowClick={(row) => setSelected(row)} searchPlaceholder="Rechercher par nom, email..." />

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.prenom} ${selected.nom}` : ''} width={580}>
        {selected && (
          <div>
            <div style={s.detailSection}>
              <div style={s.detailSectionTitle}>Informations du client</div>
              <div style={s.infoCard}><Mail size={16} color="#2E86DE" /><span>{selected.email}</span></div>
              <div style={s.infoCard}><Phone size={16} color="#27AE60" /><span>{selected.telephone}</span></div>
              <div style={s.infoCard}><Calendar size={16} color="#F39C12" /><span>Inscrit le {selected.dateInscription instanceof Date ? selected.dateInscription.toLocaleDateString('fr-FR') : (selected.dateInscription as any)?.toDate?.()?.toLocaleDateString('fr-FR') ?? '-'}</span></div>
              <div style={s.infoCard}><Package size={16} color="#8E44AD" /><span style={{ fontWeight: 600 }}>{selected.nbCommandes} commandes</span></div>
            </div>
            <div style={s.detailSection}>
              <div style={s.detailSectionTitle}>Commandes recentes</div>
              {clientOrders.length === 0 ? (
                <div style={{ color: '#adb5bd', fontSize: 13 }}>Aucune commande</div>
              ) : clientOrders.map((order) => (
                <div key={order.id} style={s.orderRow}>
                  <span style={{ fontWeight: 600, color: '#2E86DE' }}>{order.id.slice(0, 8)}</span>
                  <span style={{ color: '#6c757d' }}>{order.typeColis}</span>
                  <span style={{ fontWeight: 600 }}>{(order.prix || 0).toFixed(2)} EUR</span>
                  <StatusBadge status={order.status} size="sm" />
                </div>
              ))}
            </div>
            <div style={s.detailSection}>
              <div style={s.detailSectionTitle}>Litiges</div>
              {clientLitiges.length === 0 ? (
                <div style={{ color: '#adb5bd', fontSize: 13 }}>Aucun litige</div>
              ) : clientLitiges.map((litige) => {
                const statusColors: Record<string, string> = { ouvert: '#F39C12', en_cours: '#2E86DE', resolu: '#27AE60', ferme: '#95A5A6' };
                const statusLabels: Record<string, string> = { ouvert: 'Ouvert', en_cours: 'En cours', resolu: 'Résolu', ferme: 'Fermé' };
                const color = statusColors[litige.status] || '#F39C12';
                return (
                  <div key={litige.id} style={s.orderRow}>
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
            ? `Voulez-vous ${confirmModal.type === 'delete' ? 'supprimer definitivement' : 'archiver'} ce client ?`
            : `Voulez-vous ${confirmModal?.type === 'delete' ? 'supprimer definitivement' : 'archiver'} tous les clients ?`}
        </p>
      </Modal>

      {toast && <div style={s.toast} onClick={() => setToast(null)}>{toast}</div>}
    </div>
  );
}
