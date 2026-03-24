import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/src/utils/api';

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

  const handlePayBill = async (bill: any) => {
    Alert.alert(
      'Pay Bill',
      `Pay ₹${bill.amount.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay Now',
          onPress: async () => {
            try {
              const response = await api.post('/api/user/pay-bill', {
                billId: bill.billId,
                amount: bill.amount,
              });
              Alert.alert('Success', 'Payment successful!', [
                {
                  text: 'OK',
                  onPress: () => fetchBills(),
                },
              ]);
            } catch (error: any) {
              Alert.alert('Payment Failed', error.response?.data?.detail || 'Failed to process payment');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Bills & Payments</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : bills.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#8B9DC3" />
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
                  <Text style={styles.detailLabel}>Units Consumed:</Text>
                  <Text style={styles.detailValue}>{bill.unitsConsumed?.toFixed(2) || '0.00'} kWh</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Amount:</Text>
                  <Text style={styles.amountValue}>₹{bill.amount.toFixed(2)}</Text>
                </View>
                {bill.dueDate && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Due Date:</Text>
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
                  <Ionicons name="card" size={20} color="#FFF" />
                  <Text style={styles.payButtonText}>Pay Now</Text>
                </TouchableOpacity>
              )}

              {bill.status === 'paid' && (
                <View style={styles.paidInfo}>
                  <Ionicons name="checkmark-circle" size={20} color="#27AE60" />
                  <Text style={styles.paidText}>
                    Paid on {new Date(bill.paidAt).toLocaleDateString()}
                  </Text>
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
    backgroundColor: '#0A0E27',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 0,
  },
  loadingText: {
    color: '#8B9DC3',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#8B9DC3',
    fontSize: 14,
    marginTop: 8,
  },
  billCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  billMonth: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  billDate: {
    color: '#8B9DC3',
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusPaid: {
    backgroundColor: '#27AE60',
  },
  statusUnpaid: {
    backgroundColor: '#E74C3C',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  billDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    color: '#8B9DC3',
    fontSize: 14,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  amountValue: {
    color: '#4A90E2',
    fontSize: 18,
    fontWeight: 'bold',
  },
  payButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  paidInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  paidText: {
    color: '#27AE60',
    fontSize: 14,
    fontWeight: '600',
  },
});