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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/utils/api';

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
    // Refresh every 5 seconds to catch new spikes
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
      // Calculate power range (±10% tolerance)
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
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (devices.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Calibrate Appliances</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="hardware-chip-outline" size={64} color="#8B9DC3" />
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
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Calibrate Appliances</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#4A90E2" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A90E2" />
        }
      >
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#FFD700" />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoText}>
              Turn ON an appliance → Power spike detected → Name it → Get alerts when it turns on!
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            ⚡ Detected Power Spikes ({powerSpikes.length})
          </Text>
          {powerSpikes.length === 0 ? (
            <View style={styles.waitingCard}>
              <Ionicons name="time" size={48} color="#4A90E2" />
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
                  <Ionicons name="flash" size={32} color="#FFD700" />
                </View>
                <View style={styles.spikeInfo}>
                  <Text style={styles.spikePower}>{spike.power.toFixed(0)}W</Text>
                  <Text style={styles.spikeIncrease}>+{spike.powerIncrease?.toFixed(0)}W spike</Text>
                  <Text style={styles.spikeTime}>
                    {new Date(spike.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                <View style={styles.calibrateButton}>
                  <Ionicons name="create" size={20} color="#4A90E2" />
                  <Text style={styles.calibrateButtonText}>Name</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📱 Registered Devices</Text>
          {devices.map((device, index) => (
            <View key={index} style={styles.deviceCard}>
              <Ionicons name="hardware-chip" size={32} color="#4A90E2" />
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

      {/* Calibration Modal */}
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
              placeholderTextColor="#8B9DC3"
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
    backgroundColor: '#FFD70020',
    borderRadius: 12,
    padding: 16,
    margin: 24,
    marginTop: 0,
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#FFD700',
    lineHeight: 20,
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
  waitingCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  waitingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  waitingSubtext: {
    fontSize: 14,
    color: '#8B9DC3',
    marginTop: 8,
  },
  loadingDots: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4A90E2',
  },
  spikeCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  spikeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFD70020',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  spikeInfo: {
    flex: 1,
  },
  spikePower: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  spikeIncrease: {
    fontSize: 14,
    color: '#FFD700',
    marginTop: 2,
  },
  spikeTime: {
    fontSize: 12,
    color: '#8B9DC3',
    marginTop: 4,
  },
  calibrateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E220',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  calibrateButtonText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
  },
  deviceCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deviceId: {
    fontSize: 12,
    color: '#8B9DC3',
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
    backgroundColor: '#27AE60',
  },
  statusText: {
    fontSize: 12,
    color: '#27AE60',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
    marginTop: 8,
  },
  registerButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  registerButtonText: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#4A90E2',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  modalInput: {
    backgroundColor: '#0A0E27',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#8B9DC320',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#8B9DC3',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});