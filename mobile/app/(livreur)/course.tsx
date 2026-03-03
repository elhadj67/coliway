import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  Dimensions,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Map from '@/components/Map';
import Button from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import {
  subscribeToOrder,
  updateOrderStatus,
  Order,
} from '@/services/orders';
import { getUserProfile, UserProfile } from '@/services/auth';
import {
  updateLivreurPosition,
  Position,
} from '@/services/location';
import { ORDER_STATUS, OrderStatus } from '@/constants/config';
import { Colors } from '@/constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StatusBadgeProps {
  status: OrderStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = ORDER_STATUS[status];
  return (
    <View style={[statusBadgeStyles.badge, { backgroundColor: config.color + '20' }]}>
      <View style={[statusBadgeStyles.dot, { backgroundColor: config.color }]} />
      <Text style={[statusBadgeStyles.text, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
};

const statusBadgeStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default function CourseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId: string }>();
  const { user } = useAuth();
  const { location } = useLocation();

  const [order, setOrder] = useState<Order | null>(null);
  const [clientProfile, setClientProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const orderId = params.orderId;

  // Subscribe to order updates
  useEffect(() => {
    if (!orderId) return;

    const unsubscribe = subscribeToOrder(orderId, (updatedOrder) => {
      setOrder(updatedOrder);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId]);

  // Fetch client profile
  useEffect(() => {
    if (order?.clientId) {
      getUserProfile(order.clientId).then((profile) => {
        setClientProfile(profile);
      });
    }
  }, [order?.clientId]);

  // Update livreur position in Firestore
  useEffect(() => {
    if (location && user) {
      updateLivreurPosition(user.uid, location);
    }
  }, [location, user]);

  const isPickedUp =
    order?.status === 'en_transit' ||
    order?.status === 'enlevee' ||
    order?.status === 'livree';

  const currentStep = isPickedUp
    ? 'Livrer le colis'
    : 'Se rendre au point de retrait';

  const nextDestination: Position | null = order
    ? isPickedUp
      ? {
          latitude: order.adresseLivraison.latitude,
          longitude: order.adresseLivraison.longitude,
        }
      : {
          latitude: order.adresseEnlevement.latitude,
          longitude: order.adresseEnlevement.longitude,
        }
    : null;

  const currentAddress = order
    ? isPickedUp
      ? order.adresseLivraison.adresse
      : order.adresseEnlevement.adresse
    : '';

  const handleCopyAddress = () => {
    if (currentAddress) {
      Clipboard.setString(currentAddress);
      Alert.alert('Copie', 'Adresse copiee dans le presse-papiers');
    }
  };

  const handleOpenMaps = () => {
    if (!nextDestination) return;

    const { latitude, longitude } = nextDestination;
    const label = encodeURIComponent(currentAddress);

    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        // Fallback to Google Maps
        Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
        );
      });
    }
  };

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!orderId) return;

    const statusLabels: Record<string, string> = {
      enlevee: 'Confirmer la recuperation du colis ?',
      en_transit: 'Confirmer la recuperation du colis ?',
      livree: 'Confirmer la livraison du colis ?',
    };

    Alert.alert(
      'Confirmation',
      statusLabels[newStatus] || 'Confirmer le changement de statut ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setUpdatingStatus(true);
            try {
              await updateOrderStatus(orderId, newStatus);
              if (newStatus === 'livree') {
                Alert.alert(
                  'Livraison terminee',
                  'Le colis a ete livre avec succes !',
                  [
                    {
                      text: 'OK',
                      onPress: () => router.back(),
                    },
                  ]
                );
              }
            } catch (error) {
              console.error('Error updating status:', error);
              Alert.alert(
                'Erreur',
                'Impossible de mettre a jour le statut. Veuillez reessayer.'
              );
            } finally {
              setUpdatingStatus(false);
            }
          },
        },
      ]
    );
  };

  const handleContactClient = () => {
    if (!orderId) return;
    router.push({
      pathname: '/(livreur)/chat',
      params: { orderId },
    });
  };

  // Build map markers
  const mapMarkers = [];

  if (order) {
    if (!isPickedUp) {
      mapMarkers.push({
        id: 'pickup',
        coordinate: {
          latitude: order.adresseEnlevement.latitude,
          longitude: order.adresseEnlevement.longitude,
        },
        title: 'Point de retrait',
        description: order.adresseEnlevement.adresse,
        color: Colors.success,
      });
    }

    mapMarkers.push({
      id: 'delivery',
      coordinate: {
        latitude: order.adresseLivraison.latitude,
        longitude: order.adresseLivraison.longitude,
      },
      title: 'Point de livraison',
      description: order.adresseLivraison.adresse,
      color: Colors.danger,
    });
  }

  // Build route coordinates
  const routeCoordinates: Position[] = [];
  if (location) {
    routeCoordinates.push(location);
  }
  if (nextDestination) {
    routeCoordinates.push(nextDestination);
  }

  // Map region centered on current location or next destination
  const mapRegion = location
    ? {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      }
    : nextDestination
    ? {
        latitude: nextDestination.latitude,
        longitude: nextDestination.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      }
    : {
        latitude: 48.8566,
        longitude: 2.3522,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement de la course...</Text>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
        <Text style={styles.errorText}>Commande introuvable</Text>
        <Button
          title="Retour"
          onPress={() => router.back()}
          variant="outline"
          style={{ marginTop: 16, width: 200 }}
        />
      </SafeAreaView>
    );
  }

  const renderStatusAction = () => {
    const status = order.status;

    if (status === 'acceptee') {
      return (
        <Button
          title="Colis recupere"
          onPress={() => handleUpdateStatus('en_transit')}
          loading={updatingStatus}
          icon="cube-outline"
          variant="primary"
          style={styles.actionButton}
        />
      );
    }

    if (status === 'en_transit' || status === 'enlevee') {
      return (
        <Button
          title="Colis livre"
          onPress={() => handleUpdateStatus('livree')}
          loading={updatingStatus}
          icon="checkmark-circle-outline"
          variant="primary"
          style={[styles.actionButton, { backgroundColor: Colors.success }]}
        />
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Full-screen Map */}
      <Map
        initialRegion={mapRegion}
        markers={mapMarkers}
        showUserLocation={true}
        routeCoordinates={routeCoordinates.length > 1 ? routeCoordinates : undefined}
        style={styles.fullMap}
      />

      {/* Back Button */}
      <SafeAreaView style={styles.backButtonWrapper} edges={['top']}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.bottomSheetHandle} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.bottomSheetContent}
        >
          {/* Status & Client */}
          <View style={styles.statusRow}>
            <StatusBadge status={order.status} />
            {clientProfile && (
              <Text style={styles.clientName}>
                {clientProfile.prenom} {clientProfile.nom}
              </Text>
            )}
          </View>

          {/* Current Step */}
          <View style={styles.stepContainer}>
            <View style={styles.stepIconContainer}>
              <Ionicons
                name={isPickedUp ? 'flag' : 'location'}
                size={20}
                color={Colors.white}
              />
            </View>
            <View style={styles.stepTextContainer}>
              <Text style={styles.stepLabel}>Etape en cours</Text>
              <Text style={styles.stepTitle}>{currentStep}</Text>
            </View>
          </View>

          {/* Address */}
          <View style={styles.addressCard}>
            <View style={styles.addressCardHeader}>
              <Ionicons name="location-outline" size={18} color={Colors.secondary} />
              <Text style={styles.addressCardLabel}>
                {isPickedUp ? 'Adresse de livraison' : 'Adresse de retrait'}
              </Text>
            </View>
            <Text style={styles.addressCardText}>{currentAddress}</Text>
            <View style={styles.addressActions}>
              <TouchableOpacity
                style={styles.addressActionButton}
                onPress={handleCopyAddress}
                activeOpacity={0.7}
              >
                <Ionicons name="copy-outline" size={16} color={Colors.secondary} />
                <Text style={styles.addressActionText}>Copier</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addressActionButton}
                onPress={handleOpenMaps}
                activeOpacity={0.7}
              >
                <Ionicons name="navigate-outline" size={16} color={Colors.secondary} />
                <Text style={styles.addressActionText}>Ouvrir dans Maps</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {renderStatusAction()}

            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleContactClient}
              activeOpacity={0.7}
            >
              <Ionicons name="chatbubble-outline" size={18} color={Colors.secondary} />
              <Text style={styles.contactButtonText}>Contacter le client</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
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
    marginTop: 12,
    fontSize: 16,
    color: Colors.textLight,
  },
  errorText: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },

  // Map
  fullMap: {
    width: '100%',
    height: SCREEN_HEIGHT * 0.5,
    borderRadius: 0,
  },

  // Back Button
  backButtonWrapper: {
    position: 'absolute',
    top: 0,
    left: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },

  // Bottom Sheet
  bottomSheet: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  bottomSheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  // Status Row
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },

  // Step
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '08',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },

  // Address Card
  addressCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  addressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  addressCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondary,
  },
  addressCardText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 10,
  },
  addressActions: {
    flexDirection: 'row',
    gap: 12,
  },
  addressActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.white,
  },
  addressActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondary,
  },

  // Actions
  actionsContainer: {
    gap: 10,
  },
  actionButton: {
    width: '100%',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.secondary,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.secondary,
  },
});
