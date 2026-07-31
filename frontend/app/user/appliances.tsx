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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/utils/api';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';

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
    if (lowerName.includes('fridge')) return colors.current;
    if (lowerName.includes('ac')) return colors.success;
    if (lowerName.includes('tv')) return colors.copper;
    if (lowerName.includes('light')) return colors.copper;
    if (lowerName.includes('fan')) return colors.current;
    if (lowerName.includes('wash')) return colors.current;
    if (lowerName.includes('heater')) return colors.signal;
    return colors.mist;
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
        <Text style={styles.title}>My Appliances</Text>
        <TouchableOpacity onPress={() => router.push('/user/calibration')}>
          <Ionicons name="add-circle" size={28} color={colors.current} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.current} />
        }
      >
        {appliances.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="apps-outline" size={64} color={colors.mist} />
            <Text style={styles.emptyText}>No Appliances Yet</Text>
            <Text style={styles.emptySubtext}>
              Calibrate appliances to get notifications when they turn on
            </Text>
            <TouchableOpacity
              style={styles.calibrateButton}
              onPress={() => router.push('/user/calibration')}
            >
              <Ionicons name="flash" size={20} color={colors.void} />
              <Text style={styles.calibrateButtonText}>Start Calibrating</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.infoCard}>
              <Ionicons name="notifications" size={22} color={colors.current} />
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
                      { backgroundColor: getApplianceColor(appliance.name) + '22' },
                    ]}
                  >
                    <Ionicons
                      name={getApplianceIcon(appliance.name)}
                      size={28}
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
                    <Switch
                      value={appliance.notificationsEnabled}
                      onValueChange={() =>
                        handleToggleNotifications(appliance.applianceId)
                      }
                      trackColor={{ false: colors.mistDim, true: colors.current }}
                      thumbColor={colors.white}
                    />
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() =>
                        handleDeleteAppliance(appliance.applianceId, appliance.name)
                      }
                    >
                      <Ionicons name="trash" size={18} color={colors.signal} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Power Usage</Text>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Total Appliances</Text>
                <Text style={styles.statsValue}>{appliances.length}</Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Average Power</Text>
                <Text style={styles.statsValue}>
                  {(
                    appliances.reduce((sum, a) => sum + a.avgPower, 0) / appliances.length
                  ).toFixed(0)}
                  W
                </Text>
              </View>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Notifications</Text>
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
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.current + '18',
    borderRadius: radii.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm + 4,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontFamily: fonts.body,
    color: colors.current,
    fontSize: 13,
  },
  section: {
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.white,
    marginBottom: spacing.md,
  },
  applianceCard: {
    flexDirection: 'row',
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    alignItems: 'center',
  },
  applianceIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 4,
  },
  applianceInfo: {
    flex: 1,
  },
  applianceName: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.white,
  },
  appliancePower: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.current,
    marginTop: 4,
  },
  applianceDate: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mist,
    marginTop: 2,
  },
  applianceActions: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteButton: {
    padding: 4,
  },
  statsCard: {
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  statsTitle: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.white,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 4,
  },
  statsLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mist,
  },
  statsValue: {
    fontFamily: fonts.display,
    fontSize: 13,
    color: colors.current,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: 60,
  },
  emptyText: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.white,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mist,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 19,
  },
  calibrateButton: {
    flexDirection: 'row',
    backgroundColor: colors.current,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: radii.sm,
    marginTop: spacing.lg,
    gap: spacing.sm,
    alignItems: 'center',
  },
  calibrateButtonText: {
    fontFamily: fonts.display,
    color: colors.void,
    fontSize: 15,
  },
});