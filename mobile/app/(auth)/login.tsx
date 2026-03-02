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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/Button';
import Input from '@/components/Input';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isClient, isLivreur } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = 'L\'adresse email est requise';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Adresse email invalide';
    }

    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      await signIn(email.trim(), password);

      // After signIn resolves, the auth context will have updated profile.
      // We redirect from the root index based on role, but we can also
      // navigate directly here. The router.replace('/') will trigger the
      // index redirect logic.
      router.replace('/');
    } catch (error: any) {
      let errorMessage = 'Une erreur est survenue. Veuillez réessayer.';

      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Aucun compte trouvé avec cette adresse email.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Mot de passe incorrect.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Adresse email invalide.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Identifiants incorrects. Vérifiez votre email et mot de passe.';
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
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>Une solution de livraison pour tous</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            {errors.general && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={20} color={Colors.danger} />
                <Text style={styles.errorBannerText}>{errors.general}</Text>
              </View>
            )}

            <Input
              label="Email"
              icon="mail-outline"
              placeholder="votre@email.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
            />

            <Input
              label="Mot de passe"
              icon="lock-closed-outline"
              placeholder="Votre mot de passe"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              error={errors.password}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>

            <Button
              title="Se connecter"
              onPress={handleLogin}
              loading={loading}
              icon="log-in-outline"
              style={styles.loginButton}
            />
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            <Text style={styles.bottomText}>Pas encore de compte ?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}> S'inscrire</Text>
            </TouchableOpacity>
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
    justifyContent: 'center',
    minHeight: '100%',
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoImage: {
    width: 250,
    height: 80,
    marginBottom: Spacing.base,
  },
  tagline: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  formSection: {
    width: '100%',
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.xl,
    marginTop: -Spacing.sm,
  },
  forgotPasswordText: {
    fontSize: Typography.sizes.md,
    color: Colors.secondary,
    fontWeight: Typography.weights.medium,
  },
  loginButton: {
    marginTop: Spacing.sm,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xxxl,
    marginBottom: Spacing.xxl,
  },
  bottomText: {
    fontSize: Typography.sizes.base,
    color: Colors.textLight,
  },
  registerLink: {
    fontSize: Typography.sizes.base,
    color: Colors.secondary,
    fontWeight: Typography.weights.semibold,
  },
});
