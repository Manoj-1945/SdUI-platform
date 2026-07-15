import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Google OAuth configuration
// Use the web client ID for web/browser sign-in and the native client IDs for mobile builds.

const extra = Constants.expoConfig?.extra || {};

export const GOOGLE_WEB_CLIENT_ID =
  extra.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  extra.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  "418020125400-co486plk0k4qsdus35j78d09vbua049q.apps.googleusercontent.com";
export const GOOGLE_ANDROID_CLIENT_ID =
  extra.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
  extra.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
  "";
export const GOOGLE_IOS_CLIENT_ID =
  extra.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "";

// Select the appropriate client for the current platform.
export const GOOGLE_CLIENT_ID =
  Platform.OS === 'android'
    ? GOOGLE_ANDROID_CLIENT_ID || GOOGLE_WEB_CLIENT_ID
    : Platform.OS === 'ios'
      ? GOOGLE_IOS_CLIENT_ID || GOOGLE_WEB_CLIENT_ID
      : GOOGLE_WEB_CLIENT_ID;
