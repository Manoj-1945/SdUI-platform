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
import { useAuthStore } from '../../src/store/authStore';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/utils/api';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/users'),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
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

  const handleUserPress = (userId: string) => {
    router.push(`/admin/user-detail?userId=${userId}`);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.signal} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Admin Panel</Text>
          <Text style={styles.userName}>{user?.name}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push('/admin/settings')}
            style={styles.settingsButton}
          >
            <Ionicons name="settings" size={24} color={colors.current} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out" size={28} color={colors.signal} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="people" size={32} color={colors.current} />
          </View>
          <Text style={styles.statValue}>{stats?.totalUsers || 0}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="receipt" size={32} color={colors.signal} />
          </View>
          <Text style={styles.statValue}>{stats?.unpaidBills || 0}</Text>
          <Text style={styles.statLabel}>Unpaid Bills</Text>
        </View>
      </View>

      <View style={styles.revenueCard}>
        <View style={styles.revenueIconContainer}>
          <Ionicons name="cash" size={40} color={colors.success} />
        </View>
        <View>
          <Text style={styles.revenueLabel}>Total Revenue</Text>
          <Text style={styles.revenueValue}>₹{stats?.totalRevenue?.toFixed(2) || '0.00'}</Text>
        </View>
      </View>

      {/* Users List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Users ({users.length})</Text>
        {users.map((user, index) => (
          <TouchableOpacity
            key={index}
            style={styles.userCard}
            onPress={() => handleUserPress(user.user_id)}
          >
            <View style={styles.userIcon}>
              <Ionicons name="person" size={24} color={colors.current} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
            <View style={styles.userStats}>
              <Text style={styles.userBalance}>₹{user.balance?.toFixed(2)}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.mist} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
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
    padding: spacing.lg,
    paddingTop: 60,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingsButton: {
    padding: 4,
  },
  greeting: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.mist,
  },
  userName: {
    fontFamily: fonts.display,
    fontSize: 19,
    color: colors.white,
    marginTop: 4,
  },
  statsSection: {
    flexDirection: 'row',
    padding: spacing.lg,
    paddingTop: 0,
    gap: spacing.sm + 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.circuit,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statIconContainer: {
    marginBottom: spacing.sm + 4,
  },
  statValue: {
    fontFamily: fonts.displayBold,
    fontSize: 30,
    color: colors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.5,
    color: colors.mist,
    textAlign: 'center',
  },
  revenueCard: {
    flexDirection: 'row',
    backgroundColor: colors.circuit,
    borderRadius: radii.lg,
    padding: spacing.lg,
    margin: spacing.lg,
    marginTop: 0,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.success + '33',
  },
  revenueIconContainer: {
    marginRight: spacing.md,
  },
  revenueLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.mist,
    marginBottom: 4,
  },
  revenueValue: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: colors.success,
  },
  section: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.white,
    marginBottom: spacing.md,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    alignItems: 'center',
  },
  userIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    backgroundColor: colors.current + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 4,
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mist,
    marginTop: 4,
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userBalance: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.success,
  },
  loadingText: {
    fontFamily: fonts.body,
    color: colors.white,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
});