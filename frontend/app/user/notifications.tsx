import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/utils/api';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';

// Matches the actual notification "type" values the backend creates.
const ICON_MAP: Record<string, { icon: string; color: string }> = {
  payment: { icon: 'card', color: colors.success },
  high_usage: { icon: 'warning', color: colors.signal },
  power_control: { icon: 'flash', color: colors.signal },
  power_spike: { icon: 'trending-up', color: colors.signal },
  bill_due_reminder: { icon: 'time', color: colors.copper },
  bill_generated: { icon: 'receipt', color: colors.copper },
  low_balance: { icon: 'wallet', color: colors.copper },
  auto_recharge: { icon: 'shield-checkmark', color: colors.success },
  appliance_detected: { icon: 'flash-outline', color: colors.current },
  appliance_calibrated: { icon: 'checkmark-circle', color: colors.success },
  device_registered: { icon: 'hardware-chip', color: colors.current },
  tariff_update: { icon: 'pricetag', color: colors.mist },
};
const DEFAULT_ICON = { icon: 'notifications', color: colors.mist };

export default function Notifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/api/user/notifications');
      setNotifications(response.data.notifications);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const getIconInfo = (type: string) => ICON_MAP[type] || DEFAULT_ICON;

  const markAllAsRead = async () => {
    try {
      await api.post('/api/user/notifications/mark-all-as-read');
      fetchNotifications();
    } catch (error) {
      Alert.alert('Error', 'Could not mark notifications as read.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Ionicons name="checkmark-done" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.current} style={{ marginTop: 40 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color={colors.mist} />
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptySubtext}>You're all caught up!</Text>
          </View>
        ) : (
          notifications.map((notif, index) => {
            const { icon, color } = getIconInfo(notif.type);
            return (
              <View key={index} style={styles.notifCard}>
                <View style={[styles.iconContainer, { backgroundColor: color + '22' }]}>
                  <Ionicons name={icon as any} size={22} color={color} />
                </View>
                <View style={styles.notifContent}>
                  <Text style={styles.notifMessage}>{notif.message}</Text>
                  <Text style={styles.notifTime}>
                    {new Date(notif.createdAt).toLocaleString()}
                  </Text>
                </View>
                {!notif.isRead && <View style={styles.unreadDot} />}
              </View>
            );
          })
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
  notifCard: {
    flexDirection: 'row',
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 4,
  },
  notifContent: {
    flex: 1,
  },
  notifMessage: {
    fontFamily: fonts.body,
    color: colors.white,
    fontSize: 13,
    marginBottom: 4,
  },
  notifTime: {
    fontFamily: fonts.mono,
    color: colors.mist,
    fontSize: 11,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.current,
  },
});