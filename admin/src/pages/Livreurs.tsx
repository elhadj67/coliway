import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, FileText, Star } from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import Modal, { ModalButton } from '@/components/Modal';
import { getLivreurs, validerLivreur, Livreur } from '@/services/api';

const tabs = [
  { key: 'en_attente', label: 'En attente de validation' },
  { key: 'approuve', label: 'Approuves' },
  { key: 'refuse', label: 'Refuses' },
];

const mockLivreurs: Livreur[] = [
  { id: 'L001', nom: 'Martin', prenom: 'Pierre', email: 'pierre.martin@email.com', telephone: '06 12 34 56 78', vehicule: 'Voiture', siret: '123 456 789 00012', note: 4.7, courses: 156, status: 'approuve', documents: { permis: 'permis_martin.pdf', identite: 'id_martin.pdf', assurance: 'assur_martin.pdf' }, createdAt: new Date('2025-06-15') },
  { id: 'L002', nom: 'Leroy', prenom: 'Sophie', email: 'sophie.leroy@email.com', telephone: '06 98 76 54 32', vehicule: 'Scooter', siret: '987 654 321 00034', note: 4.9, courses: 243, status: 'approuve', documents: { permis: 'permis_leroy.pdf', identite: 'id_leroy.pdf', assurance: 'assur_leroy.pdf' }, createdAt: new Date('2025-04-20') },
  { id: 'L003', nom: 'Garnier', prenom: 'Luc', email: 'luc.garnier@email.com', telephone: '06 45 67 89 01', vehicule: 'Velo cargo', siret: '456 789 012 00056', note: 4.5, courses: 89, status: 'approuve', documents: { permis: 'permis_garnier.pdf', identite: 'id_garnier.pdf' }, createdAt: new Date('2025-09-10') },
  { id: 'L004', nom: 'Durand', prenom: 'Marc', email: 'marc.durand@email.com', telephone: '06 23 45 67 89', vehicule: 'Utilitaire', siret: '234 567 890 00078', note: 4.3, courses: 67, status: 'approuve', documents: { permis: 'permis_durand.pdf', identite: 'id_durand.pdf', assurance: 'assur_durand.pdf' }, createdAt: new Date('2025-11-01') },
  { id: 'L005', nom: 'Roux', prenom: 'Antoine', email: 'antoine.roux@email.com', telephone: '06 34 56 78 90', vehicule: 'Voiture', siret: '345 678 901 00090', note: 4.8, courses: 312, status: 'approuve', documents: { permis: 'permis_roux.pdf', identite: 'id_roux.pdf', assurance: 'assur_roux.pdf' }, createdAt: new Date('2025-03-05') },
  { id: 'L006', nom: 'Blanc', prenom: 'Julie', email: 'julie.blanc@email.com', telephone: '06 56 78 90 12', vehicule: 'Scooter', siret: '567 890 123 00012', note: 0, courses: 0, status: 'en_attente', documents: { permis: 'permis_blanc.pdf', identite: 'id_blanc.pdf', assurance: 'assur_blanc.pdf' }, createdAt: new Date('2026-02-26') },
  { id: 'L007', nom: 'Morel', prenom: 'David', email: 'david.morel@email.com', telephone: '06 67 89 01 23', vehicule: 'Voiture', siret: '678 901 234 00034', note: 0, courses: 0, status: 'en_attente', documents: { permis: 'permis_morel.pdf', identite: 'id_morel.pdf' }, createdAt: new Date('2026-02-27') },
  { id: 'L008', nom: 'Faure', prenom: 'Claire', email: 'claire.faure@email.com', telephone: '06 78 90 12 34', vehicule: 'Velo cargo', siret: '789 012 345 00056', note: 0, courses: 0, status: 'en_attente', documents: { identite: 'id_faure.pdf' }, createdAt: new Date('2026-02-28') },
  { id: 'L009', nom: 'Perrin', prenom: 'Nicolas', email: 'nicolas.perrin@email.com', telephone: '06 89 01 23 45', vehicule: 'Utilitaire', siret: '890 123 456 00078', note: 2.1, courses: 5, status: 'refuse', documents: { permis: 'permis_perrin.pdf', identite: 'id_perrin.pdf' }, createdAt: new Date('2025-12-10') },
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
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 14, fontWeight: 600 as const, color: '#1B3A5C',
    marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #f0f0f0',
  },
  detailRow: { display: 'flex', gap: 16, marginBottom: 10 },
  detailLabel: { width: 130, fontSize: 13, fontWeight: 600 as const, color: '#6c757d', flexShrink: 0 },
  detailValue: { fontSize: 13, color: '#1a1a2e' },
  docRow: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
    background: '#f8f9fa', borderRadius: 8, marginBottom: 6, fontSize: 13,
  },
  actionBtns: { display: 'flex', gap: 10, marginTop: 20 },
  approveBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px',
    background: '#27AE60', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600 as const,
    border: 'none', cursor: 'pointer',
  },
  refuseBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px',
    background: '#E74C3C', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600 as const,
    border: 'none', cursor: 'pointer',
  },
  starsWrap: { display: 'inline-flex', alignItems: 'center', gap: 2 },
};

export default function Livreurs() {
  const [activeTab, setActiveTab] = useState('en_attente');
  const [livreurs, setLivreurs] = useState<Livreur[]>(mockLivreurs);
  const [selected, setSelected] = useState<Livreur | null>(null);

  useEffect(() => {
    getLivreurs(activeTab).then((data) => {
      if (data.length > 0) setLivreurs(data);
    });
  }, [activeTab]);

  const filtered = livreurs.filter((l) => l.status === activeTab);

  const handleValidation = async (id: string, status: 'approuve' | 'refuse') => {
    try {
      await validerLivreur(id, status);
    } catch {
      // Firestore may not be configured
    }
    setLivreurs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status } : l))
    );
    setSelected(null);
  };

  const renderStars = (note: number) => {
    const fullStars = Math.floor(note);
    return (
      <span style={s.starsWrap}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={14}
            fill={i < fullStars ? '#F39C12' : 'none'}
            color={i < fullStars ? '#F39C12' : '#ddd'}
          />
        ))}
        <span style={{ marginLeft: 4, fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>
          {note > 0 ? note.toFixed(1) : '-'}
        </span>
      </span>
    );
  };

  const columns: Column<Livreur>[] = [
    { key: 'nom', label: 'Nom', sortable: true, render: (row) => (
      <span style={{ fontWeight: 600 }}>{row.prenom} {row.nom}</span>
    )},
    { key: 'email', label: 'Email', sortable: true },
    { key: 'vehicule', label: 'Vehicule', sortable: true },
    { key: 'siret', label: 'SIRET' },
    { key: 'note', label: 'Note', sortable: true, width: 140, render: (row) => renderStars(row.note) },
    { key: 'courses', label: 'Courses', sortable: true, width: 80, render: (row) => (
      <span style={{ fontWeight: 600 }}>{row.courses}</span>
    )},
    { key: 'status', label: 'Status', width: 110, render: (row) => (
      <StatusBadge status={row.status} size="sm" />
    )},
  ];

  return (
    <div style={s.page} className="fade-in">
      <div style={s.header}>
        <h1 style={s.title}>Livreurs</h1>
        <p style={s.subtitle}>Gestion et validation des livreurs</p>
      </div>

      <div style={s.tabs}>
        {tabs.map((tab) => (
          <button key={tab.key} style={s.tab(activeTab === tab.key)} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
            {tab.key === 'en_attente' && (
              <span style={{
                marginLeft: 8, background: '#E74C3C', color: '#fff', borderRadius: 10,
                padding: '1px 7px', fontSize: 11, fontWeight: 700,
              }}>
                {livreurs.filter((l) => l.status === 'en_attente').length}
              </span>
            )}
          </button>
        ))}
      </div>

      <DataTable<Livreur>
        columns={columns}
        data={filtered}
        onRowClick={(row) => setSelected(row)}
        searchPlaceholder="Rechercher par nom, email..."
      />

      {/* Detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.prenom} ${selected.nom}` : ''}
        width={620}
      >
        {selected && (
          <div>
            {/* Personal info */}
            <div style={s.detailSection}>
              <div style={s.detailSectionTitle}>Informations personnelles</div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Nom complet</span>
                <span style={s.detailValue}>{selected.prenom} {selected.nom}</span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Email</span>
                <span style={s.detailValue}>{selected.email}</span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Telephone</span>
                <span style={s.detailValue}>{selected.telephone}</span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Vehicule</span>
                <span style={s.detailValue}>{selected.vehicule}</span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>SIRET</span>
                <span style={s.detailValue}>{selected.siret}</span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Note</span>
                <span style={s.detailValue}>{renderStars(selected.note)}</span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Courses effectuees</span>
                <span style={{ ...s.detailValue, fontWeight: 700 }}>{selected.courses}</span>
              </div>
              <div style={s.detailRow}>
                <span style={s.detailLabel}>Status</span>
                <StatusBadge status={selected.status} />
              </div>
            </div>

            {/* Documents */}
            <div style={s.detailSection}>
              <div style={s.detailSectionTitle}>Documents</div>
              {selected.documents?.permis && (
                <div style={s.docRow}>
                  <FileText size={16} color="#2E86DE" />
                  <span>Permis de conduire</span>
                  <span style={{ marginLeft: 'auto', color: '#27AE60', fontSize: 12, fontWeight: 600 }}>Fourni</span>
                </div>
              )}
              {selected.documents?.identite && (
                <div style={s.docRow}>
                  <FileText size={16} color="#2E86DE" />
                  <span>Piece d'identite</span>
                  <span style={{ marginLeft: 'auto', color: '#27AE60', fontSize: 12, fontWeight: 600 }}>Fourni</span>
                </div>
              )}
              {selected.documents?.assurance && (
                <div style={s.docRow}>
                  <FileText size={16} color="#2E86DE" />
                  <span>Assurance</span>
                  <span style={{ marginLeft: 'auto', color: '#27AE60', fontSize: 12, fontWeight: 600 }}>Fourni</span>
                </div>
              )}
              {!selected.documents?.permis && !selected.documents?.identite && !selected.documents?.assurance && (
                <div style={{ color: '#adb5bd', fontSize: 13 }}>Aucun document fourni</div>
              )}
            </div>

            {/* Actions for pending */}
            {selected.status === 'en_attente' && (
              <div style={s.actionBtns}>
                <button style={s.approveBtn} onClick={() => handleValidation(selected.id, 'approuve')}>
                  <CheckCircle size={16} /> Approuver
                </button>
                <button style={s.refuseBtn} onClick={() => handleValidation(selected.id, 'refuse')}>
                  <XCircle size={16} /> Refuser
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
