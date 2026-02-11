import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'ubett_notification_settings';

export interface NotificationSettings {
  departureNotifications: boolean;
  streakReminders: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  departureNotifications: true,
  streakReminders: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

export async function loadNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_SETTINGS };
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
}

export async function saveNotificationSettings(
  settings: NotificationSettings,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** Returns true if the current time falls within the quiet hours window. */
export function isWithinQuietHours(start: string, end: string): boolean {
  const now = new Date();
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;

  if (startMins <= endMins) {
    // Same-day range (e.g., 08:00–20:00)
    return mins >= startMins && mins < endMins;
  }
  // Overnight range (e.g., 22:00–07:00)
  return mins >= startMins || mins < endMins;
}
