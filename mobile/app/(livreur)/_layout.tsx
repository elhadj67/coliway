import { Stack } from 'expo-router';

export default function LivreurLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="course" />
      <Stack.Screen name="gains" />
      <Stack.Screen name="profil" />
      <Stack.Screen name="legal" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}
