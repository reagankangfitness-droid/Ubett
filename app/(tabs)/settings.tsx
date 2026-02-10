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
import { requestNotificationPermissions, scheduleStreakReminder, cancelStreakReminder } from '@/lib/notifications';
import {
  type NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  loadNotificationSettings,
  saveNotificationSettings,
} from '@/lib/notificationSettings';
import { useChecklist } from '@/hooks/useChecklist';
import BottomSheet from '@/components/BottomSheet';
import {
  requestForegroundLocation,
  requestBackgroundLocation,
  getCurrentLocation,
  getAddressFromCoords,
} from '@/lib/locationPermissions';

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

const RADIUS_OPTIONS = [
  { value: 100, label: '100 m' },
  { value: 150, label: '150 m (recommended)' },
  { value: 200, label: '200 m' },
  { value: 300, label: '300 m' },
  { value: 500, label: '500 m' },
];

type PickerKind = 'activeStart' | 'activeEnd' | 'cooldown' | 'radius' | 'quietStart' | 'quietEnd' | null;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, loading, wifiConnected, updateSettings, detectWifi, geofenceActive } = useDepartureTrigger();
  const { resetChecks } = useChecklist();
  const [ssidInput, setSsidInput] = useState('');
  const [pickerOpen, setPickerOpen] = useState<PickerKind>(null);
  const [locationExplanationVisible, setLocationExplanationVisible] = useState(false);
  const [settingLocation, setSettingLocation] = useState(false);
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);

  useEffect(() => {
    if (!loading) {
      setSsidInput(settings.homeSSID);
    }
  }, [loading, settings.homeSSID]);

  // Load notification settings
  useEffect(() => {
    (async () => {
      const ns = await loadNotificationSettings();
      setNotifSettings(ns);
    })();
  }, []);

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
    } else if (kind === 'radius') {
      updateSettings({ ...settings, homeRadiusMeters: value as number });
    } else if (kind === 'quietStart') {
      updateNotifSettings({ ...notifSettings, quietHoursStart: value as string });
    } else if (kind === 'quietEnd') {
      updateNotifSettings({ ...notifSettings, quietHoursEnd: value as string });
    }
    setPickerOpen(null);
  };

  const handleResetChecks = () => {
    Alert.alert('Reset Checks', 'Uncheck all items for today?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => resetChecks() },
    ]);
  };

  const handleToggleGeofence = async (value: boolean) => {
    if (!value) {
      await updateSettings({ ...settings, geofenceEnabled: false });
      return;
    }

    // Request foreground permission first
    const fg = await requestForegroundLocation();
    if (!fg.granted) {
      Alert.alert('Location Required', 'Please enable location access in Settings to use geofencing.');
      return;
    }

    // Show explanation before requesting background permission
    setLocationExplanationVisible(true);
  };

  const handleLocationExplanationContinue = async () => {
    setLocationExplanationVisible(false);

    const bg = await requestBackgroundLocation();
    if (!bg.granted) {
      Alert.alert(
        'Background Location Required',
        'DoorCheck needs "Always Allow" location access for geofencing to work when the app is closed.',
      );
      return;
    }

    await updateSettings({ ...settings, geofenceEnabled: true });
  };

  const handleSetHomeLocation = async () => {
    setSettingLocation(true);
    try {
      const fg = await requestForegroundLocation();
      if (!fg.granted) {
        Alert.alert('Location Required', 'Please enable location access to set your home position.');
        return;
      }

      const coords = await getCurrentLocation();
      if (!coords) {
        Alert.alert('Location Error', 'Could not determine your current location. Please try again.');
        return;
      }

      const address = await getAddressFromCoords(coords.latitude, coords.longitude);
      const displayText = address ?? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;

      Alert.alert(
        'Set Home Location',
        `Use this as your home?\n\n${displayText}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: () =>
              updateSettings({
                ...settings,
                homeLatitude: coords.latitude,
                homeLongitude: coords.longitude,
              }),
          },
        ],
      );
    } finally {
      setSettingLocation(false);
    }
  };

  const updateNotifSettings = async (next: NotificationSettings) => {
    setNotifSettings(next);
    await saveNotificationSettings(next);

    // Sync streak reminder
    if (next.streakReminders) {
      await scheduleStreakReminder();
    } else {
      await cancelStreakReminder();
    }
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

  const formatRadius = (meters: number) => {
    const opt = RADIUS_OPTIONS.find((o) => o.value === meters);
    return opt?.label ?? `${meters} m`;
  };

  const formatCoords = (lat: number | null, lng: number | null) => {
    if (lat == null || lng == null) return 'Not set';
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
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

        {/* ── Geofence Backup Section ───────────────── */}
        <Text style={styles.sectionTitle}>GEOFENCE BACKUP</Text>
        <View style={styles.card}>
          {/* Geofence toggle */}
          <View style={styles.row}>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowLabel}>Geofence</Text>
              <Text style={styles.rowHint}>Backup departure detection via GPS</Text>
            </View>
            <Switch
              value={settings.geofenceEnabled}
              onValueChange={handleToggleGeofence}
              disabled={!settings.enabled}
              trackColor={{ false: colors.border, true: colors.green }}
              thumbColor="#FFFFFF"
            />
          </View>

          {settings.geofenceEnabled && (
            <>
              <View style={styles.divider} />

              {/* Home location */}
              <View style={styles.ssidRow}>
                <Text style={styles.rowLabel}>Home Location</Text>
                <View style={styles.ssidInputRow}>
                  <Text style={[styles.rowValue, { flex: 1 }]}>
                    {formatCoords(settings.homeLatitude, settings.homeLongitude)}
                  </Text>
                  <Pressable
                    style={[styles.detectBtn, settingLocation && { opacity: 0.5 }]}
                    onPress={handleSetHomeLocation}
                    disabled={settingLocation}
                  >
                    <Text style={styles.detectBtnText}>
                      {settingLocation ? 'Locating...' : 'Use Current Location'}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Detection radius */}
              <Pressable style={styles.row} onPress={() => setPickerOpen('radius')}>
                <Text style={styles.rowLabel}>Detection Radius</Text>
                <Text style={styles.rowValue}>{formatRadius(settings.homeRadiusMeters)}</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* ── Notifications Section ──────────────────── */}
        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          {/* Departure notifications toggle */}
          <View style={styles.row}>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowLabel}>Departure Notifications</Text>
              <Text style={styles.rowHint}>Get notified when leaving home</Text>
            </View>
            <Switch
              value={notifSettings.departureNotifications}
              onValueChange={(v) => updateNotifSettings({ ...notifSettings, departureNotifications: v })}
              trackColor={{ false: colors.border, true: colors.green }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          {/* Streak reminders toggle */}
          <View style={styles.row}>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowLabel}>Streak Reminders</Text>
              <Text style={styles.rowHint}>Remind to check before 8 PM</Text>
            </View>
            <Switch
              value={notifSettings.streakReminders}
              onValueChange={(v) => updateNotifSettings({ ...notifSettings, streakReminders: v })}
              trackColor={{ false: colors.border, true: colors.green }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          {/* Quiet hours */}
          <Pressable style={styles.row} onPress={() => setPickerOpen('quietStart')}>
            <Text style={styles.rowLabel}>Quiet Hours Start</Text>
            <Text style={styles.rowValue}>{formatTime(notifSettings.quietHoursStart)}</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.row} onPress={() => setPickerOpen('quietEnd')}>
            <Text style={styles.rowLabel}>Quiet Hours End</Text>
            <Text style={styles.rowValue}>{formatTime(notifSettings.quietHoursEnd)}</Text>
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
          {settings.geofenceEnabled
            ? ' Geofence backup uses your home location to detect departures when WiFi detection is unavailable. Your location is never tracked or stored beyond your device.'
            : ''}
        </Text>
      </ScrollView>

      {/* ── Option picker sheet ─────────────────────── */}
      <BottomSheet visible={pickerOpen !== null} onClose={() => setPickerOpen(null)}>
        <Text style={styles.pickerTitle}>
          {pickerOpen === 'activeStart'
            ? 'Active From'
            : pickerOpen === 'activeEnd'
              ? 'Active Until'
              : pickerOpen === 'radius'
                ? 'Detection Radius'
                : pickerOpen === 'quietStart'
                  ? 'Quiet Hours Start'
                  : pickerOpen === 'quietEnd'
                    ? 'Quiet Hours End'
                    : 'Cooldown'}
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
            : pickerOpen === 'radius'
              ? RADIUS_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[styles.pickerOption, settings.homeRadiusMeters === opt.value && styles.pickerOptionActive]}
                    onPress={() => handlePickerSelect('radius', opt.value)}
                  >
                    <Text style={[styles.pickerOptionText, settings.homeRadiusMeters === opt.value && styles.pickerOptionTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))
              : HOUR_OPTIONS.map((opt) => {
                  const current =
                    pickerOpen === 'activeStart'
                      ? settings.activeStart
                      : pickerOpen === 'activeEnd'
                        ? settings.activeEnd
                        : pickerOpen === 'quietStart'
                          ? notifSettings.quietHoursStart
                          : pickerOpen === 'quietEnd'
                            ? notifSettings.quietHoursEnd
                            : '';
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

      {/* ── Location explanation sheet ─────────────── */}
      <BottomSheet visible={locationExplanationVisible} onClose={() => setLocationExplanationVisible(false)}>
        <Text style={styles.pickerTitle}>Background Location</Text>
        <Text style={styles.explanationText}>
          DoorCheck uses a geofence around your home to detect when you leave. This requires "Always
          Allow" location access. Your location is never tracked or stored.
        </Text>
        <Pressable style={styles.explanationBtn} onPress={handleLocationExplanationContinue}>
          <Text style={styles.explanationBtnText}>Continue</Text>
        </Pressable>
        <Pressable
          style={styles.explanationCancelBtn}
          onPress={() => setLocationExplanationVisible(false)}
        >
          <Text style={styles.explanationCancelText}>Cancel</Text>
        </Pressable>
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
  explanationText: {
    fontSize: 15,
    color: colors.inkSoft,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'System',
  },
  explanationBtn: {
    backgroundColor: colors.orange,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  explanationBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System',
  },
  explanationCancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  explanationCancelText: {
    color: colors.inkSoft,
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'System',
  },
});
