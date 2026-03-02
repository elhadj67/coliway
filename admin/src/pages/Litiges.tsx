import React, { useState, useEffect } from 'react';
import { MessageCircle, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import Modal, { ModalButton } from '@/components/Modal';
import { getLitiges, updateLitige, Litige } from '@/services/api';

const statusTabs = [
  { key: 'tous', label: 'Tous' },
  { key: 'ouvert', label: 'Ouverts' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'resolu', label: 'Resolus' },
  { key: 'ferme', label: 'Fermes' },
];

const mockLitiges: Litige[] = [
  {
    id: 'LIT-201', commandeId: 'CMD-1236', clientId: 'c3', clientNom: 'Alice Moreau',
    livreurId: 'l4', livreurNom: 'Marc Durand', motif: 'Colis endommage',
    description: 'Le colis est arrive avec des dommages visibles sur l\'emballage. Le contenu (vase en ceramique) est casse.',
    status: 'ouvert', createdAt: new Date('2026-02-27T14:30:00'),
  },
  {
    id: 'LIT-200', commandeId: 'CMD-1230', clientId: 'c6', clientNom: 'Hugo Simon',
    livreurId: 'l1', livreurNom: 'Pierre Martin', motif: 'Livraison non effectuee',
    description: 'Le livreur indique avoir livre mais le client n\'a rien recu. Pas de photo de livraison.',
    status: 'en_cours', createdAt: new Date('2026-02-26T10:15:00'),
  },
  {
    id: 'LIT-199', commandeId: 'CMD-1218', clientId: 'c1', clientNom: 'Marie Dupont',
    livreurId: 'l5', livreurNom: 'Antoine Roux', motif: 'Retard de livraison',
    description: 'Livraison prevue a 14h, effectuee a 18h30. Le client demande un dedommagement.',
    status: 'resolu', createdAt: new Date('2026-02-24T09:00:00'),
  },
  {
    id: 'LIT-198', commandeId: 'CMD-1210', clientId: 'c4', clientNom: 'Thomas Petit',
    livreurId: 'l3', livreurNom: 'Luc Garnier', motif: 'Mauvais colis livre',
    description: 'Le client a recu un colis qui ne lui etait pas destine. Confusion lors de l\'enlevement.',
    status: 'ouvert', createdAt: new Date('2026-02-23T16:45:00'),
  },
  {
    id: 'LIT-197', commandeId: 'CMD-1195', clientId: 'c5', clientNom: 'Emma Robert',
    livreurId: 'l2', livreurNom: 'Sophie Leroy', motif: 'Comportement livreur',
    description: 'Le client signale un comportement impoli du livreur lors de la remise du colis.',
    status: 'ferme', createdAt: new Date('2026-02-20T11:30:00'),
  },
  {
    id: 'LIT-196', commandeId: 'CMD-1188', clientId: 'c7', clientNom: 'Camille Girard',
    livreurId: 'l1', livreurNom: 'Pierre Martin', motif: 'Surfacturation',
    description: 'Le client estime que le prix facture ne correspond pas a la distance parcourue. Ecart de 8 EUR.',
    status: 'en_cours', createdAt: new Date('2026-02-19T08:20:00'),
  },
];

const s = {
  page: { padding: '28px 32px', maxWidth: 1400 },
  header: { marginBottom: 24 },
  title: { fontSize: 26, fontWeight: 700 as const, color: '#1a1a2e' },
  subtitle: { fontSize: 14, color: '#6c757d', marginTop: 2 },
  tabs: {
    display: 'flex', gap: 4, marginBottom: 20, background: '#ffffff',
    borderRadius: 10, padding: 4, border: '1px solid #f0f0f0', width: 'fit-content' as const,
  },
  tab: (active: boolean) => ({
    padding: '8px 18px', borderRadius: 7, fontSize: 13, fontWeight: 500 as const,
    color: active ? '#ffffff' : '#6c757d', background: active ? '#1B3A5C' : 'transparent',
    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
  }),
  detailSection: { marginBottom: 20 },
  detailSectionTitle: {
    fontSize: 14, fontWeight: 600 as const, color: '#1B3A5C',
    marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #f0f0f0',
    display: 'flex', alignItems: 'center', gap: 8,
  },
  detailRow: { display: 'flex', gap: 16, marginBottom: 10 },
  detailLabel: { width: 120, fontSize: 13, fontWeight: 600 as const, color: '#6c757d', flexShrink: 0 },
  detailValue: { fontSize: 13, color: '#1a1a2e' },
  descriptionBox: {
    padding: '14px 16px', background: '#f8f9fa', borderRadius: 8, fontSize: 13,
    color: '#1a1a2e', lineHeight: 1.6, border: '1px solid #f0f0f0', marginBottom: 20,
  },
  actionGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16,
  },
  actionBtn: (bg: string, color: string) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '11px 16px', background: bg, color, borderRadius: 8, fontSize: 13,
    fontWeight: 600 as const, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
  }),
  statusTimeline: {
    display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, padding: '12px 16px',
    background: '#f8f9fa', borderRadius: 8, fontSize: 12, color: '#6c757d',
  },
  timelineDot: (active: boolean) => ({
    width: 10, height: 10, borderRadius: '50%',
    background: active ? '#27AE60' : '#ddd',
  }),
  timelineLine: (active: boolean) => ({
    width: 30, height: 2, background: active ? '#27AE60' : '#ddd',
  }),
};

export default function Litiges() {
  const [litiges, setLitiges] = useState<Litige[]>(mockLitiges);
  const [activeTab, setActiveTab] = useState('tous');
  const [selected, setSelected] = useState<Litige | null>(null);

  useEffect(() => {
    getLitiges().then((data) => {
      if (data.length > 0) setLitiges(data);
    });
  }, []);

  const filtered = activeTab === 'tous'
    ? litiges
    : litiges.filter((l) => l.status === activeTab);

  const handleAction = async (id: string, action: string) => {
    let newStatus: Litige['status'] = 'en_cours';
    if (action === 'resolve') newStatus = 'resolu';
    if (action === 'close') newStatus = 'ferme';

    try {
      await updateLitige(id, { status: newStatus });
    } catch {
      // Firestore may not be configured
    }

    setLitiges((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
    );
    if (selected && selected.id === id) {
      setSelected({ ...selected, status: newStatus });
    }
  };

  const statusSteps = ['ouvert', 'en_cours', 'resolu', 'ferme'];
  const getStepIndex = (status: string) => statusSteps.indexOf(status);

  const columns: Column<Litige>[] = [
    { key: 'id', label: 'ID', sortable: true, width: 100, render: (row) => (
      <span style={{ fontWeight: 600, color: '#E74C3C' }}>{row.id}</span>
    )},
    { key: 'commandeId', label: 'Commande', sortable: true, render: (row) => (
      <span style={{ color: '#2E86DE', fontWeight: 500 }}>{row.commandeId}</span>
    )},
    { key: 'clientNom', label: 'Client', sortable: true },
    { key: 'livreurNom', label: 'Livreur', sortable: true },
    { key: 'motif', label: 'Motif', sortable: true },
    { key: 'status', label: 'Status', width: 110, render: (row) => (
      <StatusBadge status={row.status} size="sm" />
    )},
    { key: 'createdAt', label: 'Date', sortable: true, width: 100, render: (row) => {
      const d = row.createdAt instanceof Date ? row.createdAt : new Date();
      return d.toLocaleDateString('fr-FR');
    }},
  ];

  return (
    <div style={s.page} className="fade-in">
      <div style={s.header}>
        <h1 style={s.title}>Litiges</h1>
        <p style={s.subtitle}>Gestion des reclamations et differends</p>
      </div>

      <div style={s.tabs}>
        {statusTabs.map((tab) => (
          <button key={tab.key} style={s.tab(activeTab === tab.key)} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
            {tab.key === 'ouvert' && (
              <span style={{
                marginLeft: 8, background: '#E74C3C', color: '#fff', borderRadius: 10,
                padding: '1px 7px', fontSize: 11, fontWeight: 700,
              }}>
                {litiges.filter((l) => l.status === 'ouvert').length}
              </span>
            )}
          </button>
        ))}
      </div>

      <DataTable<Litige>
        columns={columns}
        data={filtered}
        onRowClick={(row) => setSelected(row)}
        searchPlaceholder="Rechercher par ID, client, livreur, motif..."
      />

      {/* Detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Litige ${selected.id}` : ''}
        width={620}
      >
        {selected && (
          <div>
            {/* Status timeline */}
            <div style={s.statusTimeline}>
              {statusSteps.map((step, idx) => (
                <React.Fragment key={step}>
                  <div style={{ textAlign: 'center' as const }}>
                    <div style={s.timelineDot(getStepIndex(selected.status) >= idx)} />
                    <div style={{ marginTop: 4, fontSize: 10, textTransform: 'capitalize' as const }}>
                      {step === 'en_cours' ? 'Traitement' : step === 'resolu' ? 'Resolu' : step === 'ferme' ? 'Ferme' : 'Ouvert'}
                    </div>
                  </div>
                  {idx < statusSteps.length - 1 && (
                    <div style={s.timelineLine(getStepIndex(selected.status) > idx)} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Info */}
            <div style={{ ...s.detailSection, marginTop: 20 }}>
              <div style={s.detailSectionTitle}>
                <AlertTriangle size={16} color="#E74C3C" />
                Informations du litige
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Commande</span>
                <span style={{ ...s.detailValue, color: '#2E86DE', fontWeight: 600 }}>{selected.commandeId}</span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Motif</span>
                <span style={{ ...s.detailValue, fontWeight: 600 }}>{selected.motif}</span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Status</span>
                <StatusBadge status={selected.status} />
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Date</span>
                <span style={s.detailValue}>
                  {selected.createdAt instanceof Date
                    ? selected.createdAt.toLocaleString('fr-FR')
                    : '-'}
                </span>
              </div>
            </div>

            {/* Description */}
            <div style={s.descriptionBox}>
              {selected.description}
            </div>

            {/* Parties */}
            <div style={s.detailSection}>
              <div style={s.detailSectionTitle}>Parties concernees</div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Client</span>
                <span style={s.detailValue}>{selected.clientNom}</span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Livreur</span>
                <span style={s.detailValue}>{selected.livreurNom}</span>
              </div>
            </div>

            {/* Actions */}
            {selected.status !== 'ferme' && selected.status !== 'resolu' && (
              <div>
                <div style={s.detailSectionTitle}>Actions</div>
                <div style={s.actionGrid}>
                  <button
                    style={s.actionBtn('#E8F4FD', '#1B4F8A')}
                    onClick={() => alert('Contacter le client: ' + selected.clientNom)}
                  >
                    <MessageCircle size={16} /> Contacter client
                  </button>
                  <button
                    style={s.actionBtn('#F0E0FF', '#6C3483')}
                    onClick={() => alert('Contacter le livreur: ' + selected.livreurNom)}
                  >
                    <MessageCircle size={16} /> Contacter livreur
                  </button>
                  <button
                    style={s.actionBtn('#FFF3CD', '#856404')}
                    onClick={() => {
                      if (confirm('Confirmer le remboursement pour cette commande ?')) {
                        handleAction(selected.id, 'resolve');
                      }
                    }}
                  >
                    <RefreshCw size={16} /> Rembourser
                  </button>
                  <button
                    style={s.actionBtn('#D4EDDA', '#155724')}
                    onClick={() => handleAction(selected.id, 'resolve')}
                  >
                    <CheckCircle size={16} /> Marquer resolu
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
