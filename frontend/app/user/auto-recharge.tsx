import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/utils/api';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';

export default function AutoRechargeScreen() {
  const router = useRouter();

  // Wallet auto top-up (existing feature - internal balance only)
  const [isEnabled, setIsEnabled] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('500');
  const [threshold, setThreshold] = useState('100');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Real recurring payment / UPI Autopay (new feature - actual money)
  const [mandateStatus, setMandateStatus] = useState<'none' | 'pending' | 'active' | 'cancelled' | 'failed'>('none');
  const [mandateMaxAmount, setMandateMaxAmount] = useState<number | null>(null);
  const [contactPhone, setContactPhone] = useState('');
  const [maxAmount, setMaxAmount] = useState('5000');
  const [mandateLoading, setMandateLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchMandateStatus();
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

  const fetchMandateStatus = async () => {
    try {
      const response = await api.get('/api/user/recurring-payment/status');
      setMandateStatus(response.data.status);
      setMandateMaxAmount(response.data.maxAmount);
    } catch (error) {
      // Non-critical - leave defaults
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
      Alert.alert('Success', 'Wallet auto-top-up settings saved.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSetupAutoPay = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Not supported yet', 'Auto-pay setup is currently only available on the web app.');
      return;
    }
    if (!contactPhone.trim() || contactPhone.trim().length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number.');
      return;
    }
    const maxAmountNum = parseFloat(maxAmount);
    if (isNaN(maxAmountNum) || maxAmountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid maximum amount.');
      return;
    }

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      Alert.alert('Error', 'Could not load the payment gateway. Check your connection and try again.');
      return;
    }

    setMandateLoading(true);
    try {
      const setupRes = await api.post('/api/user/recurring-payment/setup', {
        contactPhone: contactPhone.trim(),
        maxAmount: maxAmountNum,
      });
      const { orderId, amount, currency, keyId } = setupRes.data;

      const options = {
        key: keyId,
        amount,
        currency,
        name: 'Smart Energy Monitor',
        description: 'Auto-pay authorization (small one-time charge to enable it)',
        order_id: orderId,
        recurring: '1',
        handler: async (response: any) => {
          try {
            await api.post('/api/user/recurring-payment/confirm', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            Alert.alert('Success', 'Auto-pay is now active. Future bills will be charged automatically.');
            fetchMandateStatus();
          } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Could not activate auto-pay.');
          }
        },
        theme: { color: colors.current },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', () => {
        Alert.alert('Setup Failed', 'Auto-pay authorization could not be completed.');
      });
      rzp.open();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Could not start auto-pay setup');
    } finally {
      setMandateLoading(false);
    }
  };

  const handleCancelAutoPay = async () => {
    Alert.alert('Cancel Auto-Pay', 'Are you sure? Future bills will need to be paid manually.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel Auto-Pay',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post('/api/user/recurring-payment/cancel');
            Alert.alert('Cancelled', 'Auto-pay has been cancelled.');
            fetchMandateStatus();
          } catch (error: any) {
            Alert.alert('Error', 'Could not cancel auto-pay.');
          }
        },
      },
    ]);
  };

  if (initialLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.current} style={{ marginTop: 100 }} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Recharge & Auto-Pay</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Real recurring payment - actual money via UPI Autopay/card */}
      <Text style={styles.sectionLabel}>REAL AUTO-PAY (UPI Autopay / Card)</Text>
      <View style={[styles.card, mandateStatus === 'active' && styles.cardActive]}>
        <View style={styles.mandateHeader}>
          <Ionicons
            name={mandateStatus === 'active' ? 'shield-checkmark' : 'shield-outline'}
            size={28}
            color={mandateStatus === 'active' ? colors.success : colors.mist}
          />
          <View style={{ flex: 1, marginLeft: spacing.sm + 4 }}>
            <Text style={styles.label}>
              {mandateStatus === 'active' ? 'Auto-Pay is Active' : 'Auto-Pay is not set up'}
            </Text>
            {mandateStatus === 'active' && mandateMaxAmount && (
              <Text style={styles.description}>
                Bills up to ₹{mandateMaxAmount.toFixed(0)} are charged automatically when generated.
              </Text>
            )}
          </View>
        </View>

        <Text style={styles.description}>
          Unlike wallet top-up below, this charges your real UPI/card automatically when a new
          bill is generated - no manual payment needed, up to the limit you set.
        </Text>

        {mandateStatus === 'active' ? (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelAutoPay}>
            <Text style={styles.cancelButtonText}>Cancel Auto-Pay</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
                placeholder="9999999999"
                placeholderTextColor={colors.mistDim}
              />
            </View>
            <View style={[styles.row, { marginBottom: 0 }]}>
              <Text style={styles.label}>Max Amount Per Bill (₹)</Text>
              <TextInput
                style={styles.input}
                value={maxAmount}
                onChangeText={setMaxAmount}
                keyboardType="numeric"
                placeholderTextColor={colors.mistDim}
              />
            </View>
            <TouchableOpacity
              style={[styles.setupButton, mandateLoading && styles.saveButtonDisabled]}
              onPress={handleSetupAutoPay}
              disabled={mandateLoading}
            >
              <Text style={styles.setupButtonText}>
                {mandateLoading ? 'Setting up...' : 'Set Up Auto-Pay'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Wallet auto top-up - existing internal balance feature */}
      <Text style={styles.sectionLabel}>WALLET AUTO TOP-UP</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Enable Wallet Top-Up</Text>
          <Switch
            value={isEnabled}
            onValueChange={setIsEnabled}
            trackColor={{ false: colors.mistDim, true: colors.current }}
            thumbColor={colors.white}
          />
        </View>
        <Text style={styles.description}>
          When your wallet balance falls below the threshold, it automatically tops up by the
          specified amount. This adjusts your internal wallet number, not real money.
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
        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Wallet Settings'}</Text>
      </TouchableOpacity>
    </ScrollView>
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
  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.mist,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardActive: {
    borderWidth: 1,
    borderColor: colors.success + '55',
  },
  mandateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
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
    lineHeight: 17,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.void,
    color: colors.white,
    fontFamily: fonts.mono,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    width: 130,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: colors.circuitLight,
  },
  setupButton: {
    backgroundColor: colors.current,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  setupButtonText: {
    fontFamily: fonts.display,
    color: colors.void,
    fontSize: 15,
  },
  cancelButton: {
    backgroundColor: colors.signal,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: fonts.display,
    color: colors.white,
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: colors.current,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
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