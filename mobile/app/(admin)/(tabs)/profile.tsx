import { View, Text, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/Button';

const ADMIN_DASHBOARD_URL = 'https://coliway-app.web.app';

export default function AdminProfile() {
  const { profile, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarSection}>
        <View style={styles.avatarContainer}>
          <Ionicons name="shield-checkmark" size={48} color={Colors.white} />
        </View>
        <Text style={styles.name}>
          {profile?.prenom} {profile?.nom}
        </Text>
        <View style={styles.badge}>
          <Ionicons name="shield" size={14} color={Colors.primary} />
          <Text style={styles.badgeText}>Administrateur</Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={20} color={Colors.textLight} />
          <Text style={styles.infoText}>{profile?.email || '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={20} color={Colors.textLight} />
          <Text style={styles.infoText}>{profile?.telephone || '-'}</Text>
        </View>
      </View>

      <View style={styles.dashboardSection}>
        <Button
          title="Dashboard Web Complet"
          onPress={() => Linking.openURL(ADMIN_DASHBOARD_URL)}
          variant="secondary"
          icon="globe-outline"
        />
      </View>

      <View style={styles.logoutSection}>
        <Button
          title="Se déconnecter"
          onPress={handleSignOut}
          variant="danger"
          icon="log-out-outline"
        />
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
    paddingBottom: Spacing.xxxl,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  name: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.round,
    gap: Spacing.xs,
  },
  badgeText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
  },
  infoSection: {
    backgroundColor: Colors.white,
    marginTop: Spacing.base,
    marginHorizontal: Spacing.base,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Shadows.card,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  infoText: {
    fontSize: Typography.sizes.base,
    color: Colors.text,
  },
  dashboardSection: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.base,
  },
  logoutSection: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
});
