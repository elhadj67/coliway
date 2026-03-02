import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Map from '../../components/Map';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { getCurrentPosition, Position } from '../../services/location';
import { COLIS_TYPES, ColisType, DEFAULT_MAP_REGION } from '../../constants/config';
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { calculateDistance } from '../../services/location';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.6;

// Base price per km in euros
const BASE_PRICE = 2.5;
const PRICE_PER_KM = 1.2;

const COLIS_MULTIPLIERS: Record<string, number> = {
  enveloppe: 1.0,
  petit: 1.2,
  moyen: 1.5,
  gros: 2.0,
  palette: 3.5,
};

export default function ClientHomeScreen() {
  const router = useRouter();
  const [adresseDepart, setAdresseDepart] = useState('');
  const [adresseArrivee, setAdresseArrivee] = useState('');
  const [selectedColis, setSelectedColis] = useState<ColisType>(COLIS_TYPES[1]);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [estimatedDistance, setEstimatedDistance] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const location = await getCurrentPosition();
        setCurrentPosition(location.coords);
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
    // Estimate price when both addresses are filled
    if (adresseDepart.length > 3 && adresseArrivee.length > 3) {
      // Simulate distance calculation (in real app, use geocoding + route API)
      const simulatedDistance = 5 + Math.random() * 15;
      setEstimatedDistance(Math.round(simulatedDistance * 10) / 10);
      const multiplier = COLIS_MULTIPLIERS[selectedColis.id] || 1;
      const price = BASE_PRICE + simulatedDistance * PRICE_PER_KM * multiplier;
      setEstimatedPrice(Math.round(price * 100) / 100);
    } else {
      setEstimatedPrice(null);
      setEstimatedDistance(null);
    }
  }, [adresseDepart, adresseArrivee, selectedColis]);

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
      },
    });
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
    <View style={styles.container}>
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
        bounces={false}
      >
        <View style={styles.cardHandle} />

        <Text style={styles.title}>Envoyer un colis</Text>

        {/* Address Inputs */}
        <View style={styles.addressSection}>
          <Input
            value={adresseDepart}
            onChangeText={setAdresseDepart}
            placeholder="Adresse de départ"
            icon="location"
            style={styles.addressInput}
          />

          <View style={styles.arrowContainer}>
            <Ionicons name="arrow-down" size={20} color={Colors.secondary} />
          </View>

          <Input
            value={adresseArrivee}
            onChangeText={setAdresseArrivee}
            placeholder="Adresse d'arrivée"
            icon="navigate"
            style={styles.addressInput}
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
        {estimatedPrice !== null && (
          <View style={styles.priceContainer}>
            <View style={styles.priceRow}>
              <View style={styles.priceInfo}>
                <Ionicons name="speedometer-outline" size={18} color={Colors.textLight} />
                <Text style={styles.priceInfoText}>
                  {estimatedDistance} km estimés
                </Text>
              </View>
              <View style={styles.priceInfo}>
                <Ionicons name="time-outline" size={18} color={Colors.textLight} />
                <Text style={styles.priceInfoText}>
                  ~{Math.round((estimatedDistance || 0) * 2.5)} min
                </Text>
              </View>
            </View>
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
    </View>
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
    marginTop: -24,
    ...Shadows.card,
  },
  cardContent: {
    padding: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
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
  commanderButton: {
    marginTop: Spacing.sm,
  },
});
