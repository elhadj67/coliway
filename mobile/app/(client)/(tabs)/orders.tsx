import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { ORDER_STATUS, COLIS_TYPES } from '@/constants/config';
import { useAuth } from '@/hooks/useAuth';
import { getClientOrders, Order } from '@/services/orders';
import Button from '@/components/Button';

const MAX_VISIBLE = 20;

export default function ClientOrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = getClientOrders(user.uid, (updatedOrders) => {
      setOrders(updatedOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const recentOrders = orders.slice(0, MAX_VISIBLE);
  const archivedOrders = orders.slice(MAX_VISIBLE);
  const displayedOrders = showArchived ? orders : recentOrders;

  const getColisLabel = (typeId: string) => {
    return COLIS_TYPES.find((t) => t.id === typeId)?.label || typeId;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return '';
    const d = timestamp.toDate();
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const statusConfig = ORDER_STATUS[item.status] || { label: item.status, color: '#999' };
    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.7}
        onPress={() =>
          router.push({
            pathname: '/(client)/suivi',
            params: { orderId: item.id },
          })
        }
      >
        <View style={styles.orderHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
          <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
        </View>

        <View style={styles.orderBody}>
          <View style={styles.addressRow}>
            <View style={[styles.dot, { backgroundColor: Colors.secondary }]} />
            <Text style={styles.addressText} numberOfLines={1}>
              {item.adresseEnlevement.adresse}
            </Text>
          </View>
          <View style={styles.connector} />
          <View style={styles.addressRow}>
            <View style={[styles.dot, { backgroundColor: Colors.success }]} />
            <Text style={styles.addressText} numberOfLines={1}>
              {item.adresseLivraison.adresse}
            </Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.colisType}>{getColisLabel(item.typeColis)}</Text>
          <Text style={styles.price}>{(item.prixFinal || item.prixEstime || 0).toFixed(2)} EUR</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* New order button always visible */}
      <View style={styles.topBar}>
        <Button
          title="Nouvelle commande"
          onPress={() => router.push('/(client)/nouvelle-commande')}
          icon="add-circle"
          style={styles.newOrderButton}
        />
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color={Colors.border} />
          <Text style={styles.emptyTitle}>Aucune commande</Text>
          <Text style={styles.emptySubtitle}>
            Vos commandes apparaitront ici une fois créées.
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            archivedOrders.length > 0 ? (
              <TouchableOpacity
                style={styles.archiveButton}
                onPress={() => setShowArchived(!showArchived)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showArchived ? 'chevron-up' : 'archive-outline'}
                  size={20}
                  color={Colors.secondary}
                />
                <Text style={styles.archiveButtonText}>
                  {showArchived
                    ? 'Masquer les archives'
                    : `Voir les archives (${archivedOrders.length})`}
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  topBar: {
    padding: Spacing.base,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
    ...Shadows.card,
  },
  newOrderButton: {
    marginTop: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.textLight,
    textAlign: 'center',
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.xxl,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  orderDate: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  orderBody: {
    marginBottom: Spacing.sm,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  connector: {
    width: 2,
    height: 12,
    backgroundColor: Colors.border,
    marginLeft: 4,
    marginVertical: 2,
  },
  addressText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    flex: 1,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  colisType: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  price: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  archiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  archiveButtonText: {
    fontSize: Typography.sizes.md,
    color: Colors.secondary,
    fontWeight: Typography.weights.medium,
  },
});
