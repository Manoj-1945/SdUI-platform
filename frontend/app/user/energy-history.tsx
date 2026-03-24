import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import api from '../../src/utils/api';

const screenWidth = Dimensions.get('window').width;

export default function EnergyHistory() {
  const router = useRouter();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [readings, setReadings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [period]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/user/energy-history?period=${period}`);
      setReadings(response.data.readings);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load history');
    } finally {
      setLoading(false);
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Energy History</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[styles.periodButton, period === 'daily' && styles.periodButtonActive]}
          onPress={() => setPeriod('daily')}
        >
          <Text style={[styles.periodText, period === 'daily' && styles.periodTextActive]}>
            Daily
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, period === 'weekly' && styles.periodButtonActive]}
          onPress={() => setPeriod('weekly')}
        >
          <Text style={[styles.periodText, period === 'weekly' && styles.periodTextActive]}>
            Weekly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, period === 'monthly' && styles.periodButtonActive]}
          onPress={() => setPeriod('monthly')}
        >
          <Text style={[styles.periodText, period === 'monthly' && styles.periodTextActive]}>
            Monthly
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : readings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={64} color="#8B9DC3" />
            <Text style={styles.emptyText}>No data available</Text>
            <Text style={styles.emptySubtext}>Energy readings will appear here</Text>
          </View>
        ) : (
          <>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Energy Consumption (kWh)</Text>
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

            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Statistics</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Readings:</Text>
                <Text style={styles.statValue}>{readings.length}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Avg Energy:</Text>
                <Text style={styles.statValue}>
                  {(readings.reduce((sum, r) => sum + (r.energy || 0), 0) / readings.length).toFixed(2)} kWh
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Peak Power:</Text>
                <Text style={styles.statValue}>
                  {Math.max(...readings.map(r => r.power || 0)).toFixed(0)} W
                </Text>
              </View>
            </View>

            <View style={styles.readingsList}>
              <Text style={styles.listTitle}>Recent Readings</Text>
              {readings.slice(-10).reverse().map((reading, index) => (
                <View key={index} style={styles.readingItem}>
                  <View>
                    <Text style={styles.readingEnergy}>{reading.energy.toFixed(2)} kWh</Text>
                    <Text style={styles.readingTime}>
                      {new Date(reading.timestamp).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.readingDetails}>
                    <Text style={styles.readingDetail}>{reading.voltage.toFixed(1)}V</Text>
                    <Text style={styles.readingDetail}>{reading.power.toFixed(0)}W</Text>
                  </View>
                </View>
              ))}
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
  periodSelector: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 0,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    backgroundColor: '#1A1F3A',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#4A90E2',
  },
  periodText: {
    color: '#8B9DC3',
    fontSize: 14,
    fontWeight: '600',
  },
  periodTextActive: {
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
  chartCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
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
  statsCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statLabel: {
    color: '#8B9DC3',
    fontSize: 14,
  },
  statValue: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
  },
  readingsList: {
    marginBottom: 24,
  },
  listTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  readingItem: {
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
});