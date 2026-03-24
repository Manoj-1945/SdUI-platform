import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function Index() {
  const router = useRouter();
  const { user, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      // Redirect based on role
      if (user.role === 'admin') {
        router.replace('/admin/dashboard');
      } else {
        router.replace('/user/dashboard');
      }
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="flash" size={60} color="#FFD700" />
        <Text style={styles.title}>Smart Energy Monitor</Text>
        <Text style={styles.subtitle}>IoT-Based Billing System</Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        <View style={styles.featureItem}>
          <Ionicons name="analytics" size={32} color="#4A90E2" />
          <Text style={styles.featureText}>Real-time Monitoring</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="card" size={32} color="#4A90E2" />
          <Text style={styles.featureText}>Auto Billing</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="notifications" size={32} color="#4A90E2" />
          <Text style={styles.featureText}>Smart Alerts</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.userButton}
          onPress={() => router.push('/auth/login')}
        >
          <Ionicons name="person" size={24} color="#FFF" />
          <Text style={styles.buttonText}>User Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => router.push('/auth/admin-login')}
        >
          <Ionicons name="shield" size={24} color="#FFF" />
          <Text style={styles.buttonText}>Admin Login</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push('/auth/signup')}>
        <Text style={styles.signupText}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8B9DC3',
    marginTop: 8,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 48,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureText: {
    color: '#8B9DC3',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 16,
  },
  userButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  adminButton: {
    backgroundColor: '#E74C3C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  signupText: {
    color: '#4A90E2',
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
  },
});