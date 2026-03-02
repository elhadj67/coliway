import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';

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

type ColisType = 'enveloppe' | 'petit' | 'moyen' | 'gros' | 'palette';
type OrderStatus = 'en_attente' | 'acceptee' | 'en_cours' | 'livree' | 'annulee';

const COLIS_ICONS: Record<ColisType, keyof typeof Ionicons.glyphMap> = {
  enveloppe: 'mail',
  petit: 'cube-outline',
  moyen: 'cube',
  gros: 'archive',
  palette: 'grid',
};

const COLIS_LABELS: Record<ColisType, string> = {
  enveloppe: 'Enveloppe',
  petit: 'Petit colis',
  moyen: 'Moyen colis',
  gros: 'Gros colis',
  palette: 'Palette',
};

interface Order {
  id: string;
  colis_type: ColisType;
  adresse_depart: string;
  adresse_arrivee: string;
  prix: number;
  status: OrderStatus;
  createdAt: string;
  livreurNom?: string;
}

interface OrderCardProps {
  order: Order;
  onPress?: () => void;
}

const truncateAddress = (address: string, maxLength: number = 35): string => {
  if (address.length <= maxLength) return address;
  return address.substring(0, maxLength) + '...';
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const OrderCard: React.FC<OrderCardProps> = ({ order, onPress }) => {
  const colisIcon = COLIS_ICONS[order.colis_type] || 'cube-outline';
  const colisLabel = COLIS_LABELS[order.colis_type] || order.colis_type;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={styles.colisInfo}>
          <View style={styles.iconContainer}>
            <Ionicons name={colisIcon} size={22} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.colisLabel}>{colisLabel}</Text>
            <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
          </View>
        </View>
        <StatusBadge status={order.status} />
      </View>

      <View style={styles.addressSection}>
        <View style={styles.addressRow}>
          <View style={styles.dotGreen} />
          <Text style={styles.addressText} numberOfLines={1}>
            {truncateAddress(order.adresse_depart)}
          </Text>
        </View>
        <View style={styles.addressLine} />
        <View style={styles.addressRow}>
          <View style={styles.dotRed} />
          <Text style={styles.addressText} numberOfLines={1}>
            {truncateAddress(order.adresse_arrivee)}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
          {order.livreurNom && (
            <Text style={styles.livreur}>
              <Ionicons name="person-outline" size={12} color={COLORS.textLight} />{' '}
              {order.livreurNom}
            </Text>
          )}
        </View>
        <Text style={styles.price}>{order.prix.toFixed(2)} EUR</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  colisInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  colisLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  orderId: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 1,
  },
  addressSection: {
    paddingLeft: 8,
    marginBottom: 14,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
    marginRight: 10,
  },
  dotRed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
    marginRight: 10,
  },
  addressLine: {
    width: 1,
    height: 16,
    backgroundColor: COLORS.border,
    marginLeft: 3.5,
    marginVertical: 2,
  },
  addressText: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  footerLeft: {
    flex: 1,
  },
  date: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  livreur: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

export default OrderCard;
