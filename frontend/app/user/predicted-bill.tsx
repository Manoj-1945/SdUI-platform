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

export default function PredictedBill() {
  const router = useRouter();
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrediction();
  }, []);

  const fetchPrediction = async () => {
    try {
      const response = await api.get('/api/user/predicted-bill');
      setPrediction(response.data);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load prediction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>AI Prediction</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.current} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.aiCard}>
              <Ionicons name="bulb" size={44} color={colors.copper} />
              <Text style={styles.aiTitle}>Smart Bill Prediction</Text>
              <Text style={styles.aiSubtitle}>Forecast based on your usage pattern</Text>
            </View>

            <View style={styles.predictionCard}>
              <Text style={styles.predictionLabel}>PREDICTED MONTHLY BILL</Text>
              <Text style={styles.predictionAmount}>₹{prediction?.predictedAmount?.toFixed(2) || '0.00'}</Text>
              <View style={styles.confidenceBadge}>
                <Ionicons name="stats-chart" size={14} color={colors.current} />
                <Text style={styles.confidenceText}>
                  Confidence: {prediction?.confidence || 'N/A'}
                </Text>
              </View>
              <Text style={styles.basedOn}>Based on {prediction?.basedOn || 'historical data'}</Text>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="information-circle" size={18} color={colors.current} />
                <Text style={styles.infoText}>How it works</Text>
              </View>
              <Text style={styles.infoDescription}>
                This looks at your recent energy consumption to estimate your upcoming monthly
                bill, so you can plan ahead and manage usage more efficiently.
              </Text>
            </View>

            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>Energy Saving Tips</Text>
              {[
                'Use appliances during off-peak hours',
                'Switch to LED bulbs to save energy',
                'Unplug devices when not in use',
                'Regular maintenance of AC and appliances',
              ].map((tip, i) => (
                <View key={i} style={styles.tip}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.tipText}>{tip}</Text>
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
  aiCard: {
    backgroundColor: colors.circuit,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  aiTitle: {
    fontFamily: fonts.display,
    color: colors.white,
    fontSize: 19,
    marginTop: spacing.sm + 4,
  },
  aiSubtitle: {
    fontFamily: fonts.body,
    color: colors.mist,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  predictionCard: {
    backgroundColor: colors.circuit,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.current + '55',
  },
  predictionLabel: {
    fontFamily: fonts.mono,
    color: colors.mist,
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  predictionAmount: {
    fontFamily: fonts.displayBold,
    color: colors.current,
    fontSize: 44,
    marginBottom: spacing.md,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.current + '22',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
    gap: 6,
  },
  confidenceText: {
    fontFamily: fonts.display,
    color: colors.current,
    fontSize: 12,
  },
  basedOn: {
    fontFamily: fonts.body,
    color: colors.mist,
    fontSize: 12,
  },
  infoCard: {
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm + 4,
    gap: spacing.sm,
  },
  infoText: {
    fontFamily: fonts.display,
    color: colors.white,
    fontSize: 15,
  },
  infoDescription: {
    fontFamily: fonts.body,
    color: colors.mist,
    fontSize: 13,
    lineHeight: 19,
  },
  tipsCard: {
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  tipsTitle: {
    fontFamily: fonts.display,
    color: colors.white,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm + 4,
    gap: spacing.sm,
  },
  tipText: {
    fontFamily: fonts.body,
    color: colors.mist,
    fontSize: 13,
    flex: 1,
  },
});