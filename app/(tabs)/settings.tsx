import { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { usePro } from '@/contexts/ProContext';
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

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

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

const PRO_BENEFITS = [
  'Unlimited items (free: max 6)',
  'Multiple locations',
  'Accountability buddy',
  'Return home check',
  'Widgets',
];

type PickerKind = 'activeStart' | 'activeEnd' | 'cooldown' | 'radius' | 'quietStart' | 'quietEnd' | null;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { isPro } = usePro();
  const { settings, loading, wifiConnected, updateSettings, detectWifi } = useDepartureTrigger();
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

  // ── Departure trigger handlers ────────────────────────────────

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
      Alert.alert('WiFi Detected', 'You are connected to WiFi. Set this as your home network?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set as Home',
          onPress: () => {
            const label = 'Current WiFi';
            setSsidInput(label);
            updateSettings({ ...settings, homeSSID: label });
          },
        },
      ]);
    } else {
      Alert.alert('Not on WiFi', 'Connect to your home WiFi first, then try again.');
    }
  };

  const handleToggleGeofence = async (value: boolean) => {
    if (!value) {
      await updateSettings({ ...settings, geofenceEnabled: false });
      return;
    }
    const fg = await requestForegroundLocation();
    if (!fg.granted) {
      Alert.alert('Location Required', 'Please enable location access in Settings to use geofencing.');
      return;
    }
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
      Alert.alert('Set Home Location', `Use this as your home?\n\n${displayText}`, [
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
      ]);
    } finally {
      setSettingLocation(false);
    }
  };

  // ── Notification handlers ─────────────────────────────────────

  const updateNotifSettings = async (next: NotificationSettings) => {
    setNotifSettings(next);
    await saveNotificationSettings(next);
    if (next.streakReminders) {
      await scheduleStreakReminder();
    } else {
      await cancelStreakReminder();
    }
  };

  // ── Picker handler ────────────────────────────────────────────

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

  // ── Account handlers ──────────────────────────────────────────

  const handleResetChecks = () => {
    Alert.alert('Reset Checks', 'Uncheck all items for today?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => resetChecks() },
    ]);
  };

  const handleSignIn = () => {
    Alert.alert('Coming Soon', 'Email sign-in will be available in a future update.');
  };

  const handleExportData = () => {
    Alert.alert('Coming Soon', 'Data export will be available in a future update.');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => Alert.alert('Coming Soon', 'Account deletion will be available in a future update.'),
        },
      ],
    );
  };

  // ── About handlers ────────────────────────────────────────────

  const handleRateApp = () => {
    const url = Platform.select({
      ios: 'https://apps.apple.com/app/doorcheck/id000000000',
      android: 'https://play.google.com/store/apps/details?id=com.doorcheck.app',
      default: 'https://doorcheck.app',
    });
    Linking.openURL(url);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out DoorCheck — never forget your essentials when leaving home! https://doorcheck.app',
      });
    } catch {
      // User cancelled share
    }
  };

  const handleContactSupport = () => Linking.openURL('mailto:support@doorcheck.app');
  const handlePrivacyPolicy = () => Linking.openURL('https://doorcheck.app/privacy');
  const handleTerms = () => Linking.openURL('https://doorcheck.app/terms');

  // ── PRO handler ───────────────────────────────────────────────

  const handleUpgrade = () => {
    router.push('/upgrade');
  };

  // ── Format helpers ────────────────────────────────────────────

  const formatTime = (time: string) => {
    const [h] = time.split(':').map(Number);
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
  };

  const formatCooldown = (mins: number) =>
    COOLDOWN_OPTIONS.find((o) => o.value === mins)?.label ?? `${mins} min`;

  const formatRadius = (meters: number) =>
    RADIUS_OPTIONS.find((o) => o.value === meters)?.label ?? `${meters} m`;

  const formatCoords = (lat: number | null, lng: number | null) => {
    if (lat == null || lng == null) return 'Not set';
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  const pickerTitle = (() => {
    switch (pickerOpen) {
      case 'activeStart': return 'Active From';
      case 'activeEnd': return 'Active Until';
      case 'cooldown': return 'Cooldown';
      case 'radius': return 'Detection Radius';
      case 'quietStart': return 'Quiet Hours Start';
      case 'quietEnd': return 'Quiet Hours End';
      default: return '';
    }
  })();

  const pickerCurrentHour = (() => {
    switch (pickerOpen) {
      case 'activeStart': return settings.activeStart;
      case 'activeEnd': return settings.activeEnd;
      case 'quietStart': return notifSettings.quietHoursStart;
      case 'quietEnd': return notifSettings.quietHoursEnd;
      default: return '';
    }
  })();

  // ── Render ────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Settings</Text>

        {/* ── Departure Trigger ──────────────────────── */}
        <Text style={styles.sectionTitle}>DEPARTURE TRIGGER</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowLabel}>Trigger Enabled</Text>
              <Text style={styles.rowHint}>Get notified when you leave home</Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={handleToggleEnabled}
              trackColor={{ false: colors.border, true: colors.orange }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          {/* Home WiFi */}
          <View style={styles.compactRow}>
            <View style={styles.compactRowHeader}>
              <Text style={styles.rowLabel}>Home WiFi</Text>
              <Text style={[styles.statusDot, { color: wifiConnected ? colors.green : colors.border }]}>
                {wifiConnected ? 'Connected' : wifiConnected === null ? '' : 'Disconnected'}
              </Text>
            </View>
            <View style={styles.inlineInputRow}>
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
              <Pressable style={styles.smallBtn} onPress={handleDetectWifi}>
                <Text style={styles.smallBtnText}>Detect</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Home Location (geofence) */}
          <View style={styles.row}>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowLabel}>Home Location</Text>
              <Text style={styles.rowHint}>Geofence backup via GPS</Text>
            </View>
            <Switch
              value={settings.geofenceEnabled}
              onValueChange={handleToggleGeofence}
              disabled={!settings.enabled}
              trackColor={{ false: colors.border, true: colors.orange }}
              thumbColor="#FFFFFF"
            />
          </View>

          {settings.geofenceEnabled && (
            <>
              <View style={styles.locationMeta}>
                <Text style={[styles.rowValue, { flex: 1 }]}>
                  {formatCoords(settings.homeLatitude, settings.homeLongitude)}
                </Text>
                <Pressable
                  style={[styles.smallBtn, settingLocation && { opacity: 0.5 }]}
                  onPress={handleSetHomeLocation}
                  disabled={settingLocation}
                >
                  <Text style={styles.smallBtnText}>
                    {settingLocation ? 'Locating...' : 'Set Location'}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.divider} />

              <Pressable style={styles.row} onPress={() => setPickerOpen('radius')}>
                <Text style={styles.rowLabel}>Detection Radius</Text>
                <Text style={styles.rowValue}>{formatRadius(settings.homeRadiusMeters)}</Text>
              </Pressable>
            </>
          )}

          {!settings.geofenceEnabled && <View style={styles.divider} />}

          {/* Active Hours */}
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

        {/* ── Notifications ──────────────────────────── */}
        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowLabel}>Departure Alerts</Text>
              <Text style={styles.rowHint}>Notify when leaving home</Text>
            </View>
            <Switch
              value={notifSettings.departureNotifications}
              onValueChange={(v) => updateNotifSettings({ ...notifSettings, departureNotifications: v })}
              trackColor={{ false: colors.border, true: colors.orange }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.rowTextCol}>
              <Text style={styles.rowLabel}>Streak Reminders</Text>
              <Text style={styles.rowHint}>Daily reminder at 8 PM</Text>
            </View>
            <Switch
              value={notifSettings.streakReminders}
              onValueChange={(v) => updateNotifSettings({ ...notifSettings, streakReminders: v })}
              trackColor={{ false: colors.border, true: colors.orange }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

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

        {/* ── Account ────────────────────────────────── */}
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.card}>
          <Pressable style={styles.row} onPress={handleSignIn}>
            <Text style={styles.rowLabel}>Sign In with Email</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.row} onPress={handleExportData}>
            <Text style={styles.rowLabel}>Export Data</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.row} onPress={handleResetChecks}>
            <Text style={styles.rowLabel}>Reset Today's Checks</Text>
            <Text style={[styles.rowValue, { color: colors.orange }]}>Reset</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.row} onPress={handleDeleteAccount}>
            <Text style={[styles.rowLabel, { color: '#C0392B' }]}>Delete Account</Text>
          </Pressable>
        </View>

        {/* ── About ──────────────────────────────────── */}
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>{APP_VERSION}</Text>
          </View>

          <View style={styles.divider} />

          <Pressable style={styles.row} onPress={handleRateApp}>
            <Text style={styles.rowLabel}>Rate DoorCheck \u2B50</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.row} onPress={handleShare}>
            <Text style={styles.rowLabel}>Share with a Friend</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.row} onPress={handleContactSupport}>
            <Text style={styles.rowLabel}>Contact Support</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.row} onPress={handlePrivacyPolicy}>
            <Text style={styles.rowLabel}>Privacy Policy</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.row} onPress={handleTerms}>
            <Text style={styles.rowLabel}>Terms of Service</Text>
            <Text style={styles.chevron}>{'\u203A'}</Text>
          </Pressable>
        </View>

        {/* ── DoorCheck PRO ──────────────────────────── */}
        {!isPro && (
          <>
            <Text style={styles.sectionTitle}>DOORCHECK PRO</Text>
            <View style={styles.proCard}>
              <Text style={styles.proTitle}>Unlock DoorCheck PRO</Text>
              <View style={styles.proBenefits}>
                {PRO_BENEFITS.map((benefit) => (
                  <View key={benefit} style={styles.proBenefitRow}>
                    <Text style={styles.proCheck}>{'\u2713'}</Text>
                    <Text style={styles.proBenefitText}>{benefit}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.proPricing}>$3.99/mo or $29.99/year</Text>
              <Pressable style={styles.proBtn} onPress={handleUpgrade}>
                <Text style={styles.proBtnText}>Upgrade</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Option picker sheet ─────────────────────── */}
      <BottomSheet visible={pickerOpen !== null} onClose={() => setPickerOpen(null)}>
        <Text style={styles.pickerTitle}>{pickerTitle}</Text>
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
              : HOUR_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[styles.pickerOption, pickerCurrentHour === opt.value && styles.pickerOptionActive]}
                    onPress={() => handlePickerSelect(pickerOpen, opt.value)}
                  >
                    <Text style={[styles.pickerOptionText, pickerCurrentHour === opt.value && styles.pickerOptionTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
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
        <Pressable style={styles.explanationCancelBtn} onPress={() => setLocationExplanationVisible(false)}>
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
    paddingBottom: 60,
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
  chevron: {
    fontSize: 22,
    fontWeight: '400',
    color: colors.border,
    fontFamily: 'System',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  statusDot: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
  },

  // ── Compact / inline rows ─────────────────────────
  compactRow: {
    paddingVertical: 14,
  },
  compactRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  inlineInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  smallBtn: {
    backgroundColor: colors.orange,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  smallBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'System',
  },
  locationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 14,
  },

  // ── PRO card ──────────────────────────────────────
  proCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.orange,
    shadowColor: '#1A1612',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  proTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'System',
  },
  proBenefits: {
    marginBottom: 16,
    gap: 10,
  },
  proBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  proCheck: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.orange,
    fontFamily: 'System',
  },
  proBenefitText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.ink,
    fontFamily: 'System',
  },
  proPricing: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'System',
  },
  proBtn: {
    backgroundColor: colors.orange,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  proBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'System',
  },

  // ── Picker sheet ──────────────────────────────────
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

  // ── Explanation sheet ─────────────────────────────
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
