import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Map from '../../components/Map';
import Button from '../../components/Button';
import {
  subscribeToOrder,
  updateOrderStatus,
  Order,
} from '../../services/orders';
import { ORDER_STATUS, OrderStatus } from '../../constants/config';
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LivreurInfo {
  nom: string;
  prenom: string;
  photoURL?: string;
  note?: number;
  vehicule?: string;
  telephone?: string;
  position?: {
    latitude: number;
    longitude: number;
  };
}

export default function SuiviScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId: string }>();
  const orderId = params.orderId;

  const [order, setOrder] = useState<Order | null>(null);
  const [livreur, setLivreur] = useState<LivreurInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  // Subscribe to order updates
  useEffect(() => {
    if (!orderId) return;

    const unsubscribe = subscribeToOrder(orderId, (updatedOrder) => {
      setOrder(updatedOrder);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId]);

  // Subscribe to livreur position when order has a livreur
  useEffect(() => {
    if (!order?.livreurId) {
      setLivreur(null);
      return;
    }

    const livreurRef = doc(db, 'users', order.livreurId);
    const unsubscribe = onSnapshot(livreurRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLivreur({
          nom: data.nom || '',
          prenom: data.prenom || '',
          photoURL: data.photoURL,
          note: data.note,
          vehicule: data.vehicule,
          telephone: data.telephone,
          position: data.position,
        });
      }
    });

    return () => unsubscribe();
  }, [order?.livreurId]);

  const handleCancelOrder = () => {
    Alert.alert(
      'Annuler la commande',
      'Êtes-vous sûr de vouloir annuler cette commande ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            if (!orderId) return;
            setCancelling(true);
            try {
              await updateOrderStatus(orderId, 'annulee');
              Alert.alert('Succès', 'Votre commande a été annulée.');
            } catch (error) {
              Alert.alert('Erreur', "Impossible d'annuler la commande.");
              console.error('Error cancelling order:', error);
            } finally {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleContactLivreur = () => {
    if (orderId) {
      router.push({
        pathname: '/(client)/(tabs)/messages',
        params: {
          orderId,
          livreurNom: livreur ? `${livreur.prenom} ${livreur.nom}` : 'Livreur',
        },
      });
    }
  };

  const canCancel =
    order?.status === 'en_attente' || order?.status === 'acceptee';

  // Calculate ETA based on status
  const getETA = (): string => {
    if (!order) return '--';
    switch (order.status) {
      case 'en_attente':
        return 'En attente d\'un livreur';
      case 'acceptee':
        return '~15-25 min';
      case 'enlevee':
        return '~10-20 min';
      case 'en_transit':
        return '~5-15 min';
      case 'livree':
        return 'Livré';
      case 'annulee':
        return 'Annulée';
      default:
        return '--';
    }
  };

  // Build map markers
  const buildMarkers = () => {
    const markers = [];

    if (order) {
      markers.push({
        id: 'pickup',
        coordinate: {
          latitude: order.adresseEnlevement.latitude,
          longitude: order.adresseEnlevement.longitude,
        },
        title: 'Point d\'enlèvement',
        description: order.adresseEnlevement.adresse,
        color: Colors.secondary,
      });

      markers.push({
        id: 'delivery',
        coordinate: {
          latitude: order.adresseLivraison.latitude,
          longitude: order.adresseLivraison.longitude,
        },
        title: 'Point de livraison',
        description: order.adresseLivraison.adresse,
        color: Colors.success,
      });
    }

    if (livreur?.position) {
      const vehicleIcons: Record<string, string> = {
        voiture: 'car',
        scooter: 'bicycle',
        velo: 'bicycle',
        moto: 'bicycle',
        camionnette: 'bus',
        utilitaire: 'bus',
      };
      markers.push({
        id: 'livreur',
        coordinate: {
          latitude: livreur.position.latitude,
          longitude: livreur.position.longitude,
        },
        title: `${livreur.prenom} ${livreur.nom}`,
        description: livreur.vehicule || 'Livreur',
        icon: vehicleIcons[livreur.vehicule || ''] || 'car',
      });
    }

    return markers;
  };

  // Build route coordinates
  const buildRouteCoordinates = () => {
    if (!order) return undefined;
    const coords = [];

    coords.push({
      latitude: order.adresseEnlevement.latitude,
      longitude: order.adresseEnlevement.longitude,
    });

    if (livreur?.position) {
      coords.push({
        latitude: livreur.position.latitude,
        longitude: livreur.position.longitude,
      });
    }

    coords.push({
      latitude: order.adresseLivraison.latitude,
      longitude: order.adresseLivraison.longitude,
    });

    return coords;
  };

  const getMapRegion = () => {
    if (order) {
      const midLat =
        (order.adresseEnlevement.latitude + order.adresseLivraison.latitude) / 2;
      const midLon =
        (order.adresseEnlevement.longitude + order.adresseLivraison.longitude) / 2;
      const latDelta =
        Math.abs(
          order.adresseEnlevement.latitude - order.adresseLivraison.latitude
        ) * 1.5 + 0.01;
      const lonDelta =
        Math.abs(
          order.adresseEnlevement.longitude - order.adresseLivraison.longitude
        ) * 1.5 + 0.01;

      return {
        latitude: midLat,
        longitude: midLon,
        latitudeDelta: Math.max(latDelta, 0.02),
        longitudeDelta: Math.max(lonDelta, 0.02),
      };
    }
    return undefined;
  };

  const renderStatusBadge = (status: OrderStatus) => {
    const config = ORDER_STATUS[status];
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
        <View style={[styles.statusDot, { backgroundColor: config.color }]} />
        <Text style={[styles.statusText, { color: config.color }]}>
          {config.label}
        </Text>
      </View>
    );
  };

  const renderStarRating = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= Math.round(rating) ? 'star' : 'star-outline'}
            size={14}
            color={Colors.accent}
          />
        ))}
        <Text style={styles.ratingText}>{rating?.toFixed(1)}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement du suivi...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.textLight} />
        <Text style={styles.errorText}>Commande introuvable</Text>
        <Button
          title="Retour"
          onPress={() => router.back()}
          variant="outline"
          style={styles.errorButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Suivi de commande</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Full Screen Map - follows livreur position in real-time */}
      <View style={styles.mapContainer}>
        <Map
          initialRegion={getMapRegion()}
          markers={buildMarkers()}
          routeCoordinates={buildRouteCoordinates()}
          followCoordinate={livreur?.position || null}
          style={styles.map}
        />
      </View>

      {/* Bottom Sheet */}
      <ScrollView
        style={styles.bottomSheet}
        contentContainerStyle={styles.bottomSheetContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.sheetHandle} />

        {/* Status */}
        <View style={styles.statusRow}>
          {renderStatusBadge(order.status)}
          <Text style={styles.etaText}>{getETA()}</Text>
        </View>

        {/* Addresses */}
        <View style={styles.addressesCard}>
          <View style={styles.addressRow}>
            <View style={[styles.addressDot, { backgroundColor: Colors.secondary }]} />
            <View style={styles.addressInfo}>
              <Text style={styles.addressLabel}>Enlèvement</Text>
              <Text style={styles.addressValue}>{order.adresseEnlevement.adresse}</Text>
            </View>
          </View>
          <View style={styles.addressConnector} />
          <View style={styles.addressRow}>
            <View style={[styles.addressDot, { backgroundColor: Colors.success }]} />
            <View style={styles.addressInfo}>
              <Text style={styles.addressLabel}>Livraison</Text>
              <Text style={styles.addressValue}>{order.adresseLivraison.adresse}</Text>
            </View>
          </View>
        </View>

        {/* Livreur Info */}
        {livreur && (
          <View style={styles.livreurCard}>
            <View style={styles.livreurHeader}>
              <View style={styles.livreurAvatar}>
                {livreur.photoURL ? (
                  <Image
                    source={{ uri: livreur.photoURL }}
                    style={styles.livreurPhoto}
                  />
                ) : (
                  <Ionicons name="person" size={28} color={Colors.white} />
                )}
              </View>
              <View style={styles.livreurDetails}>
                <Text style={styles.livreurName}>
                  {livreur.prenom} {livreur.nom}
                </Text>
                {livreur.note && renderStarRating(livreur.note)}
                {livreur.vehicule && (
                  <View style={styles.vehicleRow}>
                    <Ionicons name="car" size={14} color={Colors.textLight} />
                    <Text style={styles.vehicleText}>{livreur.vehicule}</Text>
                  </View>
                )}
              </View>
            </View>

            <Button
              title="Contacter le livreur"
              onPress={handleContactLivreur}
              variant="secondary"
              icon="chatbubble-ellipses"
              style={styles.contactButton}
            />
          </View>
        )}

        {/* Cancel Button */}
        {canCancel && (
          <Button
            title="Annuler la commande"
            onPress={handleCancelOrder}
            variant="danger"
            icon="close-circle"
            loading={cancelling}
            style={styles.cancelButton}
          />
        )}

        {/* New order button when cancelled */}
        {order.status === 'annulee' && (
          <View style={styles.cancelledCard}>
            <Ionicons name="information-circle-outline" size={32} color={Colors.textLight} />
            <Text style={styles.cancelledText}>
              Cette commande a été annulée.
            </Text>
            <Button
              title="Passer une nouvelle commande"
              onPress={() => router.replace('/(client)/nouvelle-commande')}
              icon="add-circle"
              style={styles.newOrderButton}
            />
          </View>
        )}

        {/* New order button when delivered */}
        {order.status === 'livree' && (
          <View style={styles.cancelledCard}>
            <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
            <Text style={styles.cancelledText}>
              Commande livrée avec succès !
            </Text>
            <Button
              title="Passer une nouvelle commande"
              onPress={() => router.replace('/(client)/nouvelle-commande')}
              icon="add-circle"
              style={styles.newOrderButton}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(27, 58, 92, 0.8)',
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerSpacer: {
    width: 40,
  },
  mapContainer: {
    height: SCREEN_HEIGHT * 0.75,
  },
  map: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  bottomSheet: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    marginTop: -24,
    ...Shadows.cardHover,
  },
  bottomSheetContent: {
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.base,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xxl,
    gap: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
  },
  etaText: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    fontWeight: Typography.weights.medium,
  },
  addressesCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  addressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  addressConnector: {
    width: 2,
    height: 16,
    backgroundColor: Colors.border,
    marginLeft: 5,
    marginVertical: Spacing.xs,
  },
  addressInfo: {
    flex: 1,
  },
  addressLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginBottom: 2,
  },
  addressValue: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  livreurCard: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  livreurHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  livreurAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  livreurPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  livreurDetails: {
    flex: 1,
  },
  livreurName: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 2,
  },
  ratingText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginLeft: Spacing.xs,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  vehicleText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  contactButton: {
    marginTop: 0,
  },
  cancelButton: {
    marginTop: Spacing.sm,
  },
  cancelledCard: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginTop: Spacing.base,
  },
  cancelledText: {
    fontSize: Typography.sizes.base,
    color: Colors.textLight,
    textAlign: 'center',
    marginVertical: Spacing.md,
  },
  newOrderButton: {
    marginTop: Spacing.sm,
    minWidth: 250,
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: Typography.sizes.lg,
    color: Colors.textLight,
    marginTop: Spacing.base,
    marginBottom: Spacing.xl,
  },
  errorButton: {
    minWidth: 150,
  },
});
