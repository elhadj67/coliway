import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';
import { subscribeToOrder, Order } from '../../services/orders';
import { createLitige } from '../../services/litiges';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const MOTIFS = [
  'Colis endommagé',
  'Retard de livraison',
  'Colis non reçu',
  'Comportement du livreur',
  'Autre',
];

export default function ReclamationClientScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ commandeId: string }>();
  const { user, profile } = useAuth();
  const commandeId = params.commandeId;

  const [order, setOrder] = useState<Order | null>(null);
  const [motif, setMotif] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!commandeId) return;
    const unsubscribe = subscribeToOrder(commandeId, (updatedOrder) => {
      setOrder(updatedOrder);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [commandeId]);

  const handleSubmit = async () => {
    if (!motif) {
      Alert.alert('Erreur', 'Veuillez sélectionner un motif.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Erreur', 'Veuillez décrire votre problème.');
      return;
    }
    if (!user || !order) return;

    setSubmitting(true);
    try {
      let livreurNom = '-';
      if (order.livreurId) {
        const livreurDoc = await getDoc(doc(db, 'users', order.livreurId));
        if (livreurDoc.exists()) {
          const d = livreurDoc.data();
          livreurNom = `${d.prenom || ''} ${d.nom || ''}`.trim() || '-';
        }
      }

      await createLitige({
        commandeId: commandeId!,
        clientId: user.uid,
        livreurId: order.livreurId || '',
        clientNom: `${profile?.prenom || ''} ${profile?.nom || ''}`.trim(),
        livreurNom,
        motif,
        description: description.trim(),
      });

      Alert.alert(
        'Réclamation envoyée',
        'Votre réclamation a été enregistrée. Nous la traiterons dans les plus brefs délais.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error creating litige:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer la réclamation. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Signaler un problème</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.secondary} />
          <Text style={styles.infoText}>
            Commande #{commandeId?.slice(0, 8)}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Motif de la réclamation</Text>
        <View style={styles.motifsContainer}>
          {MOTIFS.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.motifChip, motif === m && styles.motifChipActive]}
              onPress={() => setMotif(m)}
              activeOpacity={0.7}
            >
              <Text style={[styles.motifText, motif === m && styles.motifTextActive]}>
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Description</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Décrivez votre problème en détail..."
          placeholderTextColor={Colors.textLight}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        <Button
          title="Envoyer la réclamation"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!motif || !description.trim()}
          icon="send"
          style={styles.submitButton}
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
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.secondary + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  infoText: {
    fontSize: Typography.sizes.md,
    color: Colors.secondary,
    fontWeight: Typography.weights.semibold,
  },
  sectionTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  motifsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  motifChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xxl,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  motifChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  motifText: {
    fontSize: Typography.sizes.md,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  motifTextActive: {
    color: Colors.white,
  },
  textArea: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    fontSize: Typography.sizes.base,
    color: Colors.text,
    minHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  submitButton: {
    marginTop: Spacing.sm,
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
});
