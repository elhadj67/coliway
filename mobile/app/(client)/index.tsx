import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Map from '../../components/Map';
import Button from '../../components/Button';
import AddressInput from '../../components/AddressInput';
import {
  getCurrentPosition,
  requestLocationPermission,
  reverseGeocodePosition,
  Position,
} from '../../services/location';
import { COLIS_TYPES, ColisType, DEFAULT_MAP_REGION } from '../../constants/config';
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { getRouteInfo, RouteInfo } from '../../services/routing';
import {
  calculatePrice,
  TRAFFIC_SURCHARGE,
  MIN_DELIVERY_TIME,
} from '../../services/pricing';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.35;

export default function ClientHomeScreen() {
  const router = useRouter();
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
        const basePrice = calculatePrice(route.distanceKm, selectedColis.id);
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

  const mapMarkers = currentPosition
    ? [
        {
          id: 'user',
          coordinate: currentPosition,
          title: 'Ma position',
          color: Colors.secondary,
        },
      ]
    : [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Map Section */}
      <View style={styles.mapContainer}>
        <Map
          initialRegion={mapRegion}
          markers={mapMarkers}
          showUserLocation
          style={styles.map}
        />
      </View>

      {/* Bottom Card */}
      <ScrollView
        style={styles.card}
        contentContainerStyle={styles.cardContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        nestedScrollEnabled
      >
        <View style={styles.cardHandle} />

        <Text style={styles.title}>Envoyer un colis</Text>

        {/* Address Inputs */}
        <View style={styles.addressSection}>
          <AddressInput
            placeholder="Adresse de départ"
            icon="location"
            value={adresseDepart}
            onAddressSelect={(address, lat, lng) => {
              setAdresseDepart(address);
              setDepartCoords({ latitude: lat, longitude: lng });
            }}
          />

          <View style={styles.arrowContainer}>
            <Ionicons name="arrow-down" size={20} color={Colors.secondary} />
          </View>

          <AddressInput
            placeholder="Adresse d'arrivée"
            icon="navigate"
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mapContainer: {
    height: MAP_HEIGHT,
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
    paddingTop: Spacing.md,
    paddingBottom: 40,
  },
  cardHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.base,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    marginBottom: Spacing.lg,
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
});
