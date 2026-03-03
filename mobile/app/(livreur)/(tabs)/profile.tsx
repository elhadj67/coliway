import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/services/firebase';
import { updateProfile } from '@/services/auth';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/Button';

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

export default function LivreurProfileTabScreen() {
  const router = useRouter();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Deconnexion',
      'Voulez-vous vraiment vous deconnecter ?',
      [
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
              console.error('Logout error:', error);
              Alert.alert('Erreur', 'Impossible de se deconnecter.');
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleChangePhoto = () => {
    console.log('handleChangePhoto called');
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
        <Text style={styles.userName}>
          {profile?.prenom} {profile?.nom}
        </Text>
        <View style={styles.ratingRow}>
          {renderStars(profile?.note || 0)}
          <Text style={styles.ratingText}>
            {(profile?.note || 0).toFixed(1)}
          </Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {profile?.nombreLivraisons || 0}
          </Text>
          <Text style={styles.statLabel}>Courses</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {(profile?.note || 0).toFixed(1)}
          </Text>
          <Text style={styles.statLabel}>Note</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statValue}>--</Text>
          <Text style={styles.statLabel}>Taux accept.</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsCard}>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => router.push('/(livreur)/gains')}
        >
          <View style={styles.actionLeft}>
            <Ionicons name="cash-outline" size={22} color={Colors.success} />
            <Text style={styles.actionText}>Mes gains</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
        </TouchableOpacity>

        <View style={styles.actionDivider} />

        <TouchableOpacity
          style={styles.actionRow}
          onPress={() => router.push('/(livreur)/profil')}
        >
          <View style={styles.actionLeft}>
            <Ionicons name="person-circle-outline" size={22} color={Colors.primary} />
            <Text style={styles.actionText}>Mon profil complet</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <Button
        title="Se deconnecter"
        onPress={handleLogout}
        variant="danger"
        icon="log-out-outline"
        loading={loggingOut}
        style={styles.logoutButton}
      />

      <Text style={styles.versionText}>Coliway v1.0.0</Text>
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: 2,
  },
  ratingText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginLeft: 6,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Shadows.card,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  statLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  actionsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
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
  actionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.base,
  },
  logoutButton: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.lg,
  },
  versionText: {
    textAlign: 'center',
    fontSize: Typography.sizes.sm,
    color: Colors.border,
    marginTop: Spacing.lg,
  },
});
