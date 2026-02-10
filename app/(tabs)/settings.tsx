import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { useDepartureTrigger } from '@/hooks/useDepartureTrigger';
import { requestNotificationPermissions } from '@/lib/notifications';
import { useChecklist } from '@/hooks/useChecklist';
import BottomSheet from '@/components/BottomSheet';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => {
  const value = `${String(h).padStart(2, '0')}:00`;
  const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
  return { value, label };
});

const COOLDOWN_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
];

type PickerKind = 'activeStart' | 'activeEnd' | 'cooldown' | null;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, loading, wifiConnected, updateSettings, detectWifi } = useDepartureTrigger();
  const { resetChecks } = useChecklist();
  const [ssidInput, setSsidInput] = useState('');
  const [pickerOpen, setPickerOpen] = useState<PickerKind>(null);

  useEffect(() => {
    if (!loading) {
      setSsidInput(settings.homeSSID);
    }
  }, [loading, settings.homeSSID]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const handleToggleEnabled = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Notifications Required',
          'Please enable notifications in Settings to use departure reminders.',
        );
        return;
      }
    }
    await updateSettings({ ...settings, enabled: value });
  };

  const handleSaveSSID = () => {
    const trimmed = ssidInput.trim();
    if (trimmed !== settings.homeSSID) {
      updateSettings({ ...settings, homeSSID: trimmed });
    }
  };

  const handleDetectWifi = async () => {
    const onWifi = await detectWifi();
    if (onWifi) {
      Alert.alert(
        'WiFi Detected',
        'You are connected to WiFi. Set this as your home network?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Set as Home',
            onPress: () => {
              const label = 'Current WiFi';
              setSsidInput(label);
              updateSettings({ ...settings, homeSSID: label });
            },
          },
        ],
      );
    } else {
      Alert.alert('Not on WiFi', 'Connect to your home WiFi first, then try again.');
    }
  };

  const handlePickerSelect = (kind: PickerKind, value: string | number) => {
    if (kind === 'activeStart') {
      updateSettings({ ...settings, activeStart: value as string });
    } else if (kind === 'activeEnd') {
      updateSettings({ ...settings, activeEnd: value as string });
    } else if (kind === 'cooldown') {
      updateSettings({ ...settings, cooldownMinutes: value as number });
    }
    setPickerOpen(null);
  };

  const handleResetChecks = () => {
    Alert.alert('Reset Checks', 'Uncheck all items for today?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => resetChecks() },
    ]);
  };

  const formatTime = (time: string) => {
    const [h] = time.split(':').map(Number);
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
  };

  const formatCooldown = (mins: number) => {
    const opt = COOLDOWN_OPTIONS.find((o) => o.value === mins);
    return opt?.label ?? `${mins} min`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Settings</Text>

        {/* ── Departure Trigger Section ─────────────── */}
        <Text style={styles.sectionTitle}>DEPARTURE REMINDER</Text>
        <View style={styles.card}>
          {/* Enable toggle */}
          <View style={styles.row}>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowLabel}>Enable</Text>
              <Text style={styles.rowHint}>Get notified when you leave home</Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={handleToggleEnabled}
              trackColor={{ false: colors.border, true: colors.green }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          {/* WiFi status */}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>WiFi Status</Text>
            <Text style={[styles.rowValue, { color: wifiConnected ? colors.green : colors.inkSoft }]}>
              {wifiConnected === null ? '...' : wifiConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Home SSID */}
          <View style={styles.ssidRow}>
            <Text style={styles.rowLabel}>Home WiFi Name</Text>
            <View style={styles.ssidInputRow}>
              <TextInput
                style={styles.ssidInput}
                value={ssidInput}
                onChangeText={setSsidInput}
                onBlur={handleSaveSSID}
                placeholder="e.g. MyHomeWiFi"
                placeholderTextColor={colors.border}
                returnKeyType="done"
                onSubmitEditing={handleSaveSSID}
              />
              <Pressable style={styles.detectBtn} onPress={handleDetectWifi}>
                <Text style={styles.detectBtnText}>Detect</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Active hours */}
          <Pressable style={styles.row} onPress={() => setPickerOpen('activeStart')}>
            <Text style={styles.rowLabel}>Active From</Text>
            <Text style={styles.rowValue}>{formatTime(settings.activeStart)}</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.row} onPress={() => setPickerOpen('activeEnd')}>
            <Text style={styles.rowLabel}>Active Until</Text>
            <Text style={styles.rowValue}>{formatTime(settings.activeEnd)}</Text>
          </Pressable>

          <View style={styles.divider} />

          {/* Cooldown */}
          <Pressable style={styles.row} onPress={() => setPickerOpen('cooldown')}>
            <Text style={styles.rowLabel}>Cooldown</Text>
            <Text style={styles.rowValue}>{formatCooldown(settings.cooldownMinutes)}</Text>
          </Pressable>
        </View>

        {/* ── General Section ─────────────────────────── */}
        <Text style={styles.sectionTitle}>GENERAL</Text>
        <View style={styles.card}>
          <Pressable style={styles.row} onPress={handleResetChecks}>
            <Text style={styles.rowLabel}>Reset Today's Checks</Text>
            <Text style={[styles.rowValue, { color: colors.orange }]}>Reset</Text>
          </Pressable>
        </View>

        <Text style={styles.footnote}>
          Departure detection monitors your WiFi connection. When you disconnect from WiFi during
          active hours, you'll receive a reminder after a 30-second delay.
        </Text>
      </ScrollView>

      {/* ── Option picker sheet ─────────────────────── */}
      <BottomSheet visible={pickerOpen !== null} onClose={() => setPickerOpen(null)}>
        <Text style={styles.pickerTitle}>
          {pickerOpen === 'activeStart' ? 'Active From' : pickerOpen === 'activeEnd' ? 'Active Until' : 'Cooldown'}
        </Text>
        <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
          {pickerOpen === 'cooldown'
            ? COOLDOWN_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.pickerOption, settings.cooldownMinutes === opt.value && styles.pickerOptionActive]}
                  onPress={() => handlePickerSelect('cooldown', opt.value)}
                >
                  <Text style={[styles.pickerOptionText, settings.cooldownMinutes === opt.value && styles.pickerOptionTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))
            : HOUR_OPTIONS.map((opt) => {
                const current = pickerOpen === 'activeStart' ? settings.activeStart : settings.activeEnd;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.pickerOption, current === opt.value && styles.pickerOptionActive]}
                    onPress={() => handlePickerSelect(pickerOpen, opt.value)}
                  >
                    <Text style={[styles.pickerOptionText, current === opt.value && styles.pickerOptionTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingText: {
    marginTop: 100,
    textAlign: 'center',
    color: colors.inkSoft,
    fontSize: 16,
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.5,
    marginTop: 16,
    marginBottom: 24,
    fontFamily: 'System',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.inkSoft,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
    fontFamily: 'System',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#1A1612',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowTextCol: {
    flex: 1,
    marginRight: 12,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.ink,
    fontFamily: 'System',
  },
  rowHint: {
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: 2,
    fontFamily: 'System',
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.inkSoft,
    fontFamily: 'System',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  ssidRow: {
    paddingVertical: 14,
  },
  ssidInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  ssidInput: {
    flex: 1,
    backgroundColor: colors.cream,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.ink,
    fontFamily: 'System',
  },
  detectBtn: {
    backgroundColor: colors.orange,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  detectBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'System',
  },
  footnote: {
    fontSize: 13,
    color: colors.inkSoft,
    lineHeight: 18,
    marginHorizontal: 4,
    fontFamily: 'System',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'System',
  },
  pickerScroll: {
    maxHeight: 320,
  },
  pickerOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  pickerOptionActive: {
    backgroundColor: colors.cream,
  },
  pickerOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.ink,
    textAlign: 'center',
    fontFamily: 'System',
  },
  pickerOptionTextActive: {
    color: colors.orange,
    fontWeight: '700',
  },
});
