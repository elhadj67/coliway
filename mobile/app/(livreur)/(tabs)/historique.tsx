import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { getLivreurOrders, Order } from '@/services/orders';
import { ORDER_STATUS, OrderStatus, COLIS_TYPES } from '@/constants/config';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Timestamp } from 'firebase/firestore';

const COMMISSION_RATE = 0.20;

type FilterTab = 'toutes' | 'livrees' | 'annulees';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'toutes', label: 'Toutes' },
  { key: 'livrees', label: 'Livrees' },
  { key: 'annulees', label: 'Annulees' },
];

function formatDate(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return '--';
  try {
    const date = timestamp.toDate();
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '--';
  }
}

function formatTime(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return '';
  try {
    const date = timestamp.toDate();
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function getColisLabel(typeId: string): string {
  const found = COLIS_TYPES.find((c) => c.id === typeId);
  return found ? found.label : typeId;
}

function getEarnings(order: Order): number {
  const price = order.prixFinal || order.prixEstime || 0;
  return price * (1 - COMMISSION_RATE);
}

interface HistoryOrderCardProps {
  order: Order;
}

const HistoryOrderCard: React.FC<HistoryOrderCardProps> = ({ order }) => {
  const statusConfig = ORDER_STATUS[order.status];
  const earnings = getEarnings(order);

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderCardHeader}>
        <View style={styles.orderDateContainer}>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          <Text style={styles.orderTime}>{formatTime(order.createdAt)}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusConfig.color + '20' },
          ]}
        >
          <View
            style={[styles.statusDot, { backgroundColor: statusConfig.color }]}
          />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      <View style={styles.orderBody}>
        <View style={styles.colisRow}>
          <Ionicons name="cube-outline" size={16} color={Colors.textLight} />
          <Text style={styles.colisText}>{getColisLabel(order.typeColis)}</Text>
        </View>

        <View style={styles.addressSection}>
          <View style={styles.addressRow}>
            <Ionicons name="ellipse" size={8} color={Colors.success} />
            <Text style={styles.addressText} numberOfLines={1}>
              {order.adresseEnlevement.adresse}
            </Text>
          </View>
          <View style={styles.addressDivider} />
          <View style={styles.addressRow}>
            <Ionicons name="ellipse" size={8} color={Colors.danger} />
            <Text style={styles.addressText} numberOfLines={1}>
              {order.adresseLivraison.adresse}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.orderCardFooter}>
        <Text style={styles.orderIdText}>#{order.id.slice(0, 8)}</Text>
        <Text
          style={[
            styles.earningsText,
            order.status === 'annulee' && styles.earningsCancelled,
          ]}
        >
          {order.status === 'annulee' ? '0.00' : earnings.toFixed(2)} EUR
        </Text>
      </View>
    </View>
  );
};

export default function HistoriqueScreen() {
  const { user } = useAuth();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('toutes');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = getLivreurOrders(user.uid, (orders) => {
      // Filter to completed/cancelled orders only
      const completedOrders = orders.filter(
        (o) =>
          o.status === 'livree' ||
          o.status === 'annulee' ||
          o.status === 'echouee'
      );
      setAllOrders(completedOrders);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [user]);

  const filteredOrders = allOrders.filter((order) => {
    if (activeFilter === 'toutes') return true;
    if (activeFilter === 'livrees') return order.status === 'livree';
    if (activeFilter === 'annulees')
      return order.status === 'annulee' || order.status === 'echouee';
    return true;
  });

  const totalCourses = allOrders.filter((o) => o.status === 'livree').length;
  const totalGains = allOrders
    .filter((o) => o.status === 'livree')
    .reduce((sum, o) => sum + getEarnings(o), 0);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const renderHeader = () => (
    <View>
      {/* Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Ionicons name="bicycle-outline" size={24} color={Colors.secondary} />
          <Text style={styles.summaryValue}>{totalCourses}</Text>
          <Text style={styles.summaryLabel}>Total courses</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="cash-outline" size={24} color={Colors.success} />
          <Text style={styles.summaryValue}>{totalGains.toFixed(2)} EUR</Text>
          <Text style={styles.summaryLabel}>Total gains</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {FILTER_TABS.map((tab) => {
          const isActive = activeFilter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setActiveFilter(tab.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterTabText,
                  isActive && styles.filterTabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={48} color={Colors.textLight} />
      <Text style={styles.emptyTitle}>Aucune livraison</Text>
      <Text style={styles.emptySubtitle}>
        Votre historique de livraisons apparaitra ici
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement de l'historique...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <HistoryOrderCard order={item} />}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.base,
    color: Colors.textLight,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },

  // Summary
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    gap: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },

  // Filter Tabs
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.textLight,
  },
  filterTabTextActive: {
    color: Colors.white,
  },

  // Order Card
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.base,
    marginBottom: 10,
    padding: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  orderDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  orderDate: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  orderTime: {
    fontSize: 13,
    color: Colors.textLight,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.base,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },

  // Order Body
  orderBody: {
    marginBottom: Spacing.md,
  },
  colisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  colisText: {
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: Typography.weights.medium,
  },
  addressSection: {
    paddingLeft: Spacing.xs,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  addressDivider: {
    width: 1,
    height: 10,
    backgroundColor: Colors.border,
    marginLeft: 3,
  },
  addressText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },

  // Order Card Footer
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  orderIdText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    fontFamily: 'System',
  },
  earningsText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.success,
  },
  earningsCancelled: {
    color: Colors.textLight,
    textDecorationLine: 'line-through',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginTop: Spacing.base,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
});
