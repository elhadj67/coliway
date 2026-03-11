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
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Map from '../../components/Map';
import Button from '../../components/Button';
import {
  subscribeToOrder,
  updateOrderStatus,
  rateDelivery,
  Order,
} from '../../services/orders';
import { ORDER_STATUS, OrderStatus } from '../../constants/config';
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { doc, collection, query, where, onSnapshot } from 'firebase/firestore';
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
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [nearbyLivreurs, setNearbyLivreurs] = useState<Array<{
    id: string;
    prenom: string;
    nom: string;
    vehicule?: string;
    position: { latitude: number; longitude: number };
  }>>([]);

  // Subscribe to order updates
  useEffect(() => {
    if (!orderId) return;

    const unsubscribe = subscribeToOrder(orderId, (updatedOrder) => {
      setOrder(updatedOrder);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId]);

  // Subscribe to nearby available livreurs when waiting
  useEffect(() => {
    if (order?.status !== 'en_attente') {
      setNearbyLivreurs([]);
      return;
    }

    const q = query(
      collection(db, 'users'),
      where('role', '==', 'livreur'),
      where('disponible', '==', true)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const drivers: typeof nearbyLivreurs = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.position?.latitude && data.position?.longitude) {
          drivers.push({
            id: docSnap.id,
            prenom: data.prenom || '',
            nom: data.nom || '',
            vehicule: data.vehicule,
            position: { latitude: data.position.latitude, longitude: data.position.longitude },
          });
        }
      });
      setNearbyLivreurs(drivers);
    });

    return () => unsubscribe();
  }, [order?.status]);

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

  const handleSubmitRating = async () => {
    if (!orderId || !order?.livreurId || selectedRating === 0) return;
    setSubmittingRating(true);
    try {
      await rateDelivery(orderId, order.livreurId, selectedRating);
      setHasRated(true);
    } catch (error) {
      console.error('Error rating livreur:', error);
    } finally {
      setSubmittingRating(false);
      setShowRatingModal(false);
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

    const vehicleIcons: Record<string, string> = {
      voiture: 'car',
      scooter: 'bicycle',
      velo: 'bicycle',
      moto: 'bicycle',
      camionnette: 'bus',
      camion: 'bus',
      utilitaire: 'bus',
    };

    if (livreur?.position) {
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

    // Show all available livreurs when waiting
    if (order?.status === 'en_attente') {
      nearbyLivreurs.forEach((l) => {
        markers.push({
          id: `livreur-${l.id}`,
          coordinate: l.position,
          title: `${l.prenom} ${l.nom}`,
          description: l.vehicule || 'Livreur',
          icon: vehicleIcons[l.vehicule || ''] || 'car',
        });
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

        {/* Report Problem Button */}
        {order.status !== 'annulee' && (
          <Button
            title="Signaler un problème"
            onPress={() =>
              router.push({
                pathname: '/(client)/reclamation',
                params: { commandeId: orderId },
              })
            }
            variant="outline"
            icon="warning-outline"
            style={styles.reportButton}
          />
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
            {order.photoPreuve && (
              <View style={styles.proofPhotoContainer}>
                <Text style={styles.proofPhotoLabel}>Preuve de livraison</Text>
                <Image
                  source={{ uri: order.photoPreuve }}
                  style={styles.proofPhoto}
                  resizeMode="cover"
                />
                {order.commentairePreuve && (
                  <Text style={styles.proofComment}>{order.commentairePreuve}</Text>
                )}
              </View>
            )}
            {!hasRated && !order.noteLivreur && (
              <TouchableOpacity
                style={styles.rateButton}
                onPress={() => setShowRatingModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="star" size={18} color="#F1C40F" />
                <Text style={styles.rateButtonText}>Noter le livreur</Text>
              </TouchableOpacity>
            )}
            {(hasRated || order.noteLivreur) && (
              <View style={styles.ratedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.ratedText}>Livreur note !</Text>
              </View>
            )}
            <Button
              title="Passer une nouvelle commande"
              onPress={() => router.replace('/(client)/nouvelle-commande')}
              icon="add-circle"
              style={styles.newOrderButton}
            />
          </View>
        )}
      </ScrollView>

      {/* Rating Modal */}
      <Modal visible={showRatingModal} transparent animationType="fade">
        <View style={styles.ratingOverlay}>
          <View style={styles.ratingModal}>
            <Ionicons name="star" size={48} color="#F1C40F" />
            <Text style={styles.ratingTitle}>Noter votre livreur</Text>
            <Text style={styles.ratingSubtitle}>
              {livreur ? `${livreur.prenom} ${livreur.nom}` : 'Votre livreur'}
            </Text>
            <View style={styles.ratingStarsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setSelectedRating(star)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={star <= selectedRating ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= selectedRating ? '#F1C40F' : Colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[
                styles.ratingSubmitButton,
                selectedRating === 0 && styles.ratingSubmitDisabled,
              ]}
              onPress={handleSubmitRating}
              disabled={selectedRating === 0 || submittingRating}
              activeOpacity={0.7}
            >
              {submittingRating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.ratingSubmitText}>Valider</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowRatingModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.ratingSkipText}>Plus tard</Text>
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
  reportButton: {
    marginTop: Spacing.sm,
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
  proofPhotoContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  proofPhotoLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  proofPhoto: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
  },
  proofComment: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1C40F' + '20',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  rateButtonText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  ratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.md,
  },
  ratedText: {
    fontSize: Typography.sizes.md,
    color: Colors.success,
    fontWeight: Typography.weights.medium,
  },
  ratingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '85%',
    maxWidth: 340,
  },
  ratingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
  },
  ratingSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  ratingStarsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  ratingSubmitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  ratingSubmitDisabled: {
    backgroundColor: Colors.border,
  },
  ratingSubmitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ratingSkipText: {
    color: Colors.textLight,
    fontSize: 14,
    marginTop: 14,
  },
});
