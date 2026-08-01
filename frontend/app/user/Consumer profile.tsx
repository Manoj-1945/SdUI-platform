import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/utils/api';
import { colors, fonts, radii, spacing } from '../../src/theme/tokens';

interface ConsumerProfileData {
  consumerName: string;
  address: string;
  rrNumber: string;
  kaNumber: string;
  category: string;
  sanctionedLoad: string;
  meterInstallDate: string;
  subDivision: string;
}

const EMPTY_PROFILE: ConsumerProfileData = {
  consumerName: '',
  address: '',
  rrNumber: '',
  kaNumber: '',
  category: '4LT-1',
  sanctionedLoad: 'HP: 0  KW: 1',
  meterInstallDate: '',
  subDivision: '',
};

export default function ConsumerProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<ConsumerProfileData>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/user/consumer-profile');
      setProfile({ ...EMPTY_PROFILE, ...response.data });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to load consumer profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/api/user/consumer-profile', profile);
      Alert.alert('Saved', 'Your consumer details have been saved. These will now appear on your bill receipts.');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save consumer profile');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof ConsumerProfileData, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.current} style={{ marginTop: 100 }} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.title}>Consumer Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.hint}>
          These details appear on your bill receipts, matching your actual electricity
          connection - name, address, RR number, and connection details.
        </Text>

        <Field label="Consumer Name" value={profile.consumerName} onChangeText={(v) => updateField('consumerName', v)} placeholder="e.g. K.E.LAKSHMI W/O GANGADHARA" />
        <Field label="Address" value={profile.address} onChangeText={(v) => updateField('address', v)} placeholder="e.g. D.NO.46 W.NO.XXX ROAD" multiline />
        <Field label="RR Sankhye (Service Number)" value={profile.rrNumber} onChangeText={(v) => updateField('rrNumber', v)} placeholder="e.g. 7076524000" keyboardType="numeric" />
        <Field label="KA Number" value={profile.kaNumber} onChangeText={(v) => updateField('kaNumber', v)} placeholder="e.g. 44002311" keyboardType="numeric" />
        <Field label="Category" value={profile.category} onChangeText={(v) => updateField('category', v)} placeholder="e.g. 4LT-1" />
        <Field label="Sanctioned Load" value={profile.sanctionedLoad} onChangeText={(v) => updateField('sanctionedLoad', v)} placeholder="e.g. HP: 0  KW: 1" />
        <Field label="Meter Install Date" value={profile.meterInstallDate} onChangeText={(v) => updateField('meterInstallDate', v)} placeholder="DD/MM/YYYY" />
        <Field label="Sub-Division" value={profile.subDivision} onChangeText={(v) => updateField('subDivision', v)} placeholder="e.g. Bellary City Sub-Division-1" />

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.void} />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color={colors.void} />
              <Text style={styles.saveButtonText}>Save Details</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric';
}

function Field({ label, value, onChangeText, placeholder, multiline, keyboardType }: FieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mistDim}
        multiline={multiline}
        keyboardType={keyboardType || 'default'}
      />
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
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.white,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.mist,
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.mist,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.circuit,
    borderRadius: radii.sm,
    padding: spacing.md,
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.circuitLight,
  },
  inputMultiline: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: colors.current,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: fonts.display,
    fontSize: 15,
    color: colors.void,
  },
});