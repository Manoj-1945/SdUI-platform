import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/utils/api';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';

export default function Billing() {
  const router = useRouter();
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const response = await api.get('/api/user/bills');
      setBills(response.data.bills);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Not supported yet', 'CSV export is currently only available on the web app.');
      return;
    }
    try {
      const response = await api.get('/api/user/bills/export', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'bills.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      Alert.alert('Error', 'Could not export CSV');
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

  const handlePayBill = async (bill: any) => {
    if (Platform.OS !== 'web') {
      Alert.alert('Not supported yet', 'Online payment is currently only available on the web app.');
      return;
    }

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      Alert.alert('Error', 'Could not load the payment gateway. Check your connection and try again.');
      return;
    }

    try {
      const orderRes = await api.post('/api/user/create-payment-order', { billId: bill.billId });
      const { orderId, amount, currency, keyId } = orderRes.data;

      const options = {
        key: keyId,
        amount,
        currency,
        name: 'Smart Energy Monitor',
        description: `Bill payment - ${bill.billId}`,
        order_id: orderId,
        handler: async (response: any) => {
          try {
            await api.post('/api/user/verify-payment', {
              billId: bill.billId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            Alert.alert('Success', 'Payment successful!', [
              { text: 'OK', onPress: () => fetchBills() },
            ]);
          } catch (error: any) {
            Alert.alert(
              'Verification Failed',
              error.response?.data?.detail ||
                'Payment could not be verified. If money was deducted, contact support.'
            );
          }
        },
        theme: { color: colors.copper },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', () => {
        Alert.alert('Payment Failed', 'Your payment could not be completed. Please try again.');
      });
      rzp.open();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Could not start payment');
    }
  };

  // Fixed: previously called a wrong /pdf endpoint and referenced an
  // unimported useAuthStore (would have crashed on tap). Uses the correct
  // /receipt endpoint and the existing `api` instance, which already
  // attaches the auth header automatically via its interceptor.
  const handleDownloadReceipt = async (bill: any) => {
    if (Platform.OS !== 'web') {
      Alert.alert('Not supported yet', 'Receipt download is currently only available on the web app.');
      return;
    }
    try {
      const response = await api.get(`/api/user/bill/${bill.billId}/receipt`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt_${bill.billId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      Alert.alert('Error', 'Could not download receipt');
    }
  };

  if (loading) {
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
        <Text style={styles.title}>Bills & Payments</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleExportCsv}>
            <Ionicons name="download-outline" size={22} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/user/consumer-profile')}>
            <Ionicons name="person-circle-outline" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {bills.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={colors.mist} />
            <Text style={styles.emptyText}>No bills yet</Text>
            <Text style={styles.emptySubtext}>Your bills will appear here</Text>
          </View>
        ) : (
          bills.map((bill, index) => (
            <View key={index} style={styles.billCard}>
              <View style={styles.billHeader}>
                <View>
                  <Text style={styles.billMonth}>{bill.billMonth || 'Current Bill'}</Text>
                  <Text style={styles.billDate}>
                    Generated: {new Date(bill.generatedAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  bill.status === 'paid' ? styles.statusPaid : styles.statusUnpaid,
                ]}>
                  <Text style={styles.statusText}>{bill.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.billDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Units Consumed</Text>
                  <Text style={styles.detailValue}>{bill.unitsConsumed?.toFixed(2) || '0.00'} kWh</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount</Text>
                  <Text style={styles.amountValue}>₹{bill.amount.toFixed(2)}</Text>
                </View>
                {bill.dueDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Due Date</Text>
                    <Text style={styles.detailValue}>
                      {new Date(bill.dueDate).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>

              {bill.status === 'unpaid' && (
                <TouchableOpacity
                  style={styles.payButton}
                  onPress={() => handlePayBill(bill)}
                >
                  <Ionicons name="card" size={20} color={colors.void} />
                  <Text style={styles.payButtonText}>Pay Now</Text>
                </TouchableOpacity>
              )}

              {bill.status === 'paid' && (
                <View style={styles.actionsRow}>
                  <View style={styles.paidInfo}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={styles.paidText}>
                      Paid on {bill.paidAt ? new Date(bill.paidAt).toLocaleDateString() : '-'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => handleDownloadReceipt(bill)}
                  >
                    <Ionicons name="download" size={18} color={colors.void} />
                    <Text style={styles.downloadButtonText}>Receipt</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.void,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.white,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    fontFamily: fonts.display,
    color: colors.white,
    fontSize: 17,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontFamily: fonts.body,
    color: colors.mist,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  billCard: {
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  billMonth: {
    fontFamily: fonts.display,
    color: colors.white,
    fontSize: 16,
  },
  billDate: {
    fontFamily: fonts.mono,
    color: colors.mist,
    fontSize: 11,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  statusPaid: {
    backgroundColor: colors.success,
  },
  statusUnpaid: {
    backgroundColor: colors.signal,
  },
  statusText: {
    fontFamily: fonts.mono,
    color: colors.void,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  billDetails: {
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontFamily: fonts.body,
    color: colors.mist,
    fontSize: 13,
  },
  detailValue: {
    fontFamily: fonts.body,
    color: colors.white,
    fontSize: 13,
  },
  amountValue: {
    fontFamily: fonts.displayBold,
    color: colors.copper,
    fontSize: 16,
  },
  payButton: {
    flexDirection: 'row',
    backgroundColor: colors.current,
    borderRadius: radii.sm,
    padding: spacing.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payButtonText: {
    fontFamily: fonts.display,
    color: colors.void,
    fontSize: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paidInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paidText: {
    fontFamily: fonts.body,
    color: colors.success,
    fontSize: 12,
  },
  downloadButton: {
    flexDirection: 'row',
    backgroundColor: colors.copper,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
    gap: 6,
  },
  downloadButtonText: {
    fontFamily: fonts.display,
    color: colors.void,
    fontSize: 12,
  },
});