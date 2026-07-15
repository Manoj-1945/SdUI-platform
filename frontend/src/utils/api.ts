import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const DEFAULT_BACKEND_URL = process.env.NODE_ENV === 'production' ? '' : 'http://127.0.0.1:8001';

export const getBackendUrl = () => {
  const configuredUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;
  const backendUrl = configuredUrl || DEFAULT_BACKEND_URL;
  if (!backendUrl) {
    console.warn('EXPO_PUBLIC_BACKEND_URL is not defined. Set it in the environment for production builds.');
  }
  return backendUrl.replace(/\/$/, '');
};

const api = axios.create({
  baseURL: getBackendUrl(),
  timeout: 30000,
});

// Add auth token to all requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('session_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;