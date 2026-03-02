import React, { useState, useEffect } from 'react';
import { Mail, Phone, Calendar, Package } from 'lucide-react';
import DataTable, { Column } from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { getClients, Client } from '@/services/api';

const mockClients: Client[] = [
  { id: 'C001', nom: 'Dupont', prenom: 'Marie', email: 'marie.dupont@email.com', telephone: '06 11 22 33 44', dateInscription: new Date('2025-03-10'), nbCommandes: 24 },
  { id: 'C002', nom: 'Bernard', prenom: 'Jean', email: 'jean.bernard@email.com', telephone: '06 22 33 44 55', dateInscription: new Date('2025-05-22'), nbCommandes: 12 },
  { id: 'C003', nom: 'Moreau', prenom: 'Alice', email: 'alice.moreau@email.com', telephone: '06 33 44 55 66', dateInscription: new Date('2025-07-14'), nbCommandes: 18 },
  { id: 'C004', nom: 'Petit', prenom: 'Thomas', email: 'thomas.petit@email.com', telephone: '06 44 55 66 77', dateInscription: new Date('2025-08-03'), nbCommandes: 7 },
  { id: 'C005', nom: 'Robert', prenom: 'Emma', email: 'emma.robert@email.com', telephone: '06 55 66 77 88', dateInscription: new Date('2025-09-18'), nbCommandes: 31 },
  { id: 'C006', nom: 'Simon', prenom: 'Hugo', email: 'hugo.simon@email.com', telephone: '06 66 77 88 99', dateInscription: new Date('2025-10-25'), nbCommandes: 5 },
  { id: 'C007', nom: 'Girard', prenom: 'Camille', email: 'camille.girard@email.com', telephone: '06 77 88 99 00', dateInscription: new Date('2025-11-12'), nbCommandes: 15 },
  { id: 'C008', nom: 'Fournier', prenom: 'Lucas', email: 'lucas.fournier@email.com', telephone: '06 88 99 00 11', dateInscription: new Date('2025-12-01'), nbCommandes: 9 },
  { id: 'C009', nom: 'Mercier', prenom: 'Lea', email: 'lea.mercier@email.com', telephone: '06 99 00 11 22', dateInscription: new Date('2026-01-15'), nbCommandes: 3 },
  { id: 'C010', nom: 'Bonnet', prenom: 'Nathan', email: 'nathan.bonnet@email.com', telephone: '06 00 11 22 33', dateInscription: new Date('2026-02-20'), nbCommandes: 1 },
];

const mockOrders = [
  { id: 'CMD-1247', typeColis: 'Petit Colis', prix: 18.50, status: 'en_transit', date: '28/02/2026' },
  { id: 'CMD-1237', typeColis: 'Enveloppe', prix: 9.50, status: 'livree', date: '27/02/2026' },
  { id: 'CMD-1225', typeColis: 'Moyen Colis', prix: 28.00, status: 'livree', date: '25/02/2026' },
  { id: 'CMD-1210', typeColis: 'Petit Colis', prix: 14.00, status: 'livree', date: '23/02/2026' },
];

const s = {
  page: { padding: '28px 32px', maxWidth: 1400 },
  header: { marginBottom: 24 },
  title: { fontSize: 26, fontWeight: 700 as const, color: '#1a1a2e' },
  subtitle: { fontSize: 14, color: '#6c757d', marginTop: 2 },
  detailSection: { marginBottom: 20 },
  detailSectionTitle: {
    fontSize: 14, fontWeight: 600 as const, color: '#1B3A5C',
    marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #f0f0f0',
  },
  detailRow: { display: 'flex', gap: 16, marginBottom: 10 },
  detailLabel: { width: 140, fontSize: 13, fontWeight: 600 as const, color: '#6c757d', flexShrink: 0 },
  detailValue: { fontSize: 13, color: '#1a1a2e' },
  infoCard: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
    background: '#f8f9fa', borderRadius: 8, marginBottom: 6, fontSize: 13,
  },
  orderRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px', borderBottom: '1px solid #f5f5f5', fontSize: 13,
  },
};

export default function Clients() {
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [selected, setSelected] = useState<Client | null>(null);

  useEffect(() => {
    getClients().then((data) => {
      if (data.length > 0) setClients(data);
    });
  }, []);

  const columns: Column<Client>[] = [
    { key: 'nom', label: 'Nom', sortable: true, render: (row) => (
      <span style={{ fontWeight: 600 }}>{row.prenom} {row.nom}</span>
    )},
    { key: 'email', label: 'Email', sortable: true },
    { key: 'telephone', label: 'Telephone' },
    { key: 'dateInscription', label: 'Date inscription', sortable: true, render: (row) => {
      const d = row.dateInscription instanceof Date ? row.dateInscription : new Date();
      return d.toLocaleDateString('fr-FR');
    }},
    { key: 'nbCommandes', label: 'Nb commandes', sortable: true, width: 120, render: (row) => (
      <span style={{
        fontWeight: 700, color: row.nbCommandes > 10 ? '#27AE60' : '#1a1a2e',
      }}>
        {row.nbCommandes}
      </span>
    )},
  ];

  return (
    <div style={s.page} className="fade-in">
      <div style={s.header}>
        <h1 style={s.title}>Clients</h1>
        <p style={s.subtitle}>Gestion des comptes clients</p>
      </div>

      <DataTable<Client>
        columns={columns}
        data={clients}
        onRowClick={(row) => setSelected(row)}
        searchPlaceholder="Rechercher par nom, email..."
      />

      {/* Detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.prenom} ${selected.nom}` : ''}
        width={580}
      >
        {selected && (
          <div>
            {/* Client info */}
            <div style={s.detailSection}>
              <div style={s.detailSectionTitle}>Informations du client</div>
              <div style={s.infoCard}>
                <Mail size={16} color="#2E86DE" />
                <span>{selected.email}</span>
              </div>
              <div style={s.infoCard}>
                <Phone size={16} color="#27AE60" />
                <span>{selected.telephone}</span>
              </div>
              <div style={s.infoCard}>
                <Calendar size={16} color="#F39C12" />
                <span>Inscrit le {selected.dateInscription instanceof Date
                  ? selected.dateInscription.toLocaleDateString('fr-FR')
                  : '-'}</span>
              </div>
              <div style={s.infoCard}>
                <Package size={16} color="#8E44AD" />
                <span style={{ fontWeight: 600 }}>{selected.nbCommandes} commandes</span>
              </div>
            </div>

            {/* Recent orders */}
            <div style={s.detailSection}>
              <div style={s.detailSectionTitle}>Commandes recentes</div>
              {mockOrders.map((order) => (
                <div key={order.id} style={s.orderRow}>
                  <span style={{ fontWeight: 600, color: '#2E86DE' }}>{order.id}</span>
                  <span style={{ color: '#6c757d' }}>{order.typeColis}</span>
                  <span style={{ fontWeight: 600 }}>{order.prix.toFixed(2)} EUR</span>
                  <StatusBadge status={order.status} size="sm" />
                  <span style={{ color: '#adb5bd', fontSize: 12 }}>{order.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
