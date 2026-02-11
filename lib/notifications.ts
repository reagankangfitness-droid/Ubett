import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadNotificationSettings, isWithinQuietHours } from './notificationSettings';

const STREAK_NOTIF_ID_KEY = 'ubett_streak_notification_id';

/** Configure how notifications appear when the app is in the foreground. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Request notification permissions and return the granted status. */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Set up Android notification channels (no-op on iOS). */
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('departure', {
      name: 'Departure Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E85D26',
    });
    await Notifications.setNotificationChannelAsync('streaks', {
      name: 'Streak Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#E85D26',
    });
  }
}

/** Register notification categories with interactive actions. */
export async function setupNotificationCategories(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.setNotificationCategoryAsync('DEPARTURE_CHECK', [
    {
      identifier: 'open_check',
      buttonTitle: 'Open Checklist',
      options: { opensAppToForeground: true },
    },
  ]);
}

/**
 * Fire a "leaving home" reminder notification.
 * Respects notification settings (departure toggle + quiet hours).
 */
export async function scheduleDepartureNotification(): Promise<void> {
  if (Platform.OS === 'web') return;

  // Check permission before scheduling
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  try {
    const settings = await loadNotificationSettings();
    if (!settings.departureNotifications) return;
    if (isWithinQuietHours(settings.quietHoursStart, settings.quietHoursEnd)) return;
  } catch {
    // If we can't load settings, send anyway
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '\uD83D\uDEAA Leaving home?',
      body: 'Quick check \u2014 tap to confirm your essentials',
      sound: true,
      color: '#E85D26',
      categoryIdentifier: 'DEPARTURE_CHECK',
      ...(Platform.OS === 'android' ? { channelId: 'departure' } : {}),
    },
    trigger: null, // fire immediately
  });
}

/**
 * Schedule a "welcome back" notification.
 * PRO feature — returns false for free users (caller should show upgrade prompt).
 */
export async function scheduleReturnNotification(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  // PRO feature — always returns false until subscription is implemented
  const isPro = false;
  if (!isPro) return false;

  // Check permission before scheduling
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '\uD83C\uDFE0 Welcome back!',
      body: 'Did you bring everything home?',
      sound: true,
      color: '#E85D26',
      ...(Platform.OS === 'android' ? { channelId: 'departure' } : {}),
    },
    trigger: null,
  });
  return true;
}

/**
 * Schedule an 8 PM streak reminder for today.
 * Skips if: reminders disabled, past 8 PM, or today's checks already complete.
 */
export async function scheduleStreakReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const settings = await loadNotificationSettings();
    if (!settings.streakReminders) return;

    const now = new Date();
    if (now.getHours() >= 20) return; // Past 8 PM

    // Check if today's checks are already complete
    if (await areTodayChecksComplete()) return;

    // Cancel any existing streak reminder first
    await cancelStreakReminder();

    const eightPm = new Date();
    eightPm.setHours(20, 0, 0, 0);
    const seconds = Math.max(1, Math.floor((eightPm.getTime() - now.getTime()) / 1000));

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '\uD83D\uDD25 Don\u2019t break your streak!',
        body: 'You haven\u2019t done your Ubett check today.',
        sound: true,
        color: '#E85D26',
        ...(Platform.OS === 'android' ? { channelId: 'streaks' } : {}),
      },
      trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    });

    await AsyncStorage.setItem(STREAK_NOTIF_ID_KEY, id);
  } catch {
    // Scheduling failed — not critical
  }
}

/** Cancel a pending streak reminder notification. */
export async function cancelStreakReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const id = await AsyncStorage.getItem(STREAK_NOTIF_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(STREAK_NOTIF_ID_KEY);
    }
  } catch {
    // Cancellation failed — not critical
  }
}

// ── Internal helpers ──────────────────────────────────────────

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function areTodayChecksComplete(): Promise<boolean> {
  try {
    const [rawItems, rawChecks, rawReset] = await AsyncStorage.multiGet([
      'ubett_items',
      'ubett_checks',
      'ubett_last_reset',
    ]);

    // If checks weren't reset today, they're stale (not done today)
    if (rawReset[1] !== todayKey()) return false;

    const items: Array<{ id: string; isActive: boolean }> = rawItems[1]
      ? JSON.parse(rawItems[1])
      : [];
    const checks: string[] = rawChecks[1] ? JSON.parse(rawChecks[1]) : [];
    const checkSet = new Set(checks);
    const activeItems = items.filter((i) => i.isActive);

    return activeItems.length > 0 && activeItems.every((i) => checkSet.has(i.id));
  } catch {
    return false;
  }
}
