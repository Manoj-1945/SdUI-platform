import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import api from '@/src/utils/api';

const screenWidth = Dimensions.get('window').width;

export default function UserDetail() {
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const [user, setUser] = useState<any>(null);
  const [readings, setReadings] = useState<any[]>([]);
  const [powerOn, setPowerOn] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const [usersRes, consumptionRes] = await Promise.all([
        api.get('/api/admin/users'),
        api.get(`/api/admin/user/${userId}/consumption`),
      ]);
      const foundUser = usersRes.data.users.find((u: any) => u.user_id === userId);
      setUser(foundUser);
      setReadings(consumptionRes.data.readings);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handlePowerControl = async (status: boolean) => {
    try {
      await api.put(`/api/admin/user/${userId}/power-control`, {
        userId,
        status: status ? 'ON' : 'OFF',
      });
      setPowerOn(status);
      Alert.alert('Success', `Power turned ${status ? 'ON' : 'OFF'}`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to control power');
      setPowerOn(!status);
    }
  };

  const getChartData = () => {
    if (readings.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{ data: [0] }],
      };
    }

    const labels = readings.slice(-10).map((r, i) => `${i + 1}`);
    const data = readings.slice(-10).map((r) => r.energy || 0);

    return {
      labels,
      datasets: [{ data, color: () => '#4A90E2' }],
    };
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>User Details</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* User Info Card */}
      <View style={styles.userCard}>
        <View style={styles.userHeader}>
          <View style={styles.userIcon}>
            <Ionicons name="person" size={40} color="#4A90E2" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        </View>
        <View style={styles.userStats}>
          <View style={styles.userStat}>
            <Text style={styles.userStatLabel}>Balance</Text>
            <Text style={styles.userStatValue}>₹{user.balance?.toFixed(2)}</Text>
          </View>
          <View style={styles.userStat}>
            <Text style={styles.userStatLabel}>Tariff Rate</Text>
            <Text style={styles.userStatValue}>₹{user.tariffRate}/kWh</Text>
          </View>
        </View>
      </View>

      {/* Power Control */}
      <View style={styles.controlCard}>
        <View style={styles.controlHeader}>
          <View>
            <Text style={styles.controlTitle}>Power Control</Text>
            <Text style={styles.controlSubtitle}>Remote on/off control</Text>
          </View>
          <Switch
            value={powerOn}
            onValueChange={handlePowerControl}
            trackColor={{ false: '#E74C3C', true: '#27AE60' }}
            thumbColor="#FFFFFF"
          />
        </View>
        <View style={[styles.powerStatus, powerOn ? styles.powerStatusOn : styles.powerStatusOff]}>
          <Ionicons name="flash" size={24} color="#FFF" />
          <Text style={styles.powerStatusText}>{powerOn ? 'POWER ON' : 'POWER OFF'}</Text>
        </View>
      </View>

      {/* Consumption Chart */}
      {readings.length > 0 && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Energy Consumption (Last 30 days)</Text>
          <LineChart
            data={getChartData()}
            width={screenWidth - 48}
            height={220}
            chartConfig={{
              backgroundColor: '#1A1F3A',
              backgroundGradientFrom: '#1A1F3A',
              backgroundGradientTo: '#1A1F3A',
              decimalPlaces: 2,
              color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(139, 157, 195, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: '#4A90E2',
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Recent Readings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Readings</Text>
        {readings.slice(-5).reverse().map((reading, index) => (
          <View key={index} style={styles.readingCard}>
            <View>
              <Text style={styles.readingEnergy}>{reading.energy?.toFixed(2)} kWh</Text>
              <Text style={styles.readingTime}>
                {new Date(reading.timestamp).toLocaleString()}
              </Text>
            </View>
            <View style={styles.readingDetails}>
              <Text style={styles.readingDetail}>{reading.voltage?.toFixed(1)}V</Text>
              <Text style={styles.readingDetail}>{reading.power?.toFixed(0)}W</Text>
            </View>
          </View>
        ))}
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 20,
    margin: 24,
    marginTop: 0,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  userIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4A90E220',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userEmail: {
    fontSize: 14,
    color: '#8B9DC3',
    marginTop: 4,
  },
  userStats: {
    flexDirection: 'row',
    gap: 16,
  },
  userStat: {
    flex: 1,
    backgroundColor: '#0A0E27',
    borderRadius: 12,
    padding: 16,
  },
  userStatLabel: {
    fontSize: 12,
    color: '#8B9DC3',
    marginBottom: 4,
  },
  userStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  controlCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 20,
    margin: 24,
    marginTop: 0,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  controlSubtitle: {
    fontSize: 12,
    color: '#8B9DC3',
    marginTop: 4,
  },
  powerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  powerStatusOn: {
    backgroundColor: '#27AE60',
  },
  powerStatusOff: {
    backgroundColor: '#E74C3C',
  },
  powerStatusText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chartCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 16,
    margin: 24,
    marginTop: 0,
  },
  chartTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
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
  readingCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readingEnergy: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  readingTime: {
    color: '#8B9DC3',
    fontSize: 12,
    marginTop: 4,
  },
  readingDetails: {
    alignItems: 'flex-end',
  },
  readingDetail: {
    color: '#4A90E2',
    fontSize: 14,
    marginTop: 4,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
});