import React from 'react';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: number;       // percentage, positive = up
  color?: string;
  prefix?: string;
  suffix?: string;
}

const styles = {
  card: {
    background: '#ffffff',
    borderRadius: 12,
    padding: '22px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    transition: 'all 0.2s ease',
    cursor: 'default',
    border: '1px solid #f0f0f0',
    flex: '1 1 0',
    minWidth: 220,
  },
  iconWrap: (color: string) => ({
    width: 48,
    height: 48,
    borderRadius: 12,
    background: color + '14',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }),
  content: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: 500 as const,
    color: '#6c757d',
    marginBottom: 4,
  },
  value: {
    fontSize: 26,
    fontWeight: 700 as const,
    color: '#1a1a2e',
    lineHeight: 1.2,
  },
  trendWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    fontSize: 12,
    fontWeight: 600 as const,
  },
};

export default function StatsCard({
  icon: Icon,
  label,
  value,
  trend,
  color = '#2E86DE',
  prefix = '',
  suffix = '',
}: StatsCardProps) {
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <div
      style={styles.card}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          '0 4px 12px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)';
      }}
    >
      <div style={styles.iconWrap(color)}>
        <Icon size={22} color={color} />
      </div>
      <div style={styles.content}>
        <div style={styles.label}>{label}</div>
        <div style={styles.value}>
          {prefix}
          {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
          {suffix}
        </div>
        {trend !== undefined && (
          <div
            style={{
              ...styles.trendWrap,
              color: isPositive ? '#27AE60' : '#E74C3C',
            }}
          >
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>
              {isPositive ? '+' : ''}
              {trend}%
            </span>
            <span style={{ color: '#adb5bd', fontWeight: 400 }}>vs semaine prec.</span>
          </div>
        )}
      </div>
    </div>
  );
}
