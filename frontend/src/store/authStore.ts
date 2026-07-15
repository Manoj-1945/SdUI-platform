import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';

interface User {
  user_id: string;
  email: string;
  name: string;
  role: string;
  picture?: string;
  balance: number;
  tariffRate: number;
}

interface AuthState {
  user: User | null;
  sessionToken: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setSessionToken: (token: string | null) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  googleAuth: (sessionId: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  sessionToken: null,
  isLoading: true,

  setUser: (user) => set({ user }),

  setSessionToken: async (token) => {
    if (token) {
      await AsyncStorage.setItem('session_token', token);
    } else {
      await AsyncStorage.removeItem('session_token');
    }
    set({ sessionToken: token });
  },

  login: async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', {
        email,
        password,
      });

      const { user, session_token } = response.data;
      set({ user });
      await get().setSessionToken(session_token);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  },

  signup: async (email, password, name) => {
    try {
      const response = await api.post('/api/auth/signup', {
        email,
        password,
        name,
      });

      const { user, session_token } = response.data;
      set({ user });
      await get().setSessionToken(session_token);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Signup failed');
    }
  },

  googleAuth: async (idToken: string) => {
    try {
      const response = await api.post('/api/auth/google', {
        idToken: idToken,
      });

      const { user, session_token } = response.data;
      set({ user });
      await get().setSessionToken(session_token);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Google auth failed');
    }
  },

  adminLogin: async (email, password) => {
    try {
      const response = await api.post('/api/admin/login', {
        email,
        password,
      });

      const { user, session_token } = response.data;
      set({ user });
      await get().setSessionToken(session_token);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Admin login failed');
    }
  },

  logout: async () => {
    const token = get().sessionToken;
    if (token) {
      try {
        await api.post(
          '/api/auth/logout',
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    set({ user: null });
    await get().setSessionToken(null);
  },

  checkAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      if (!token) {
        set({ isLoading: false });
        return;
      }

      const response = await api.get('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      set({ user: response.data, sessionToken: token, isLoading: false });
    } catch (error) {
      await get().setSessionToken(null);
      set({ user: null, isLoading: false });
    }
  },
}));