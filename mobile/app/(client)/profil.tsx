import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { useAuth } from '../../contexts/AuthContext';
import { signOut, updateProfile as updateUserProfile } from '../../services/auth';
import { Colors, Shadows, Spacing, BorderRadius, Typography } from '../../constants/theme';

export default function ProfilScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Editable fields
  const [nom, setNom] = useState(profile?.nom || '');
  const [prenom, setPrenom] = useState(profile?.prenom || '');
  const [email] = useState(profile?.email || '');
  const [telephone, setTelephone] = useState(profile?.telephone || '');
  const [adresse, setAdresse] = useState(profile?.adresse || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (profile) {
      setNom(profile.nom);
      setPrenom(profile.prenom);
      setTelephone(profile.telephone);
      setAdresse(profile.adresse || '');
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!nom.trim() || !prenom.trim()) {
      Alert.alert('Erreur', 'Le nom et le prénom sont obligatoires.');
      return;
    }

    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        nom: nom.trim(),
        prenom: prenom.trim(),
        telephone: telephone.trim(),
        adresse: adresse.trim() || undefined,
      });
      await refreshProfile();
      setIsEditing(false);
      Alert.alert('Succès', 'Votre profil a été mis à jour.');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil.');
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Se déconnecter',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await signOut();
              router.replace('/');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de se déconnecter.');
              console.error('Error signing out:', error);
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est irréversible. Toutes vos données seront supprimées. Êtes-vous sûr ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Information',
              'Pour supprimer votre compte, veuillez contacter le support à support@coliway.fr'
            );
          },
        },
      ]
    );
  };

  const handleCancelEdit = () => {
    // Reset to original values
    if (profile) {
      setNom(profile.nom);
      setPrenom(profile.prenom);
      setTelephone(profile.telephone);
      setAdresse(profile.adresse || '');
    }
    setIsEditing(false);
  };

  const renderProfileHeader = () => (
    <View style={styles.profileHeader}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={48} color={Colors.white} />
        </View>
      </View>
      <Text style={styles.profileName}>
        {profile ? `${profile.prenom} ${profile.nom}` : 'Utilisateur'}
      </Text>
      <Text style={styles.profileEmail}>{email}</Text>

      {!isEditing && (
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={18} color={Colors.primary} />
          <Text style={styles.editButtonText}>Modifier le profil</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPersonalInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Informations personnelles</Text>

      <View style={styles.sectionCard}>
        {isEditing ? (
          <>
            <Input
              label="Nom"
              value={nom}
              onChangeText={setNom}
              placeholder="Votre nom"
              icon="person-outline"
            />
            <Input
              label="Prénom"
              value={prenom}
              onChangeText={setPrenom}
              placeholder="Votre prénom"
              icon="person-outline"
            />
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyLabel}>Email</Text>
              <Text style={styles.readOnlyValue}>{email}</Text>
            </View>
            <Input
              label="Téléphone"
              value={telephone}
              onChangeText={setTelephone}
              placeholder="06 12 34 56 78"
              keyboardType="phone-pad"
              icon="call-outline"
            />
          </>
        ) : (
          <>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color={Colors.textLight} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Nom</Text>
                <Text style={styles.infoValue}>{profile?.nom || '--'}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color={Colors.textLight} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Prénom</Text>
                <Text style={styles.infoValue}>{profile?.prenom || '--'}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color={Colors.textLight} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{email || '--'}</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color={Colors.textLight} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Téléphone</Text>
                <Text style={styles.infoValue}>
                  {profile?.telephone || '--'}
                </Text>
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );

  const renderDefaultAddress = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Adresse par défaut</Text>

      <View style={styles.sectionCard}>
        {isEditing ? (
          <Input
            label="Adresse"
            value={adresse}
            onChangeText={setAdresse}
            placeholder="Votre adresse par défaut"
            icon="location-outline"
          />
        ) : (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color={Colors.textLight} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Adresse</Text>
              <Text style={styles.infoValue}>
                {profile?.adresse || 'Non renseignée'}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderNotifications = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Notifications</Text>

      <View style={styles.sectionCard}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Ionicons
              name="notifications-outline"
              size={20}
              color={Colors.textLight}
            />
            <Text style={styles.toggleLabel}>Notifications push</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
            thumbColor={notificationsEnabled ? Colors.primary : Colors.textLight}
          />
        </View>
      </View>
    </View>
  );

  const renderPaymentMethods = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Mes moyens de paiement</Text>

      <View style={styles.sectionCard}>
        <TouchableOpacity style={styles.paymentMethodRow} activeOpacity={0.7}>
          <View style={styles.paymentMethodLeft}>
            <Ionicons name="card" size={20} color={Colors.primary} />
            <Text style={styles.paymentMethodText}>
              Carte bancaire **** 4242
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={Colors.textLight}
          />
        </TouchableOpacity>

        <TouchableOpacity style={styles.addPaymentRow} activeOpacity={0.7}>
          <Ionicons name="add-circle-outline" size={20} color={Colors.secondary} />
          <Text style={styles.addPaymentText}>
            Ajouter un moyen de paiement
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLegalLinks = () => (
    <View style={styles.section}>
      <View style={styles.sectionCard}>
        <TouchableOpacity style={styles.linkRow} activeOpacity={0.7}>
          <View style={styles.linkLeft}>
            <Ionicons
              name="document-text-outline"
              size={20}
              color={Colors.textLight}
            />
            <Text style={styles.linkText}>
              Conditions Générales d'Utilisation
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={Colors.textLight}
          />
        </TouchableOpacity>

        <View style={styles.linkDivider} />

        <TouchableOpacity style={styles.linkRow} activeOpacity={0.7}>
          <View style={styles.linkLeft}>
            <Ionicons
              name="shield-outline"
              size={20}
              color={Colors.textLight}
            />
            <Text style={styles.linkText}>Politique de confidentialité</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={Colors.textLight}
          />
        </TouchableOpacity>

        <View style={styles.linkDivider} />

        <TouchableOpacity style={styles.linkRow} activeOpacity={0.7}>
          <View style={styles.linkLeft}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={Colors.textLight}
            />
            <Text style={styles.linkText}>Mentions légales</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={Colors.textLight}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon profil</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {renderProfileHeader()}
        {renderPersonalInfo()}
        {renderDefaultAddress()}
        {renderNotifications()}
        {renderPaymentMethods()}
        {renderLegalLinks()}

        {/* Edit Action Buttons */}
        {isEditing && (
          <View style={styles.editActions}>
            <Button
              title="Enregistrer"
              onPress={handleSaveProfile}
              loading={saving}
              icon="checkmark-circle"
              style={styles.saveButton}
            />
            <Button
              title="Annuler"
              onPress={handleCancelEdit}
              variant="outline"
              icon="close-circle"
              style={styles.cancelButton}
            />
          </View>
        )}

        {/* Logout Button */}
        <Button
          title="Se déconnecter"
          onPress={handleLogout}
          variant="danger"
          icon="log-out-outline"
          loading={loggingOut}
          style={styles.logoutButton}
        />

        {/* Delete Account */}
        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteAccountText}>Supprimer mon compte</Text>
        </TouchableOpacity>
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl + Spacing.base,
    paddingBottom: Spacing.base,
    backgroundColor: Colors.white,
    ...Shadows.card,
  },
  headerTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingBottom: Spacing.xxxl * 2,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.white,
    marginBottom: Spacing.md,
  },
  avatarContainer: {
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  profileEmail: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xxl,
    gap: Spacing.xs,
  },
  editButtonText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
  },
  section: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Shadows.card,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  readOnlyField: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.base,
  },
  readOnlyLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginBottom: 2,
  },
  readOnlyValue: {
    fontSize: Typography.sizes.base,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  toggleLabel: {
    fontSize: Typography.sizes.base,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  paymentMethodText: {
    fontSize: Typography.sizes.base,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  addPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addPaymentText: {
    fontSize: Typography.sizes.md,
    color: Colors.secondary,
    fontWeight: Typography.weights.medium,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  linkText: {
    fontSize: Typography.sizes.base,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  linkDivider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  editActions: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  saveButton: {},
  cancelButton: {},
  logoutButton: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
  },
  deleteAccountButton: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
  },
  deleteAccountText: {
    fontSize: Typography.sizes.md,
    color: Colors.danger,
    fontWeight: Typography.weights.medium,
    textDecorationLine: 'underline',
  },
});
