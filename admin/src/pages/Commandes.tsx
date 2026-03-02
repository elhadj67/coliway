import React, { useState, useEffect } from 'react';
import { Download, Eye } from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { getCommandes, exportData, Commande } from '@/services/api';

const statusTabs = [
  { key: 'toutes', label: 'Toutes' },
  { key: 'en_attente', label: 'En attente' },
  { key: 'en_transit', label: 'En cours' },
  { key: 'livree', label: 'Livrees' },
  { key: 'annulee', label: 'Annulees' },
];

// Mock data
const mockCommandes: Commande[] = [
  { id: 'CMD-1247', clientId: 'c1', clientNom: 'Marie Dupont', livreurId: 'l1', livreurNom: 'Pierre Martin', typeColis: 'Petit Colis', adresseDepart: '12 Rue de Rivoli, Paris', adresseArrivee: '45 Avenue des Champs-Elysees, Paris', prix: 18.50, status: 'en_transit', createdAt: new Date('2026-02-28T14:32:00') },
  { id: 'CMD-1246', clientId: 'c2', clientNom: 'Jean Bernard', livreurId: 'l2', livreurNom: 'Sophie Leroy', typeColis: 'Enveloppe', adresseDepart: '8 Rue de la Paix, Paris', adresseArrivee: '22 Boulevard Haussmann, Paris', prix: 24.00, status: 'livree', createdAt: new Date('2026-02-28T13:15:00') },
  { id: 'CMD-1245', clientId: 'c3', clientNom: 'Alice Moreau', typeColis: 'Moyen Colis', adresseDepart: '3 Place de la Concorde, Paris', adresseArrivee: '17 Rue du Faubourg Saint-Honore, Paris', prix: 12.00, status: 'en_attente', createdAt: new Date('2026-02-28T12:48:00') },
  { id: 'CMD-1244', clientId: 'c4', clientNom: 'Thomas Petit', livreurId: 'l3', livreurNom: 'Luc Garnier', typeColis: 'Gros Colis', adresseDepart: '56 Avenue Montaigne, Paris', adresseArrivee: '9 Rue de Sevres, Paris', prix: 35.50, status: 'enlevee', createdAt: new Date('2026-02-28T11:20:00') },
  { id: 'CMD-1243', clientId: 'c5', clientNom: 'Emma Robert', livreurId: 'l4', livreurNom: 'Marc Durand', typeColis: 'Petit Colis', adresseDepart: '28 Rue de Clichy, Paris', adresseArrivee: '14 Rue Lepic, Paris', prix: 15.00, status: 'livree', createdAt: new Date('2026-02-28T10:45:00') },
  { id: 'CMD-1242', clientId: 'c6', clientNom: 'Hugo Simon', typeColis: 'Enveloppe', adresseDepart: '41 Rue Oberkampf, Paris', adresseArrivee: '6 Rue de Turenne, Paris', prix: 22.00, status: 'annulee', createdAt: new Date('2026-02-28T09:30:00') },
  { id: 'CMD-1241', clientId: 'c7', clientNom: 'Camille Girard', livreurId: 'l5', livreurNom: 'Antoine Roux', typeColis: 'Palette', adresseDepart: '15 Quai de la Tournelle, Paris', adresseArrivee: '30 Boulevard Saint-Germain, Paris', prix: 85.00, status: 'en_transit', createdAt: new Date('2026-02-28T08:15:00') },
  { id: 'CMD-1240', clientId: 'c8', clientNom: 'Lucas Fournier', livreurId: 'l2', livreurNom: 'Sophie Leroy', typeColis: 'Moyen Colis', adresseDepart: '7 Rue des Rosiers, Paris', adresseArrivee: '19 Rue de Bretagne, Paris', prix: 28.00, status: 'livree', createdAt: new Date('2026-02-27T16:40:00') },
  { id: 'CMD-1239', clientId: 'c9', clientNom: 'Lea Mercier', livreurId: 'l1', livreurNom: 'Pierre Martin', typeColis: 'Petit Colis', adresseDepart: '23 Rue Mouffetard, Paris', adresseArrivee: '11 Place d\'Italie, Paris', prix: 16.50, status: 'livree', createdAt: new Date('2026-02-27T15:10:00') },
  { id: 'CMD-1238', clientId: 'c10', clientNom: 'Nathan Bonnet', typeColis: 'Gros Colis', adresseDepart: '35 Avenue de Wagram, Paris', adresseArrivee: '48 Rue de Ponthieu, Paris', prix: 42.00, status: 'en_attente', createdAt: new Date('2026-02-27T14:22:00') },
  { id: 'CMD-1237', clientId: 'c1', clientNom: 'Marie Dupont', livreurId: 'l3', livreurNom: 'Luc Garnier', typeColis: 'Enveloppe', adresseDepart: '12 Rue de Rivoli, Paris', adresseArrivee: '5 Rue Saint-Honore, Paris', prix: 9.50, status: 'livree', createdAt: new Date('2026-02-27T12:55:00') },
  { id: 'CMD-1236', clientId: 'c3', clientNom: 'Alice Moreau', livreurId: 'l4', livreurNom: 'Marc Durand', typeColis: 'Petit Colis', adresseDepart: '3 Place de la Concorde, Paris', adresseArrivee: '26 Rue du Bac, Paris', prix: 14.00, status: 'echouee', createdAt: new Date('2026-02-27T11:30:00') },
];

const s = {
  page: {
    padding: '28px 32px',
    maxWidth: 1400,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 700 as const,
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 2,
  },
  exportBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    background: '#1B3A5C',
    color: '#ffffff',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600 as const,
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  tabs: {
    display: 'flex',
    gap: 4,
    marginBottom: 20,
    background: '#ffffff',
    borderRadius: 10,
    padding: 4,
    border: '1px solid #f0f0f0',
    width: 'fit-content' as const,
  },
  tab: (active: boolean) => ({
    padding: '8px 18px',
    borderRadius: 7,
    fontSize: 13,
    fontWeight: 500 as const,
    color: active ? '#ffffff' : '#6c757d',
    background: active ? '#1B3A5C' : 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),
  detailRow: {
    display: 'flex',
    gap: 16,
    marginBottom: 14,
  },
  detailLabel: {
    width: 120,
    fontSize: 13,
    fontWeight: 600 as const,
    color: '#6c757d',
    flexShrink: 0,
  },
  detailValue: {
    fontSize: 13,
    color: '#1a1a2e',
  },
};

export default function Commandes() {
  const [activeTab, setActiveTab] = useState('toutes');
  const [commandes, setCommandes] = useState<Commande[]>(mockCommandes);
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);

  useEffect(() => {
    getCommandes({ status: activeTab }).then((data) => {
      if (data.length > 0) setCommandes(data);
    });
  }, [activeTab]);

  const filtered =
    activeTab === 'toutes'
      ? commandes
      : commandes.filter((c) => c.status === activeTab);

  const columns: Column<Commande>[] = [
    { key: 'id', label: 'ID', sortable: true, width: 110, render: (row) => (
      <span style={{ fontWeight: 600, color: '#2E86DE' }}>{row.id}</span>
    )},
    { key: 'clientNom', label: 'Client', sortable: true },
    { key: 'livreurNom', label: 'Livreur', sortable: true, render: (row) => row.livreurNom || '-' },
    { key: 'typeColis', label: 'Type colis', sortable: true },
    { key: 'adresseDepart', label: 'Depart', render: (row) => (
      <span title={row.adresseDepart}>{row.adresseDepart}</span>
    )},
    { key: 'adresseArrivee', label: 'Arrivee', render: (row) => (
      <span title={row.adresseArrivee}>{row.adresseArrivee}</span>
    )},
    { key: 'prix', label: 'Prix', sortable: true, width: 90, render: (row) => (
      <span style={{ fontWeight: 600 }}>{row.prix.toFixed(2)} EUR</span>
    )},
    { key: 'status', label: 'Status', width: 110, render: (row) => (
      <StatusBadge status={row.status} size="sm" />
    )},
    { key: 'createdAt', label: 'Date', sortable: true, width: 100, render: (row) => {
      const d = row.createdAt instanceof Date ? row.createdAt : new Date();
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }},
  ];

  const handleExport = () => {
    const rows = filtered.map((c) => ({
      ID: c.id,
      Client: c.clientNom,
      Livreur: c.livreurNom || '',
      TypeColis: c.typeColis,
      Depart: c.adresseDepart,
      Arrivee: c.adresseArrivee,
      Prix: c.prix,
      Status: c.status,
    }));
    exportData(rows, 'commandes');
  };

  return (
    <div style={s.page} className="fade-in">
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Commandes</h1>
          <p style={s.subtitle}>Gestion de toutes les commandes</p>
        </div>
        <button
          style={s.exportBtn}
          onClick={handleExport}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#244a72';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#1B3A5C';
          }}
        >
          <Download size={16} />
          Exporter CSV
        </button>
      </div>

      {/* Status tabs */}
      <div style={s.tabs}>
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            style={s.tab(activeTab === tab.key)}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <DataTable<Commande>
        columns={columns}
        data={filtered}
        onRowClick={(row) => setSelectedCommande(row)}
        searchPlaceholder="Rechercher par ID, client, livreur..."
      />

      {/* Detail modal */}
      <Modal
        open={!!selectedCommande}
        onClose={() => setSelectedCommande(null)}
        title={`Commande ${selectedCommande?.id || ''}`}
        width={600}
      >
        {selectedCommande && (
          <div>
            <div style={s.detailRow}>
              <span style={s.detailLabel}>Status</span>
              <StatusBadge status={selectedCommande.status} />
            </div>
            <div style={s.detailRow}>
              <span style={s.detailLabel}>Client</span>
              <span style={s.detailValue}>{selectedCommande.clientNom}</span>
            </div>
            <div style={s.detailRow}>
              <span style={s.detailLabel}>Livreur</span>
              <span style={s.detailValue}>{selectedCommande.livreurNom || 'Non assigne'}</span>
            </div>
            <div style={s.detailRow}>
              <span style={s.detailLabel}>Type de colis</span>
              <span style={s.detailValue}>{selectedCommande.typeColis}</span>
            </div>
            <div style={s.detailRow}>
              <span style={s.detailLabel}>Depart</span>
              <span style={s.detailValue}>{selectedCommande.adresseDepart}</span>
            </div>
            <div style={s.detailRow}>
              <span style={s.detailLabel}>Arrivee</span>
              <span style={s.detailValue}>{selectedCommande.adresseArrivee}</span>
            </div>
            <div style={s.detailRow}>
              <span style={s.detailLabel}>Prix</span>
              <span style={{ ...s.detailValue, fontWeight: 700, fontSize: 16 }}>
                {selectedCommande.prix.toFixed(2)} EUR
              </span>
            </div>
            <div style={s.detailRow}>
              <span style={s.detailLabel}>Date</span>
              <span style={s.detailValue}>
                {selectedCommande.createdAt instanceof Date
                  ? selectedCommande.createdAt.toLocaleString('fr-FR')
                  : '-'}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
