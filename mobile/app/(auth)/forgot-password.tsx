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
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import Button from '@/components/Button';
import Input from '@/components/Input';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setError('L\'adresse email est requise');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Adresse email invalide');
      return false;
    }
    setError('');
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateEmail()) return;

    setLoading(true);
    setError('');

    try {
      await resetPassword(email.trim());
      setEmailSent(true);
    } catch (err: any) {
      let errorMessage = 'Une erreur est survenue. Veuillez réessayer.';

      if (err.code === 'auth/user-not-found') {
        errorMessage = 'Aucun compte trouvé avec cette adresse email.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Adresse email invalide.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard.';
      }

      setError(errorMessage);
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
          </View>

          {/* Logo */}
          <View style={styles.logoSection}>
            {emailSent ? (
              <View style={styles.iconContainer}>
                <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
              </View>
            ) : (
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {emailSent ? 'Email envoyé !' : 'Mot de passe oublié'}
          </Text>

          {/* Description */}
          <Text style={styles.description}>
            {emailSent
              ? `Un lien de réinitialisation a été envoyé à ${email}. Vérifiez votre boîte de réception et suivez les instructions.`
              : 'Entrez votre adresse email, nous vous enverrons un lien pour réinitialiser votre mot de passe.'}
          </Text>

          {!emailSent ? (
            <View style={styles.formSection}>
              <Input
                label="Email"
                icon="mail-outline"
                placeholder="votre@email.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError('');
                }}
                error={error}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="done"
                onSubmitEditing={handleResetPassword}
              />

              <Button
                title="Envoyer le lien"
                onPress={handleResetPassword}
                loading={loading}
                icon="send-outline"
                style={styles.submitButton}
              />
            </View>
          ) : (
            <View style={styles.successSection}>
              <Button
                title="Retour à la connexion"
                onPress={() => router.replace('/(auth)/login')}
                icon="log-in-outline"
                style={styles.submitButton}
              />

              <TouchableOpacity
                style={styles.resendLink}
                onPress={() => {
                  setEmailSent(false);
                  setEmail('');
                }}
              >
                <Text style={styles.resendText}>
                  Vous n'avez pas reçu l'email ?{' '}
                  <Text style={styles.resendAction}>Renvoyer</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
  },
  header: {
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
  logoSection: {
    alignItems: 'center',
    marginTop: Spacing.xxxl,
    marginBottom: Spacing.xl,
  },
  logoImage: {
    width: 220,
    height: 70,
  },
  iconContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.card,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: Typography.sizes.base,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.base,
  },
  formSection: {
    width: '100%',
  },
  submitButton: {
    marginTop: Spacing.base,
  },
  successSection: {
    width: '100%',
    alignItems: 'center',
  },
  resendLink: {
    marginTop: Spacing.xl,
  },
  resendText: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    textAlign: 'center',
  },
  resendAction: {
    color: Colors.secondary,
    fontWeight: Typography.weights.semibold,
  },
});
