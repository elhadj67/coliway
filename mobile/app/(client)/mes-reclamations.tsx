import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { getMyLitiges, Litige } from '../../services/litiges';
import { getClientOrders, Order } from '../../services/orders';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { Timestamp } from 'firebase/firestore';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ouvert: { label: 'Ouvert', color: '#F39C12' },
  en_cours: { label: 'En cours', color: '#2E86DE' },
  resolu: { label: 'Résolu', color: '#27AE60' },
  ferme: { label: 'Fermé', color: '#95A5A6' },
};

export default function MesReclamationsClientScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [litiges, setLitiges] = useState<Litige[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = getMyLitiges(user.uid, (data) => {
      setLitiges(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleNewReclamation = () => {
    if (!user) return;
    setOrdersLoading(true);
    setShowOrderPicker(true);
    const unsubscribe = getClientOrders(user.uid, (data) => {
      setOrders(data);
      setOrdersLoading(false);
      unsubscribe();
    });
  };

  const selectOrder = (orderId: string) => {
    setShowOrderPicker(false);
    router.push({
      pathname: '/(client)/reclamation',
      params: { commandeId: orderId },
    });
  };

  const formatDate = (timestamp: Timestamp | Date) => {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderItem = ({ item }: { item: Litige }) => {
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.ouvert;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.motif}>{item.motif}</Text>
          <View style={[styles.badge, { backgroundColor: statusConfig.color + '20' }]}>
            <View style={[styles.badgeDot, { backgroundColor: statusConfig.color }]} />
            <Text style={[styles.badgeText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="document-text-outline" size={14} color={Colors.textLight} />
            <Text style={styles.footerText}>#{item.commandeId.slice(0, 8)}</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textLight} />
            <Text style={styles.footerText}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes réclamations</Text>
        <TouchableOpacity onPress={handleNewReclamation} style={styles.addButton} activeOpacity={0.7}>
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : litiges.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color={Colors.border} />
          <Text style={styles.emptyText}>Aucune réclamation</Text>
          <Text style={styles.emptySubtext}>
            Vous n'avez aucune réclamation en cours.
          </Text>
        </View>
      ) : (
        <FlatList
          data={litiges}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={showOrderPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionnez une commande</Text>
              <TouchableOpacity onPress={() => setShowOrderPicker(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            {ordersLoading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
            ) : orders.length === 0 ? (
              <Text style={styles.emptySubtext}>Aucune commande trouvée.</Text>
            ) : (
              <FlatList
                data={orders}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.orderItem} onPress={() => selectOrder(item.id)} activeOpacity={0.7}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderItemTitle}>Commande #{item.id.slice(0, 8)}</Text>
                      <Text style={styles.orderItemSub}>{item.adresseEnlevement?.adresse || 'Départ'} → {item.adresseLivraison?.adresse || 'Arrivée'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    ...Shadows.card,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  motif: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xxl,
    gap: Spacing.xs,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  description: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: Spacing.base,
  },
  emptySubtext: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '70%',
    paddingBottom: Spacing.xxxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  orderItemTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: 2,
  },
  orderItemSub: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
});
