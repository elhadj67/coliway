import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Switch,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/services/firebase';
import { updateProfile } from '@/services/auth';
import {
  listPaymentMethods,
  createSetupIntent,
  deletePaymentMethod,
  SavedCard,
} from '@/services/payment';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/Button';
import AddressInput from '@/components/AddressInput';

export default function ClientProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { confirmSetupIntent } = useStripe();
  const [loggingOut, setLoggingOut] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  // Card management
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [addingCard, setAddingCard] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const loadCards = useCallback(async () => {
    setLoadingCards(true);
    try {
      const cards = await listPaymentMethods();
      setSavedCards(cards);
    } catch (error) {
      console.error('Error loading cards:', error);
    } finally {
      setLoadingCards(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleAddCard = async () => {
    setAddingCard(true);
    try {
      const { clientSecret } = await createSetupIntent();
      const { error } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
      });
      if (error) {
        Alert.alert('Erreur', error.message || "Impossible d'enregistrer la carte.");
      } else {
        Alert.alert('Succès', 'Carte enregistrée avec succès.');
        await loadCards();
      }
    } catch (error) {
      Alert.alert('Erreur', "Impossible d'enregistrer la carte.");
      console.error('Error adding card:', error);
    } finally {
      setAddingCard(false);
      setCardComplete(false);
    }
  };

  const handleDeleteCard = (card: SavedCard) => {
    Alert.alert(
      'Supprimer la carte',
      `Voulez-vous supprimer la carte ${card.brand.toUpperCase()} **** ${card.last4} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePaymentMethod(card.id);
              await loadCards();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la carte.');
              console.error('Error deleting card:', error);
            }
          },
        },
      ]
    );
  };

  const handleEditAddress = () => {
    setAddressModalVisible(true);
  };

  const handleSelectAddress = async (address: string) => {
    if (!user || !address.trim()) return;
    setSavingAddress(true);
    try {
      await updateProfile(user.uid, { adresse: address.trim() });
      await refreshProfile();
      setAddressModalVisible(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'adresse.');
      console.error('Error saving address:', error);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
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
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Erreur', 'Impossible de se déconnecter.');
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleChangePhoto = () => {
    Alert.alert(
      'Photo de profil',
      'Choisissez une option',
      [
        {
          text: 'Prendre une photo',
          onPress: () => pickImage('camera'),
        },
        {
          text: 'Choisir depuis la galerie',
          onPress: () => pickImage('gallery'),
        },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission requise', 'Autorisez l\'accès à la caméra pour prendre une photo.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie pour choisir une photo.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });
      }

      if (result.canceled || !result.assets?.[0]?.uri) return;

      await uploadPhoto(result.assets[0].uri);
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image.');
    }
  };

  const uploadPhoto = async (uri: string) => {
    if (!user) return;

    setUploadingPhoto(true);
    try {
      const blob: Blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(xhr.response);
        xhr.onerror = () => reject(new TypeError('Network request failed'));
        xhr.responseType = 'blob';
        xhr.open('GET', uri, true);
        xhr.send(null);
      });

      // Upload to Firebase Storage
      const storageRef = ref(storage, `profiles/${user.uid}/photo.jpg`);
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Update profile in Firestore
      await updateProfile(user.uid, { photoURL: downloadURL });

      // Refresh profile to show new photo
      await refreshProfile();

      Alert.alert('Succès', 'Photo de profil mise à jour !');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la photo de profil.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const emailVerified = user?.emailVerified ?? false;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar section */}
      <View style={styles.avatarSection}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={handleChangePhoto}
          disabled={uploadingPhoto}
          activeOpacity={0.7}
        >
          {profile?.photoURL ? (
            <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>
                {(profile?.prenom?.[0] || '').toUpperCase()}
                {(profile?.nom?.[0] || '').toUpperCase()}
              </Text>
            </View>
          )}
          {/* Camera overlay */}
          <View style={styles.cameraOverlay}>
            {uploadingPhoto ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons name="camera" size={16} color={Colors.white} />
            )}
          </View>
        </TouchableOpacity>
        <Text style={styles.userName}>
          {profile?.prenom} {profile?.nom}
        </Text>
        <Text style={styles.userRole}>
          {profile?.role === 'client' ? 'Client' : profile?.role === 'livreur' ? 'Livreur' : 'Admin'}
        </Text>
      </View>

      {/* Email verification banner */}
      {!emailVerified && (
        <View style={styles.verificationBanner}>
          <Ionicons name="mail-unread-outline" size={20} color={Colors.accent} />
          <Text style={styles.verificationText}>
            Email non vérifié. Consultez votre boite mail.
          </Text>
        </View>
      )}

      {/* Info cards */}
      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Informations personnelles</Text>

        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={20} color={Colors.textLight} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Nom complet</Text>
            <Text style={styles.infoValue}>
              {profile?.prenom || '—'} {profile?.nom || '—'}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={20} color={Colors.textLight} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Email</Text>
            <View style={styles.emailRow}>
              <Text style={styles.infoValue}>{profile?.email || user?.email || '—'}</Text>
              {emailVerified && (
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              )}
            </View>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={20} color={Colors.textLight} />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Téléphone</Text>
            <Text style={styles.infoValue}>{profile?.telephone || '—'}</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsCard}>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => router.push('/(client)/historique')}
        >
          <View style={styles.actionLeft}>
            <Ionicons name="time-outline" size={22} color={Colors.primary} />
            <Text style={styles.actionText}>Historique des commandes</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
        </TouchableOpacity>
      </View>

      {/* Payment Methods */}
      <View style={styles.paymentCard}>
        <Text style={styles.sectionTitle}>Mes moyens de paiement</Text>

        {loadingCards ? (
          <ActivityIndicator size="small" color={Colors.primary} style={{ paddingVertical: Spacing.md }} />
        ) : savedCards.length === 0 ? (
          <Text style={styles.noCardsText}>Aucune carte enregistrée</Text>
        ) : (
          savedCards.map((card) => (
            <View key={card.id} style={styles.cardRow}>
              <View style={styles.cardRowLeft}>
                <Ionicons name="card" size={20} color={Colors.primary} />
                <Text style={styles.cardRowText}>
                  {card.brand.toUpperCase()} **** {card.last4}
                </Text>
                <Text style={styles.cardRowExpiry}>
                  {String(card.expMonth).padStart(2, '0')}/{card.expYear}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteCard(card)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={styles.addCardSection}>
          <CardField
            postalCodeEnabled={false}
            placeholders={{ number: '4242 4242 4242 4242' }}
            cardStyle={{
              backgroundColor: Colors.background,
              textColor: Colors.text,
              borderWidth: 1,
              borderColor: Colors.border,
              borderRadius: 8,
              fontSize: 14,
            }}
            style={styles.cardField}
            onCardChange={(details) => setCardComplete(details.complete)}
          />
          <Button
            title="Enregistrer la carte"
            onPress={handleAddCard}
            loading={addingCard}
            icon="save-outline"
            disabled={!cardComplete || addingCard}
          />
        </View>
      </View>

      {/* Adresse par défaut */}
      <TouchableOpacity style={styles.sectionCard} onPress={handleEditAddress} activeOpacity={0.7}>
        <Text style={styles.sectionTitle}>Adresse par défaut</Text>
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={20} color={Colors.textLight} />
          <Text style={styles.addressValue}>
            {profile?.adresse || 'Non renseignée'}
          </Text>
          <Ionicons name="create-outline" size={18} color={Colors.secondary} />
        </View>
      </TouchableOpacity>

      {/* Notifications */}
      <View style={styles.sectionCard}>
        <View style={styles.notifRow}>
          <View style={styles.notifLeft}>
            <Ionicons name="notifications-outline" size={20} color={Colors.textLight} />
            <Text style={styles.notifLabel}>Notifications push</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
            thumbColor={notificationsEnabled ? Colors.primary : Colors.textLight}
          />
        </View>
      </View>

      {/* Liens légaux */}
      <View style={styles.legalCard}>
        <TouchableOpacity
          style={styles.legalRow}
          onPress={() => Linking.openURL('https://coliway.fr/cgu')}
          activeOpacity={0.7}
        >
          <View style={styles.legalLeft}>
            <Ionicons name="document-text-outline" size={20} color={Colors.textLight} />
            <Text style={styles.legalText}>Conditions Générales d'Utilisation</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
        </TouchableOpacity>

        <View style={styles.legalDivider} />

        <TouchableOpacity
          style={styles.legalRow}
          onPress={() => Linking.openURL('https://coliway.fr/confidentialite')}
          activeOpacity={0.7}
        >
          <View style={styles.legalLeft}>
            <Ionicons name="shield-outline" size={20} color={Colors.textLight} />
            <Text style={styles.legalText}>Politique de confidentialité</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
        </TouchableOpacity>

        <View style={styles.legalDivider} />

        <TouchableOpacity
          style={styles.legalRow}
          onPress={() => Linking.openURL('https://coliway.fr/mentions-legales')}
          activeOpacity={0.7}
        >
          <View style={styles.legalLeft}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.textLight} />
            <Text style={styles.legalText}>Mentions légales</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <Button
        title="Se déconnecter"
        onPress={handleLogout}
        variant="danger"
        icon="log-out-outline"
        loading={loggingOut}
        style={styles.logoutButton}
      />

      {/* Supprimer mon compte */}
      <TouchableOpacity
        style={styles.deleteAccountButton}
        onPress={() =>
          Alert.alert(
            'Supprimer mon compte',
            'Cette action est irréversible. Toutes vos données seront supprimées. Êtes-vous sûr ?',
            [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Supprimer',
                style: 'destructive',
                onPress: () =>
                  Alert.alert(
                    'Information',
                    'Pour supprimer votre compte, veuillez contacter le support à support@coliway.fr'
                  ),
              },
            ]
          )
        }
        activeOpacity={0.7}
      >
        <Text style={styles.deleteAccountText}>Supprimer mon compte</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Coliway v1.0.0</Text>

      {/* Modal adresse */}
      <Modal
        visible={addressModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adresse par défaut</Text>
              <TouchableOpacity
                onPress={() => setAddressModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            {/* Adresse enregistrée */}
            {profile?.adresse ? (
              <View style={styles.savedAddressSection}>
                <Text style={styles.savedAddressLabel}>Adresse actuelle</Text>
                <TouchableOpacity
                  style={styles.savedAddressItem}
                  onPress={() => handleSelectAddress(profile.adresse!)}
                  disabled={savingAddress}
                  activeOpacity={0.7}
                >
                  <Ionicons name="bookmark" size={18} color={Colors.secondary} />
                  <Text style={styles.savedAddressText} numberOfLines={2}>
                    {profile.adresse}
                  </Text>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Recherche d'adresse avec autocomplete */}
            <Text style={styles.searchAddressLabel}>Rechercher une adresse</Text>
            <AddressInput
              placeholder="Tapez une adresse..."
              icon="search-outline"
              onAddressSelect={(address) => handleSelectAddress(address)}
            />

            {savingAddress && (
              <View style={styles.savingOverlay}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.savingText}>Enregistrement...</Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.white,
    ...Shadows.card,
  },
  avatarContainer: {
    marginBottom: Spacing.md,
    position: 'relative',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  userName: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  userRole: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginTop: 2,
  },
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    padding: Spacing.md,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: '#FFEEBA',
  },
  verificationText: {
    fontSize: Typography.sizes.md,
    color: '#856404',
    flex: 1,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    margin: Spacing.base,
    ...Shadows.card,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.primary,
    marginBottom: Spacing.base,
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
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.card,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  actionText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  paymentCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.card,
  },
  noCardsText: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cardRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  cardRowText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  cardRowExpiry: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  addCardSection: {
    marginTop: Spacing.md,
  },
  cardField: {
    width: '100%',
    height: 50,
    marginBottom: Spacing.sm,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.card,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  notifLabel: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  legalCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.card,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  legalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  legalText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  legalDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.base,
  },
  logoutButton: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    width: undefined,
    alignSelf: 'stretch',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  addressValue: {
    flex: 1,
    fontSize: Typography.sizes.base,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  savedAddressSection: {
    marginBottom: 16,
  },
  savedAddressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  savedAddressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  savedAddressText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  searchAddressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  savingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  savingText: {
    fontSize: 14,
    color: Colors.primary,
  },
  deleteAccountButton: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xs,
  },
  deleteAccountText: {
    fontSize: Typography.sizes.md,
    color: Colors.danger,
    fontWeight: Typography.weights.medium,
    textDecorationLine: 'underline',
  },
  versionText: {
    textAlign: 'center',
    fontSize: Typography.sizes.sm,
    color: Colors.border,
    marginTop: Spacing.lg,
  },
});
