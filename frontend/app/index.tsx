import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radii, spacing } from '../src/theme/tokens';

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
        <Ionicons name="flash" size={60} color={colors.copper} />
        <Text style={styles.title}>Smart Energy Monitor</Text>
        <Text style={styles.subtitle}>IoT-Based Billing System</Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        <View style={styles.featureItem}>
          <Ionicons name="analytics" size={32} color={colors.current} />
          <Text style={styles.featureText}>Real-time Monitoring</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="card" size={32} color={colors.current} />
          <Text style={styles.featureText}>Auto Billing</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="notifications" size={32} color={colors.current} />
          <Text style={styles.featureText}>Smart Alerts</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.userButton}
          onPress={() => router.push('/auth/login')}
        >
          <Ionicons name="person" size={24} color={colors.white} />
          <Text style={styles.userButtonText}>User Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => router.push('/auth/admin-login')}
        >
          <Ionicons name="shield" size={24} color={colors.white} />
          <Text style={styles.adminButtonText}>Admin Login</Text>
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
    backgroundColor: colors.void,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl + spacing.lg,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 30,
    color: colors.white,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.mono,
    fontSize: 13,
    letterSpacing: 1,
    color: colors.mist,
    marginTop: spacing.sm,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xl + spacing.lg,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureText: {
    fontFamily: fonts.body,
    color: colors.mist,
    fontSize: 12,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: spacing.md,
  },
  userButton: {
    backgroundColor: colors.current,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  adminButton: {
    backgroundColor: colors.circuit,
    borderWidth: 1,
    borderColor: colors.signal + '55',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  userButtonText: {
    fontFamily: fonts.display,
    color: colors.void,
    fontSize: 16,
  },
  adminButtonText: {
    fontFamily: fonts.display,
    color: colors.white,
    fontSize: 16,
  },
  signupText: {
    fontFamily: fonts.body,
    color: colors.current,
    textAlign: 'center',
    marginTop: spacing.lg,
    fontSize: 14,
  },
  loadingText: {
    fontFamily: fonts.body,
    color: colors.white,
    fontSize: 16,
    textAlign: 'center',
  },
});