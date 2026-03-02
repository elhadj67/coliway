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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getClientOrders, Order } from '../../services/orders';
import { useAuth } from '../../contexts/AuthContext';
import {
  ORDER_STATUS,
  OrderStatus,
  COLIS_TYPES,
} from '../../constants/config';
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '../../constants/theme';

type FilterTab = 'toutes' | 'livrees' | 'annulees';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'toutes', label: 'Toutes' },
  { key: 'livrees', label: 'Livrées' },
  { key: 'annulees', label: 'Annulées' },
];

export default function HistoriqueScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('toutes');

  useEffect(() => {
    if (!user) return;

    const unsubscribe = getClientOrders(user.uid, (fetchedOrders) => {
      setOrders(fetchedOrders);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // The real-time listener will handle the refresh
    // Setting refreshing to false after a timeout as fallback
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const filteredOrders = orders.filter((order) => {
    switch (activeFilter) {
      case 'livrees':
        return order.status === 'livree';
      case 'annulees':
        return order.status === 'annulee';
      default:
        return true;
    }
  });

  const handleOrderPress = (order: Order) => {
    router.push({
      pathname: '/(client)/suivi',
      params: { orderId: order.id },
    });
  };

  const getColisLabel = (typeId: string): string => {
    const colisType = COLIS_TYPES.find((t) => t.id === typeId);
    return colisType?.label || typeId;
  };

  const getColisIcon = (typeId: string): string => {
    const colisType = COLIS_TYPES.find((t) => t.id === typeId);
    return colisType?.icon || 'cube-outline';
  };

  const formatDate = (timestamp: unknown): string => {
    if (!timestamp) return '';
    try {
      const date =
        typeof (timestamp as { toDate?: () => Date }).toDate === 'function'
          ? (timestamp as { toDate: () => Date }).toDate()
          : new Date(timestamp as string);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const renderStatusBadge = (status: OrderStatus) => {
    const config = ORDER_STATUS[status];
    return (
      <View
        style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}
      >
        <View style={[styles.statusDot, { backgroundColor: config.color }]} />
        <Text style={[styles.statusLabel, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  const renderOrderCard = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => handleOrderPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderTypeRow}>
          <View style={styles.orderIconContainer}>
            <Ionicons
              name={getColisIcon(item.typeColis) as keyof typeof Ionicons.glyphMap}
              size={22}
              color={Colors.primary}
            />
          </View>
          <View style={styles.orderTypeInfo}>
            <Text style={styles.orderTypeText}>{getColisLabel(item.typeColis)}</Text>
            <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
        {renderStatusBadge(item.status)}
      </View>

      <View style={styles.orderAddresses}>
        <View style={styles.orderAddressRow}>
          <View
            style={[styles.orderAddressDot, { backgroundColor: Colors.secondary }]}
          />
          <Text style={styles.orderAddressText} numberOfLines={1}>
            {item.adresseEnlevement.adresse}
          </Text>
        </View>
        <View style={styles.orderAddressConnector} />
        <View style={styles.orderAddressRow}>
          <View
            style={[styles.orderAddressDot, { backgroundColor: Colors.success }]}
          />
          <Text style={styles.orderAddressText} numberOfLines={1}>
            {item.adresseLivraison.adresse}
          </Text>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.orderPrice}>
          {(item.prixFinal || item.prixEstime).toFixed(2)} €
        </Text>
        <View style={styles.orderArrow}>
          <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="receipt-outline" size={80} color={Colors.border} />
      <Text style={styles.emptyTitle}>Aucune commande</Text>
      <Text style={styles.emptySubtitle}>
        {activeFilter === 'toutes'
          ? "Vous n'avez pas encore passé de commande."
          : activeFilter === 'livrees'
          ? "Aucune commande livrée pour le moment."
          : "Aucune commande annulée."}
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes commandes</Text>
        <Text style={styles.headerSubtitle}>
          {orders.length} commande{orders.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.filterTab,
              activeFilter === tab.key && styles.filterTabActive,
            ]}
            onPress={() => setActiveFilter(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === tab.key && styles.filterTabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl + Spacing.base,
    paddingBottom: Spacing.base,
    backgroundColor: Colors.white,
  },
  headerTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  filterTab: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.xxl,
    backgroundColor: Colors.background,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    color: Colors.textLight,
  },
  filterTabTextActive: {
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  orderTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  orderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  orderTypeInfo: {
    flex: 1,
  },
  orderTypeText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  orderDate: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.xxl,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  orderAddresses: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  orderAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  orderAddressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  orderAddressConnector: {
    width: 2,
    height: 10,
    backgroundColor: Colors.border,
    marginLeft: 3,
    marginVertical: 2,
  },
  orderAddressText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    flex: 1,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderPrice: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  orderArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl * 2,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontSize: Typography.sizes.base,
    color: Colors.textLight,
    marginTop: Spacing.base,
  },
});
