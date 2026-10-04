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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/utils/api';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const requestReset = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Enter the email address associated with your account.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await api.post('/api/auth/forgot-password', { email: trimmedEmail });
      setMessage(response.data.message);
    } catch (requestError: any) {
      setError(requestError.response?.data?.detail || 'Could not request a password reset. Try again.');
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Ionicons name="key" size={48} color={colors.copper} />
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>We’ll email a link if an account matches.</Text>
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="mail" size={20} color={colors.mist} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={colors.mistDim}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        {!!message && <Text accessibilityRole="text" style={styles.successMessage}>{message}</Text>}
        {!!error && <Text accessibilityRole="alert" style={styles.errorMessage}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          onPress={requestReset}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Sending…' : 'Send reset link'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.replace('/auth/login')}>
          <Text style={styles.secondaryText}>Back to login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.void },
  content: { flexGrow: 1, padding: spacing.lg, paddingTop: 60 },
  backButton: { marginBottom: spacing.lg, alignSelf: 'flex-start' },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  title: { fontFamily: fonts.displayBold, fontSize: 26, color: colors.white, marginTop: spacing.md },
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
  secondaryButton: { padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  secondaryText: { fontFamily: fonts.display, color: colors.mist, fontSize: 14 },
});