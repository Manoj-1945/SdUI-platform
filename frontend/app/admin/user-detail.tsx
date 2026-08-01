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
import api from '../../src/utils/api';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';

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
      const [usersRes, consumptionRes, powerRes] = await Promise.all([
        api.get('/api/admin/users'),
        api.get(`/api/admin/user/${userId}/consumption`),
        api.get(`/api/admin/user/${userId}/power-status`),
      ]);
      const foundUser = usersRes.data.users.find((u: any) => u.user_id === userId);
      setUser(foundUser);
      setReadings(consumptionRes.data.readings);
      setPowerOn(powerRes.data.powerStatus === 'ON');
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
      datasets: [{ data, color: () => colors.current }],
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
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>User Details</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* User Info Card */}
      <View style={styles.userCard}>
        <View style={styles.userHeader}>
          <View style={styles.userIcon}>
            <Ionicons name="person" size={40} color={colors.current} />
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
            trackColor={{ false: colors.signal, true: colors.success }}
            thumbColor={colors.white}
          />
        </View>
        <View style={[styles.powerStatus, powerOn ? styles.powerStatusOn : styles.powerStatusOff]}>
          <Ionicons name="flash" size={24} color={colors.white} />
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
              backgroundColor: colors.circuit,
              backgroundGradientFrom: colors.circuit,
              backgroundGradientTo: colors.circuit,
              decimalPlaces: 2,
              color: (opacity = 1) => `rgba(45, 212, 191, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(122, 136, 166, ${opacity})`,
              style: {
                borderRadius: 16,
              },
              propsForDots: {
                r: '4',
                strokeWidth: '2',
                stroke: colors.current,
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
    backgroundColor: colors.void,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    paddingTop: 60,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.white,
  },
  userCard: {
    backgroundColor: colors.circuit,
    borderRadius: radii.lg,
    padding: spacing.lg,
    margin: spacing.lg,
    marginTop: 0,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  userIcon: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: colors.current + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: fonts.display,
    fontSize: 19,
    color: colors.white,
  },
  userEmail: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mist,
    marginTop: 4,
  },
  userStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  userStat: {
    flex: 1,
    backgroundColor: colors.void,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  userStatLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.mist,
    marginBottom: 4,
  },
  userStatValue: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.current,
  },
  controlCard: {
    backgroundColor: colors.circuit,
    borderRadius: radii.lg,
    padding: spacing.lg,
    margin: spacing.lg,
    marginTop: 0,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  controlTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.white,
  },
  controlSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mist,
    marginTop: 4,
  },
  powerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  powerStatusOn: {
    backgroundColor: colors.success,
  },
  powerStatusOff: {
    backgroundColor: colors.signal,
  },
  powerStatusText: {
    fontFamily: fonts.display,
    color: colors.void,
    fontSize: 15,
  },
  chartCard: {
    backgroundColor: colors.circuit,
    borderRadius: radii.lg,
    padding: spacing.md,
    margin: spacing.lg,
    marginTop: 0,
  },
  chartTitle: {
    fontFamily: fonts.display,
    color: colors.white,
    fontSize: 15,
    marginBottom: spacing.md,
  },
  chart: {
    borderRadius: radii.lg,
  },
  section: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  sectionTitle: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.white,
    marginBottom: spacing.md,
  },
  readingCard: {
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readingEnergy: {
    fontFamily: fonts.display,
    color: colors.white,
    fontSize: 15,
  },
  readingTime: {
    fontFamily: fonts.mono,
    color: colors.mist,
    fontSize: 11,
    marginTop: 4,
  },
  readingDetails: {
    alignItems: 'flex-end',
  },
  readingDetail: {
    fontFamily: fonts.mono,
    color: colors.current,
    fontSize: 13,
    marginTop: 4,
  },
  loadingText: {
    fontFamily: fonts.body,
    color: colors.white,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  errorText: {
    fontFamily: fonts.body,
    color: colors.signal,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
});