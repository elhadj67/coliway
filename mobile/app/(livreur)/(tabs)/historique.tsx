import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Linking,
  Alert,
  Dimensions,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { getLivreurOrders, Order } from '@/services/orders';
import { ORDER_STATUS, OrderStatus, COLIS_TYPES } from '@/constants/config';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { Timestamp } from 'firebase/firestore';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { fetchCommissionRate, COMMISSION_RATE as DEFAULT_COMMISSION_RATE } from '@/services/gains';

type FilterTab = 'toutes' | 'livrees' | 'annulees';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'toutes', label: 'Toutes' },
  { key: 'livrees', label: 'Livrees' },
  { key: 'annulees', label: 'Annulees' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

function getEarnings(order: Order, commissionRate: number): number {
  const price = order.prixFinal || order.prixEstime || 0;
  return price * (1 - commissionRate);
}

interface HistoryOrderCardProps {
  order: Order;
  commissionRate: number;
  onPress: (order: Order) => void;
}

const HistoryOrderCard: React.FC<HistoryOrderCardProps> = ({ order, commissionRate, onPress }) => {
  const statusConfig = ORDER_STATUS[order.status];
  const earnings = getEarnings(order, commissionRate);

  return (
    <TouchableOpacity style={styles.orderCard} onPress={() => onPress(order)} activeOpacity={0.7}>
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

      {order.photoPreuve && (
        <View style={styles.proofRow}>
          <Image source={{ uri: order.photoPreuve }} style={styles.proofThumb} />
          <View style={styles.proofInfo}>
            <Text style={styles.proofLabel}>Preuve de livraison</Text>
            {order.commentairePreuve && (
              <Text style={styles.proofComment} numberOfLines={2}>{order.commentairePreuve}</Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.orderCardFooter}>
        <Text style={styles.orderIdText}>#{order.id.slice(0, 8)}</Text>
        <View style={styles.footerRight}>
          <Text
            style={[
              styles.earningsText,
              order.status === 'annulee' && styles.earningsCancelled,
            ]}
          >
            {order.status === 'annulee' ? '0.00' : earnings.toFixed(2)} EUR
          </Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function HistoriqueScreen() {
  const { user } = useAuth();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('toutes');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commissionRate, setCommissionRate] = useState(DEFAULT_COMMISSION_RATE);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showPhotoFull, setShowPhotoFull] = useState(false);
  const [showReclamation, setShowReclamation] = useState(false);
  const [reclamationText, setReclamationText] = useState('');
  const [sendingReclamation, setSendingReclamation] = useState(false);

  useEffect(() => {
    fetchCommissionRate().then(setCommissionRate);
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = getLivreurOrders(user.uid, (orders) => {
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
    .reduce((sum, o) => sum + getEarnings(o, commissionRate), 0);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const openDetail = (order: Order) => {
    setSelectedOrder(order);
    setShowDetail(true);
  };

  const handleContactClient = () => {
    if (!selectedOrder?.destinataireTelephone) {
      Alert.alert('Info', 'Aucun numéro de téléphone disponible pour ce client.');
      return;
    }
    Linking.openURL(`tel:${selectedOrder.destinataireTelephone}`);
  };

  const handleSendReclamation = async () => {
    if (!reclamationText.trim() || !selectedOrder || !user) return;
    setSendingReclamation(true);
    try {
      await addDoc(collection(db, 'reclamations'), {
        orderId: selectedOrder.id,
        livreurId: user.uid,
        clientId: selectedOrder.clientId,
        message: reclamationText.trim(),
        status: 'en_attente',
        createdAt: serverTimestamp(),
      });
      Alert.alert('Succès', 'Votre réclamation a été envoyée.');
      setReclamationText('');
      setShowReclamation(false);
    } catch (error: any) {
      Alert.alert('Erreur', 'Impossible d\'envoyer la réclamation.');
    } finally {
      setSendingReclamation(false);
    }
  };

  const renderHeader = () => (
    <View>
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
        renderItem={({ item }) => (
          <HistoryOrderCard order={item} commissionRate={commissionRate} onPress={openDetail} />
        )}
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

      {/* Detail Modal */}
      <Modal visible={showDetail} animationType="slide" presentationStyle="pageSheet">
        {selectedOrder && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDetail(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Détail de la course</Text>
              <View style={{ width: 36 }} />
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
              {/* Status & Date */}
              <View style={styles.detailSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Commande</Text>
                  <Text style={styles.detailValue}>#{selectedOrder.id.slice(0, 8)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(selectedOrder.createdAt)} {formatTime(selectedOrder.createdAt)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Statut</Text>
                  <View style={[styles.statusBadge, { backgroundColor: ORDER_STATUS[selectedOrder.status].color + '20' }]}>
                    <View style={[styles.statusDot, { backgroundColor: ORDER_STATUS[selectedOrder.status].color }]} />
                    <Text style={[styles.statusText, { color: ORDER_STATUS[selectedOrder.status].color }]}>
                      {ORDER_STATUS[selectedOrder.status].label}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type colis</Text>
                  <Text style={styles.detailValue}>{getColisLabel(selectedOrder.typeColis)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Gains</Text>
                  <Text style={[styles.detailValue, { color: Colors.success, fontWeight: '700' as any }]}>
                    {selectedOrder.status === 'annulee' ? '0.00' : getEarnings(selectedOrder, commissionRate).toFixed(2)} EUR
                  </Text>
                </View>
              </View>

              {/* Addresses */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Adresses</Text>
                <View style={styles.detailAddressRow}>
                  <View style={[styles.detailAddressDot, { backgroundColor: Colors.success }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailAddressLabel}>Enlèvement</Text>
                    <Text style={styles.detailAddressText}>{selectedOrder.adresseEnlevement.adresse}</Text>
                  </View>
                </View>
                <View style={styles.detailAddressConnector} />
                <View style={styles.detailAddressRow}>
                  <View style={[styles.detailAddressDot, { backgroundColor: Colors.danger }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailAddressLabel}>Livraison</Text>
                    <Text style={styles.detailAddressText}>{selectedOrder.adresseLivraison.adresse}</Text>
                  </View>
                </View>
              </View>

              {/* Destinataire */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Destinataire</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Nom</Text>
                  <Text style={styles.detailValue}>{selectedOrder.destinataireNom || '--'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Téléphone</Text>
                  <Text style={styles.detailValue}>{selectedOrder.destinataireTelephone || '--'}</Text>
                </View>
                {selectedOrder.description ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Description</Text>
                    <Text style={[styles.detailValue, { flex: 1, textAlign: 'right' }]}>{selectedOrder.description}</Text>
                  </View>
                ) : null}
              </View>

              {/* Photo Preuve */}
              {selectedOrder.photoPreuve && (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Preuve de livraison</Text>
                  <TouchableOpacity onPress={() => setShowPhotoFull(true)} activeOpacity={0.8}>
                    <Image
                      source={{ uri: selectedOrder.photoPreuve }}
                      style={styles.detailPhoto}
                      resizeMode="cover"
                    />
                    <View style={styles.photoZoomHint}>
                      <Ionicons name="expand-outline" size={16} color="#fff" />
                      <Text style={styles.photoZoomText}>Agrandir</Text>
                    </View>
                  </TouchableOpacity>
                  {selectedOrder.commentairePreuve && (
                    <Text style={styles.detailPhotoComment}>{selectedOrder.commentairePreuve}</Text>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.detailActions}>
                <TouchableOpacity style={styles.actionButton} onPress={handleContactClient} activeOpacity={0.7}>
                  <Ionicons name="call-outline" size={20} color={Colors.white} />
                  <Text style={styles.actionButtonText}>Contacter le client</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonReclamation]}
                  onPress={() => setShowReclamation(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="alert-circle-outline" size={20} color={Colors.white} />
                  <Text style={styles.actionButtonText}>Réclamation</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Full Photo Modal */}
      <Modal visible={showPhotoFull} transparent animationType="fade">
        <View style={styles.photoFullOverlay}>
          <TouchableOpacity style={styles.photoFullClose} onPress={() => setShowPhotoFull(false)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          {selectedOrder?.photoPreuve && (
            <Image
              source={{ uri: selectedOrder.photoPreuve }}
              style={styles.photoFullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Reclamation Modal */}
      <Modal visible={showReclamation} transparent animationType="fade">
        <View style={styles.reclamationOverlay}>
          <View style={styles.reclamationModal}>
            <Text style={styles.reclamationTitle}>Réclamation</Text>
            <Text style={styles.reclamationSubtitle}>
              Commande #{selectedOrder?.id.slice(0, 8)}
            </Text>
            <TextInput
              style={styles.reclamationInput}
              placeholder="Décrivez votre problème..."
              placeholderTextColor={Colors.textLight}
              multiline
              numberOfLines={4}
              value={reclamationText}
              onChangeText={setReclamationText}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.reclamationSendBtn, !reclamationText.trim() && styles.reclamationSendDisabled]}
              onPress={handleSendReclamation}
              disabled={!reclamationText.trim() || sendingReclamation}
              activeOpacity={0.7}
            >
              {sendingReclamation ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.reclamationSendText}>Envoyer</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowReclamation(false); setReclamationText(''); }}>
              <Text style={styles.reclamationCancelText}>Annuler</Text>
            </TouchableOpacity>
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

  // Proof photo
  proofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  proofThumb: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  proofInfo: {
    flex: 1,
  },
  proofLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  proofComment: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
    fontStyle: 'italic',
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
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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

  // Detail Modal
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },

  // Detail sections
  detailSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
  },
  detailValue: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },

  // Detail addresses
  detailAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  detailAddressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  detailAddressLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  detailAddressText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    lineHeight: 20,
  },
  detailAddressConnector: {
    width: 2,
    height: 16,
    backgroundColor: Colors.border,
    marginLeft: 4,
    marginVertical: 2,
  },

  // Detail photo
  detailPhoto: {
    width: '100%',
    height: 220,
    borderRadius: BorderRadius.md,
  },
  photoZoomHint: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  photoZoomText: {
    fontSize: 12,
    color: '#fff',
  },
  detailPhotoComment: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
  },

  // Action buttons
  detailActions: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
  },
  actionButtonReclamation: {
    backgroundColor: Colors.danger,
  },
  actionButtonText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },

  // Full photo modal
  photoFullOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFullClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  photoFullImage: {
    width: SCREEN_WIDTH - 20,
    height: SCREEN_WIDTH - 20,
  },

  // Reclamation modal
  reclamationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reclamationModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '88%',
    maxWidth: 380,
    alignItems: 'center',
  },
  reclamationTitle: {
    fontSize: 20,
    fontWeight: '700' as any,
    color: Colors.text,
    marginBottom: 4,
  },
  reclamationSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 16,
  },
  reclamationInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
    minHeight: 100,
    marginBottom: 16,
  },
  reclamationSendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  reclamationSendDisabled: {
    backgroundColor: Colors.border,
  },
  reclamationSendText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as any,
  },
  reclamationCancelText: {
    color: Colors.textLight,
    fontSize: 14,
    marginTop: 14,
  },
});
