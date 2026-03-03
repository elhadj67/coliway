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
import { SafeAreaView } from 'react-native-safe-area-context';
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

const COLORS = {
  primary: '#1B3A5C',
  secondary: '#2E86DE',
  accent: '#F39C12',
  success: '#27AE60',
  danger: '#E74C3C',
  background: '#F5F7FA',
  white: '#FFFFFF',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  border: '#E0E6ED',
};

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
            color={COLORS.secondary}
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
          <Ionicons name="ellipse" size={10} color={COLORS.success} />
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
          <Ionicons name="ellipse" size={10} color={COLORS.danger} />
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
            <Ionicons name="navigate-outline" size={14} color={COLORS.textLight} />
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
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
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
    const unsubscribe = getAvailableOrders((orders) => {
      setAvailableOrders(orders);
      setLoading(false);
      setRefreshing(false);
    });

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
    color: COLORS.accent,
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
                { backgroundColor: disponible ? COLORS.success : COLORS.textLight },
              ]}
            />
            <Text
              style={[
                styles.toggleLabel,
                { color: disponible ? COLORS.success : COLORS.textLight },
              ]}
            >
              {disponible ? 'Disponible' : 'Indisponible'}
            </Text>
            <Switch
              value={disponible}
              onValueChange={handleToggleDisponible}
              trackColor={{ false: COLORS.border, true: '#A3D9A5' }}
              thumbColor={disponible ? COLORS.success : COLORS.textLight}
            />
          </View>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="bicycle-outline" size={22} color={COLORS.secondary} />
          <Text style={styles.statValue}>{todayCourses}</Text>
          <Text style={styles.statLabel}>Courses aujourd'hui</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="cash-outline" size={22} color={COLORS.success} />
          <Text style={styles.statValue}>{todayGains.toFixed(2)} EUR</Text>
          <Text style={styles.statLabel}>Gains aujourd'hui</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="star" size={22} color={COLORS.accent} />
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
      <Ionicons name="search-outline" size={48} color={COLORS.textLight} />
      <Text style={styles.emptyTitle}>Aucune commande disponible</Text>
      <Text style={styles.emptySubtitle}>
        De nouvelles commandes apparaitront ici en temps reel
      </Text>
    </View>
  );

  if (loading && availableOrders.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textLight,
  },
  listContent: {
    paddingBottom: 24,
  },

  // Header Card
  headerCard: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 8,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
  },
  greetingSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -1,
    paddingTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 2,
    textAlign: 'center',
  },

  // Map Section
  mapSection: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  map: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
  },

  // Orders Header
  ordersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  ordersCount: {
    fontSize: 14,
    color: COLORS.textLight,
  },

  // Order Card
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
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
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  colisTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Address
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  addressDot: {
    width: 24,
    alignItems: 'center',
  },
  addressConnector: {
    width: 1,
    height: 14,
    backgroundColor: COLORS.border,
    marginLeft: 12,
  },
  addressTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  addressLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 1,
  },

  // Order Card Footer
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  acceptButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
