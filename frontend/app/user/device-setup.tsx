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
      const response = await api.post('/api/user/register-device', {
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
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>

        <View style={styles.header}>
          <Ionicons name="hardware-chip" size={64} color="#4A90E2" />
          <Text style={styles.title}>Setup ESP32 Device</Text>
          <Text style={styles.subtitle}>Register your smart energy monitor</Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#4A90E2" />
          <Text style={styles.infoText}>
            Enter the Device ID printed on your ESP32 device.
            Format: ESP32-XXXXXX
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Device ID *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="barcode" size={20} color="#8B9DC3" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="ESP32-ABC123"
              placeholderTextColor="#8B9DC3"
              value={deviceId}
              onChangeText={setDeviceId}
              autoCapitalize="characters"
            />
          </View>

          <Text style={styles.label}>Device Name (Optional)</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="pencil" size={20} color="#8B9DC3" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Living Room Monitor"
              placeholderTextColor="#8B9DC3"
              value={deviceName}
              onChangeText={setDeviceName}
            />
          </View>

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.disabledButton]}
            onPress={handleRegisterDevice}
            disabled={loading}
          >
            <Ionicons name="checkmark-circle" size={24} color="#FFF" />
            <Text style={styles.registerButtonText}>
              {loading ? 'Registering...' : 'Register Device'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>• Device ID is usually printed on the ESP32 board</Text>
          <Text style={styles.helpText}>• Make sure device is powered on and connected to WiFi</Text>
          <Text style={styles.helpText}>• Each device can only be registered once</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#8B9DC3',
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#4A90E220',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: '#4A90E2',
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#8B9DC3',
    marginBottom: 8,
    marginTop: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 16,
  },
  registerButton: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  helpCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 20,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#8B9DC3',
    marginBottom: 8,
    lineHeight: 20,
  },
});