import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Switch,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Map from '@/components/Map';
import Button from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import {
  getAvailableOrders,
  acceptOrder,
  Order,
} from '@/services/orders';
import {
  updateLivreurPosition,
  calculateDistance,
  Position,
} from '@/services/location';
import { updateProfile } from '@/services/auth';
import { COLIS_TYPES, DEFAULT_MAP_REGION } from '@/constants/config';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';

function getColisLabel(typeId: string): string {
  const found = COLIS_TYPES.find((c) => c.id === typeId);
  return found ? found.label : typeId;
}

function getColisIcon(typeId: string): keyof typeof Ionicons.glyphMap {
  const found = COLIS_TYPES.find((c) => c.id === typeId);
  return (found?.icon as keyof typeof Ionicons.glyphMap) || 'cube-outline';
}

interface OrderCardProps {
  order: Order;
  livreurPosition: Position | null;
  onAccept: (orderId: string) => void;
  accepting: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  livreurPosition,
  onAccept,
  accepting,
}) => {
  const distance = livreurPosition
    ? calculateDistance(livreurPosition, {
        latitude: order.adresseEnlevement.latitude,
        longitude: order.adresseEnlevement.longitude,
      })
    : null;

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderCardHeader}>
        <View style={styles.colisTypeContainer}>
          <Ionicons
            name={getColisIcon(order.typeColis)}
            size={20}
            color={Colors.secondary}
          />
          <Text style={styles.colisTypeText}>
            {getColisLabel(order.typeColis)}
          </Text>
        </View>
        <Text style={styles.orderPrice}>
          {(order.prixEstime || 0).toFixed(2)} EUR
        </Text>
      </View>

      <View style={styles.addressRow}>
        <View style={styles.addressDot}>
          <Ionicons name="ellipse" size={10} color={Colors.success} />
        </View>
        <View style={styles.addressTextContainer}>
          <Text style={styles.addressLabel}>Retrait</Text>
          <Text style={styles.addressText} numberOfLines={1}>
            {order.adresseEnlevement.adresse}
          </Text>
        </View>
      </View>

      <View style={styles.addressConnector} />

      <View style={styles.addressRow}>
        <View style={styles.addressDot}>
          <Ionicons name="ellipse" size={10} color={Colors.danger} />
        </View>
        <View style={styles.addressTextContainer}>
          <Text style={styles.addressLabel}>Livraison</Text>
          <Text style={styles.addressText} numberOfLines={1}>
            {order.adresseLivraison.adresse}
          </Text>
        </View>
      </View>

      <View style={styles.orderCardFooter}>
        {distance !== null && (
          <View style={styles.distanceBadge}>
            <Ionicons name="navigate-outline" size={14} color={Colors.textLight} />
            <Text style={styles.distanceText}>{distance.toFixed(1)} km</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.acceptButton, accepting && styles.acceptButtonDisabled]}
          onPress={() => onAccept(order.id)}
          disabled={accepting}
          activeOpacity={0.7}
        >
          {accepting ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
              <Text style={styles.acceptButtonText}>Accepter</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function LivreurDashboard() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { location, loading: locationLoading } = useLocation();

  const [disponible, setDisponible] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);

  // Stats
  const [todayCourses, setTodayCourses] = useState(0);
  const [todayGains, setTodayGains] = useState(0);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    if (profile) {
      setAverageRating(profile.note || 5);
      setTodayCourses(0);
      setTodayGains(0);
    }
  }, [profile]);

  // Subscribe to available orders
  useEffect(() => {
    const unsubscribe = getAvailableOrders(
      (orders) => {
        setAvailableOrders(orders);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('Error loading orders:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Update livreur position in Firestore
  useEffect(() => {
    if (location && user && disponible) {
      updateLivreurPosition(user.uid, location);
    }
  }, [location, user, disponible]);

  const handleToggleDisponible = async (value: boolean) => {
    setDisponible(value);
    if (user) {
      try {
        await updateProfile(user.uid, {
          disponible: value,
        } as any);
      } catch (error) {
        console.error('Error updating availability:', error);
      }
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!user) return;

    Alert.alert(
      'Accepter la commande',
      'Voulez-vous accepter cette commande ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter',
          onPress: async () => {
            setAcceptingOrderId(orderId);
            try {
              await acceptOrder(orderId, user.uid);
              router.push({
                pathname: '/(livreur)/course',
                params: { orderId },
              });
            } catch (error) {
              console.error('Error accepting order:', error);
              Alert.alert(
                'Erreur',
                'Impossible d\'accepter cette commande. Veuillez reessayer.'
              );
            } finally {
              setAcceptingOrderId(null);
            }
          },
        },
      ]
    );
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // The real-time listener will handle the refresh
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const mapRegion = location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : DEFAULT_MAP_REGION;

  const mapMarkers = availableOrders.map((order) => ({
    id: order.id,
    coordinate: {
      latitude: order.adresseEnlevement.latitude,
      longitude: order.adresseEnlevement.longitude,
    },
    title: getColisLabel(order.typeColis),
    description: `${(order.prixEstime || 0).toFixed(2)} EUR`,
    color: Colors.accent,
  }));

  const renderHeader = () => (
    <View>
      {/* Greeting & Availability */}
      <View style={styles.headerCard}>
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greetingText}>
              Bonjour, {profile?.prenom || 'Livreur'}
            </Text>
            <Text style={styles.greetingSubtext}>
              {disponible ? 'Vous etes en service' : 'Vous etes hors service'}
            </Text>
          </View>
          <View style={styles.toggleContainer}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: disponible ? Colors.success : Colors.textLight },
              ]}
            />
            <Text
              style={[
                styles.toggleLabel,
                { color: disponible ? Colors.success : Colors.textLight },
              ]}
            >
              {disponible ? 'Disponible' : 'Indisponible'}
            </Text>
            <Switch
              value={disponible}
              onValueChange={handleToggleDisponible}
              trackColor={{ false: Colors.border, true: '#A3D9A5' }}
              thumbColor={disponible ? Colors.success : Colors.textLight}
            />
          </View>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="bicycle-outline" size={22} color={Colors.secondary} />
          <Text style={styles.statValue}>{todayCourses}</Text>
          <Text style={styles.statLabel}>Courses aujourd'hui</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="cash-outline" size={22} color={Colors.success} />
          <Text style={styles.statValue}>{todayGains.toFixed(2)} EUR</Text>
          <Text style={styles.statLabel}>Gains aujourd'hui</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="star" size={22} color={Colors.accent} />
          <Text style={styles.statValue}>{averageRating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Note moyenne</Text>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapSection}>
        <Text style={styles.sectionTitle}>Commandes a proximite</Text>
        <Map
          initialRegion={mapRegion}
          markers={mapMarkers}
          showUserLocation={true}
          style={styles.map}
        />
      </View>

      {/* Available Orders Header */}
      <View style={styles.ordersHeader}>
        <Text style={styles.sectionTitle}>Commandes disponibles</Text>
        <Text style={styles.ordersCount}>{availableOrders.length} commande(s)</Text>
      </View>
    </View>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={48} color={Colors.textLight} />
      <Text style={styles.emptyTitle}>Aucune commande disponible</Text>
      <Text style={styles.emptySubtitle}>
        De nouvelles commandes apparaitront ici en temps reel
      </Text>
    </View>
  );

  if (loading && availableOrders.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={availableOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            livreurPosition={location}
            onAccept={handleAcceptOrder}
            accepting={acceptingOrderId === item.id}
          />
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

  // Header Card
  headerCard: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 22,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  greetingSubtext: {
    fontSize: Typography.sizes.md,
    color: 'rgba(255,255,255,0.7)',
    marginTop: Spacing.xs,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.sm,
  },
  toggleLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginRight: Spacing.xs,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginTop: -1,
    paddingTop: Spacing.base,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: 6,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
    textAlign: 'center',
  },

  // Map Section
  mapSection: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  map: {
    width: '100%',
    height: 220,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },

  // Orders Header
  ordersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  ordersCount: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
  },

  // Order Card
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    padding: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  colisTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  colisTypeText: {
    fontSize: 13,
    fontWeight: Typography.weights.semibold,
    color: Colors.secondary,
  },
  orderPrice: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },

  // Address
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  addressDot: {
    width: 24,
    alignItems: 'center',
  },
  addressConnector: {
    width: 1,
    height: 14,
    backgroundColor: Colors.border,
    marginLeft: Spacing.md,
  },
  addressTextContainer: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  addressLabel: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: Typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    marginTop: 1,
  },

  // Order Card Footer
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  distanceText: {
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: Typography.weights.medium,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  acceptButtonDisabled: {
    backgroundColor: Colors.border,
  },
  acceptButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
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
