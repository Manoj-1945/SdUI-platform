import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/utils/api';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';

export default function Calibration() {
  const router = useRouter();
  const [devices, setDevices] = useState<any[]>([]);
  const [powerSpikes, setPowerSpikes] = useState<any[]>([]);
  const [selectedSpike, setSelectedSpike] = useState<any>(null);
  const [applianceName, setApplianceName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calibrating, setCalibrating] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [devicesRes, spikesRes] = await Promise.all([
        api.get('/api/user/devices'),
        api.get('/api/user/power-spikes?uncalibrated_only=true'),
      ]);
      setDevices(devicesRes.data.devices);
      setPowerSpikes(spikesRes.data.spikes);
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCalibrateSpike = (spike: any) => {
    setSelectedSpike(spike);
    setApplianceName('');
    setShowModal(true);
  };

  const handleSaveCalibration = async () => {
    if (!applianceName.trim()) {
      Alert.alert('Error', 'Please enter appliance name');
      return;
    }

    if (!selectedSpike) return;

    setCalibrating(true);
    try {
      const avgPower = selectedSpike.power;
      const minPower = avgPower * 0.9;
      const maxPower = avgPower * 1.1;

      await api.post('/api/user/calibrate-appliance', {
        deviceId: selectedSpike.deviceId,
        applianceName: applianceName.trim(),
        minPower,
        maxPower,
        avgPower,
      });

      Alert.alert(
        'Success',
        `${applianceName} calibrated! You'll get notifications when it turns on.`,
        [
          {
            text: 'View Appliances',
            onPress: () => {
              setShowModal(false);
              router.push('/user/appliances');
            },
          },
          {
            text: 'OK',
            onPress: () => {
              setShowModal(false);
              fetchData();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to calibrate');
    } finally {
      setCalibrating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.current} style={{ marginTop: 100 }} />
      </View>
    );
  }

  if (devices.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.title}>Calibrate Appliances</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="hardware-chip-outline" size={64} color={colors.mist} />
          <Text style={styles.emptyText}>No Device Registered</Text>
          <Text style={styles.emptySubtext}>Register an ESP32 device first</Text>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push('/user/device-setup')}
          >
            <Text style={styles.registerButtonText}>Register Device</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Calibrate Appliances</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={22} color={colors.current} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.current} />
        }
      >
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={22} color={colors.copper} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoText}>
              Turn ON an appliance, a power spike gets detected, name it, then get alerts when it turns on.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Detected Power Spikes ({powerSpikes.length})
          </Text>
          {powerSpikes.length === 0 ? (
            <View style={styles.waitingCard}>
              <Ionicons name="time" size={44} color={colors.current} />
              <Text style={styles.waitingText}>Waiting for power spikes...</Text>
              <Text style={styles.waitingSubtext}>
                Turn ON an appliance to detect it
              </Text>
              <View style={styles.loadingDots}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
            </View>
          ) : (
            powerSpikes.map((spike, index) => (
              <TouchableOpacity
                key={index}
                style={styles.spikeCard}
                onPress={() => handleCalibrateSpike(spike)}
              >
                <View style={styles.spikeIcon}>
                  <Ionicons name="flash" size={28} color={colors.copper} />
                </View>
                <View style={styles.spikeInfo}>
                  <Text style={styles.spikePower}>{spike.power.toFixed(0)}W</Text>
                  <Text style={styles.spikeIncrease}>+{spike.powerIncrease?.toFixed(0)}W spike</Text>
                  <Text style={styles.spikeTime}>
                    {new Date(spike.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                <View style={styles.calibrateButton}>
                  <Ionicons name="create" size={18} color={colors.current} />
                  <Text style={styles.calibrateButtonText}>Name</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Registered Devices</Text>
          {devices.map((device, index) => (
            <View key={index} style={styles.deviceCard}>
              <Ionicons name="hardware-chip" size={28} color={colors.current} />
              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{device.deviceName}</Text>
                <Text style={styles.deviceId}>{device.deviceId}</Text>
              </View>
              <View style={styles.deviceStatus}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Name this Appliance</Text>
            <Text style={styles.modalSubtitle}>
              Power: {selectedSpike?.power.toFixed(0)}W
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Fridge, AC, TV"
              placeholderTextColor={colors.mistDim}
              value={applianceName}
              onChangeText={setApplianceName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, calibrating && styles.disabledButton]}
                onPress={handleSaveCalibration}
                disabled={calibrating}
              >
                <Text style={styles.modalSaveText}>
                  {calibrating ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: colors.copper + '18',
    borderRadius: radii.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm + 4,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontFamily: fonts.display,
    fontSize: 14,
    color: colors.copper,
    marginBottom: 4,
  },
  infoText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.copper,
    lineHeight: 18,
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
  waitingCard: {
    backgroundColor: colors.circuit,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  waitingText: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.white,
    marginTop: spacing.md,
  },
  waitingSubtext: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mist,
    marginTop: spacing.xs,
  },
  loadingDots: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.current,
  },
  spikeCard: {
    flexDirection: 'row',
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    alignItems: 'center',
  },
  spikeIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.full,
    backgroundColor: colors.copper + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 4,
  },
  spikeInfo: {
    flex: 1,
  },
  spikePower: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.white,
  },
  spikeIncrease: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.copper,
    marginTop: 2,
  },
  spikeTime: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.mist,
    marginTop: 4,
  },
  calibrateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.current + '22',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    gap: 4,
  },
  calibrateButtonText: {
    fontFamily: fonts.display,
    color: colors.current,
    fontSize: 13,
  },
  deviceCard: {
    flexDirection: 'row',
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
    marginLeft: spacing.sm + 4,
  },
  deviceName: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.white,
  },
  deviceId: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.mist,
    marginTop: 4,
  },
  deviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  statusText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.success,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
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
    marginTop: spacing.sm,
  },
  registerButton: {
    backgroundColor: colors.current,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: radii.sm,
    marginTop: spacing.lg,
  },
  registerButtonText: {
    fontFamily: fonts.display,
    color: colors.void,
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 14, 20, 0.85)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.circuit,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.white,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: fonts.mono,
    fontSize: 14,
    color: colors.current,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  modalInput: {
    backgroundColor: colors.void,
    borderRadius: radii.sm,
    padding: spacing.md,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.white,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.circuitLight,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: colors.circuitLight,
    padding: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  modalCancelText: {
    fontFamily: fonts.display,
    color: colors.mist,
    fontSize: 15,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: colors.current,
    padding: spacing.md,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  modalSaveText: {
    fontFamily: fonts.display,
    color: colors.void,
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.6,
  },
});