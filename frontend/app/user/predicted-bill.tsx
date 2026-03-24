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
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>AI Prediction</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : (
          <>
            <View style={styles.aiCard}>
              <View style={styles.aiHeader}>
                <Ionicons name="bulb" size={48} color="#FFD700" />
                <Text style={styles.aiTitle}>Smart Bill Prediction</Text>
              </View>
              <Text style={styles.aiSubtitle}>AI-powered forecast based on your usage</Text>
            </View>

            <View style={styles.predictionCard}>
              <Text style={styles.predictionLabel}>Predicted Monthly Bill</Text>
              <Text style={styles.predictionAmount}>₹{prediction?.predictedAmount?.toFixed(2) || '0.00'}</Text>
              <View style={styles.confidenceBadge}>
                <Ionicons name="stats-chart" size={16} color="#4A90E2" />
                <Text style={styles.confidenceText}>
                  Confidence: {prediction?.confidence || 'N/A'}
                </Text>
              </View>
              <Text style={styles.basedOn}>Based on {prediction?.basedOn || 'historical data'}</Text>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="information-circle" size={20} color="#4A90E2" />
                <Text style={styles.infoText}>How it works</Text>
              </View>
              <Text style={styles.infoDescription}>
                Our AI analyzes your recent energy consumption patterns to predict your upcoming monthly bill. 
                This helps you plan your budget and manage energy usage efficiently.
              </Text>
            </View>

            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>💡 Energy Saving Tips</Text>
              <View style={styles.tip}>
                <Ionicons name="checkmark-circle" size={16} color="#27AE60" />
                <Text style={styles.tipText}>Use appliances during off-peak hours</Text>
              </View>
              <View style={styles.tip}>
                <Ionicons name="checkmark-circle" size={16} color="#27AE60" />
                <Text style={styles.tipText}>Switch to LED bulbs to save energy</Text>
              </View>
              <View style={styles.tip}>
                <Ionicons name="checkmark-circle" size={16} color="#27AE60" />
                <Text style={styles.tipText}>Unplug devices when not in use</Text>
              </View>
              <View style={styles.tip}>
                <Ionicons name="checkmark-circle" size={16} color="#27AE60" />
                <Text style={styles.tipText}>Regular maintenance of AC and appliances</Text>
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
    padding: 24,
    paddingTop: 0,
  },
  loadingText: {
    color: '#8B9DC3',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  aiCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  aiHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  aiTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
  },
  aiSubtitle: {
    color: '#8B9DC3',
    fontSize: 14,
    textAlign: 'center',
  },
  predictionCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  predictionLabel: {
    color: '#8B9DC3',
    fontSize: 14,
    marginBottom: 8,
  },
  predictionAmount: {
    color: '#4A90E2',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E220',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
    gap: 6,
  },
  confidenceText: {
    color: '#4A90E2',
    fontSize: 12,
    fontWeight: '600',
  },
  basedOn: {
    color: '#8B9DC3',
    fontSize: 12,
  },
  infoCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoDescription: {
    color: '#8B9DC3',
    fontSize: 14,
    lineHeight: 20,
  },
  tipsCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  tipsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  tipText: {
    color: '#8B9DC3',
    fontSize: 14,
    flex: 1,
  },
});