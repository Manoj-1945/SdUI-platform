import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/utils/api';

export default function Appliances() {
  const router = useRouter();
  const [appliances, setAppliances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAppliances();
  }, []);

  const fetchAppliances = async () => {
    try {
      const response = await api.get('/api/user/appliances');
      setAppliances(response.data.appliances);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load appliances');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppliances();
  };

  const handleToggleNotifications = async (applianceId: string) => {
    try {
      await api.put(`/api/user/appliance/${applianceId}/toggle-notifications`);
      fetchAppliances();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to toggle notifications');
    }
  };

  const handleDeleteAppliance = async (applianceId: string, name: string) => {
    Alert.alert(
      'Delete Appliance',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/user/appliance/${applianceId}`);
              Alert.alert('Success', 'Appliance deleted');
              fetchAppliances();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete appliance');
            }
          },
        },
      ]
    );
  };

  const getApplianceIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('fridge') || lowerName.includes('refrigerator')) return 'snow';
    if (lowerName.includes('ac') || lowerName.includes('air')) return 'thermometer';
    if (lowerName.includes('tv') || lowerName.includes('television')) return 'tv';
    if (lowerName.includes('light') || lowerName.includes('bulb')) return 'bulb';
    if (lowerName.includes('fan')) return 'sync';
    if (lowerName.includes('wash')) return 'water';
    if (lowerName.includes('heater') || lowerName.includes('geyser')) return 'flame';
    return 'flash';
  };

  const getApplianceColor = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('fridge')) return '#4A90E2';
    if (lowerName.includes('ac')) return '#27AE60';
    if (lowerName.includes('tv')) return '#9B59B6';
    if (lowerName.includes('light')) return '#FFD700';
    if (lowerName.includes('fan')) return '#4A90E2';
    if (lowerName.includes('wash')) return '#3498DB';
    if (lowerName.includes('heater')) return '#E74C3C';
    return '#8B9DC3';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>My Appliances</Text>
        <TouchableOpacity onPress={() => router.push('/user/calibration')}>
          <Ionicons name="add-circle" size={28} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A90E2" />
        }
      >
        {appliances.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="apps-outline" size={64} color="#8B9DC3" />
            <Text style={styles.emptyText}>No Appliances Yet</Text>
            <Text style={styles.emptySubtext}>
              Calibrate appliances to get notifications when they turn on
            </Text>
            <TouchableOpacity
              style={styles.calibrateButton}
              onPress={() => router.push('/user/calibration')}
            >
              <Ionicons name="flash" size={20} color="#FFF" />
              <Text style={styles.calibrateButtonText}>Start Calibrating</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.infoCard}>
              <Ionicons name="notifications" size={24} color="#4A90E2" />
              <Text style={styles.infoText}>
                Get alerts when your appliances turn on
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Calibrated Appliances ({appliances.length})
              </Text>
              {appliances.map((appliance, index) => (
                <View key={index} style={styles.applianceCard}>
                  <View
                    style={[
                      styles.applianceIcon,
                      { backgroundColor: getApplianceColor(appliance.name) + '20' },
                    ]}
                  >
                    <Ionicons
                      name={getApplianceIcon(appliance.name)}
                      size={32}
                      color={getApplianceColor(appliance.name)}
                    />
                  </View>
                  <View style={styles.applianceInfo}>
                    <Text style={styles.applianceName}>{appliance.name}</Text>
                    <Text style={styles.appliancePower}>
                      {appliance.avgPower.toFixed(0)}W (±10%)
                    </Text>
                    <Text style={styles.applianceDate}>
                      Calibrated {new Date(appliance.calibratedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.applianceActions}>
                    <View style={styles.notificationToggle}>
                      <Switch
                        value={appliance.notificationsEnabled}
                        onValueChange={() =>
                          handleToggleNotifications(appliance.applianceId)
                        }
                        trackColor={{ false: '#8B9DC3', true: '#4A90E2' }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() =>
                        handleDeleteAppliance(appliance.applianceId, appliance.name)
                      }
                    >
                      <Ionicons name="trash" size={20} color="#E74C3C" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Power Usage</Text>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Total Appliances:</Text>
                <Text style={styles.statsValue}>{appliances.length}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Average Power:</Text>
                <Text style={styles.statsValue}>
                  {(
                    appliances.reduce((sum, a) => sum + a.avgPower, 0) / appliances.length
                  ).toFixed(0)}
                  W
                </Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Notifications:</Text>
                <Text style={styles.statsValue}>
                  {appliances.filter((a) => a.notificationsEnabled).length} enabled
                </Text>
              </View>
            </View>
          </>
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
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#4A90E220',
    borderRadius: 12,
    padding: 16,
    margin: 24,
    marginTop: 0,
    gap: 12,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    color: '#4A90E2',
    fontSize: 14,
  },
  section: {
    padding: 24,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  applianceCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  applianceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  applianceInfo: {
    flex: 1,
  },
  applianceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  appliancePower: {
    fontSize: 14,
    color: '#4A90E2',
    marginTop: 4,
  },
  applianceDate: {
    fontSize: 12,
    color: '#8B9DC3',
    marginTop: 4,
  },
  applianceActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationToggle: {
    paddingVertical: 4,
  },
  deleteButton: {
    padding: 8,
  },
  statsCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 20,
    margin: 24,
    marginTop: 0,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statsLabel: {
    fontSize: 14,
    color: '#8B9DC3',
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A90E2',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8B9DC3',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  calibrateButton: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
    alignItems: 'center',
  },
  calibrateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
});