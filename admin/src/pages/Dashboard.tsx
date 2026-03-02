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
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import StatusBadge from '@/components/StatusBadge';
import { getStats } from '@/services/api';

// Mock data for charts
const commandesParJour = [
  { jour: 'Lun', commandes: 42 },
  { jour: 'Mar', commandes: 58 },
  { jour: 'Mer', commandes: 35 },
  { jour: 'Jeu', commandes: 67 },
  { jour: 'Ven', commandes: 82 },
  { jour: 'Sam', commandes: 54 },
  { jour: 'Dim', commandes: 37 },
];

const revenusParSemaine = [
  { semaine: 'S1', revenus: 4200 },
  { semaine: 'S2', revenus: 5800 },
  { semaine: 'S3', revenus: 5100 },
  { semaine: 'S4', revenus: 6700 },
  { semaine: 'S5', revenus: 7200 },
  { semaine: 'S6', revenus: 6400 },
  { semaine: 'S7', revenus: 8100 },
  { semaine: 'S8', revenus: 7600 },
];

const recentCommandes = [
  { id: 'CMD-1247', client: 'Marie Dupont', livreur: 'Pierre Martin', status: 'en_transit', prix: 18.50, date: '14:32' },
  { id: 'CMD-1246', client: 'Jean Bernard', livreur: 'Sophie Leroy', status: 'livree', prix: 24.00, date: '13:15' },
  { id: 'CMD-1245', client: 'Alice Moreau', livreur: '-', status: 'en_attente', prix: 12.00, date: '12:48' },
  { id: 'CMD-1244', client: 'Thomas Petit', livreur: 'Luc Garnier', status: 'enlevee', prix: 35.50, date: '11:20' },
  { id: 'CMD-1243', client: 'Emma Robert', livreur: 'Marc Durand', status: 'livree', prix: 15.00, date: '10:45' },
  { id: 'CMD-1242', client: 'Hugo Simon', livreur: '-', status: 'annulee', prix: 22.00, date: '09:30' },
];

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
};

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCA: 45230,
    commandesAujourdhui: 37,
    livreursActifs: 124,
    clientsInscrits: 1856,
  });

  useEffect(() => {
    getStats().then((data) => {
      setStats({
        totalCA: data.totalCA,
        commandesAujourdhui: data.commandesAujourdhui,
        livreursActifs: data.livreursActifs,
        clientsInscrits: data.clientsInscrits,
      });
    });
  }, []);

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
            {recentCommandes.map((cmd) => (
              <tr key={cmd.id}>
                <td style={{ ...s.td, fontWeight: 600, color: '#2E86DE' }}>{cmd.id}</td>
                <td style={s.td}>{cmd.client}</td>
                <td style={s.td}>{cmd.livreur}</td>
                <td style={{ ...s.td, fontWeight: 600 }}>{cmd.prix.toFixed(2)} EUR</td>
                <td style={s.td}>
                  <StatusBadge status={cmd.status} size="sm" />
                </td>
                <td style={{ ...s.td, color: '#6c757d' }}>{cmd.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
