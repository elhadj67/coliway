import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Map from '../../components/Map';
import Button from '../../components/Button';
import Input from '../../components/Input';
import AddressInput from '../../components/AddressInput';
import { createOrder, OrderData } from '../../services/orders';
import { useAuth } from '../../hooks/useAuth';
import { COLIS_TYPES, ColisType, DEFAULT_MAP_REGION } from '../../constants/config';
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { getRouteInfo } from '../../services/routing';
import { calculatePriceAsync, TRAFFIC_SURCHARGE, MIN_DELIVERY_TIME } from '../../services/pricing';

const TOTAL_STEPS = 4;
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MINIMIZED_HEIGHT = 90;

export default function NouvelleCommandeScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const params = useLocalSearchParams<{
    adresseDepart?: string;
    adresseArrivee?: string;
    typeColis?: string;
    prixEstime?: string;
    distance?: string;
    departLat?: string;
    departLng?: string;
    arriveeLat?: string;
    arriveeLng?: string;
  }>();

  // Check if we have pre-filled params from the home screen
  const hasParams = !!(params.departLat && params.arriveeLat);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  // Step 1: Addresses
  const [adresseDepart, setAdresseDepart] = useState(params.adresseDepart || '');
  const [adresseArrivee, setAdresseArrivee] = useState(params.adresseArrivee || '');
  const [departCoords, setDepartCoords] = useState<{ latitude: number; longitude: number } | null>(
    hasParams
      ? { latitude: parseFloat(params.departLat!), longitude: parseFloat(params.departLng!) }
      : null
  );
  const [arriveeCoords, setArriveeCoords] = useState<{ latitude: number; longitude: number } | null>(
    hasParams
      ? { latitude: parseFloat(params.arriveeLat!), longitude: parseFloat(params.arriveeLng!) }
      : null
  );

  // Step 2: Colis details
  const initialColis = COLIS_TYPES.find((t) => t.id === params.typeColis) || COLIS_TYPES[1];
  const [selectedColis, setSelectedColis] = useState<ColisType>(initialColis);
  const [poids, setPoids] = useState('');
  const [description, setDescription] = useState('');
  const [destinataireNom, setDestinataireNom] = useState('');
  const [destinataireTelephone, setDestinataireTelephone] = useState('');
  const [instructions, setInstructions] = useState('');

  // Step 3: Payment
  const [paymentMethod, setPaymentMethod] = useState<'carte' | 'paypal'>('carte');

  // Price estimation (calculated on the fly)
  const [estimatedPrice, setEstimatedPrice] = useState<number>(parseFloat(params.prixEstime || '0'));
  const [estimatedDistance, setEstimatedDistance] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [trafficLevel, setTrafficLevel] = useState<string>('inconnu');
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Form collapse/expand
  const [formMinimized, setFormMinimized] = useState(false);
  const formAnim = useRef(new Animated.Value(1)).current;

  const toggleForm = () => {
    const toValue = formMinimized ? 1 : 0;
    Animated.spring(formAnim, {
      toValue,
      useNativeDriver: false,
      friction: 8,
      tension: 65,
    }).start();
    setFormMinimized(!formMinimized);
  };

  // Calculate route & price when both coordinates are set
  useEffect(() => {
    if (!departCoords || !arriveeCoords) return;
    // Skip if we already have a price from params
    if (hasParams && estimatedPrice > 0) return;

    let cancelled = false;
    setLoadingRoute(true);

    (async () => {
      try {
        const route = await getRouteInfo(departCoords, arriveeCoords);
        if (cancelled) return;

        setEstimatedDistance(route.distanceKm);
        const totalTime = Math.max(route.durationTrafficMin, MIN_DELIVERY_TIME);
        setEstimatedTime(totalTime);
        setTrafficLevel(route.trafficLevel);

        const clientType = profile?.typeClient || 'particulier';
        const basePrice = await calculatePriceAsync(route.distanceKm, selectedColis.id, clientType);
        const surcharge = TRAFFIC_SURCHARGE[route.trafficLevel] || 1.0;
        setEstimatedPrice(Math.round(basePrice * surcharge * 100) / 100);
      } catch {
        if (!cancelled) {
          // Fallback: estimate price from straight-line distance
          const dLat = departCoords.latitude - arriveeCoords.latitude;
          const dLng = departCoords.longitude - arriveeCoords.longitude;
          const approxKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
          setEstimatedDistance(Math.round(approxKm * 10) / 10);
          const clientType = profile?.typeClient || 'particulier';
          calculatePriceAsync(approxKm, selectedColis.id, clientType).then((p) => {
            if (!cancelled) setEstimatedPrice(p);
          });
        }
      } finally {
        if (!cancelled) setLoadingRoute(false);
      }
    })();

    return () => { cancelled = true; };
  }, [departCoords, arriveeCoords, selectedColis]);

  const handleNext = () => {
    if (currentStep === 1) {
      if (!adresseDepart.trim() || !adresseArrivee.trim()) {
        Alert.alert('Erreur', 'Veuillez remplir les deux adresses.');
        return;
      }
      if (!departCoords || !arriveeCoords) {
        Alert.alert('Erreur', 'Veuillez sélectionner des adresses dans la liste de suggestions pour obtenir les coordonnées.');
        return;
      }
    }
    if (currentStep === 2) {
      if (!poids.trim()) {
        Alert.alert('Erreur', 'Veuillez indiquer le poids du colis.');
        return;
      }
      const poidsNum = parseFloat(poids.replace(',', '.'));
      if (isNaN(poidsNum) || poidsNum <= 0) {
        Alert.alert('Erreur', 'Veuillez saisir un poids valide.');
        return;
      }
      if (poidsNum > selectedColis.poidsMax) {
        Alert.alert(
          'Poids dépassé',
          `Le poids maximum pour "${selectedColis.label}" est de ${selectedColis.poidsMax} kg. Votre colis pèse ${poidsNum} kg.\n\nVeuillez réduire le poids ou choisir un type de colis plus grand.`
        );
        return;
      }
      if (!destinataireNom.trim()) {
        Alert.alert('Erreur', 'Veuillez remplir le nom du destinataire.');
        return;
      }
      if (!destinataireTelephone.trim()) {
        Alert.alert('Erreur', 'Veuillez remplir le téléphone du destinataire.');
        return;
      }
      // Validate phone number format
      const phoneDigits = destinataireTelephone.replace(/[\s.\-()]/g, '');
      if (phoneDigits.startsWith('+33')) {
        if (phoneDigits.length !== 12) {
          Alert.alert('Téléphone invalide', `Le numéro contient ${phoneDigits.length - 1}/11 chiffres attendus (format +33XXXXXXXXX).`);
          return;
        }
        if (!/^\+33[1-9]\d{8}$/.test(phoneDigits)) {
          Alert.alert('Téléphone invalide', 'Format incorrect (ex: +33612345678).');
          return;
        }
      } else if (phoneDigits.startsWith('0')) {
        if (phoneDigits.length !== 10) {
          Alert.alert('Téléphone invalide', `Le numéro contient ${phoneDigits.length}/10 chiffres attendus.`);
          return;
        }
        if (!/^0[1-9]\d{8}$/.test(phoneDigits)) {
          Alert.alert('Téléphone invalide', 'Format incorrect (ex: 0612345678).');
          return;
        }
      } else {
        Alert.alert('Téléphone invalide', 'Le numéro doit commencer par 0 ou +33.');
        return;
      }
    }
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleConfirmOrder = async () => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour passer une commande.');
      return;
    }
    if (!departCoords || !arriveeCoords) {
      Alert.alert('Erreur', 'Coordonnées manquantes. Revenez à l\'étape 1.');
      return;
    }

    setLoading(true);
    try {
      const orderData: OrderData = {
        clientId: user.uid,
        typeColis: selectedColis.id,
        poids: parseFloat(poids.replace(',', '.')) || 0,
        description: description || `${selectedColis.label} - ${poids || '0'} kg`,
        adresseEnlevement: {
          adresse: adresseDepart,
          latitude: departCoords.latitude,
          longitude: departCoords.longitude,
        },
        adresseLivraison: {
          adresse: adresseArrivee,
          latitude: arriveeCoords.latitude,
          longitude: arriveeCoords.longitude,
        },
        destinataireNom,
        destinataireTelephone,
        instructions: instructions || '',
        assurance: false,
        prixEstime: estimatedPrice,
      };

      const orderId = await createOrder(orderData);
      setCreatedOrderId(orderId);
      setOrderCreated(true);
      setCurrentStep(4);
    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert('Erreur', 'Impossible de créer la commande. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToSuivi = () => {
    if (createdOrderId) {
      router.replace({
        pathname: '/(client)/suivi',
        params: { orderId: createdOrderId },
      });
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
        <View key={step} style={styles.progressStepWrapper}>
          <View
            style={[
              styles.progressDot,
              step <= currentStep && styles.progressDotActive,
              step < currentStep && styles.progressDotCompleted,
            ]}
          >
            {step < currentStep ? (
              <Ionicons name="checkmark" size={14} color={Colors.white} />
            ) : (
              <Text
                style={[
                  styles.progressDotText,
                  step <= currentStep && styles.progressDotTextActive,
                ]}
              >
                {step}
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.progressLabel,
              step <= currentStep && styles.progressLabelActive,
            ]}
          >
            {step === 1
              ? 'Adresses'
              : step === 2
              ? 'Colis'
              : step === 3
              ? 'Paiement'
              : 'Confirmation'}
          </Text>
          {step < TOTAL_STEPS && (
            <View
              style={[
                styles.progressLine,
                step < currentStep && styles.progressLineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Adresses de livraison</Text>

      {/* Mini Map Preview when we have coordinates */}
      {departCoords && arriveeCoords && (
        <View style={styles.miniMapContainer}>
          <Map
            initialRegion={{
              latitude: (departCoords.latitude + arriveeCoords.latitude) / 2,
              longitude: (departCoords.longitude + arriveeCoords.longitude) / 2,
              latitudeDelta: Math.abs(departCoords.latitude - arriveeCoords.latitude) * 2 + 0.01,
              longitudeDelta: Math.abs(departCoords.longitude - arriveeCoords.longitude) * 2 + 0.01,
            }}
            markers={[
              {
                id: 'depart',
                coordinate: departCoords,
                title: 'Départ',
                color: Colors.secondary,
              },
              {
                id: 'arrivee',
                coordinate: arriveeCoords,
                title: 'Arrivée',
                color: Colors.success,
              },
            ]}
            style={styles.miniMap}
          />
        </View>
      )}

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
          value={adresseArrivee}
          onAddressSelect={(address, lat, lng) => {
            setAdresseArrivee(address);
            setArriveeCoords({ latitude: lat, longitude: lng });
          }}
        />
      </View>

      {/* Price estimate preview */}
      {loadingRoute && (
        <View style={styles.routeInfo}>
          <ActivityIndicator size="small" color={Colors.secondary} />
          <Text style={styles.routeInfoText}>Calcul du trajet...</Text>
        </View>
      )}
      {!loadingRoute && estimatedPrice > 0 && (
        <View style={styles.routeInfo}>
          {estimatedDistance && (
            <View style={styles.routeDetail}>
              <Ionicons name="speedometer-outline" size={16} color={Colors.textLight} />
              <Text style={styles.routeInfoText}>{estimatedDistance} km</Text>
            </View>
          )}
          {estimatedTime && (
            <View style={styles.routeDetail}>
              <Ionicons name="time-outline" size={16} color={Colors.textLight} />
              <Text style={styles.routeInfoText}>~{estimatedTime} min</Text>
            </View>
          )}
          <View style={styles.routeDetail}>
            <Ionicons name="pricetag-outline" size={16} color={Colors.primary} />
            <Text style={[styles.routeInfoText, { color: Colors.primary, fontWeight: Typography.weights.bold }]}>
              {estimatedPrice.toFixed(2)} €
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Détails du colis</Text>

      {/* Colis Type Selector */}
      <Text style={styles.fieldLabel}>Type de colis</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.colisTypesRow}
      >
        {COLIS_TYPES.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.colisTypeChip,
              selectedColis.id === type.id && styles.colisTypeChipSelected,
            ]}
            onPress={() => {
              setSelectedColis(type);
              setPoids('');
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={type.icon as keyof typeof Ionicons.glyphMap}
              size={20}
              color={selectedColis.id === type.id ? Colors.white : Colors.primary}
            />
            <Text
              style={[
                styles.colisTypeChipLabel,
                selectedColis.id === type.id && styles.colisTypeChipLabelSelected,
              ]}
            >
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Conditions card */}
      <View style={styles.conditionsCard}>
        <View style={styles.conditionsHeader}>
          <Ionicons name="information-circle" size={20} color={Colors.secondary} />
          <Text style={styles.conditionsTitle}>
            Conditions — {selectedColis.label}
          </Text>
        </View>
        {selectedColis.conditions.map((condition, index) => (
          <View key={index} style={styles.conditionRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} />
            <Text style={styles.conditionText}>{condition}</Text>
          </View>
        ))}
      </View>

      <Input
        label={`Poids (kg) — max ${selectedColis.poidsMax} kg`}
        value={poids}
        onChangeText={setPoids}
        placeholder={`Ex: ${Math.min(selectedColis.poidsMax, 2.5)}`}
        keyboardType="numeric"
        icon="scale-outline"
      />

      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Décrivez brièvement le contenu du colis"
        multiline
        icon="document-text-outline"
      />

      <Input
        label="Nom du destinataire"
        value={destinataireNom}
        onChangeText={setDestinataireNom}
        placeholder="Nom complet"
        icon="person-outline"
      />

      <Input
        label="Téléphone du destinataire"
        value={destinataireTelephone}
        onChangeText={setDestinataireTelephone}
        placeholder="06 12 34 56 78"
        keyboardType="phone-pad"
        icon="call-outline"
      />

      <Input
        label="Instructions (optionnel)"
        value={instructions}
        onChangeText={setInstructions}
        placeholder="Code d'accès, étage, etc."
        icon="information-circle-outline"
      />
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Récapitulatif et paiement</Text>

      {/* Order Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Récapitulatif</Text>

        <View style={styles.summaryRow}>
          <Ionicons name="location" size={18} color={Colors.secondary} />
          <View style={styles.summaryTextContainer}>
            <Text style={styles.summaryLabel}>Départ</Text>
            <Text style={styles.summaryValue}>{adresseDepart}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <Ionicons name="navigate" size={18} color={Colors.success} />
          <View style={styles.summaryTextContainer}>
            <Text style={styles.summaryLabel}>Arrivée</Text>
            <Text style={styles.summaryValue}>{adresseArrivee}</Text>
          </View>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <Ionicons
            name={selectedColis.icon as keyof typeof Ionicons.glyphMap}
            size={18}
            color={Colors.primary}
          />
          <View style={styles.summaryTextContainer}>
            <Text style={styles.summaryLabel}>Colis</Text>
            <Text style={styles.summaryValue}>
              {selectedColis.label} - {poids || '0'} kg
            </Text>
          </View>
        </View>

        {description ? (
          <View style={styles.summaryRow}>
            <Ionicons name="document-text-outline" size={18} color={Colors.textLight} />
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryLabel}>Description</Text>
              <Text style={styles.summaryValue}>{description}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.summaryRow}>
          <Ionicons name="person-outline" size={18} color={Colors.textLight} />
          <View style={styles.summaryTextContainer}>
            <Text style={styles.summaryLabel}>Destinataire</Text>
            <Text style={styles.summaryValue}>{destinataireNom} — {destinataireTelephone}</Text>
          </View>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryPriceRow}>
          <Text style={styles.summaryPriceLabel}>Total estimé</Text>
          <Text style={styles.summaryPriceValue}>{estimatedPrice.toFixed(2)} €</Text>
        </View>
      </View>

      {/* Payment Method Selection */}
      <Text style={styles.fieldLabel}>Moyen de paiement</Text>

      <TouchableOpacity
        style={[
          styles.paymentOption,
          paymentMethod === 'carte' && styles.paymentOptionSelected,
        ]}
        onPress={() => setPaymentMethod('carte')}
        activeOpacity={0.7}
      >
        <View style={styles.paymentOptionLeft}>
          <Ionicons
            name="card"
            size={24}
            color={paymentMethod === 'carte' ? Colors.primary : Colors.textLight}
          />
          <Text
            style={[
              styles.paymentOptionText,
              paymentMethod === 'carte' && styles.paymentOptionTextSelected,
            ]}
          >
            Carte bancaire
          </Text>
        </View>
        <View
          style={[
            styles.radioOuter,
            paymentMethod === 'carte' && styles.radioOuterSelected,
          ]}
        >
          {paymentMethod === 'carte' && <View style={styles.radioInner} />}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.paymentOption,
          paymentMethod === 'paypal' && styles.paymentOptionSelected,
        ]}
        onPress={() => setPaymentMethod('paypal')}
        activeOpacity={0.7}
      >
        <View style={styles.paymentOptionLeft}>
          <Ionicons
            name="logo-paypal"
            size={24}
            color={paymentMethod === 'paypal' ? Colors.primary : Colors.textLight}
          />
          <Text
            style={[
              styles.paymentOptionText,
              paymentMethod === 'paypal' && styles.paymentOptionTextSelected,
            ]}
          >
            PayPal
          </Text>
        </View>
        <View
          style={[
            styles.radioOuter,
            paymentMethod === 'paypal' && styles.radioOuterSelected,
          ]}
        >
          {paymentMethod === 'paypal' && <View style={styles.radioInner} />}
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Création de votre commande...</Text>
        </View>
      ) : orderCreated ? (
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>Commande créée !</Text>
          <Text style={styles.successSubtitle}>
            Votre commande a été enregistrée avec succès. Un livreur sera assigné sous peu.
          </Text>
          <Text style={styles.orderIdText}>
            N° de commande : {createdOrderId}
          </Text>

          <Button
            title="Suivre ma commande"
            onPress={handleGoToSuivi}
            icon="navigate-circle"
            style={styles.followButton}
          />

          <Button
            title="Retour à l'accueil"
            onPress={() => router.replace('/(client)/')}
            variant="outline"
            icon="home"
            style={styles.homeButton}
          />
        </View>
      ) : (
        <View style={styles.confirmContainer}>
          <Ionicons name="shield-checkmark" size={48} color={Colors.primary} />
          <Text style={styles.confirmTitle}>Confirmer votre commande</Text>
          <Text style={styles.confirmSubtitle}>
            En confirmant, vous acceptez de payer {estimatedPrice.toFixed(2)} € pour cette livraison.
          </Text>
          <Button
            title={`Confirmer et payer ${estimatedPrice.toFixed(2)} €`}
            onPress={handleConfirmOrder}
            icon="lock-closed"
            loading={loading}
            style={styles.confirmButton}
          />
        </View>
      )}
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  const formHeight = formAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [MINIMIZED_HEIGHT, SCREEN_HEIGHT],
  });

  const mapHeight = formAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT - MINIMIZED_HEIGHT - 60, 0],
  });

  const formContentOpacity = formAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const mapRegion = departCoords && arriveeCoords
    ? {
        latitude: (departCoords.latitude + arriveeCoords.latitude) / 2,
        longitude: (departCoords.longitude + arriveeCoords.longitude) / 2,
        latitudeDelta: Math.abs(departCoords.latitude - arriveeCoords.latitude) * 2.5 + 0.01,
        longitudeDelta: Math.abs(departCoords.longitude - arriveeCoords.longitude) * 2.5 + 0.01,
      }
    : departCoords
    ? { latitude: departCoords.latitude, longitude: departCoords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : DEFAULT_MAP_REGION;

  const mapMarkers = [
    ...(departCoords
      ? [{ id: 'depart', coordinate: departCoords, title: 'Départ', color: Colors.secondary }]
      : []),
    ...(arriveeCoords
      ? [{ id: 'arrivee', coordinate: arriveeCoords, title: 'Arrivée', color: Colors.success }]
      : []),
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle commande</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Full Map (visible when form is minimized) */}
      <Animated.View style={[styles.fullMapContainer, { height: mapHeight }]}>
        <Map
          initialRegion={mapRegion}
          markers={mapMarkers}
          style={styles.fullMap}
        />
      </Animated.View>

      {/* Collapsible Form */}
      <Animated.View style={[styles.formWrapper, { height: formHeight }]}>
        {/* Collapse/Expand Handle */}
        <TouchableOpacity style={styles.collapseHandle} onPress={toggleForm} activeOpacity={0.7}>
          <View style={styles.handleBar} />
          <Ionicons
            name={formMinimized ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={Colors.textLight}
          />
        </TouchableOpacity>

        {/* Form Content (hidden when minimized) */}
        <Animated.View style={[styles.formContent, { opacity: formContentOpacity }]}>
          {/* Progress Bar */}
          {renderProgressBar()}

          {/* Step Content */}
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentInner}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            scrollEnabled={!formMinimized}
          >
            {renderCurrentStep()}
          </ScrollView>

          {/* Navigation Buttons */}
          {currentStep < 4 && (
            <View style={styles.navigationButtons}>
              {currentStep > 1 && (
                <Button
                  title="Précédent"
                  onPress={handlePrevious}
                  variant="outline"
                  icon="arrow-back"
                  style={styles.navButton}
                />
              )}
              <Button
                title={currentStep === 3 ? 'Confirmer' : 'Suivant'}
                onPress={currentStep === 3 ? handleConfirmOrder : handleNext}
                icon={currentStep === 3 ? 'checkmark-circle' : 'arrow-forward'}
                loading={loading}
                style={[styles.navButton, currentStep === 1 && styles.navButtonFull]}
              />
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </KeyboardAvoidingView>
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
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
    ...Shadows.card,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  headerSpacer: {
    width: 40,
  },
  fullMapContainer: {
    overflow: 'hidden',
  },
  fullMap: {
    width: '100%',
    height: '100%',
  },
  formWrapper: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  collapseHandle: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 6,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 4,
  },
  handleText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    fontWeight: Typography.weights.medium,
  },
  formContent: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.white,
  },
  progressStepWrapper: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  progressDotCompleted: {
    backgroundColor: Colors.success,
  },
  progressDotText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.textLight,
  },
  progressDotTextActive: {
    color: Colors.white,
  },
  progressLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  progressLabelActive: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
  progressLine: {
    position: 'absolute',
    top: 14,
    left: '60%',
    right: '-40%',
    height: 2,
    backgroundColor: Colors.border,
  },
  progressLineActive: {
    backgroundColor: Colors.success,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentInner: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    marginBottom: Spacing.lg,
  },
  addressSection: {
    zIndex: 999,
  },
  arrowContainer: {
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  miniMapContainer: {
    height: 150,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  miniMap: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.lg,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.base,
    gap: Spacing.base,
    ...Shadows.card,
  },
  routeDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  routeInfoText: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
  },
  fieldLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  colisTypesRow: {
    paddingBottom: Spacing.base,
    gap: Spacing.sm,
  },
  colisTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
    gap: Spacing.xs,
  },
  colisTypeChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  colisTypeChipLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  colisTypeChipLabelSelected: {
    color: Colors.white,
  },
  conditionsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  conditionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  conditionsTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.secondary,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  conditionText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    flex: 1,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  summaryTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  summaryPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryPriceLabel: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  summaryPriceValue: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  paymentOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(27, 58, 92, 0.03)',
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  paymentOptionText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.textLight,
  },
  paymentOptionTextSelected: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  navigationButtons: {
    flexDirection: 'row',
    padding: Spacing.base,
    paddingBottom: Spacing.xxl,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  navButton: {
    flex: 1,
  },
  navButtonFull: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
  loadingText: {
    fontSize: Typography.sizes.base,
    color: Colors.textLight,
    marginTop: Spacing.base,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  successIconContainer: {
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.success,
    marginBottom: Spacing.sm,
  },
  successSubtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  orderIdText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
    backgroundColor: Colors.background,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  followButton: {
    marginBottom: Spacing.sm,
  },
  homeButton: {
    marginTop: 0,
  },
  confirmContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  confirmTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  confirmSubtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  confirmButton: {
    marginTop: Spacing.base,
  },
});
