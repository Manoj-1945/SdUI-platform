import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import api from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function scheduleLowBalanceNotification(): Promise<void> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    if (newStatus !== 'granted') {
      console.log('[push] Notification permissions not granted for low balance warning.');
      return;
    }
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Low Balance Warning',
      body: 'Your smart meter balance is critically low. Please recharge soon to avoid disconnection.',
    },
    trigger: null, // immediately
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerWebPush(): Promise<void> {
  if (Platform.OS !== 'web') return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[push] Web push is not supported in this browser');
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[push] Notification permission not granted');
      return;
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      await api.post('/api/user/register-push-token', {
        platform: 'web',
        token: JSON.stringify(existingSubscription),
      });
      return;
    }

    const { data } = await api.get('/api/vapid-public-key');
    if (!data.publicKey) {
      console.log('[push] VAPID public key not configured on the backend yet');
      return;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });

    await api.post('/api/user/register-push-token', {
      platform: 'web',
      token: JSON.stringify(subscription),
    });

    console.log('[push] Web push subscription registered');
  } catch (error) {
    console.log('[push] Failed to register web push:', error);
  }
}