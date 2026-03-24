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

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return 'card';
      case 'high_usage':
        return 'warning';
      case 'power_control':
        return 'flash';
      case 'bill_due':
        return 'time';
      default:
        return 'notifications';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'payment':
        return '#27AE60';
      case 'high_usage':
        return '#F39C12';
      case 'power_control':
        return '#E74C3C';
      case 'bill_due':
        return '#4A90E2';
      default:
        return '#8B9DC3';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color="#8B9DC3" />
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptySubtext}>You're all caught up!</Text>
          </View>
        ) : (
          notifications.map((notif, index) => (
            <View key={index} style={styles.notifCard}>
              <View style={[styles.iconContainer, { backgroundColor: getIconColor(notif.type) + '20' }]}>
                <Ionicons name={getIcon(notif.type)} size={24} color={getIconColor(notif.type)} />
              </View>
              <View style={styles.notifContent}>
                <Text style={styles.notifMessage}>{notif.message}</Text>
                <Text style={styles.notifTime}>
                  {new Date(notif.createdAt).toLocaleString()}
                </Text>
              </View>
              {!notif.isRead && <View style={styles.unreadDot} />}
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
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifContent: {
    flex: 1,
  },
  notifMessage: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 4,
  },
  notifTime: {
    color: '#8B9DC3',
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
  },
});