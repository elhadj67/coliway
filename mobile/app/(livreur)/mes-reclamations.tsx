import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { getMyLitiges, Litige } from '../../services/litiges';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { Timestamp } from 'firebase/firestore';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ouvert: { label: 'Ouvert', color: '#F39C12' },
  en_cours: { label: 'En cours', color: '#2E86DE' },
  resolu: { label: 'Résolu', color: '#27AE60' },
  ferme: { label: 'Fermé', color: '#95A5A6' },
};

export default function MesReclamationsLivreurScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [litiges, setLitiges] = useState<Litige[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = getMyLitiges(user.uid, (data) => {
      setLitiges(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const formatDate = (timestamp: Timestamp | Date) => {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderItem = ({ item }: { item: Litige }) => {
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.ouvert;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.motif}>{item.motif}</Text>
          <View style={[styles.badge, { backgroundColor: statusConfig.color + '20' }]}>
            <View style={[styles.badgeDot, { backgroundColor: statusConfig.color }]} />
            <Text style={[styles.badgeText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="document-text-outline" size={14} color={Colors.textLight} />
            <Text style={styles.footerText}>#{item.commandeId.slice(0, 8)}</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textLight} />
            <Text style={styles.footerText}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes réclamations</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : litiges.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color={Colors.border} />
          <Text style={styles.emptyText}>Aucune réclamation</Text>
          <Text style={styles.emptySubtext}>
            Vous n'avez aucune réclamation en cours.
          </Text>
        </View>
      ) : (
        <FlatList
          data={litiges}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  listContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  motif: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xxl,
    gap: Spacing.xs,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  description: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: Spacing.base,
  },
  emptySubtext: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});
