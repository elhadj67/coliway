import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Euro,
  Package,
  Truck,
  Users,
  Clock,
  ArrowRight,
  Trash2,
  Archive,
  AlertTriangle,
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import StatusBadge from '@/components/StatusBadge';
import Modal, { ModalButton } from '@/components/Modal';
import {
  getStats,
  getRecentCommandes,
  RecentCommande,
  deleteCommandes,
  archiveCommandes,
  deleteLivreurs,
  archiveLivreurs,
  deleteClients,
  archiveClients,
} from '@/services/api';

const s = {
  page: {
    padding: '28px 32px',
    maxWidth: 1400,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: 700 as const,
    color: '#1a1a2e',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  statsRow: {
    display: 'flex',
    gap: 20,
    marginBottom: 28,
    flexWrap: 'wrap' as const,
  },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
    marginBottom: 28,
  },
  chartCard: {
    background: '#ffffff',
    borderRadius: 12,
    padding: '20px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #f0f0f0',
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: 600 as const,
    color: '#1a1a2e',
    marginBottom: 20,
  },
  recentCard: {
    background: '#ffffff',
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #f0f0f0',
    overflow: 'hidden' as const,
  },
  recentHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 24px',
    borderBottom: '1px solid #f0f0f0',
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: 600 as const,
    color: '#1a1a2e',
  },
  viewAll: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 13,
    fontWeight: 500 as const,
    color: '#2E86DE',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    textAlign: 'left' as const,
    padding: '10px 16px',
    fontSize: 11,
    fontWeight: 600 as const,
    color: '#6c757d',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    borderBottom: '1px solid #f0f0f0',
    background: '#f8f9fa',
  },
  td: {
    padding: '12px 16px',
    fontSize: 13,
    color: '#1a1a2e',
    borderBottom: '1px solid #f5f5f5',
  },
  dataCard: {
    background: '#ffffff',
    borderRadius: 12,
    padding: '20px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: '1px solid #f0f0f0',
    marginTop: 28,
  },
  dataTitle: {
    fontSize: 15,
    fontWeight: 600 as const,
    color: '#1a1a2e',
    marginBottom: 4,
  },
  dataSubtitle: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 20,
  },
  dataGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  dataItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: '#f8f9fa',
    borderRadius: 10,
    border: '1px solid #f0f0f0',
  },
  dataItemLabel: {
    fontSize: 14,
    fontWeight: 600 as const,
    color: '#1a1a2e',
  },
  dataItemActions: {
    display: 'flex',
    gap: 8,
  },
  archiveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500 as const,
    color: '#2E86DE',
    background: '#f0f7ff',
    border: '1px solid #d0e4f7',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '7px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500 as const,
    color: '#E74C3C',
    background: '#fff5f5',
    border: '1px solid #f5d0d0',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  toast: {
    position: 'fixed' as const,
    bottom: 24,
    right: 24,
    background: '#1a1a2e',
    color: '#fff',
    padding: '12px 20px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 500 as const,
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
    cursor: 'pointer',
    zIndex: 999,
    animation: 'fadeIn 0.2s ease',
  },
};

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCA: 0,
    commandesAujourdhui: 0,
    livreursActifs: 0,
    clientsInscrits: 0,
  });
  const [commandesParJour, setCommandesParJour] = useState<{ jour: string; commandes: number }[]>([]);
  const [revenusParSemaine, setRevenusParSemaine] = useState<{ semaine: string; revenus: number }[]>([]);
  const [recentCommandes, setRecentCommandes] = useState<RecentCommande[]>([]);

  const [modal, setModal] = useState<{ type: 'delete' | 'archive'; target: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);

  const refreshStats = () => {
    getStats().then((data) => {
      setStats({
        totalCA: data.totalCA,
        commandesAujourdhui: data.commandesAujourdhui,
        livreursActifs: data.livreursActifs,
        clientsInscrits: data.clientsInscrits,
      });
      setCommandesParJour(data.commandesParJour);
      setRevenusParSemaine(data.revenusParSemaine);
    });
    getRecentCommandes().then(setRecentCommandes);
  };

  useEffect(() => {
    refreshStats();
  }, []);

  const targetLabels: Record<string, string> = {
    commandes: 'Commandes',
    livreurs: 'Livreurs',
    clients: 'Clients',
  };

  const handleConfirmAction = async () => {
    if (!modal) return;
    setActionLoading(true);
    try {
      let count = 0;
      if (modal.type === 'delete') {
        if (modal.target === 'commandes') count = await deleteCommandes();
        else if (modal.target === 'livreurs') count = await deleteLivreurs();
        else if (modal.target === 'clients') count = await deleteClients();
      } else {
        if (modal.target === 'commandes') count = await archiveCommandes();
        else if (modal.target === 'livreurs') count = await archiveLivreurs();
        else if (modal.target === 'clients') count = await archiveClients();
      }
      const verb = modal.type === 'delete' ? 'supprime(s)' : 'archive(s)';
      setActionResult(`${count} ${targetLabels[modal.target]} ${verb} avec succes.`);
      refreshStats();
    } catch {
      setActionResult('Erreur lors de l\'operation. Veuillez reessayer.');
    } finally {
      setActionLoading(false);
      setModal(null);
    }
  };

  return (
    <div style={s.page} className="fade-in">
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.title}>Tableau de bord</h1>
        <p style={s.subtitle}>Vue d'ensemble de l'activite Coliway</p>
      </div>

      {/* Stats cards */}
      <div style={s.statsRow}>
        <StatsCard
          icon={Euro}
          label="Chiffre d'affaires total"
          value={stats.totalCA}
          prefix=""
          suffix=" EUR"
          trend={12.5}
          color="#27AE60"
        />
        <StatsCard
          icon={Package}
          label="Commandes aujourd'hui"
          value={stats.commandesAujourdhui}
          trend={8.3}
          color="#2E86DE"
        />
        <StatsCard
          icon={Truck}
          label="Livreurs actifs"
          value={stats.livreursActifs}
          trend={3.1}
          color="#8E44AD"
        />
        <StatsCard
          icon={Users}
          label="Clients inscrits"
          value={stats.clientsInscrits}
          trend={15.7}
          color="#F39C12"
        />
      </div>

      {/* Charts */}
      <div style={s.chartsRow}>
        {/* Commandes par jour */}
        <div style={s.chartCard}>
          <h3 style={s.chartTitle}>Commandes par jour (7 derniers jours)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={commandesParJour} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="jour"
                tick={{ fontSize: 12, fill: '#6c757d' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6c757d' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#1a1a2e',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 13,
                }}
                cursor={{ fill: 'rgba(46,134,222,0.08)' }}
              />
              <Bar
                dataKey="commandes"
                fill="#2E86DE"
                radius={[6, 6, 0, 0]}
                name="Commandes"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenus par semaine */}
        <div style={s.chartCard}>
          <h3 style={s.chartTitle}>Revenus par semaine (EUR)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenusParSemaine}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="semaine"
                tick={{ fontSize: 12, fill: '#6c757d' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#6c757d' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#1a1a2e',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontSize: 13,
                }}
              />
              <Line
                type="monotone"
                dataKey="revenus"
                stroke="#27AE60"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#27AE60', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                name="Revenus"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent orders */}
      <div style={s.recentCard}>
        <div style={s.recentHeader}>
          <h3 style={s.recentTitle}>
            <Clock size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
            Commandes recentes
          </h3>
          <button style={s.viewAll}>
            Voir toutes <ArrowRight size={14} />
          </button>
        </div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>ID</th>
              <th style={s.th}>Client</th>
              <th style={s.th}>Livreur</th>
              <th style={s.th}>Prix</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Heure</th>
            </tr>
          </thead>
          <tbody>
            {recentCommandes.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...s.td, textAlign: 'center', color: '#6c757d', padding: '24px 16px' }}>
                  Aucune commande
                </td>
              </tr>
            ) : (
              recentCommandes.map((cmd) => (
                <tr key={cmd.id}>
                  <td style={{ ...s.td, fontWeight: 600, color: '#2E86DE' }}>{cmd.id.slice(0, 8)}</td>
                  <td style={s.td}>{cmd.clientNom}</td>
                  <td style={s.td}>{cmd.livreurNom}</td>
                  <td style={{ ...s.td, fontWeight: 600 }}>{cmd.prix.toFixed(2)} EUR</td>
                  <td style={s.td}>
                    <StatusBadge status={cmd.status} size="sm" />
                  </td>
                  <td style={{ ...s.td, color: '#6c757d' }}>{cmd.heure}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Gestion des données */}
      <div style={s.dataCard}>
        <h3 style={s.dataTitle}>
          <AlertTriangle size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom', color: '#F39C12' }} />
          Gestion des donnees
        </h3>
        <p style={s.dataSubtitle}>Supprimer ou archiver les donnees affichees sur le dashboard.</p>

        <div style={s.dataGrid}>
          {(['commandes', 'livreurs', 'clients'] as const).map((target) => (
            <div key={target} style={s.dataItem}>
              <span style={s.dataItemLabel}>{targetLabels[target]}</span>
              <div style={s.dataItemActions}>
                <button
                  style={s.archiveBtn}
                  onClick={() => setModal({ type: 'archive', target })}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#e8f4fd'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#f0f7ff'; }}
                >
                  <Archive size={14} /> Archiver
                </button>
                <button
                  style={s.deleteBtn}
                  onClick={() => setModal({ type: 'delete', target })}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#fde8e8'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#fff5f5'; }}
                >
                  <Trash2 size={14} /> Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Result toast */}
      {actionResult && (
        <div style={s.toast} onClick={() => setActionResult(null)}>
          {actionResult}
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.type === 'delete' ? 'Confirmer la suppression' : 'Confirmer l\'archivage'}
        width={440}
        footer={
          <>
            <ModalButton onClick={() => setModal(null)} variant="secondary">Annuler</ModalButton>
            <ModalButton
              onClick={handleConfirmAction}
              variant={modal?.type === 'delete' ? 'danger' : 'primary'}
              disabled={actionLoading}
            >
              {actionLoading
                ? 'En cours...'
                : modal?.type === 'delete'
                  ? 'Supprimer'
                  : 'Archiver'}
            </ModalButton>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: modal?.type === 'delete' ? '#fff5f5' : '#f0f7ff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            {modal?.type === 'delete'
              ? <Trash2 size={26} color="#E74C3C" />
              : <Archive size={26} color="#2E86DE" />}
          </div>
          <p style={{ fontSize: 15, color: '#1a1a2e', lineHeight: 1.6 }}>
            {modal?.type === 'delete'
              ? <>Vous etes sur le point de <strong>supprimer definitivement</strong> toutes les donnees <strong>{modal?.target && targetLabels[modal.target]}</strong>. Cette action est irreversible.</>
              : <>Vous etes sur le point d'<strong>archiver</strong> toutes les donnees <strong>{modal?.target && targetLabels[modal.target]}</strong>. Elles seront deplacees dans la collection <code>{modal?.target}_archive</code>.</>}
          </p>
        </div>
      </Modal>
    </div>
  );
}
