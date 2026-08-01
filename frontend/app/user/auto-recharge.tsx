import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/utils/api';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';

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

  if (initialLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.current} style={{ marginTop: 100 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
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
            trackColor={{ false: colors.mistDim, true: colors.current }}
            thumbColor={colors.white}
          />
        </View>
        <Text style={styles.description}>
          When your balance falls below the threshold, your wallet will automatically top up
          by the specified amount.
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
              placeholderTextColor={colors.mistDim}
            />
          </View>
          <View style={[styles.row, { marginBottom: 0 }]}>
            <Text style={styles.label}>Low Balance Threshold (₹)</Text>
            <TextInput
              style={styles.input}
              value={threshold}
              onChangeText={setThreshold}
              keyboardType="numeric"
              placeholderTextColor={colors.mistDim}
            />
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveButton, loading && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Settings'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.void,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.white,
  },
  card: {
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.white,
  },
  description: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mist,
    marginTop: -6,
    lineHeight: 17,
  },
  input: {
    backgroundColor: colors.void,
    color: colors.white,
    fontFamily: fonts.mono,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    width: 100,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: colors.circuitLight,
  },
  saveButton: {
    backgroundColor: colors.current,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: fonts.display,
    color: colors.void,
    fontSize: 16,
  },
});