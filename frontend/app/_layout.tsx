import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0E27' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/signup" />
      <Stack.Screen name="auth/admin-login" />
      <Stack.Screen name="user/dashboard" />
      <Stack.Screen name="user/energy-history" />
      <Stack.Screen name="user/billing" />
      <Stack.Screen name="user/notifications" />
      <Stack.Screen name="user/predicted-bill" />
      <Stack.Screen name="admin/dashboard" />
      <Stack.Screen name="admin/user-detail" />
    </Stack>
  );
}
