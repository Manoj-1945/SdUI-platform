import { Stack } from 'expo-router';
import { useFonts, ChakraPetch_400Regular, ChakraPetch_600SemiBold, ChakraPetch_700Bold } from '@expo-google-fonts/chakra-petch';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { colors } from '../src/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ChakraPetch_400Regular,
    ChakraPetch_600SemiBold,
    ChakraPetch_700Bold,
    SpaceMono_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.void },
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
      <Stack.Screen name="user/device-setup" />
      <Stack.Screen name="user/calibration" />
      <Stack.Screen name="user/appliances" />
      <Stack.Screen name="user/auto-recharge" />
      <Stack.Screen name="user/consumer-profile" />
      <Stack.Screen name="admin/dashboard" />
      <Stack.Screen name="admin/user-detail" />
    </Stack>
  );
}