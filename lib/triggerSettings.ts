import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'doorcheck_trigger_settings';

export interface TriggerSettings {
  enabled: boolean;
  /** User-facing label for the home WiFi network. */
  homeSSID: string;
  /** Active hours start (HH:mm, 24-h). */
  activeStart: string;
  /** Active hours end (HH:mm, 24-h). */
  activeEnd: string;
  /** Cooldown between triggers in minutes. */
  cooldownMinutes: number;
  /** ISO timestamp of the last trigger fire. */
  lastTriggeredAt: string | null;
}

export const DEFAULT_TRIGGER_SETTINGS: TriggerSettings = {
  enabled: false,
  homeSSID: '',
  activeStart: '06:00',
  activeEnd: '22:00',
  cooldownMinutes: 120,
  lastTriggeredAt: null,
};

export async function loadTriggerSettings(): Promise<TriggerSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TRIGGER_SETTINGS };
    return { ...DEFAULT_TRIGGER_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_TRIGGER_SETTINGS };
  }
}

export async function saveTriggerSettings(settings: TriggerSettings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** Returns true if the current time falls within the active window. */
export function isWithinActiveHours(start: string, end: string): boolean {
  const now = new Date();
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= sh * 60 + sm && mins <= eh * 60 + em;
}

/** Returns true if enough time has passed since the last trigger. */
export function isCooldownElapsed(lastTriggeredAt: string | null, cooldownMinutes: number): boolean {
  if (!lastTriggeredAt) return true;
  const elapsed = Date.now() - new Date(lastTriggeredAt).getTime();
  return elapsed >= cooldownMinutes * 60 * 1000;
}
