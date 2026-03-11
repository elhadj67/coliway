import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { UserRole, GOOGLE_WEB_CLIENT_ID } from '@/constants/config';
import Button from '@/components/Button';
import Input from '@/components/Input';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
});

const VEHICULE_OPTIONS = [
  { label: 'Voiture', value: 'voiture' },
  { label: 'Moto', value: 'moto' },
  { label: 'Vélo', value: 'velo' },
  { label: 'Utilitaire', value: 'utilitaire' },
];

type ClientType = 'particulier' | 'professionnel';

interface FormData {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  password: string;
  confirmPassword: string;
  vehicule: string;
  siret: string;
  // Client pro fields
  typeClient: ClientType;
  raisonSociale: string;
  siretClient: string;
  tvaIntracommunautaire: string;
  adresseFacturation: string;
  contactFacturation: string;
  emailFacturation: string;
}

interface FormErrors {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  password?: string;
  confirmPassword?: string;
  vehicule?: string;
  siret?: string;
  raisonSociale?: string;
  siretClient?: string;
  adresseFacturation?: string;
  terms?: string;
  general?: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signOut();
      const response = await GoogleSignin.signIn();
      const idToken = response.data?.idToken;
      if (!idToken) {
        throw new Error('No ID token received');
      }
      await signInWithGoogle(idToken, role);
      router.replace('/');
    } catch (error: any) {
      console.error('Google sign-up error:', error);
      if (error.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('Erreur', 'Impossible de s\'inscrire avec Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const [role, setRole] = useState<UserRole>('client');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [form, setForm] = useState<FormData>({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    password: '',
    confirmPassword: '',
    vehicule: 'voiture',
    siret: '',
    typeClient: 'particulier',
    raisonSociale: '',
    siretClient: '',
    tvaIntracommunautaire: '',
    adresseFacturation: '',
    contactFacturation: '',
    emailFacturation: '',
  });

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.nom.trim()) {
      newErrors.nom = 'Le nom est requis';
    }

    if (!form.prenom.trim()) {
      newErrors.prenom = 'Le prénom est requis';
    }

    if (!form.email.trim()) {
      newErrors.email = 'L\'adresse email est requise';
    } else if (!form.email.trim().includes('@')) {
      newErrors.email = 'L\'adresse email doit contenir un @';
    } else if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(form.email.trim())) {
      newErrors.email = 'Format invalide (ex: nom@domaine.com)';
    }

    const phoneDigits = form.telephone.replace(/[\s.\-()]/g, '');
    if (!form.telephone.trim()) {
      newErrors.telephone = 'Le numéro de téléphone est requis';
    } else if (phoneDigits.startsWith('+33')) {
      if (phoneDigits.length !== 12) {
        newErrors.telephone = `Numéro invalide : ${phoneDigits.length - 1}/11 chiffres (format +33XXXXXXXXX)`;
      } else if (!/^\+33[1-9]\d{8}$/.test(phoneDigits)) {
        newErrors.telephone = 'Format invalide (ex: +33612345678)';
      }
    } else if (phoneDigits.startsWith('0')) {
      if (phoneDigits.length !== 10) {
        newErrors.telephone = `Numéro invalide : ${phoneDigits.length}/10 chiffres attendus`;
      } else if (!/^0[1-9]\d{8}$/.test(phoneDigits)) {
        newErrors.telephone = 'Format invalide (ex: 0612345678)';
      }
    } else {
      newErrors.telephone = 'Le numéro doit commencer par 0 ou +33';
    }

    // Validation ANSSI (Recommandations relatives à l'authentification
    // multifacteur et aux mots de passe, 2021) - Entropie forte
    if (!form.password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (form.password.length < 8) {
      newErrors.password = 'Minimum 8 caractères';
    } else if (!/[A-Z]/.test(form.password)) {
      newErrors.password = 'Au moins une lettre majuscule requise';
    } else if (!/[a-z]/.test(form.password)) {
      newErrors.password = 'Au moins une lettre minuscule requise';
    } else if (!/[0-9]/.test(form.password)) {
      newErrors.password = 'Au moins un chiffre requis';
    } else if (!/[^A-Za-z0-9]/.test(form.password)) {
      newErrors.password = 'Au moins un caractère spécial requis (!@#$%...)';
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Veuillez confirmer le mot de passe';
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    if (role === 'client' && form.typeClient === 'professionnel') {
      if (!form.raisonSociale.trim()) {
        newErrors.raisonSociale = 'La raison sociale est requise';
      }
      if (!form.siretClient.trim()) {
        newErrors.siretClient = 'Le numéro SIRET est requis';
      } else if (form.siretClient.replace(/\s/g, '').length !== 14) {
        newErrors.siretClient = 'Le SIRET doit contenir 14 chiffres';
      }
      if (!form.adresseFacturation.trim()) {
        newErrors.adresseFacturation = 'L\'adresse de facturation est requise';
      }
    }

    if (role === 'livreur') {
      if (!form.vehicule) {
        newErrors.vehicule = 'Veuillez sélectionner un véhicule';
      }
      if (!form.siret.trim()) {
        newErrors.siret = 'Le numéro SIRET est requis';
      } else if (form.siret.replace(/\s/g, '').length !== 14) {
        newErrors.siret = 'Le numéro SIRET doit contenir 14 chiffres';
      }
    }

    if (!acceptTerms) {
      newErrors.terms = 'Vous devez accepter les CGU';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      await signUp({
        email: form.email.trim(),
        password: form.password,
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        telephone: form.telephone.trim(),
        role,
        // Client fields
        typeClient: role === 'client' ? form.typeClient : undefined,
        raisonSociale: form.typeClient === 'professionnel' ? form.raisonSociale.trim() : undefined,
        siretClient: form.typeClient === 'professionnel' ? form.siretClient.trim() : undefined,
        tvaIntracommunautaire: form.typeClient === 'professionnel' ? form.tvaIntracommunautaire.trim() || undefined : undefined,
        adresseFacturation: form.typeClient === 'professionnel' ? form.adresseFacturation.trim() : undefined,
        contactFacturation: form.typeClient === 'professionnel' ? form.contactFacturation.trim() || undefined : undefined,
        emailFacturation: form.typeClient === 'professionnel' ? form.emailFacturation.trim() || undefined : undefined,
        // Livreur fields
        vehicule: role === 'livreur' ? form.vehicule : undefined,
        permis: role === 'livreur' ? form.siret.trim() : undefined,
      });

      // After signUp, the auth context will be updated.
      // Redirect to the root which will handle role-based routing.
      router.replace('/');
    } catch (error: any) {
      console.error('Registration error:', JSON.stringify({ code: error?.code, message: error?.message }));
      let errorMessage = 'Une erreur est survenue. Veuillez réessayer.';

      const code = error?.code || '';
      if (code === 'auth/email-already-in-use' || code.includes('email-already')) {
        errorMessage = 'Cette adresse email est déjà utilisée. Connectez-vous plutôt.';
      } else if (code === 'auth/weak-password') {
        errorMessage = 'Le mot de passe est trop faible (min. 6 car. Firebase).';
      } else if (code === 'auth/invalid-email') {
        errorMessage = 'Adresse email invalide.';
      } else if (code === 'auth/network-request-failed') {
        errorMessage = 'Erreur réseau. Vérifiez votre connexion internet.';
      } else if (code === 'auth/too-many-requests') {
        errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard.';
      } else if (code === 'auth/operation-not-allowed') {
        errorMessage = 'L\'inscription par email n\'est pas activée.';
      } else if (code.includes('permission-denied') || code === 'PERMISSION_DENIED') {
        errorMessage = 'Erreur de permissions. Veuillez réessayer.';
      } else if (error?.message) {
        errorMessage = `Erreur : ${error.message}`;
      }

      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Créer un compte</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Logo */}
          <View style={styles.logoSection}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Role Selector */}
          <View style={styles.roleSelector}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                role === 'client' && styles.roleButtonActive,
              ]}
              onPress={() => setRole('client')}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={role === 'client' ? Colors.white : Colors.primary}
              />
              <Text
                style={[
                  styles.roleButtonText,
                  role === 'client' && styles.roleButtonTextActive,
                ]}
              >
                Client
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleButton,
                role === 'livreur' && styles.roleButtonActive,
              ]}
              onPress={() => setRole('livreur')}
            >
              <Ionicons
                name="bicycle-outline"
                size={20}
                color={role === 'livreur' ? Colors.white : Colors.primary}
              />
              <Text
                style={[
                  styles.roleButtonText,
                  role === 'livreur' && styles.roleButtonTextActive,
                ]}
              >
                Livreur
              </Text>
            </TouchableOpacity>
          </View>

          {/* Client Type Selector */}
          {role === 'client' && (
            <View style={styles.clientTypeSelector}>
              <TouchableOpacity
                style={[
                  styles.clientTypeButton,
                  form.typeClient === 'particulier' && styles.clientTypeButtonActive,
                ]}
                onPress={() => updateField('typeClient', 'particulier')}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={form.typeClient === 'particulier' ? Colors.white : Colors.secondary}
                />
                <Text
                  style={[
                    styles.clientTypeText,
                    form.typeClient === 'particulier' && styles.clientTypeTextActive,
                  ]}
                >
                  Particulier
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.clientTypeButton,
                  form.typeClient === 'professionnel' && styles.clientTypeButtonActive,
                ]}
                onPress={() => updateField('typeClient', 'professionnel')}
              >
                <Ionicons
                  name="business-outline"
                  size={18}
                  color={form.typeClient === 'professionnel' ? Colors.white : Colors.secondary}
                />
                <Text
                  style={[
                    styles.clientTypeText,
                    form.typeClient === 'professionnel' && styles.clientTypeTextActive,
                  ]}
                >
                  Professionnel
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Error Banner */}
          {errors.general && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color={Colors.danger} />
              <Text style={styles.errorBannerText}>{errors.general}</Text>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.formSection}>
            <View style={styles.row}>
              <Input
                label="Nom"
                icon="person-outline"
                placeholder="Dupont"
                value={form.nom}
                onChangeText={(text) => updateField('nom', text)}
                error={errors.nom}
                autoCapitalize="words"
                containerStyle={styles.halfInput}
              />
              <Input
                label="Prénom"
                icon="person-outline"
                placeholder="Jean"
                value={form.prenom}
                onChangeText={(text) => updateField('prenom', text)}
                error={errors.prenom}
                autoCapitalize="words"
                containerStyle={styles.halfInput}
              />
            </View>

            <Input
              label="Email"
              icon="mail-outline"
              placeholder="votre@email.com"
              value={form.email}
              onChangeText={(text) => updateField('email', text)}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Input
              label="Téléphone"
              icon="call-outline"
              placeholder="06 12 34 56 78"
              value={form.telephone}
              onChangeText={(text) => updateField('telephone', text)}
              error={errors.telephone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />

            {/* Professional client fields */}
            {role === 'client' && form.typeClient === 'professionnel' && (
              <View style={styles.proSection}>
                <Text style={styles.sectionTitle}>Informations entreprise</Text>

                <Input
                  label="Raison sociale *"
                  icon="business-outline"
                  placeholder="Nom de l'entreprise"
                  value={form.raisonSociale}
                  onChangeText={(text) => updateField('raisonSociale', text)}
                  error={errors.raisonSociale}
                  autoCapitalize="words"
                />

                <Input
                  label="SIRET *"
                  icon="document-text-outline"
                  placeholder="123 456 789 01234"
                  value={form.siretClient}
                  onChangeText={(text) => updateField('siretClient', text)}
                  error={errors.siretClient}
                  keyboardType="numeric"
                />

                <Input
                  label="N° TVA intracommunautaire"
                  icon="receipt-outline"
                  placeholder="FR 12 345678901 (optionnel)"
                  value={form.tvaIntracommunautaire}
                  onChangeText={(text) => updateField('tvaIntracommunautaire', text)}
                  autoCapitalize="characters"
                />

                <Input
                  label="Adresse de facturation *"
                  icon="location-outline"
                  placeholder="Adresse complète"
                  value={form.adresseFacturation}
                  onChangeText={(text) => updateField('adresseFacturation', text)}
                  error={errors.adresseFacturation}
                />

                <Input
                  label="Contact facturation"
                  icon="person-outline"
                  placeholder="Nom du contact (optionnel)"
                  value={form.contactFacturation}
                  onChangeText={(text) => updateField('contactFacturation', text)}
                  autoCapitalize="words"
                />

                <Input
                  label="Email de facturation"
                  icon="mail-outline"
                  placeholder="comptabilite@entreprise.com (optionnel)"
                  value={form.emailFacturation}
                  onChangeText={(text) => updateField('emailFacturation', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            )}

            <Input
              label="Mot de passe"
              icon="lock-closed-outline"
              placeholder="Min. 8 car., maj., min., chiffre, spécial"
              value={form.password}
              onChangeText={(text) => updateField('password', text)}
              error={errors.password}
              secureTextEntry
              autoCapitalize="none"
            />

            <Input
              label="Confirmer le mot de passe"
              icon="lock-closed-outline"
              placeholder="Confirmez votre mot de passe"
              value={form.confirmPassword}
              onChangeText={(text) => updateField('confirmPassword', text)}
              error={errors.confirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            {/* Livreur-specific fields */}
            {role === 'livreur' && (
              <View style={styles.livreurSection}>
                <Text style={styles.sectionTitle}>Informations livreur</Text>

                {/* Vehicle Picker */}
                <Text style={styles.inputLabel}>Véhicule</Text>
                <View style={styles.vehiculeGrid}>
                  {VEHICULE_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.vehiculeOption,
                        form.vehicule === option.value && styles.vehiculeOptionActive,
                      ]}
                      onPress={() => updateField('vehicule', option.value)}
                    >
                      <Ionicons
                        name={
                          option.value === 'voiture'
                            ? 'car-outline'
                            : option.value === 'moto'
                            ? 'bicycle-outline'
                            : option.value === 'velo'
                            ? 'walk-outline'
                            : 'bus-outline'
                        }
                        size={24}
                        color={
                          form.vehicule === option.value
                            ? Colors.white
                            : Colors.primary
                        }
                      />
                      <Text
                        style={[
                          styles.vehiculeOptionText,
                          form.vehicule === option.value &&
                            styles.vehiculeOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.vehicule && (
                  <Text style={styles.fieldError}>{errors.vehicule}</Text>
                )}

                <Input
                  label="Numéro SIRET"
                  icon="document-text-outline"
                  placeholder="123 456 789 01234"
                  value={form.siret}
                  onChangeText={(text) => updateField('siret', text)}
                  error={errors.siret}
                  keyboardType="numeric"
                />
              </View>
            )}

            {/* Terms Checkbox */}
            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => {
                setAcceptTerms(!acceptTerms);
                if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
              }}
            >
              <View
                style={[
                  styles.checkbox,
                  acceptTerms && styles.checkboxActive,
                ]}
              >
                {acceptTerms && (
                  <Ionicons name="checkmark" size={16} color={Colors.white} />
                )}
              </View>
              <Text style={styles.termsText}>
                J'accepte les{' '}
                <Text style={styles.termsLink} onPress={() => router.push({ pathname: '/(auth)/legal', params: { type: 'cgu' } })}>CGU</Text> et la{' '}
                <Text style={styles.termsLink} onPress={() => router.push({ pathname: '/(auth)/legal', params: { type: 'confidentialite' } })}>Politique de Confidentialité</Text>
              </Text>
            </TouchableOpacity>
            {errors.terms && (
              <Text style={styles.fieldError}>{errors.terms}</Text>
            )}

            {/* Submit Button */}
            <Button
              title="S'inscrire"
              onPress={handleRegister}
              loading={loading}
              icon="person-add-outline"
              style={styles.registerButton}
            />

            {/* Separator */}
            <View style={styles.separatorRow}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>ou</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* Google Sign-Up */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignUp}
              disabled={googleLoading}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-google" size={20} color="#DB4437" />
              <Text style={styles.googleButtonText}>
                {googleLoading ? 'Inscription...' : 'Continuer avec Google'}
              </Text>
            </TouchableOpacity>

            {/* Bottom Link */}
            <View style={styles.bottomSection}>
              <Text style={styles.bottomText}>Déjà un compte ?</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.loginLink}> Se connecter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.card,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logoImage: {
    width: 200,
    height: 60,
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: 4,
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: 8,
  },
  roleButtonActive: {
    backgroundColor: Colors.primary,
  },
  roleButtonText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
  },
  roleButtonTextActive: {
    color: Colors.white,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEDEE',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: '#F5C6CB',
  },
  errorBannerText: {
    flex: 1,
    fontSize: Typography.sizes.md,
    color: Colors.danger,
    marginLeft: Spacing.sm,
  },
  formSection: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  clientTypeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: 3,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clientTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 6,
  },
  clientTypeButtonActive: {
    backgroundColor: Colors.secondary,
  },
  clientTypeText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.secondary,
  },
  clientTypeTextActive: {
    color: Colors.white,
  },
  proSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  livreurSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
    marginBottom: Spacing.base,
  },
  inputLabel: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  vehiculeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  vehiculeOption: {
    flex: 1,
    minWidth: '22%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  vehiculeOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  vehiculeOptionText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.primary,
    marginTop: 4,
  },
  vehiculeOptionTextActive: {
    color: Colors.white,
  },
  fieldError: {
    fontSize: Typography.sizes.sm,
    color: Colors.danger,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.sm,
    marginBottom: Spacing.base,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  termsText: {
    flex: 1,
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    lineHeight: 20,
  },
  termsLink: {
    color: Colors.secondary,
    fontWeight: Typography.weights.medium,
  },
  registerButton: {
    marginTop: Spacing.base,
  },
  separatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  separatorText: {
    marginHorizontal: Spacing.base,
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  googleIcon: {
    width: 22,
    height: 22,
  },
  googleButtonText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.text,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  bottomText: {
    fontSize: Typography.sizes.base,
    color: Colors.textLight,
  },
  loginLink: {
    fontSize: Typography.sizes.base,
    color: Colors.secondary,
    fontWeight: Typography.weights.semibold,
  },
});
