import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import Input from '../../components/Input';
import {
  createPaymentIntent,
  confirmPayment,
  createPaypalPayment,
} from '../../services/payment';
import { COLIS_TYPES } from '../../constants/config';
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '../../constants/theme';

type PaymentMethod = 'carte' | 'paypal';
type PaymentState = 'input' | 'processing' | 'success' | 'failure';

export default function PaiementScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    orderId: string;
    montant: string;
    adresseDepart: string;
    adresseArrivee: string;
    typeColis: string;
  }>();

  const montant = parseFloat(params.montant || '0');
  const orderId = params.orderId || '';

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('carte');
  const [paymentState, setPaymentState] = useState<PaymentState>('input');
  const [errorMessage, setErrorMessage] = useState('');

  // Card fields (placeholder UI)
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  const [cardHolder, setCardHolder] = useState('');

  const formatCardNumber = (text: string): string => {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  const formatExpiry = (text: string): string => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 3) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }
    return cleaned;
  };

  const getColisLabel = (typeId: string): string => {
    const colisType = COLIS_TYPES.find((t) => t.id === typeId);
    return colisType?.label || typeId;
  };

  const validateCard = (): boolean => {
    const cleanedNumber = cardNumber.replace(/\s/g, '');
    if (cleanedNumber.length < 16) {
      Alert.alert('Erreur', 'Numéro de carte invalide.');
      return false;
    }
    if (cardExpiry.length < 5) {
      Alert.alert('Erreur', "Date d'expiration invalide.");
      return false;
    }
    if (cardCVC.length < 3) {
      Alert.alert('Erreur', 'Code CVC invalide.');
      return false;
    }
    if (!cardHolder.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir le nom du titulaire.');
      return false;
    }
    return true;
  };

  const handlePay = async () => {
    if (paymentMethod === 'carte' && !validateCard()) return;

    setPaymentState('processing');
    setErrorMessage('');

    try {
      if (paymentMethod === 'carte') {
        // Create a Stripe PaymentIntent
        const { clientSecret } = await createPaymentIntent(
          orderId,
          Math.round(montant * 100) // Stripe uses cents
        );

        // In a real app, the Stripe SDK would handle the UI and confirmation.
        // Here we call confirmPayment as a placeholder.
        const result = await confirmPayment(clientSecret);

        if (result.success) {
          setPaymentState('success');
        } else {
          setErrorMessage(result.error || 'Le paiement a échoué.');
          setPaymentState('failure');
        }
      } else {
        // PayPal flow
        const { approvalUrl } = await createPaypalPayment(
          orderId,
          Math.round(montant * 100)
        );
        // In a real app, open a WebView for PayPal approval
        // For now, simulate success
        setPaymentState('success');
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Erreur de paiement inconnue';
      setErrorMessage(msg);
      setPaymentState('failure');
    }
  };

  const handleRetry = () => {
    setPaymentState('input');
    setErrorMessage('');
  };

  const handleGoToSuivi = () => {
    router.replace({
      pathname: '/(client)/suivi',
      params: { orderId },
    });
  };

  // Processing State
  if (paymentState === 'processing') {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.processingTitle}>Paiement en cours...</Text>
        <Text style={styles.processingSubtitle}>
          Veuillez ne pas fermer l'application.
        </Text>
        <View style={styles.secureRow}>
          <Ionicons name="lock-closed" size={14} color={Colors.success} />
          <Text style={styles.secureText}>Paiement sécurisé</Text>
        </View>
      </View>
    );
  }

  // Success State
  if (paymentState === 'success') {
    return (
      <View style={styles.centeredContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={90} color={Colors.success} />
        </View>
        <Text style={styles.successTitle}>Paiement réussi !</Text>
        <Text style={styles.successSubtitle}>
          Votre paiement de {montant.toFixed(2)} € a été accepté.
        </Text>
        <Button
          title="Suivre ma commande"
          onPress={handleGoToSuivi}
          icon="navigate-circle"
          style={styles.resultButton}
        />
        <Button
          title="Retour à l'accueil"
          onPress={() => router.replace('/(client)/')}
          variant="outline"
          icon="home"
          style={styles.resultButtonSecondary}
        />
      </View>
    );
  }

  // Failure State
  if (paymentState === 'failure') {
    return (
      <View style={styles.centeredContainer}>
        <View style={styles.failureIcon}>
          <Ionicons name="close-circle" size={90} color={Colors.danger} />
        </View>
        <Text style={styles.failureTitle}>Paiement échoué</Text>
        <Text style={styles.failureSubtitle}>
          {errorMessage || 'Une erreur est survenue lors du paiement.'}
        </Text>
        <Button
          title="Réessayer"
          onPress={handleRetry}
          icon="refresh"
          style={styles.resultButton}
        />
        <Button
          title="Retour"
          onPress={() => router.back()}
          variant="outline"
          icon="arrow-back"
          style={styles.resultButtonSecondary}
        />
      </View>
    );
  }

  // Input State
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiement</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Récapitulatif</Text>

          {params.adresseDepart && (
            <View style={styles.summaryRow}>
              <Ionicons name="location" size={16} color={Colors.secondary} />
              <Text style={styles.summaryText} numberOfLines={1}>
                {params.adresseDepart}
              </Text>
            </View>
          )}

          {params.adresseArrivee && (
            <View style={styles.summaryRow}>
              <Ionicons name="navigate" size={16} color={Colors.success} />
              <Text style={styles.summaryText} numberOfLines={1}>
                {params.adresseArrivee}
              </Text>
            </View>
          )}

          {params.typeColis && (
            <View style={styles.summaryRow}>
              <Ionicons name="cube-outline" size={16} color={Colors.primary} />
              <Text style={styles.summaryText}>
                {getColisLabel(params.typeColis)}
              </Text>
            </View>
          )}

          <View style={styles.summaryDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total à payer</Text>
            <Text style={styles.totalValue}>{montant.toFixed(2)} €</Text>
          </View>
        </View>

        {/* Payment Method Selection */}
        <Text style={styles.sectionTitle}>Moyen de paiement</Text>

        <TouchableOpacity
          style={[
            styles.methodOption,
            paymentMethod === 'carte' && styles.methodOptionSelected,
          ]}
          onPress={() => setPaymentMethod('carte')}
          activeOpacity={0.7}
        >
          <View style={styles.methodLeft}>
            <View
              style={[
                styles.methodIconContainer,
                paymentMethod === 'carte' && styles.methodIconContainerSelected,
              ]}
            >
              <Ionicons
                name="card"
                size={22}
                color={paymentMethod === 'carte' ? Colors.white : Colors.primary}
              />
            </View>
            <Text
              style={[
                styles.methodText,
                paymentMethod === 'carte' && styles.methodTextSelected,
              ]}
            >
              Carte bancaire
            </Text>
          </View>
          <View
            style={[
              styles.radio,
              paymentMethod === 'carte' && styles.radioSelected,
            ]}
          >
            {paymentMethod === 'carte' && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.methodOption,
            paymentMethod === 'paypal' && styles.methodOptionSelected,
          ]}
          onPress={() => setPaymentMethod('paypal')}
          activeOpacity={0.7}
        >
          <View style={styles.methodLeft}>
            <View
              style={[
                styles.methodIconContainer,
                paymentMethod === 'paypal' && styles.methodIconContainerSelected,
              ]}
            >
              <Ionicons
                name="logo-paypal"
                size={22}
                color={paymentMethod === 'paypal' ? Colors.white : Colors.primary}
              />
            </View>
            <Text
              style={[
                styles.methodText,
                paymentMethod === 'paypal' && styles.methodTextSelected,
              ]}
            >
              PayPal
            </Text>
          </View>
          <View
            style={[
              styles.radio,
              paymentMethod === 'paypal' && styles.radioSelected,
            ]}
          >
            {paymentMethod === 'paypal' && <View style={styles.radioInner} />}
          </View>
        </TouchableOpacity>

        {/* Card Input Fields */}
        {paymentMethod === 'carte' && (
          <View style={styles.cardInputsContainer}>
            <Input
              label="Numéro de carte"
              value={cardNumber}
              onChangeText={(text) => setCardNumber(formatCardNumber(text))}
              placeholder="1234 5678 9012 3456"
              keyboardType="numeric"
              icon="card-outline"
            />

            <Input
              label="Titulaire de la carte"
              value={cardHolder}
              onChangeText={setCardHolder}
              placeholder="NOM PRENOM"
              icon="person-outline"
            />

            <View style={styles.cardRow}>
              <View style={styles.cardRowHalf}>
                <Input
                  label="Expiration"
                  value={cardExpiry}
                  onChangeText={(text) => setCardExpiry(formatExpiry(text))}
                  placeholder="MM/AA"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.cardRowHalf}>
                <Input
                  label="CVC"
                  value={cardCVC}
                  onChangeText={(text) =>
                    setCardCVC(text.replace(/\D/g, '').slice(0, 4))
                  }
                  placeholder="123"
                  keyboardType="numeric"
                  secureTextEntry
                />
              </View>
            </View>
          </View>
        )}

        {/* Secure Payment Badge */}
        <View style={styles.securePaymentBadge}>
          <Ionicons name="shield-checkmark" size={18} color={Colors.success} />
          <Text style={styles.securePaymentText}>
            Paiement sécurisé et chiffré
          </Text>
        </View>
      </ScrollView>

      {/* Pay Button */}
      <View style={styles.footer}>
        <Button
          title={`Payer ${montant.toFixed(2)} €`}
          onPress={handlePay}
          icon="lock-closed"
          style={styles.payButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.md,
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
  content: {
    flex: 1,
  },
  contentInner: {
    padding: Spacing.xl,
    paddingBottom: 120,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.xl,
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
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  summaryText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    flex: 1,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  totalValue: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  sectionTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  methodOption: {
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
  methodOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(27, 58, 92, 0.03)',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  methodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodIconContainerSelected: {
    backgroundColor: Colors.primary,
  },
  methodText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.textLight,
  },
  methodTextSelected: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  cardInputsContainer: {
    marginTop: Spacing.lg,
  },
  cardRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cardRowHalf: {
    flex: 1,
  },
  securePaymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  securePaymentText: {
    fontSize: Typography.sizes.md,
    color: Colors.success,
    fontWeight: Typography.weights.medium,
  },
  footer: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxl,
    backgroundColor: Colors.white,
    ...Shadows.card,
  },
  payButton: {},
  processingTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    marginTop: Spacing.xl,
  },
  processingSubtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.textLight,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xl,
  },
  secureText: {
    fontSize: Typography.sizes.md,
    color: Colors.success,
  },
  successIcon: {
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.success,
  },
  successSubtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  resultButton: {
    minWidth: 250,
    marginBottom: Spacing.sm,
  },
  resultButtonSecondary: {
    minWidth: 250,
  },
  failureIcon: {
    marginBottom: Spacing.lg,
  },
  failureTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.danger,
  },
  failureSubtitle: {
    fontSize: Typography.sizes.base,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
});
