import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isWithinQuietHours,
  loadNotificationSettings,
  saveNotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
} from '../lib/notificationSettings';

function mockTime(hours: number, minutes: number) {
  const date = new Date(2025, 5, 15, hours, minutes, 0);
  jest.useFakeTimers();
  jest.setSystemTime(date);
}

afterEach(() => {
  jest.useRealTimers();
  (global as any).__asyncStorageStore.clear();
});

// ── isWithinQuietHours ───────────────────────────────────────

describe('isWithinQuietHours', () => {
  it('returns true within same-day range', () => {
    mockTime(12, 0);
    expect(isWithinQuietHours('08:00', '20:00')).toBe(true);
  });

  it('returns false outside same-day range', () => {
    mockTime(7, 0);
    expect(isWithinQuietHours('08:00', '20:00')).toBe(false);
  });

  // Overnight range (22:00-07:00) — the typical quiet hours
  it('returns true at 23:00 within overnight range', () => {
    mockTime(23, 0);
    expect(isWithinQuietHours('22:00', '07:00')).toBe(true);
  });

  it('returns true at 3:00 AM within overnight range', () => {
    mockTime(3, 0);
    expect(isWithinQuietHours('22:00', '07:00')).toBe(true);
  });

  it('returns true at exactly 22:00 (start of overnight range)', () => {
    mockTime(22, 0);
    expect(isWithinQuietHours('22:00', '07:00')).toBe(true);
  });

  it('returns false at exactly 07:00 (end of overnight range, exclusive)', () => {
    mockTime(7, 0);
    expect(isWithinQuietHours('22:00', '07:00')).toBe(false);
  });

  it('returns true at 06:59 within overnight range', () => {
    mockTime(6, 59);
    expect(isWithinQuietHours('22:00', '07:00')).toBe(true);
  });

  it('returns false at 12:00 PM outside overnight range', () => {
    mockTime(12, 0);
    expect(isWithinQuietHours('22:00', '07:00')).toBe(false);
  });
});

// ── load/save round-trip ─────────────────────────────────────

describe('load/save round-trip', () => {
  it('returns defaults on empty storage', async () => {
    const settings = await loadNotificationSettings();
    expect(settings).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
  });

  it('round-trips saved settings', async () => {
    const custom: NotificationSettings = {
      departureNotifications: false,
      streakReminders: false,
      quietHoursStart: '23:00',
      quietHoursEnd: '06:00',
    };
    await saveNotificationSettings(custom);
    const loaded = await loadNotificationSettings();
    expect(loaded).toEqual(custom);
  });
});
