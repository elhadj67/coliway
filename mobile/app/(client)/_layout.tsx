import { Stack } from 'expo-router';

export default function ClientLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="nouvelle-commande" />
      <Stack.Screen name="suivi" />
      <Stack.Screen name="paiement" />
      <Stack.Screen name="historique" />
      <Stack.Screen name="profil" />
      <Stack.Screen name="legal" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}
