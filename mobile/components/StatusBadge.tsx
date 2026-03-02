import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const COLORS = {
  primary: '#1B3A5C',
  secondary: '#2E86DE',
  accent: '#F39C12',
  success: '#27AE60',
  danger: '#E74C3C',
  warning: '#F39C12',
  background: '#F5F7FA',
  white: '#FFFFFF',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  border: '#E0E6ED',
};

type OrderStatus = 'en_attente' | 'acceptee' | 'en_cours' | 'livree' | 'annulee';

interface StatusConfig {
  label: string;
  backgroundColor: string;
  textColor: string;
}

const STATUS_MAP: Record<OrderStatus, StatusConfig> = {
  en_attente: {
    label: 'En attente',
    backgroundColor: '#FEF3E2',
    textColor: COLORS.warning,
  },
  acceptee: {
    label: 'Accept\u00e9e',
    backgroundColor: '#E8F4FD',
    textColor: COLORS.secondary,
  },
  en_cours: {
    label: 'En cours',
    backgroundColor: '#FEF3E2',
    textColor: COLORS.accent,
  },
  livree: {
    label: 'Livr\u00e9e',
    backgroundColor: '#E8F8EE',
    textColor: COLORS.success,
  },
  annulee: {
    label: 'Annul\u00e9e',
    backgroundColor: '#FDECEB',
    textColor: COLORS.danger,
  },
};

interface StatusBadgeProps {
  status: OrderStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = STATUS_MAP[status] || STATUS_MAP.en_attente;

  return (
    <View style={[styles.badge, { backgroundColor: config.backgroundColor }]}>
      <Text style={[styles.badgeText, { color: config.textColor }]}>
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default StatusBadge;
