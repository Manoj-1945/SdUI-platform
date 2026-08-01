import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/utils/api';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';

export default function DeviceSetup() {
  const router = useRouter();
  const [deviceId, setDeviceId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegisterDevice = async () => {
    if (!deviceId.trim()) {
      Alert.alert('Error', 'Please enter Device ID');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/user/register-device', {
        deviceId: deviceId.trim(),
        deviceName: deviceName.trim() || deviceId.trim(),
      });

      Alert.alert(
        'Success',
        'Device registered successfully! You can now calibrate appliances.',
        [
          {
            text: 'Calibrate Now',
            onPress: () => router.push('/user/calibration'),
          },
          {
            text: 'Later',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to register device');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Ionicons name="hardware-chip" size={64} color={colors.current} />
          <Text style={styles.title}>Setup ESP32 Device</Text>
          <Text style={styles.subtitle}>Register your smart energy monitor</Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={colors.current} />
          <Text style={styles.infoText}>
            Enter the same Device ID you set in your ESP32's firmware. This links the
            physical device to your account.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Device ID *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="barcode" size={20} color={colors.mist} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="kitchen_meter"
              placeholderTextColor={colors.mistDim}
              value={deviceId}
              onChangeText={setDeviceId}
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.label}>Device Name (Optional)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="pencil" size={20} color={colors.mist} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Living Room Monitor"
              placeholderTextColor={colors.mistDim}
              value={deviceName}
              onChangeText={setDeviceName}
            />
          </View>

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.disabledButton]}
            onPress={handleRegisterDevice}
            disabled={loading}
          >
            <Ionicons name="checkmark-circle" size={24} color={colors.void} />
            <Text style={styles.registerButtonText}>
              {loading ? 'Registering...' : 'Register Device'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>• This ID must exactly match DEVICE_ID in your firmware</Text>
          <Text style={styles.helpText}>• Make sure the device is powered on and connected to WiFi</Text>
          <Text style={styles.helpText}>• Readings are rejected until the device is registered here</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.void,
  },
  content: {
    padding: spacing.lg,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: colors.white,
    marginTop: spacing.md,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mist,
    marginTop: spacing.sm,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.current + '18',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm + 4,
  },
  infoText: {
    flex: 1,
    fontFamily: fonts.body,
    color: colors.current,
    fontSize: 13,
    lineHeight: 19,
  },
  form: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.mist,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.circuitLight,
  },
  inputIcon: {
    marginRight: spacing.sm + 4,
  },
  input: {
    flex: 1,
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: 15,
    paddingVertical: spacing.md,
  },
  registerButton: {
    flexDirection: 'row',
    backgroundColor: colors.current,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  disabledButton: {
    opacity: 0.6,
  },
  registerButtonText: {
    fontFamily: fonts.display,
    color: colors.void,
    fontSize: 16,
  },
  helpCard: {
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    padding: spacing.lg,
  },
  helpTitle: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.white,
    marginBottom: spacing.sm + 4,
  },
  helpText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mist,
    marginBottom: spacing.sm,
    lineHeight: 19,
  },
});