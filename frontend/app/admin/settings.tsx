import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/utils/api';

export default function AdminSettings() {
  const router = useRouter();
  const [tariffRate, setTariffRate] = useState('8.0');
  const [lowBalanceUsers, setLowBalanceUsers] = useState<any[]>([]);
  const [unpaidUsers, setUnpaidUsers] = useState<any[]>([]);
  const [highConsumptionUsers, setHighConsumptionUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProblematicUsers();
    fetchHighConsumption();
  }, []);

  const fetchProblematicUsers = async () => {
    try {
      const response = await api.get('/api/admin/users/problematic');
      setLowBalanceUsers(response.data.lowBalanceUsers);
      setUnpaidUsers(response.data.unpaidBillUsers);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchHighConsumption = async () => {
    try {
      const response = await api.get('/api/admin/users/high-consumption');
      setHighConsumptionUsers(response.data.highConsumptionUsers);
    } catch (error: any) {
      console.error('Error fetching high consumption:', error);
    }
  };

  const handleUpdateGlobalTariff = async () => {
    const rate = parseFloat(tariffRate);
    if (isNaN(rate) || rate <= 0) {
      Alert.alert('Error', 'Please enter a valid tariff rate');
      return;
    }

    Alert.alert(
      'Update Global Tariff',
      `Set tariff rate to ₹${rate}/kWh for ALL users?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              const response = await api.put(
                `/api/admin/update-global-tariff?new_rate=${rate}`
              );
              Alert.alert(
                'Success',
                `Tariff updated for ${response.data.usersAffected} users`
              );
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Update failed');
            }
          },
        },
      ]
    );
  };

  const handleUpdateUserTariff = async (userId: string, currentRate: number) => {
    Alert.prompt(
      'Update User Tariff',
      `Current rate: ₹${currentRate}/kWh\nEnter new rate:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async (newRate) => {
            const rate = parseFloat(newRate || '0');
            if (isNaN(rate) || rate <= 0) {
              Alert.alert('Error', 'Invalid rate');
              return;
            }

            try {
              await api.put(
                `/api/admin/update-tariff?user_id=${userId}&new_rate=${rate}`
              );
              Alert.alert('Success', 'Tariff updated for user');
              fetchProblematicUsers();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Update failed');
            }
          },
        },
      ],
      'plain-text',
      currentRate.toString()
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Admin Management</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Global Tariff Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Tariff Rate Management</Text>
          <View style={styles.tariffCard}>
            <Text style={styles.tariffLabel}>Global Tariff Rate (₹/kWh)</Text>
            <View style={styles.tariffInput}>
              <Text style={styles.rupeeSymbol}>₹</Text>
              <TextInput
                style={styles.input}
                value={tariffRate}
                onChangeText={setTariffRate}
                keyboardType="decimal-pad"
                placeholder="8.0"
                placeholderTextColor="#8B9DC3"
              />
              <Text style={styles.unitText}>/kWh</Text>
            </View>
            <TouchableOpacity
              style={styles.updateButton}
              onPress={handleUpdateGlobalTariff}
            >
              <Ionicons name="flash" size={20} color="#FFF" />
              <Text style={styles.updateButtonText}>Update All Users</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Low Balance Users */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            ⚠️ Low Balance Users ({lowBalanceUsers.length})
          </Text>
          {lowBalanceUsers.map((user, index) => (
            <View key={index} style={styles.userCard}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
              <View style={styles.userActions}>
                <Text style={styles.balanceText}>
                  ₹{user.balance?.toFixed(2)}
                </Text>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleUpdateUserTariff(user.user_id, user.tariffRate)}
                >
                  <Ionicons name="create" size={20} color="#4A90E2" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {lowBalanceUsers.length === 0 && (
            <Text style={styles.emptyText}>No users with low balance</Text>
          )}
        </View>

        {/* Unpaid Bills Users */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            🔴 Unpaid Bills ({unpaidUsers.length})
          </Text>
          {unpaidUsers.map((user, index) => (
            <View key={index} style={styles.userCard}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
              <View style={styles.userActions}>
                <View style={styles.unpaidBadge}>
                  <Ionicons name="alert-circle" size={16} color="#E74C3C" />
                  <Text style={styles.unpaidText}>Unpaid</Text>
                </View>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() =>
                    router.push(`/admin/user-detail?userId=${user.user_id}`)
                  }
                >
                  <Ionicons name="chevron-forward" size={20} color="#8B9DC3" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {unpaidUsers.length === 0 && (
            <Text style={styles.emptyText}>All bills are paid!</Text>
          )}
        </View>

        {/* High Consumption Users */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            📊 High Consumption (Last 7 Days)
          </Text>
          {highConsumptionUsers.map((item, index) => (
            <View key={index} style={styles.consumptionCard}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.user.name}</Text>
                <Text style={styles.consumptionStats}>
                  {item.totalEnergy.toFixed(2)} kWh • ₹
                  {item.estimatedCost.toFixed(2)}
                </Text>
              </View>
              <View style={styles.consumptionBadge}>
                <Ionicons name="trending-up" size={16} color="#F39C12" />
                <Text style={styles.consumptionText}>
                  {item.avgPower.toFixed(0)}W
                </Text>
              </View>
            </View>
          ))}
          {highConsumptionUsers.length === 0 && (
            <Text style={styles.emptyText}>No high consumption alerts</Text>
          )}
        </View>
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
  tariffCard: {
    backgroundColor: '#1A1F3A',
    borderRadius: 16,
    padding: 20,
  },
  tariffLabel: {
    fontSize: 14,
    color: '#8B9DC3',
    marginBottom: 12,
  },
  tariffInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0E27',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  rupeeSymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  unitText: {
    fontSize: 14,
    color: '#8B9DC3',
    marginLeft: 8,
  },
  updateButton: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userEmail: {
    fontSize: 12,
    color: '#8B9DC3',
    marginTop: 4,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  balanceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F39C12',
  },
  iconButton: {
    padding: 8,
  },
  unpaidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E74C3C20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  unpaidText: {
    color: '#E74C3C',
    fontSize: 12,
    fontWeight: 'bold',
  },
  consumptionCard: {
    flexDirection: 'row',
    backgroundColor: '#1A1F3A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  consumptionStats: {
    fontSize: 12,
    color: '#8B9DC3',
    marginTop: 4,
  },
  consumptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F39C1220',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  consumptionText: {
    color: '#F39C12',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#8B9DC3',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
});
