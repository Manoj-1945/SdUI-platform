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
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';

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
          <Ionicons name="arrow-back" size={24} color={colors.white} />
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
                placeholderTextColor={colors.mistDim}
              />
              <Text style={styles.unitText}>/kWh</Text>
            </View>
            <TouchableOpacity
              style={styles.updateButton}
              onPress={handleUpdateGlobalTariff}
            >
              <Ionicons name="flash" size={20} color={colors.white} />
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
                  <Ionicons name="create" size={20} color={colors.current} />
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
                  <Ionicons name="alert-circle" size={16} color={colors.signal} />
                  <Text style={styles.unpaidText}>Unpaid</Text>
                </View>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() =>
                    router.push(`/admin/user-detail?userId=${user.user_id}`)
                  }
                >
                  <Ionicons name="chevron-forward" size={20} color={colors.mist} />
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
                <Ionicons name="trending-up" size={16} color={colors.copper} />
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
  content: {
    flex: 1,
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
  tariffCard: {
    backgroundColor: colors.circuit,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  tariffLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mist,
    marginBottom: spacing.sm + 4,
  },
  tariffInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.void,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.circuitLight,
  },
  rupeeSymbol: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.current,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.white,
  },
  unitText: {
    fontFamily: fonts.mono,
    fontSize: 13,
    color: colors.mist,
    marginLeft: spacing.sm,
  },
  updateButton: {
    flexDirection: 'row',
    backgroundColor: colors.current,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  updateButtonText: {
    fontFamily: fonts.display,
    color: colors.void,
    fontSize: 15,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.white,
  },
  userEmail: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.mist,
    marginTop: 4,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
  },
  balanceText: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.copper,
  },
  iconButton: {
    padding: spacing.sm,
  },
  unpaidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.signal + '22',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radii.sm,
    gap: 4,
  },
  unpaidText: {
    fontFamily: fonts.display,
    color: colors.signal,
    fontSize: 11,
  },
  consumptionCard: {
    flexDirection: 'row',
    backgroundColor: colors.circuit,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    alignItems: 'center',
  },
  consumptionStats: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.mist,
    marginTop: 4,
  },
  consumptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.copper + '22',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: radii.sm,
    gap: 4,
  },
  consumptionText: {
    fontFamily: fonts.display,
    color: colors.copper,
    fontSize: 11,
  },
  emptyText: {
    fontFamily: fonts.body,
    color: colors.mist,
    fontSize: 13,
    textAlign: 'center',
    padding: spacing.lg,
  },
});