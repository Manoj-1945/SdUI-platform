import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/utils/api';

export default function AutoRechargeScreen() {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('500');
  const [threshold, setThreshold] = useState('100');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/user/auto-recharge');
      setIsEnabled(response.data.enabled);
      setRechargeAmount(String(response.data.rechargeAmount));
      setThreshold(String(response.data.threshold));
    } catch (error) {
      // Keep the defaults if this fails - not critical enough to block the screen
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.post('/api/user/auto-recharge', {
        enabled: isEnabled,
        rechargeAmount: parseInt(rechargeAmount, 10),
        threshold: parseInt(threshold, 10),
      });
      Alert.alert('Success', 'Auto-recharge settings saved.');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Auto-Recharge</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Enable Auto-Recharge</Text>
          <Switch
            value={isEnabled}
            onValueChange={setIsEnabled}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={isEnabled ? '#f5dd4b' : '#f4f3f4'}
          />
        </View>
        <Text style={styles.description}>
          When your balance falls below the threshold, we will automatically recharge your account with the specified amount.
        </Text>
      </View>

      {isEnabled && (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Recharge Amount (₹)</Text>
            <TextInput
              style={styles.input}
              value={rechargeAmount}
              onChangeText={setRechargeAmount}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Low Balance Threshold (₹)</Text>
            <TextInput
              style={styles.input}
              value={threshold}
              onChangeText={setThreshold}
              keyboardType="numeric"
            />
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Settings'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  card: {
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: 'white',
  },
  description: {
    fontSize: 12,
    color: '#8B9DC3',
    marginTop: -10,
  },
  input: {
    backgroundColor: '#0A0E27',
    color: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    width: 100,
    textAlign: 'right',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
