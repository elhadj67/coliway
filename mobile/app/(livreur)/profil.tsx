import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Linking,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { signOut, updateProfile } from '@/services/auth';

const COLORS = {
  primary: '#1B3A5C',
  secondary: '#2E86DE',
  accent: '#F39C12',
  success: '#27AE60',
  danger: '#E74C3C',
  background: '#F5F7FA',
  white: '#FFFFFF',
  text: '#2C3E50',
  textLight: '#7F8C8D',
  border: '#E0E6ED',
};

type AccountStatus = 'en_attente' | 'approuve' | 'refuse';

interface DocumentItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  status: 'valide' | 'en_attente' | 'manquant';
}

function getAccountStatusConfig(status: AccountStatus) {
  switch (status) {
    case 'approuve':
      return {
        label: 'Approuve',
        color: COLORS.success,
        icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
        description: 'Votre compte est actif. Vous pouvez accepter des courses.',
      };
    case 'en_attente':
      return {
        label: 'En attente de validation',
        color: COLORS.accent,
        icon: 'time' as keyof typeof Ionicons.glyphMap,
        description:
          'Votre compte est en cours de verification. Cela peut prendre 24 a 48h.',
      };
    case 'refuse':
      return {
        label: 'Refuse',
        color: COLORS.danger,
        icon: 'close-circle' as keyof typeof Ionicons.glyphMap,
        description:
          'Votre compte a ete refuse. Veuillez verifier vos documents et reessayer.',
      };
    default:
      return {
        label: 'Inconnu',
        color: COLORS.textLight,
        icon: 'help-circle' as keyof typeof Ionicons.glyphMap,
        description: '',
      };
  }
}

function getDocStatusConfig(status: string) {
  switch (status) {
    case 'valide':
      return { label: 'Valide', color: COLORS.success, icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap };
    case 'en_attente':
      return { label: 'En attente', color: COLORS.accent, icon: 'time' as keyof typeof Ionicons.glyphMap };
    case 'manquant':
      return { label: 'Manquant', color: COLORS.danger, icon: 'alert-circle' as keyof typeof Ionicons.glyphMap };
    default:
      return { label: 'Inconnu', color: COLORS.textLight, icon: 'help-circle' as keyof typeof Ionicons.glyphMap };
  }
}

function renderStars(rating: number): React.ReactNode[] {
  const stars: React.ReactNode[] = [];
  const fullStars = Math.floor(rating);
  const halfStar = rating - fullStars >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <Ionicons key={i} name="star" size={16} color={COLORS.accent} />
      );
    } else if (i === fullStars && halfStar) {
      stars.push(
        <Ionicons key={i} name="star-half" size={16} color={COLORS.accent} />
      );
    } else {
      stars.push(
        <Ionicons key={i} name="star-outline" size={16} color={COLORS.border} />
      );
    }
  }
  return stars;
}

export default function ProfilScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const accountStatus: AccountStatus =
    ((profile as any)?.accountStatus as AccountStatus) || 'en_attente';
  const accountConfig = getAccountStatusConfig(accountStatus);

  const memberSince = profile?.createdAt
    ? (() => {
        try {
          const date = (profile.createdAt as any).toDate();
          return date.toLocaleDateString('fr-FR', {
            month: 'long',
            year: 'numeric',
          });
        } catch {
          return '--';
        }
      })()
    : '--';

  const documents: DocumentItem[] = [
    {
      id: 'permis',
      label: 'Permis de conduire',
      icon: 'card-outline',
      status: profile?.permis ? 'valide' : 'manquant',
    },
    {
      id: 'siret',
      label: 'SIRET',
      icon: 'document-text-outline',
      status: 'en_attente',
    },
    {
      id: 'assurance',
      label: 'Assurance',
      icon: 'shield-checkmark-outline',
      status: 'manquant',
    },
  ];

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    if (user) {
      try {
        await updateProfile(user.uid, {
          notificationsEnabled: value,
        } as any);
      } catch (error) {
        console.error('Error updating notification setting:', error);
      }
    }
  };

  const handleUploadDocument = (docId: string) => {
    Alert.alert(
      'Telecharger un document',
      'Cette fonctionnalite sera disponible prochainement.',
      [{ text: 'OK' }]
    );
  };

  const handleLogout = () => {
    Alert.alert('Deconnexion', 'Voulez-vous vraiment vous deconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se deconnecter',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await signOut();
            router.replace('/(auth)/login' as any);
          } catch (error) {
            console.error('Error signing out:', error);
            Alert.alert('Erreur', 'Impossible de se deconnecter.');
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', 'Impossible d\'ouvrir le lien.');
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Mon profil</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profile?.photoURL ? (
              <Image
                source={{ uri: profile.photoURL }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={36} color={COLORS.white} />
              </View>
            )}
          </View>
          <Text style={styles.profileName}>
            {profile?.prenom} {profile?.nom}
          </Text>
          <View style={styles.ratingRow}>
            {renderStars(profile?.note || 0)}
            <Text style={styles.ratingText}>
              {(profile?.note || 0).toFixed(1)}
            </Text>
          </View>
          <Text style={styles.memberSince}>Membre depuis {memberSince}</Text>
        </View>

        {/* Profile Stats */}
        <View style={styles.profileStats}>
          <View style={styles.profileStatItem}>
            <Text style={styles.profileStatValue}>
              {profile?.nombreLivraisons || 0}
            </Text>
            <Text style={styles.profileStatLabel}>Total courses</Text>
          </View>
          <View style={styles.profileStatDivider} />
          <View style={styles.profileStatItem}>
            <Text style={styles.profileStatValue}>
              {(profile?.note || 0).toFixed(1)}
            </Text>
            <Text style={styles.profileStatLabel}>Note moyenne</Text>
          </View>
          <View style={styles.profileStatDivider} />
          <View style={styles.profileStatItem}>
            <Text style={styles.profileStatValue}>--</Text>
            <Text style={styles.profileStatLabel}>Taux accept.</Text>
          </View>
        </View>

        {/* Informations personnelles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          <View style={styles.infoCard}>
            <InfoRow
              icon="person-outline"
              label="Nom"
              value={profile?.nom || '--'}
            />
            <InfoRow
              icon="person-outline"
              label="Prenom"
              value={profile?.prenom || '--'}
            />
            <InfoRow
              icon="mail-outline"
              label="Email"
              value={profile?.email || '--'}
            />
            <InfoRow
              icon="call-outline"
              label="Telephone"
              value={profile?.telephone || '--'}
              isLast
            />
          </View>
        </View>

        {/* Vehicule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicule</Text>
          <View style={styles.infoCard}>
            <InfoRow
              icon="car-outline"
              label="Type"
              value={profile?.vehicule || 'Non renseigne'}
            />
            <InfoRow
              icon="document-outline"
              label="Immatriculation"
              value="--"
              isLast
            />
          </View>
        </View>

        {/* Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents</Text>
          <View style={styles.infoCard}>
            {documents.map((doc, index) => {
              const docConfig = getDocStatusConfig(doc.status);
              return (
                <View
                  key={doc.id}
                  style={[
                    styles.documentRow,
                    index < documents.length - 1 && styles.documentRowBorder,
                  ]}
                >
                  <View style={styles.documentLeft}>
                    <Ionicons
                      name={doc.icon}
                      size={20}
                      color={COLORS.textLight}
                    />
                    <Text style={styles.documentLabel}>{doc.label}</Text>
                  </View>
                  <View style={styles.documentRight}>
                    <View
                      style={[
                        styles.docStatusBadge,
                        { backgroundColor: docConfig.color + '15' },
                      ]}
                    >
                      <Ionicons
                        name={docConfig.icon}
                        size={14}
                        color={docConfig.color}
                      />
                      <Text
                        style={[styles.docStatusText, { color: docConfig.color }]}
                      >
                        {docConfig.label}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.uploadButton}
                      onPress={() => handleUploadDocument(doc.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="cloud-upload-outline"
                        size={18}
                        color={COLORS.secondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Account Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statut du compte</Text>
          <View style={styles.statusCard}>
            <Ionicons
              name={accountConfig.icon}
              size={28}
              color={accountConfig.color}
            />
            <View style={styles.statusTextContainer}>
              <Text
                style={[styles.statusLabel, { color: accountConfig.color }]}
              >
                {accountConfig.label}
              </Text>
              <Text style={styles.statusDescription}>
                {accountConfig.description}
              </Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parametres</Text>
          <View style={styles.infoCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={COLORS.textLight}
                />
                <Text style={styles.settingLabel}>Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: COLORS.border, true: COLORS.success + '50' }}
                thumbColor={
                  notificationsEnabled ? COLORS.success : COLORS.textLight
                }
              />
            </View>
          </View>
        </View>

        {/* Links */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            <LinkRow
              icon="document-text-outline"
              label="Charte du livreur"
              onPress={() => handleOpenLink('https://coliway.fr/charte-livreur')}
            />
            <LinkRow
              icon="reader-outline"
              label="Conditions generales d'utilisation"
              onPress={() => handleOpenLink('https://coliway.fr/cgu')}
            />
            <LinkRow
              icon="lock-closed-outline"
              label="Politique de confidentialite"
              onPress={() =>
                handleOpenLink('https://coliway.fr/confidentialite')
              }
              isLast
            />
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          disabled={loggingOut}
          activeOpacity={0.7}
        >
          {loggingOut ? (
            <ActivityIndicator size="small" color={COLORS.danger} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
              <Text style={styles.logoutText}>Se deconnecter</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.versionText}>Coliway v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// Sub-components

interface InfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isLast?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value, isLast }) => (
  <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
    <View style={styles.infoRowLeft}>
      <Ionicons name={icon} size={18} color={COLORS.textLight} />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

interface LinkRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  isLast?: boolean;
}

const LinkRow: React.FC<LinkRowProps> = ({ icon, label, onPress, isLast }) => (
  <TouchableOpacity
    style={[styles.linkRow, !isLast && styles.infoRowBorder]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.infoRowLeft}>
      <Ionicons name={icon} size={18} color={COLORS.textLight} />
      <Text style={styles.linkLabel}>{label}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Screen Header
  screenHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: COLORS.white,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 6,
  },
  memberSince: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 6,
  },

  // Profile Stats
  profileStats: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  profileStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  profileStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  profileStatLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  profileStatDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },

  // Section
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },

  // Info Card
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    maxWidth: '50%',
    textAlign: 'right',
  },

  // Document Row
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  documentRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  documentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  documentLabel: {
    fontSize: 14,
    color: COLORS.text,
  },
  documentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  docStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  docStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  uploadButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Account Status
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  statusDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
    lineHeight: 18,
  },

  // Settings
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingLabel: {
    fontSize: 14,
    color: COLORS.text,
  },

  // Links
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  linkLabel: {
    fontSize: 14,
    color: COLORS.text,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.danger,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.danger,
  },

  // Version
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 20,
  },
});
