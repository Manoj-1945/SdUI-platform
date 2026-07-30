import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/utils/api';
import { registerWebPush, scheduleLowBalanceNotification } from '../../src/utils/pushNotifications';
import { useRealtimeReading } from '../../src/utils/useRealtimeReading';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';
import PowerGauge from '../../src/components/PowerGauge';
import CircuitPattern from '../../src/components/CircuitPattern';

const screenWidth = Dimensions.get('window').width;

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
  usageInsights?: {
    vsLastMonth: number;
    vsRollingAvg: number;
    hottestAppliance: {
        name: string;
        usage: number;
    } | null;
    isAutoRechargeEnabled: boolean;
  }
}

export default function UserDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [lowBalanceNotified, setLowBalanceNotified] = useState(false);

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/api/user/dashboard');
      let insights = null;
      try {
        const insightsRes = await api.get('/api/user/usage-insights');
        insights = insightsRes.data;
      } catch (e) {
        // Non-critical - dashboard still works without the insights card
      }
      setDashboardData({ ...response.data, usageInsights: insights });
      setLoadError(false);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load dashboard');
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    registerWebPush();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!dashboardData) return;

    if (dashboardData.balance < 100 && !lowBalanceNotified) {
      scheduleLowBalanceNotification();
      setLowBalanceNotified(true);
    } else if (dashboardData.balance >= 100 && lowBalanceNotified) {
      setLowBalanceNotified(false);
    }
  }, [dashboardData, lowBalanceNotified]);

  useRealtimeReading(user?.user_id, (reading) => {
    setDashboardData((prev) => (prev ? { ...prev, currentReading: reading } : prev));
  });

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

  if (loadError || !dashboardData) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Couldn't load your dashboard.</Text>
        <TouchableOpacity onPress={fetchDashboard} style={{ marginTop: 16, alignSelf: 'center' }}>
          <Text style={{ color: colors.current, fontSize: 16, fontFamily: fonts.body }}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const powerOn = dashboardData?.powerStatus === 'ON';
  const insights = dashboardData?.usageInsights;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.current} />
      }
    >
      {/* Header with circuit-trace texture */}
      <View style={styles.hero}>
        <CircuitPattern width={screenWidth} height={340} />
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>WELCOME BACK</Text>
            <Text style={styles.userName}>{user?.name}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={22} color={colors.signal} />
          </TouchableOpacity>
        </View>

        {/* Signature element: live animated power gauge */}
        <View style={styles.gaugeWrap}>
          <PowerGauge watts={dashboardData?.currentReading.power ?? 0} />
          <View style={[styles.liveDot, { backgroundColor: powerOn ? colors.current : colors.signal }]} />
          <Text style={styles.liveLabel}>{powerOn ? 'LIVE' : 'DISCONNECTED'}</Text>
        </View>
      </View>

      {/* Low Balance Warning */}
      {dashboardData?.balance < 100 && (
        <TouchableOpacity
          style={styles.lowBalanceCard}
          onPress={() => router.push('/user/billing')}
        >
          <Ionicons name="warning" size={26} color={colors.void} />
          <View style={styles.lowBalanceInfo}>
            <Text style={styles.lowBalanceTitle}>Low balance</Text>
            <Text style={styles.lowBalanceText}>
              Recharge soon to avoid service disruption.
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Power Status Card */}
      <View style={[styles.powerCard, powerOn ? styles.powerOnBorder : styles.powerOffBorder]}>
        <View style={[styles.powerIconContainer, { backgroundColor: powerOn ? colors.current + '22' : colors.signal + '22' }]}>
          <Ionicons name="flash" size={28} color={powerOn ? colors.current : colors.signal} />
        </View>
        <View style={styles.powerInfo}>
          <Text style={styles.powerLabel}>Power status</Text>
          <Text style={[styles.powerStatus, { color: powerOn ? colors.current : colors.signal }]}>
            {powerOn ? 'CONNECTED' : 'DISCONNECTED'}
          </Text>
          {!powerOn && (
            <Text style={styles.powerWarning}>Bill payment required</Text>
          )}
        </View>
      </View>

      {/* Live Readings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Live readings</Text>
        <View style={styles.readingsGrid}>
          <View style={styles.readingCard}>
            <Ionicons name="flash-outline" size={24} color={colors.copper} />
            <Text style={styles.readingValue}>{dashboardData?.currentReading.voltage.toFixed(1)}<Text style={styles.readingUnit}> V</Text></Text>
            <Text style={styles.readingLabel}>Voltage</Text>
          </View>
          <View style={styles.readingCard}>
            <Ionicons name="pulse-outline" size={24} color={colors.current} />
            <Text style={styles.readingValue}>{dashboardData?.currentReading.current.toFixed(2)}<Text style={styles.readingUnit}> A</Text></Text>
            <Text style={styles.readingLabel}>Current</Text>
          </View>
          <View style={styles.readingCard}>
            <Ionicons name="speedometer-outline" size={24} color={colors.signal} />
            <Text style={styles.readingValue}>{dashboardData?.currentReading.power.toFixed(0)}<Text style={styles.readingUnit}> W</Text></Text>
            <Text style={styles.readingLabel}>Power</Text>
          </View>
          <View style={styles.readingCard}>
            <Ionicons name="battery-charging-outline" size={24} color={colors.success} />
            <Text style={styles.readingValue}>{dashboardData?.currentReading.energy.toFixed(2)}<Text style={styles.readingUnit}> kWh</Text></Text>
            <Text style={styles.readingLabel}>Energy</Text>
          </View>
        </View>
      </View>

      {/* Billing Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current billing</Text>
        <View style={styles.billingCard}>
          <View style={styles.billingRow}>
            <Text style={styles.billingLabel}>Current bill</Text>
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

      {/* Smart Insights */}
      {insights && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Smart insights</Text>
          <View style={styles.insightsGrid}>
            <View style={styles.insightCard}>
              <Ionicons name="analytics-outline" size={26} color={colors.current} />
              <Text style={styles.insightValue}>
                {insights.vsLastMonth > 0 ? `+${insights.vsLastMonth}`: insights.vsLastMonth}%
              </Text>
              <Text style={styles.insightLabel}>vs. last month</Text>
            </View>
            {typeof insights.vsRollingAvg === 'number' && (
                <View style={styles.insightCard}>
                    <Ionicons name="podium-outline" size={26} color={colors.copper} />
                    <Text style={styles.insightValue}>
                        {insights.vsRollingAvg > 0 ? `+${insights.vsRollingAvg}` : insights.vsRollingAvg}%
                    </Text>
                    <Text style={styles.insightLabel}>vs. rolling avg</Text>
                </View>
            )}
            {insights.hottestAppliance ? (
              <View style={styles.insightCard}>
                <Ionicons name="flame-outline" size={26} color={colors.signal} />
                <Text style={styles.insightValue}>{insights.hottestAppliance.name}</Text>
                <Text style={styles.insightLabel}>Consumption hotspot</Text>
              </View>
            ) : null}
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/user/device-setup')}
          >
            <Ionicons name="hardware-chip-outline" size={26} color={colors.copper} />
            <Text style={styles.actionText}>Add device</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/user/calibration')}
          >
            <Ionicons name="flash-outline" size={26} color={colors.current} />
            <Text style={styles.actionText}>Calibrate</Text>
          </TouchableOpacity>
          <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/user/auto-recharge')}
            >
              <Ionicons
                name={insights?.isAutoRechargeEnabled ? 'shield-checkmark-outline' : 'shield-outline'}
                size={26}
                color={insights?.isAutoRechargeEnabled ? colors.success : colors.mist}
              />
              <Text style={styles.actionText}>Auto-recharge</Text>
            </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/user/appliances')}
          >
            <Ionicons name="apps-outline" size={26} color={colors.success} />
            <Text style={styles.actionText}>Appliances</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/user/energy-history')}
          >
            <Ionicons name="bar-chart-outline" size={26} color={colors.current} />
            <Text style={styles.actionText}>Energy history</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/user/billing')}
          >
            <Ionicons name="receipt-outline" size={26} color={colors.copper} />
            <Text style={styles.actionText}>Bills</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/user/notifications')}
          >
            <Ionicons name="notifications-outline" size={26} color={colors.signal} />
            <Text style={styles.actionText}>Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/user/predicted-bill')}
          >
            <Ionicons name="bulb-outline" size={26} color={colors.copper} />
            <Text style={styles.actionText}>AI prediction</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.void,
  },
  hero: {
    paddingTop: 60,
    paddingBottom: spacing.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
  },
  greeting: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.mist,
  },
  userName: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: colors.white,
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
    borderRadius: radii.full,
    backgroundColor: colors.circuit,
  },
  gaugeWrap: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: spacing.md,
  },
  liveLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.mist,
    marginTop: 6,
  },
  lowBalanceCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    backgroundColor: colors.copper,
  },
  lowBalanceInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  lowBalanceTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.void,
  },
  lowBalanceText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.void,
    marginTop: 2,
    opacity: 0.85,
  },
  powerCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    backgroundColor: colors.circuit,
    borderWidth: 1,
  },
  powerOnBorder: {
    borderColor: colors.current + '55',
  },
  powerOffBorder: {
    borderColor: colors.signal + '55',
  },
  powerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  powerInfo: {
    flex: 1,
  },
  powerLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.mist,
  },
  powerStatus: {
    fontFamily: fonts.display,
    fontSize: 20,
    marginTop: 2,
  },
  powerWarning: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.signal,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.white,
    marginBottom: spacing.md,
  },
  readingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  readingCard: {
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    padding: spacing.md,
    width: '48%',
    alignItems: 'flex-start',
  },
  readingValue: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.white,
    marginTop: spacing.sm,
  },
  readingUnit: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.mist,
  },
  readingLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.mist,
    marginTop: 4,
  },
  billingCard: {
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  billingLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.mist,
  },
  billingAmount: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.copper,
  },
  balanceAmount: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.current,
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
    fontSize: 11,
    letterSpacing: 0.5,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    padding: spacing.md,
    width: '48%',
    alignItems: 'center',
  },
  actionText: {
    fontFamily: fonts.body,
    color: colors.white,
    fontSize: 13,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  loadingText: {
    fontFamily: fonts.body,
    color: colors.white,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  insightsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  insightCard: {
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    padding: spacing.md,
    flex: 1,
    alignItems: 'center',
  },
  insightValue: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.white,
    marginTop: spacing.sm,
  },
  insightLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.mist,
    marginTop: 4,
    textAlign: 'center',
  },
});