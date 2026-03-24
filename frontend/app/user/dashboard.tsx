import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import api from '@/src/utils/api';

interface DashboardData {
  user: any;
  currentReading: {
    voltage: number;
    current: number;
    power: number;
    energy: number;
  };
  currentBill: {
    amount: number;
    status: string;
    dueDate: string | null;
  };
  powerStatus: string;
  balance: number;
}

export default function UserDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/api/user/dashboard');
      setDashboardData(response.data);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Refresh every 10 seconds for real-time updates
    const interval = setInterval(fetchDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const powerOn = dashboardData?.powerStatus === 'ON';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A90E2" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out" size={28} color="#E74C3C" />
        </TouchableOpacity>
      </View>

      {/* Power Status Card */}
      <View style={[styles.powerCard, powerOn ? styles.powerOn : styles.powerOff]}>
        <View style={styles.powerIconContainer}>
          <Ionicons name="flash" size={40} color="#FFF" />
        </View>
        <View style={styles.powerInfo}>
          <Text style={styles.powerLabel}>Power Status</Text>
          <Text style={styles.powerStatus}>{powerOn ? 'CONNECTED' : 'DISCONNECTED'}</Text>
          {!powerOn && (
            <Text style={styles.powerWarning}>Bill payment required</Text>
          )}
        </View>
      </View>

      {/* Live Readings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Live Readings</Text>
        <View style={styles.readingsGrid}>
          <View style={styles.readingCard}>
            <Ionicons name="flash" size={32} color="#FFD700" />
            <Text style={styles.readingValue}>{dashboardData?.currentReading.voltage.toFixed(1)}V</Text>
            <Text style={styles.readingLabel}>Voltage</Text>
          </View>
          <View style={styles.readingCard}>
            <Ionicons name="trending-up" size={32} color="#4A90E2" />
            <Text style={styles.readingValue}>{dashboardData?.currentReading.current.toFixed(2)}A</Text>
            <Text style={styles.readingLabel}>Current</Text>
          </View>
          <View style={styles.readingCard}>
            <Ionicons name="speedometer" size={32} color="#E74C3C" />
            <Text style={styles.readingValue}>{dashboardData?.currentReading.power.toFixed(0)}W</Text>
            <Text style={styles.readingLabel}>Power</Text>
          </View>
          <View style={styles.readingCard}>
            <Ionicons name="battery-charging" size={32} color="#27AE60" />
            <Text style={styles.readingValue}>{dashboardData?.currentReading.energy.toFixed(2)}</Text>
            <Text style={styles.readingLabel}>Energy (kWh)</Text>
          </View>
        </View>
      </View>

      {/* Billing Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Billing</Text>
        <View style={styles.billingCard}>
          <View style={styles.billingRow}>
            <Text style={styles.billingLabel}>Current Bill</Text>
            <Text style={styles.billingAmount}>₹{dashboardData?.currentBill.amount.toFixed(2)}</Text>
          </View>
          <View style={styles.billingRow}>
            <Text style={styles.billingLabel}>Balance</Text>
            <Text style={styles.balanceAmount}>₹{dashboardData?.balance.toFixed(2)}</Text>
          </View>
          <View style={styles.billingRow}>
            <Text style={styles.billingLabel}>Status</Text>
            <View style={[
              styles.statusBadge,
              dashboardData?.currentBill.status === 'paid'
                ? styles.statusPaid
                : styles.statusUnpaid,
            ]}>
              <Text style={styles.statusText}>
                {dashboardData?.currentBill.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/user/energy-history')}
          >
            <Ionicons name="bar-chart" size={32} color="#4A90E2" />
            <Text style={styles.actionText}>Energy History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/user/billing')}
          >
            <Ionicons name="receipt" size={32} color="#27AE60" />
            <Text style={styles.actionText}>Bills</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/user/notifications')}
          >
            <Ionicons name="notifications" size={32} color="#F39C12" />
            <Text style={styles.actionText}>Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/user/predicted-bill')}
          >
            <Ionicons name="bulb" size={32} color="#9B59B6" />
            <Text style={styles.actionText}>AI Prediction</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
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
  greeting: {
    fontSize: 16,
    color: '#8B9DC3',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  powerCard: {
    flexDirection: 'row',
    margin: 24,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  powerOn: {
    backgroundColor: '#27AE60',
  },
  powerOff: {
    backgroundColor: '#E74C3C',
  },
  powerIconContainer: {
    marginRight: 16,
  },
  powerInfo: {
    flex: 1,
  },
  powerLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  powerStatus: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  powerWarning: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 4,
    opacity: 0.9,
  },
  section: {
    padding: 24,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  readingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  readingCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
  },
  readingValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  readingLabel: {
    fontSize: 12,
    color: '#8B9DC3',
    marginTop: 4,
  },
  billingCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 20,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  billingLabel: {
    fontSize: 16,
    color: '#8B9DC3',
  },
  billingAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27AE60',
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
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 20,
    width: '48%',
    alignItems: 'center',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
});