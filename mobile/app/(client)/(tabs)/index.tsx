import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import Map from '../../../components/Map';
import Button from '../../../components/Button';
import AddressInput from '../../../components/AddressInput';
import {
  getCurrentPosition,
  requestLocationPermission,
  reverseGeocodePosition,
  Position,
} from '../../../services/location';
import { COLIS_TYPES, ColisType, DEFAULT_MAP_REGION } from '../../../constants/config';
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '../../../constants/theme';
import { getRouteInfo, RouteInfo } from '../../../services/routing';
import {
  calculatePriceAsync,
  fetchPricingConfig,
  TRAFFIC_SURCHARGE,
  MIN_DELIVERY_TIME,
} from '../../../services/pricing';
import { useAuth } from '../../../hooks/useAuth';
import { updateProfile, SavedAddress } from '../../../services/auth';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT_SMALL = SCREEN_HEIGHT * 0.25;
const MAP_HEIGHT_LARGE = SCREEN_HEIGHT * 0.65;
const CARD_MINIMIZED_HEIGHT = 100;

export default function ClientHomeScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [adresseDepart, setAdresseDepart] = useState('');
  const [adresseArrivee, setAdresseArrivee] = useState('');
  const [departCoords, setDepartCoords] = useState<Position | null>(null);
  const [arriveeCoords, setArriveeCoords] = useState<Position | null>(null);
  const [selectedColis, setSelectedColis] = useState<ColisType>(COLIS_TYPES[1]);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [trafficLevel, setTrafficLevel] = useState<string>('inconnu');
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [livreurs, setLivreurs] = useState<Array<{ id: string; position: Position; prenom: string; nom: string; vehicule?: string }>>([]);
  // Saved addresses
  const [addAddressModal, setAddAddressModal] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('');
  const [newAddressValue, setNewAddressValue] = useState('');
  const [newAddressCoords, setNewAddressCoords] = useState<Position | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressTarget, setAddressTarget] = useState<'depart' | 'arrivee'>('depart');

  // Card collapse/expand
  const [cardMinimized, setCardMinimized] = useState(false);
  const cardAnim = useRef(new Animated.Value(0)).current; // 0 = expanded, 1 = minimized

  const toggleCard = () => {
    const toValue = cardMinimized ? 0 : 1;
    Animated.spring(cardAnim, {
      toValue,
      useNativeDriver: false,
      friction: 8,
      tension: 65,
    }).start();
    setCardMinimized(!cardMinimized);
  };

  const mapHeight = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [MAP_HEIGHT_SMALL, MAP_HEIGHT_LARGE],
  });

  const cardContentOpacity = cardAnim.interpolate({
    inputRange: [0, 0.3],
    outputRange: [1, 0],
  });

  const savedAddresses: SavedAddress[] = profile?.adressesSauvegardees || [];

  // Preload pricing config from Firestore
  useEffect(() => {
    fetchPricingConfig();
  }, []);

  const handleSaveNewAddress = async () => {
    if (!user || !newAddressLabel.trim() || !newAddressValue.trim()) return;
    setSavingAddress(true);
    try {
      const updated = [...savedAddresses, { label: newAddressLabel.trim(), adresse: newAddressValue.trim() }];
      await updateProfile(user.uid, { adressesSauvegardees: updated });
      await refreshProfile();
      setAddAddressModal(false);
      setNewAddressLabel('');
      setNewAddressValue('');
      setNewAddressCoords(null);
    } catch {
      Alert.alert('Erreur', 'Impossible d\'enregistrer l\'adresse.');
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteSavedAddress = (index: number) => {
    const addr = savedAddresses[index];
    Alert.alert('Supprimer', `Supprimer "${addr.label}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          if (!user) return;
          const updated = savedAddresses.filter((_, i) => i !== index);
          await updateProfile(user.uid, { adressesSauvegardees: updated });
          await refreshProfile();
        },
      },
    ]);
  };

  const handlePickSavedAddress = async (addr: SavedAddress) => {
    // Geocode the saved address
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr.adresse)}&format=json&countrycodes=fr&limit=1`,
        { headers: { 'Accept': 'application/json', 'User-Agent': 'ColiwayApp/1.0' } }
      );
      const data = await resp.json();
      const lat = data[0] ? parseFloat(data[0].lat) : 0;
      const lng = data[0] ? parseFloat(data[0].lon) : 0;

      if (!adresseDepart || addressTarget === 'depart') {
        setAdresseDepart(addr.adresse);
        setDepartCoords({ latitude: lat, longitude: lng });
      } else {
        setAdresseArrivee(addr.adresse);
        setArriveeCoords({ latitude: lat, longitude: lng });
      }
    } catch {
      // Fallback without coords
      if (!adresseDepart || addressTarget === 'depart') {
        setAdresseDepart(addr.adresse);
      } else {
        setAdresseArrivee(addr.adresse);
      }
    }
  };

  // Subscribe to available livreurs with positions
  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'livreur'),
      where('disponible', '==', true)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const drivers: typeof livreurs = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.position?.latitude && data.position?.longitude) {
          drivers.push({
            id: doc.id,
            position: { latitude: data.position.latitude, longitude: data.position.longitude },
            prenom: data.prenom || '',
            nom: data.nom || '',
            vehicule: data.vehicule,
          });
        }
      });
      setLivreurs(drivers);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const granted = await requestLocationPermission();
        if (!granted) {
          Alert.alert(
            'Position requise',
            "Veuillez autoriser l'accès à votre position pour utiliser Coliway."
          );
          setCurrentPosition({
            latitude: DEFAULT_MAP_REGION.latitude,
            longitude: DEFAULT_MAP_REGION.longitude,
          });
          return;
        }

        const location = await getCurrentPosition();
        setCurrentPosition(location.coords);

        // Auto-fill departure address and coords from current position
        setDepartCoords({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        const address = await reverseGeocodePosition(location.coords);
        if (address) {
          setAdresseDepart(address);
        }
      } catch {
        // Fallback to default Paris location
        setCurrentPosition({
          latitude: DEFAULT_MAP_REGION.latitude,
          longitude: DEFAULT_MAP_REGION.longitude,
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (!departCoords || !arriveeCoords) {
      setEstimatedPrice(null);
      setEstimatedDistance(null);
      setEstimatedTime(null);
      setTrafficLevel('inconnu');
      return;
    }

    let cancelled = false;
    setLoadingRoute(true);

    (async () => {
      try {
        const route = await getRouteInfo(departCoords, arriveeCoords);
        if (cancelled) return;

        setEstimatedDistance(route.distanceKm);
        // Delivery time = driving time with real-time traffic
        const totalTime = Math.max(route.durationTrafficMin, MIN_DELIVERY_TIME);
        setEstimatedTime(totalTime);
        setTrafficLevel(route.trafficLevel);

        // Price = base colis price + distance tiers + traffic surcharge
        const clientType = profile?.typeClient || 'particulier';
        const basePrice = await calculatePriceAsync(route.distanceKm, selectedColis.id, clientType);
        const surcharge = TRAFFIC_SURCHARGE[route.trafficLevel] || 1.0;
        setEstimatedPrice(Math.round(basePrice * surcharge * 100) / 100);
      } catch {
        if (cancelled) return;
        setEstimatedPrice(null);
        setEstimatedDistance(null);
        setEstimatedTime(null);
      } finally {
        if (!cancelled) setLoadingRoute(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedColis, departCoords, arriveeCoords]);

  const handleCommander = () => {
    if (!adresseDepart.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir une adresse de départ.');
      return;
    }
    if (!adresseArrivee.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir une adresse d\'arrivée.');
      return;
    }

    router.push({
      pathname: '/(client)/nouvelle-commande',
      params: {
        adresseDepart,
        adresseArrivee,
        typeColis: selectedColis.id,
        prixEstime: estimatedPrice?.toString() || '0',
        distance: estimatedDistance?.toString() || '0',
        departLat: departCoords?.latitude?.toString() || '',
        departLng: departCoords?.longitude?.toString() || '',
        arriveeLat: arriveeCoords?.latitude?.toString() || '',
        arriveeLng: arriveeCoords?.longitude?.toString() || '',
      },
    } as any);
  };

  const mapRegion = currentPosition
    ? {
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : DEFAULT_MAP_REGION;

  const mapMarkers = [
    ...(currentPosition
      ? [
          {
            id: 'user',
            coordinate: currentPosition,
            title: 'Ma position',
            color: Colors.secondary,
          },
        ]
      : []),
    ...livreurs.map((l) => {
      const vehicleIcons: Record<string, string> = {
        voiture: 'car',
        scooter: 'bicycle',
        velo: 'bicycle',
        moto: 'bicycle',
        camionnette: 'bus',
      };
      return {
        id: `livreur-${l.id}`,
        coordinate: l.position,
        title: `${l.prenom} ${l.nom}`,
        description: l.vehicule || 'Livreur',
        icon: vehicleIcons[l.vehicule || ''] || 'car',
      };
    }),
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Map Section */}
      <Animated.View style={[styles.mapContainer, { height: mapHeight }]}>
        <Map
          initialRegion={mapRegion}
          markers={mapMarkers}
          showUserLocation
          style={styles.map}
        />
      </Animated.View>

      {/* Bottom Card */}
      <ScrollView
        style={styles.card}
        contentContainerStyle={styles.cardContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled
        scrollEnabled={!cardMinimized}
      >
        {/* Collapse/Expand Handle */}
        <TouchableOpacity style={styles.cardHandleArea} onPress={toggleCard} activeOpacity={0.7}>
          <View style={styles.cardHandle} />
          <Ionicons
            name={cardMinimized ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={Colors.textLight}
          />
        </TouchableOpacity>

        <Animated.View style={{ opacity: cardContentOpacity }}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Envoyer un colis</Text>
          {profile?.typeClient === 'professionnel' && (
            <View style={styles.proBadge}>
              <Ionicons name="briefcase" size={12} color={Colors.white} />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
        </View>

        {/* Saved Addresses */}
        <View style={styles.savedSection}>
          <Text style={styles.savedSectionLabel}>Mes adresses enregistrées</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.savedList}
          >
            {savedAddresses.map((addr, index) => (
              <TouchableOpacity
                key={index}
                style={styles.savedChip}
                onPress={() => handlePickSavedAddress(addr)}
                onLongPress={() => handleDeleteSavedAddress(index)}
                activeOpacity={0.7}
              >
                <Ionicons name="bookmark" size={14} color={Colors.secondary} />
                <Text style={styles.savedChipLabel} numberOfLines={1}>{addr.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.addChip}
              onPress={() => setAddAddressModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color={Colors.primary} />
              <Text style={styles.addChipText}>Ajouter</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Address Inputs */}
        <View style={styles.addressSection}>
          <AddressInput
            placeholder="Adresse de départ"
            icon="location"
            value={adresseDepart}
            onAddressSelect={(address, lat, lng) => {
              setAdresseDepart(address);
              setDepartCoords({ latitude: lat, longitude: lng });
              setAddressTarget('arrivee');
            }}
          />

          <View style={styles.arrowContainer}>
            <Ionicons name="arrow-down" size={20} color={Colors.secondary} />
          </View>

          <AddressInput
            placeholder="Adresse d'arrivée"
            icon="navigate"
            value={adresseArrivee}
            onAddressSelect={(address, lat, lng) => {
              setAdresseArrivee(address);
              setArriveeCoords({ latitude: lat, longitude: lng });
            }}
          />
        </View>

        {/* Colis Type Selector */}
        <Text style={styles.sectionLabel}>Type de colis</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.colisTypesContainer}
        >
          {COLIS_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.colisTypeItem,
                selectedColis.id === type.id && styles.colisTypeItemSelected,
              ]}
              onPress={() => setSelectedColis(type)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={type.icon as keyof typeof Ionicons.glyphMap}
                size={24}
                color={
                  selectedColis.id === type.id ? Colors.white : Colors.primary
                }
              />
              <Text
                style={[
                  styles.colisTypeLabel,
                  selectedColis.id === type.id && styles.colisTypeLabelSelected,
                ]}
              >
                {type.label}
              </Text>
              <Text
                style={[
                  styles.colisTypeWeight,
                  selectedColis.id === type.id && styles.colisTypeWeightSelected,
                ]}
              >
                max {type.poidsMax} kg
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Price Estimate */}
        {loadingRoute && departCoords && arriveeCoords && (
          <View style={styles.priceContainer}>
            <ActivityIndicator size="small" color={Colors.secondary} />
            <Text style={[styles.priceInfoText, { textAlign: 'center', marginTop: 8 }]}>
              Calcul du trajet en temps réel...
            </Text>
          </View>
        )}
        {!loadingRoute && estimatedPrice !== null && (
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <View style={styles.priceInfo}>
                <Ionicons name="speedometer-outline" size={18} color={Colors.textLight} />
                <Text style={styles.priceInfoText}>
                  {estimatedDistance} km
                </Text>
              </View>
              <View style={styles.priceInfo}>
                <Ionicons name="time-outline" size={18} color={Colors.textLight} />
                <Text style={styles.priceInfoText}>
                  ~{estimatedTime} min
                </Text>
              </View>
              <View style={styles.priceInfo}>
                <Ionicons
                  name="car-outline"
                  size={18}
                  color={trafficLevel === 'fluide' ? Colors.success : trafficLevel === 'dense' ? '#E74C3C' : Colors.accent}
                />
                <Text style={[
                  styles.priceInfoText,
                  { color: trafficLevel === 'fluide' ? Colors.success : trafficLevel === 'dense' ? '#E74C3C' : Colors.accent }
                ]}>
                  {trafficLevel === 'inconnu' ? '' : `Trafic ${trafficLevel}`}
                </Text>
              </View>
            </View>
            {trafficLevel === 'dense' && (
              <Text style={styles.trafficWarning}>
                Surcharge trafic dense (+20%)
              </Text>
            )}
            {trafficLevel === 'modéré' && (
              <Text style={styles.trafficInfo}>
                Surcharge trafic modéré (+10%)
              </Text>
            )}
            <View style={styles.priceEstimate}>
              <Text style={styles.priceLabel}>Prix estimé</Text>
              <Text style={styles.priceValue}>{estimatedPrice.toFixed(2)} €</Text>
            </View>
          </View>
        )}

        {/* Commander Button */}
        <Button
          title="Commander"
          onPress={handleCommander}
          icon="send"
          style={styles.commanderButton}
        />

        {/* Direct new order button */}
        <TouchableOpacity
          style={styles.newOrderDirect}
          onPress={() => router.push('/(client)/nouvelle-commande')}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={20} color={Colors.secondary} />
          <Text style={styles.newOrderDirectText}>Nouvelle commande sans estimation</Text>
        </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Modal ajouter adresse */}
      <Modal
        visible={addAddressModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAddAddressModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle adresse</Text>
              <TouchableOpacity onPress={() => setAddAddressModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Nom</Text>
            <TextInput
              style={styles.modalInput}
              value={newAddressLabel}
              onChangeText={setNewAddressLabel}
              placeholder="Ex: Domicile, Bureau, Maman..."
              placeholderTextColor={Colors.textLight}
            />

            <Text style={styles.modalLabel}>Adresse</Text>
            <AddressInput
              placeholder="Rechercher une adresse..."
              icon="search-outline"
              onAddressSelect={(address, lat, lng) => {
                setNewAddressValue(address);
                setNewAddressCoords({ latitude: lat, longitude: lng });
              }}
            />

            {newAddressValue ? (
              <View style={styles.selectedAddress}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.selectedAddressText} numberOfLines={2}>{newAddressValue}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.modalSaveButton,
                (!newAddressLabel.trim() || !newAddressValue.trim()) && styles.modalSaveButtonDisabled,
              ]}
              onPress={handleSaveNewAddress}
              disabled={!newAddressLabel.trim() || !newAddressValue.trim() || savingAddress}
              activeOpacity={0.7}
            >
              {savingAddress ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.modalSaveButtonText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapContainer: {
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    marginTop: -20,
    ...Shadows.card,
  },
  cardContent: {
    padding: Spacing.lg,
    paddingTop: 0,
    paddingBottom: 40,
  },
  cardHandleArea: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  cardHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 6,
  },
  cardHandleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  cardHandleText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    fontWeight: Typography.weights.medium,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  addressSection: {
    marginBottom: Spacing.md,
    zIndex: 999,
  },
  addressInput: {
    marginBottom: Spacing.xs,
  },
  arrowContainer: {
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  sectionLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  colisTypesContainer: {
    paddingBottom: Spacing.base,
    gap: Spacing.sm,
  },
  colisTypeItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    minWidth: 90,
    marginRight: Spacing.sm,
  },
  colisTypeItemSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  colisTypeLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  colisTypeLabelSelected: {
    color: Colors.white,
  },
  colisTypeWeight: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  colisTypeWeightSelected: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  priceContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.md,
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  priceInfoText: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
  },
  priceEstimate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  priceLabel: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  priceValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  trafficWarning: {
    fontSize: Typography.sizes.sm,
    color: '#E74C3C',
    textAlign: 'center',
    marginBottom: Spacing.sm,
    fontWeight: Typography.weights.medium,
  },
  trafficInfo: {
    fontSize: Typography.sizes.sm,
    color: Colors.accent,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    fontWeight: Typography.weights.medium,
  },
  commanderButton: {
    marginTop: Spacing.sm,
  },
  newOrderDirect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  newOrderDirectText: {
    fontSize: Typography.sizes.md,
    color: Colors.secondary,
    fontWeight: Typography.weights.medium,
  },
  savedSection: {
    marginBottom: Spacing.md,
  },
  savedSectionLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginBottom: 6,
  },
  savedList: {
    gap: 8,
    paddingRight: Spacing.sm,
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.secondary + '40',
    ...Shadows.card,
  },
  savedChipLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    maxWidth: 120,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  addChipText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 16,
    backgroundColor: Colors.white,
  },
  selectedAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  selectedAddressText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
  },
  modalSaveButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  modalSaveButtonDisabled: {
    opacity: 0.5,
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});
