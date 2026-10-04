import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/utils/api';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submitReset = async () => {
    if (!token) {
      setError('This reset link is missing its token. Request a new link.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await api.post('/api/auth/reset-password', {
        token,
        newPassword: password,
      });
      setMessage(response.data.message);
    } catch (requestError: any) {
      setError(requestError.response?.data?.detail || 'Could not reset password. Request a new link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/auth/login')}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Ionicons name="lock-closed" size={48} color={colors.copper} />
          <Text style={styles.title}>Choose a new password</Text>
          <Text style={styles.subtitle}>Use at least 6 characters.</Text>
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="key" size={20} color={colors.mist} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor={colors.mistDim}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />
        </View>
        <View style={styles.inputContainer}>
          <Ionicons name="key" size={20} color={colors.mist} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor={colors.mistDim}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="new-password"
          />
        </View>

        {!!message && <Text accessibilityRole="text" style={styles.successMessage}>{message}</Text>}
        {!!error && <Text accessibilityRole="alert" style={styles.errorMessage}>{error}</Text>}

        {message ? (
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/auth/login')}>
            <Text style={styles.buttonText}>Go to login</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, loading && styles.disabledButton]}
            onPress={submitReset}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Updating…' : 'Update password'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.void },
  content: { flexGrow: 1, padding: spacing.lg, paddingTop: 60 },
  backButton: { marginBottom: spacing.lg, alignSelf: 'flex-start' },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  title: { fontFamily: fonts.displayBold, fontSize: 26, color: colors.white, marginTop: spacing.md, textAlign: 'center' },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.mist, marginTop: spacing.sm, textAlign: 'center' },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.circuit,
    borderRadius: radii.md, marginBottom: spacing.md, paddingHorizontal: spacing.md,
    borderWidth: 1, borderColor: colors.circuitLight,
  },
  inputIcon: { marginRight: spacing.sm + 4 },
  input: { flex: 1, color: colors.white, fontFamily: fonts.body, fontSize: 15, paddingVertical: spacing.md },
  button: { backgroundColor: colors.current, padding: spacing.md, borderRadius: radii.md, alignItems: 'center', marginTop: spacing.sm },
  disabledButton: { opacity: 0.6 },
  buttonText: { fontFamily: fonts.display, color: colors.void, fontSize: 16 },
  successMessage: { fontFamily: fonts.body, color: colors.success, marginBottom: spacing.sm, textAlign: 'center' },
  errorMessage: { fontFamily: fonts.body, color: colors.signal, marginBottom: spacing.sm, textAlign: 'center' },
});