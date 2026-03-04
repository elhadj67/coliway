import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StripeProvider } from '@stripe/stripe-react-native';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from '@/contexts/AuthContext';
import { STRIPE_PUBLISHABLE_KEY } from '@/constants/config';

function NotificationHandler() {
  const router = useRouter();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as Record<string, string> | undefined;
        if (!data) return;

        if (data.commandeId) {
          if (data.type === 'livraison') {
            router.push({
              pathname: '/(livreur)/course',
              params: { commandeId: data.commandeId },
            });
          } else {
            router.push({
              pathname: '/(client)/suivi',
              params: { orderId: data.commandeId },
            });
          }
        }
      }
    );

    return () => subscription.remove();
  }, [router]);

  return null;
}

export default function RootLayout() {
  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <AuthProvider>
        <NotificationHandler />
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(client)" />
          <Stack.Screen name="(livreur)" />
          <Stack.Screen name="(admin)" />
        </Stack>
      </AuthProvider>
    </StripeProvider>
  );
}
