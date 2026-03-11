import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { COLIS_TYPES } from '@/constants/config';
import Button from '@/components/Button';

type ClientType = 'particulier' | 'professionnel';

interface ColisGridRow {
  base: string;
  perKm0: string;
  perKm1: string;
  perKm2: string;
}

type PricingGrid = Record<string, ColisGridRow>;

const DEFAULT_GRID: PricingGrid = {
  enveloppe: { base: '3.50', perKm0: '0.80', perKm1: '0.60', perKm2: '0.50' },
  petit:     { base: '4.50', perKm0: '1.00', perKm1: '0.80', perKm2: '0.65' },
  moyen:     { base: '6.00', perKm0: '1.30', perKm1: '1.00', perKm2: '0.85' },
  gros:      { base: '8.50', perKm0: '1.80', perKm1: '1.40', perKm2: '1.15' },
  palette:   { base: '15.00', perKm0: '3.00', perKm1: '2.50', perKm2: '2.00' },
};

const DEFAULT_PRO_GRID: PricingGrid = {
  enveloppe: { base: '3.00', perKm0: '0.70', perKm1: '0.50', perKm2: '0.40' },
  petit:     { base: '3.80', perKm0: '0.85', perKm1: '0.65', perKm2: '0.55' },
  moyen:     { base: '5.00', perKm0: '1.10', perKm1: '0.85', perKm2: '0.70' },
  gros:      { base: '7.00', perKm0: '1.50', perKm1: '1.15', perKm2: '0.95' },
  palette:   { base: '12.00', perKm0: '2.50', perKm1: '2.00', perKm2: '1.60' },
};

function gridToFirestore(grid: PricingGrid) {
  const result: Record<string, { base: number; perKm: number[]; tiers: number[] }> = {};
  for (const key of Object.keys(grid)) {
    const row = grid[key];
    result[key] = {
      base: parseFloat(row.base) || 0,
      perKm: [
        parseFloat(row.perKm0) || 0,
        parseFloat(row.perKm1) || 0,
        parseFloat(row.perKm2) || 0,
      ],
      tiers: [10, 30],
    };
  }
  return result;
}

function firestoreToGrid(data: Record<string, { base: number; perKm: number[]; tiers: number[] }>): PricingGrid {
  const grid: PricingGrid = {};
  for (const key of Object.keys(data)) {
    const entry = data[key];
    grid[key] = {
      base: entry.base.toFixed(2),
      perKm0: entry.perKm[0].toFixed(2),
      perKm1: entry.perKm[1].toFixed(2),
      perKm2: entry.perKm[2].toFixed(2),
    };
  }
  return grid;
}

export default function TarifsScreen() {
  const [activeTab, setActiveTab] = useState<ClientType>('particulier');
  const [particulierGrid, setParticulierGrid] = useState<PricingGrid>(DEFAULT_GRID);
  const [proGrid, setProGrid] = useState<PricingGrid>(DEFAULT_PRO_GRID);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const grid = activeTab === 'particulier' ? particulierGrid : proGrid;
  const setGrid = activeTab === 'particulier' ? setParticulierGrid : setProGrid;

  const loadPricing = useCallback(async () => {
    try {
      const docRef = doc(db, 'config', 'pricing');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.particulier) setParticulierGrid(firestoreToGrid(data.particulier));
        if (data.professionnel) setProGrid(firestoreToGrid(data.professionnel));
      }
    } catch (error) {
      console.error('Error loading pricing:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPricing();
  }, [loadPricing]);

  const updateField = (colisId: string, field: keyof ColisGridRow, value: string) => {
    // Allow only valid decimal input
    const cleaned = value.replace(/[^0-9.]/g, '');
    setGrid((prev) => ({
      ...prev,
      [colisId]: { ...prev[colisId], [field]: cleaned },
    }));
  };

  const handleSave = async () => {
    // Validate all fields are valid numbers
    const currentGrid = activeTab === 'particulier' ? particulierGrid : proGrid;
    for (const colisId of Object.keys(currentGrid)) {
      const row = currentGrid[colisId];
      for (const [field, val] of Object.entries(row)) {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0) {
          const colisLabel = COLIS_TYPES.find((c) => c.id === colisId)?.label || colisId;
          Alert.alert('Erreur', `Valeur invalide pour ${colisLabel} (${field})`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const docRef = doc(db, 'config', 'pricing');
      const existing = await getDoc(docRef);
      const existingData = existing.exists() ? existing.data() : {};

      await setDoc(docRef, {
        ...existingData,
        [activeTab]: gridToFirestore(currentGrid),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      Alert.alert('Succès', `Tarifs ${activeTab === 'particulier' ? 'particulier' : 'professionnel'} enregistrés.`);
    } catch (error) {
      console.error('Error saving pricing:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les tarifs.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Réinitialiser',
      `Remettre les tarifs ${activeTab} par défaut ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réinitialiser',
          style: 'destructive',
          onPress: () => {
            if (activeTab === 'particulier') {
              setParticulierGrid({ ...DEFAULT_GRID });
            } else {
              setProGrid({ ...DEFAULT_PRO_GRID });
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.secondary]} />
      }
    >
      {/* Tab selector */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'particulier' && styles.tabActive]}
          onPress={() => setActiveTab('particulier')}
          activeOpacity={0.7}
        >
          <Ionicons name="person" size={18} color={activeTab === 'particulier' ? Colors.white : Colors.primary} />
          <Text style={[styles.tabText, activeTab === 'particulier' && styles.tabTextActive]}>
            Particulier
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'professionnel' && styles.tabActive]}
          onPress={() => setActiveTab('professionnel')}
          activeOpacity={0.7}
        >
          <Ionicons name="briefcase" size={18} color={activeTab === 'professionnel' ? Colors.white : Colors.primary} />
          <Text style={[styles.tabText, activeTab === 'professionnel' && styles.tabTextActive]}>
            Professionnel
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={18} color={Colors.secondary} />
        <Text style={styles.infoText}>
          Paliers : 0-10 km | 10-30 km | +30 km
        </Text>
      </View>

      {/* Pricing cards */}
      {COLIS_TYPES.map((colis) => {
        const row = grid[colis.id];
        if (!row) return null;
        return (
          <View key={colis.id} style={styles.colisCard}>
            <View style={styles.colisHeader}>
              <Ionicons name={colis.icon as any} size={22} color={Colors.primary} />
              <Text style={styles.colisTitle}>{colis.label}</Text>
              <Text style={styles.colisWeight}>max {colis.poidsMax} kg</Text>
            </View>

            <View style={styles.fieldsGrid}>
              <View style={styles.fieldCol}>
                <Text style={styles.fieldLabel}>Base</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={row.base}
                    onChangeText={(v) => updateField(colis.id, 'base', v)}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                  <Text style={styles.inputUnit}>€</Text>
                </View>
              </View>

              <View style={styles.fieldCol}>
                <Text style={styles.fieldLabel}>0-10 km</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={row.perKm0}
                    onChangeText={(v) => updateField(colis.id, 'perKm0', v)}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                  <Text style={styles.inputUnit}>€/km</Text>
                </View>
              </View>

              <View style={styles.fieldCol}>
                <Text style={styles.fieldLabel}>10-30 km</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={row.perKm1}
                    onChangeText={(v) => updateField(colis.id, 'perKm1', v)}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                  <Text style={styles.inputUnit}>€/km</Text>
                </View>
              </View>

              <View style={styles.fieldCol}>
                <Text style={styles.fieldLabel}>+30 km</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={row.perKm2}
                    onChangeText={(v) => updateField(colis.id, 'perKm2', v)}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                  <Text style={styles.inputUnit}>€/km</Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Enregistrer"
          onPress={handleSave}
          loading={saving}
          icon="save-outline"
          style={styles.saveButton}
        />
        <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={18} color={Colors.danger} />
          <Text style={styles.resetText}>Réinitialiser par défaut</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  tabTextActive: {
    color: Colors.white,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.secondary + '15',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.base,
  },
  infoText: {
    fontSize: Typography.sizes.sm,
    color: Colors.secondary,
    fontWeight: Typography.weights.medium,
  },
  colisCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  colisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  colisTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    flex: 1,
  },
  colisWeight: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  fieldsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  fieldCol: {
    width: '48%',
    marginBottom: Spacing.xs,
  },
  fieldLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    fontWeight: Typography.weights.medium,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  inputUnit: {
    paddingRight: 10,
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  actions: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  saveButton: {
    width: undefined,
    alignSelf: 'stretch',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  resetText: {
    fontSize: Typography.sizes.md,
    color: Colors.danger,
    fontWeight: Typography.weights.medium,
  },
});
