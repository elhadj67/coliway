import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/theme';

export default function Index() {
  const { user, profile, loading, isClient, isLivreur } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/(auth)/login');
      return;
    }

    // Wait for profile to be loaded before redirecting
    if (!profile) return;

    if (isClient) {
      router.replace('/(client)');
    } else if (isLivreur) {
      router.replace('/(livreur)');
    } else {
      router.replace('/(client)');
    }
  }, [user, profile, loading, isClient, isLivreur]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.secondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
