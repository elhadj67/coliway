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
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/services/firebase';
import { useAuth } from '@/hooks/useAuth';
import { signOut, updateProfile } from '@/services/auth';
import { Colors } from '@/constants/theme';

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
        color: Colors.success,
        icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
        description: 'Votre compte est actif. Vous pouvez accepter des courses.',
      };
    case 'en_attente':
      return {
        label: 'En attente de validation',
        color: Colors.accent,
        icon: 'time' as keyof typeof Ionicons.glyphMap,
        description:
          'Votre compte est en cours de verification. Cela peut prendre 24 a 48h.',
      };
    case 'refuse':
      return {
        label: 'Refuse',
        color: Colors.danger,
        icon: 'close-circle' as keyof typeof Ionicons.glyphMap,
        description:
          'Votre compte a ete refuse. Veuillez verifier vos documents et reessayer.',
      };
    default:
      return {
        label: 'Inconnu',
        color: Colors.textLight,
        icon: 'help-circle' as keyof typeof Ionicons.glyphMap,
        description: '',
      };
  }
}

function getDocStatusConfig(status: string) {
  switch (status) {
    case 'valide':
      return { label: 'Valide', color: Colors.success, icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap };
    case 'en_attente':
      return { label: 'En attente', color: Colors.accent, icon: 'time' as keyof typeof Ionicons.glyphMap };
    case 'manquant':
      return { label: 'Manquant', color: Colors.danger, icon: 'alert-circle' as keyof typeof Ionicons.glyphMap };
    default:
      return { label: 'Inconnu', color: Colors.textLight, icon: 'help-circle' as keyof typeof Ionicons.glyphMap };
  }
}

function renderStars(rating: number): React.ReactNode[] {
  const stars: React.ReactNode[] = [];
  const fullStars = Math.floor(rating);
  const halfStar = rating - fullStars >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <Ionicons key={i} name="star" size={16} color={Colors.accent} />
      );
    } else if (i === fullStars && halfStar) {
      stars.push(
        <Ionicons key={i} name="star-half" size={16} color={Colors.accent} />
      );
    } else {
      stars.push(
        <Ionicons key={i} name="star-outline" size={16} color={Colors.border} />
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalField, setModalField] = useState<'immatriculation' | 'siret' | 'vehicule'>('immatriculation');
  const [modalValue, setModalValue] = useState('');
  const [savingField, setSavingField] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

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
      status: profile?.siret ? 'valide' : 'manquant',
    },
    {
      id: 'assurance',
      label: 'Assurance',
      icon: 'shield-checkmark-outline',
      status: profile?.assurance ? 'valide' : 'manquant',
    },
  ];

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

      const storageRef = ref(storage, `profiles/${user.uid}/photo.jpg`);
      await uploadBytes(storageRef, blob);

      const downloadURL = await getDownloadURL(storageRef);

      await updateProfile(user.uid, { photoURL: downloadURL });

      await refreshProfile();

      Alert.alert('Succès', 'Photo de profil mise à jour !');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la photo de profil.');
    } finally {
      setUploadingPhoto(false);
    }
  };

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

  const handleEditField = (field: 'immatriculation' | 'siret' | 'vehicule') => {
    const currentValue = profile?.[field] || '';
    setModalField(field);
    setModalValue(currentValue);
    setModalVisible(true);
  };

  const handleSaveField = async () => {
    if (!user) return;

    const value = modalValue.trim();

    if (modalField === 'siret') {
      if (!/^\d{14}$/.test(value)) {
        Alert.alert('SIRET invalide', 'Le numero SIRET doit comporter exactement 14 chiffres.');
        return;
      }
    }

    setSavingField(true);
    try {
      await updateProfile(user.uid, { [modalField]: value });
      await refreshProfile();
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving field:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder.');
    } finally {
      setSavingField(false);
    }
  };

  const getModalLabel = (field: string) => {
    switch (field) {
      case 'immatriculation': return 'Immatriculation';
      case 'siret': return 'SIRET';
      case 'vehicule': return 'Type de vehicule';
      default: return '';
    }
  };

  const handleUploadDocument = (docId: string) => {
    if (docId === 'siret') {
      handleEditField('siret');
      return;
    }

    Alert.alert(
      'Telecharger un document',
      'Choisissez une option',
      [
        {
          text: 'Prendre une photo',
          onPress: () => pickDocumentImage(docId, 'camera'),
        },
        {
          text: 'Choisir depuis la galerie',
          onPress: () => pickDocumentImage(docId, 'gallery'),
        },
        {
          text: 'Choisir un PDF',
          onPress: () => pickDocumentPDF(docId),
        },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const pickDocumentImage = async (docId: string, source: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission requise', 'Autorisez l\'acces a la camera.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.7,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permission requise', 'Autorisez l\'acces a la galerie.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.7,
        });
      }

      if (result.canceled || !result.assets?.[0]?.uri) return;

      await uploadDocument(docId, result.assets[0].uri, 'jpg');
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Erreur', 'Impossible de selectionner l\'image.');
    }
  };

  const pickDocumentPDF = async (docId: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      await uploadDocument(docId, result.assets[0].uri, 'pdf');
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Erreur', 'Impossible de selectionner le document.');
    }
  };

  const uploadDocument = async (docId: string, uri: string, ext: string) => {
    if (!user) return;

    setUploadingDoc(docId);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const storageRef = ref(storage, `profiles/${user.uid}/${docId}.${ext}`);
      await uploadBytes(storageRef, blob);

      const downloadURL = await getDownloadURL(storageRef);

      await updateProfile(user.uid, { [docId]: downloadURL });
      await refreshProfile();

      Alert.alert('Succes', 'Document telecharge avec succes !');
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Erreur', error?.message || 'Impossible de telecharger le document.');
    } finally {
      setUploadingDoc(null);
    }
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Mon profil</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleChangePhoto}
            disabled={uploadingPhoto}
            activeOpacity={0.7}
          >
            {profile?.photoURL ? (
              <Image
                source={{ uri: profile.photoURL }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={36} color={Colors.white} />
              </View>
            )}
            <View style={styles.cameraOverlay}>
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="camera" size={16} color={Colors.white} />
              )}
            </View>
          </TouchableOpacity>
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
            <TouchableOpacity onPress={() => handleEditField('vehicule')} activeOpacity={0.7}>
              <InfoRow
                icon="car-outline"
                label="Type"
                value={profile?.vehicule || 'Non renseigne'}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleEditField('immatriculation')} activeOpacity={0.7}>
              <InfoRow
                icon="document-outline"
                label="Immatriculation"
                value={profile?.immatriculation || '--'}
                isLast
              />
            </TouchableOpacity>
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
                      color={Colors.textLight}
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
                      disabled={uploadingDoc === doc.id}
                    >
                      {uploadingDoc === doc.id ? (
                        <ActivityIndicator size="small" color={Colors.secondary} />
                      ) : (
                        <Ionicons
                          name="cloud-upload-outline"
                          size={18}
                          color={Colors.secondary}
                        />
                      )}
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
                  color={Colors.textLight}
                />
                <Text style={styles.settingLabel}>Notifications</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: Colors.border, true: Colors.success + '50' }}
                thumbColor={
                  notificationsEnabled ? Colors.success : Colors.textLight
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
            <ActivityIndicator size="small" color={Colors.danger} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
              <Text style={styles.logoutText}>Se deconnecter</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.versionText}>Coliway v1.0.0</Text>
      </ScrollView>

      {/* Modal de saisie */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{getModalLabel(modalField)}</Text>
            <TextInput
              style={styles.modalInput}
              value={modalValue}
              onChangeText={setModalValue}
              placeholder={`Entrez votre ${getModalLabel(modalField).toLowerCase()}`}
              autoFocus
              autoCapitalize={modalField === 'immatriculation' ? 'characters' : 'none'}
              keyboardType={modalField === 'siret' ? 'numeric' : 'default'}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setModalVisible(false)}
                disabled={savingField}
              >
                <Text style={styles.modalButtonCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={handleSaveField}
                disabled={savingField}
              >
                {savingField ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.modalButtonConfirmText}>Valider</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
      <Ionicons name={icon} size={18} color={Colors.textLight} />
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
      <Ionicons name={icon} size={18} color={Colors.textLight} />
      <Text style={styles.linkLabel}>{label}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Screen Header
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: Colors.white,
  },
  avatarContainer: {
    marginBottom: 12,
    position: 'relative',
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
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
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
    color: Colors.text,
    marginLeft: 6,
  },
  memberSince: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 6,
  },

  // Profile Stats
  profileStats: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
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
    color: Colors.text,
  },
  profileStatLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  profileStatDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },

  // Section
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },

  // Info Card
  infoCard: {
    backgroundColor: Colors.white,
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
    borderBottomColor: Colors.border,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
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
    borderBottomColor: Colors.border,
  },
  documentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  documentLabel: {
    fontSize: 14,
    color: Colors.text,
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
    backgroundColor: Colors.secondary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Account Status
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
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
    color: Colors.textLight,
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
    color: Colors.text,
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
    color: Colors.text,
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
    borderColor: Colors.danger,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.danger,
  },

  // Version
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 20,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textLight,
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
});
