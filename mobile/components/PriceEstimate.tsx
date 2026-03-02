import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

const COLORS = {
  primary: '#1B3A5C',
  secondary: '#2E86DE',
  accent: '#F39C12',
  success: '#27AE60',
  danger: '#E74C3C',
  warning: '#F39C12',
  background: '#F5F7FA',
  white: '#FFFFFF',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  border: '#E0E6ED',
};

type ColisType = 'enveloppe' | 'petit' | 'moyen' | 'gros' | 'palette';

const BASE_PRICES: Record<ColisType, number> = {
  enveloppe: 3.0,
  petit: 5.0,
  moyen: 8.0,
  gros: 15.0,
  palette: 30.0,
};

const PRICE_PER_KM: Record<ColisType, number> = {
  enveloppe: 0.1,
  petit: 0.15,
  moyen: 0.25,
  gros: 0.4,
  palette: 0.8,
};

const COLIS_LABELS: Record<ColisType, string> = {
  enveloppe: 'Enveloppe',
  petit: 'Petit colis',
  moyen: 'Moyen colis',
  gros: 'Gros colis',
  palette: 'Palette',
};

interface PriceEstimateProps {
  distance: number;
  colisType: ColisType;
  prix?: number;
  loading?: boolean;
}

const PriceEstimate: React.FC<PriceEstimateProps> = ({
  distance,
  colisType,
  prix,
  loading = false,
}) => {
  const basePrice = BASE_PRICES[colisType];
  const pricePerKm = PRICE_PER_KM[colisType];
  const distanceCost = distance * pricePerKm;
  const total = prix ?? basePrice + distanceCost;

  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Estimation du prix</Text>
        <View style={styles.skeletonRow}>
          <View style={styles.skeletonLabel} />
          <View style={styles.skeletonValue} />
        </View>
        <View style={styles.skeletonRow}>
          <View style={styles.skeletonLabel} />
          <View style={styles.skeletonValue} />
        </View>
        <View style={styles.divider} />
        <View style={styles.skeletonRow}>
          <View style={styles.skeletonLabelLarge} />
          <View style={styles.skeletonValueLarge} />
        </View>
        <ActivityIndicator
          size="small"
          color={COLORS.primary}
          style={styles.loader}
        />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Estimation du prix</Text>

      <View style={styles.row}>
        <Text style={styles.label}>
          Prix de base ({COLIS_LABELS[colisType]})
        </Text>
        <Text style={styles.value}>{basePrice.toFixed(2)} EUR</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>
          Distance ({distance.toFixed(1)} km x {pricePerKm.toFixed(2)} EUR/km)
        </Text>
        <Text style={styles.value}>{distanceCost.toFixed(2)} EUR</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{total.toFixed(2)} EUR</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    width: '100%',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    color: COLORS.textLight,
    flex: 1,
    marginRight: 8,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  loader: {
    marginTop: 8,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  skeletonLabel: {
    width: '55%',
    height: 14,
    backgroundColor: COLORS.background,
    borderRadius: 6,
  },
  skeletonValue: {
    width: 60,
    height: 14,
    backgroundColor: COLORS.background,
    borderRadius: 6,
  },
  skeletonLabelLarge: {
    width: 60,
    height: 18,
    backgroundColor: COLORS.background,
    borderRadius: 6,
  },
  skeletonValueLarge: {
    width: 80,
    height: 22,
    backgroundColor: COLORS.background,
    borderRadius: 6,
  },
});

export default PriceEstimate;
