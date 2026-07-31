import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import api from '../../src/utils/api';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';

const screenWidth = Dimensions.get('window').width;

type Period = 'daily' | 'weekly' | 'monthly';
type Comparison = 'none' | 'lastMonth' | 'rollingAvg';

export default function EnergyHistory() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('daily');
  const [comparison, setComparison] = useState<Comparison>('none');
  const [readings, setReadings] = useState<any[]>([]);
  const [comparisonReadings, setComparisonReadings] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [period, comparison]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get(
        `/api/user/energy-history?period=${period}&comparison=${comparison}`
      );
      setReadings(response.data.readings);
      setComparisonReadings(response.data.comparisonReadings || []);
      setSummary(response.data.summary || null);
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
    const datasets = [{ data, color: () => colors.current, strokeWidth: 2 }];

    if (comparison !== 'none' && comparisonReadings.length > 0) {
      const comparisonData = comparisonReadings.slice(-10).map((r) => r.energy || 0);
      datasets.push({
        data: comparisonData,
        color: () => colors.copper,
        strokeWidth: 1,
      });
    }

    return { labels, datasets };
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Energy History</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.selectors}>
        <View style={styles.periodSelector}>
          {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodButton, period === p && styles.periodButtonActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.periodSelector}>
          {(
            [
              ['none', 'No Comparison'],
              ['lastMonth', 'Vs. Last Month'],
              ['rollingAvg', 'Vs. Rolling Avg'],
            ] as [Comparison, string][]
          ).map(([c, text]) => (
            <TouchableOpacity
              key={c}
              style={[styles.periodButton, comparison === c && styles.periodButtonActive]}
              onPress={() => setComparison(c)}
            >
              <Text style={[styles.periodText, comparison === c && styles.periodTextActive]}>
                {text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.current} style={{ marginTop: 40 }} />
        ) : readings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={64} color={colors.mist} />
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
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </View>

            {summary && (
              <View style={styles.statsCard}>
                <Text style={styles.statsTitle}>Comparison Summary</Text>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Current Period Avg</Text>
                  <Text style={styles.statValue}>{summary.currentAvg.toFixed(2)} kWh</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Comparison Avg</Text>
                  <Text style={styles.statValue}>{summary.comparisonAvg.toFixed(2)} kWh</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Change</Text>
                  <Text
                    style={[
                      styles.statValue,
                      summary.changePercent >= 0 ? styles.positiveChange : styles.negativeChange,
                    ]}
                  >
                    {summary.changePercent.toFixed(2)}%
                  </Text>
                </View>
              </View>
            )}

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

const chartConfig = {
  backgroundColor: colors.circuit,
  backgroundGradientFrom: colors.circuit,
  backgroundGradientTo: colors.circuit,
  decimalPlaces: 2,
  color: (opacity = 1) => `rgba(45, 212, 191, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(122, 136, 166, ${opacity})`,
  style: { borderRadius: 16 },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: colors.current,
  },
};

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
  selectors: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  periodButton: {
    flex: 1,
    backgroundColor: colors.circuit,
    padding: spacing.sm + 4,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.current,
  },
  periodText: {
    fontFamily: fonts.body,
    color: colors.mist,
    fontSize: 12,
  },
  periodTextActive: {
    fontFamily: fonts.display,
    color: colors.void,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
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
  chartCard: {
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  chartTitle: {
    fontFamily: fonts.display,
    color: colors.white,
    fontSize: 15,
    marginBottom: spacing.md,
  },
  chart: {
    borderRadius: radii.md,
  },
  statsCard: {
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  statsTitle: {
    fontFamily: fonts.display,
    color: colors.white,
    fontSize: 15,
    marginBottom: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 4,
  },
  statLabel: {
    fontFamily: fonts.body,
    color: colors.mist,
    fontSize: 13,
  },
  statValue: {
    fontFamily: fonts.display,
    color: colors.current,
    fontSize: 13,
  },
  positiveChange: {
    color: colors.signal,
  },
  negativeChange: {
    color: colors.success,
  },
  readingsList: {
    marginBottom: spacing.lg,
  },
  listTitle: {
    fontFamily: fonts.display,
    color: colors.white,
    fontSize: 15,
    marginBottom: spacing.md,
  },
  readingItem: {
    backgroundColor: colors.circuit,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readingEnergy: {
    fontFamily: fonts.displayBold,
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
    fontSize: 12,
    marginTop: 2,
  },
});