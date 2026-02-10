import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isWithinActiveHours,
  isCooldownElapsed,
  isWithinDeduplicationWindow,
  loadTriggerSettings,
  saveTriggerSettings,
  DEFAULT_TRIGGER_SETTINGS,
  type TriggerSettings,
} from '../lib/triggerSettings';

// Helper to mock current time
function mockTime(hours: number, minutes: number) {
  const date = new Date(2025, 5, 15, hours, minutes, 0);
  jest.useFakeTimers();
  jest.setSystemTime(date);
}

afterEach(() => {
  jest.useRealTimers();
  (global as any).__asyncStorageStore.clear();
});

// ── isWithinActiveHours ──────────────────────────────────────

describe('isWithinActiveHours', () => {
  it('returns true when within same-day range', () => {
    mockTime(12, 0);
    expect(isWithinActiveHours('06:00', '22:00')).toBe(true);
  });

  it('returns false when outside same-day range (before start)', () => {
    mockTime(5, 0);
    expect(isWithinActiveHours('06:00', '22:00')).toBe(false);
  });

  it('returns false when outside same-day range (after end)', () => {
    mockTime(23, 0);
    expect(isWithinActiveHours('06:00', '22:00')).toBe(false);
  });

  it('returns true at exact start boundary', () => {
    mockTime(6, 0);
    expect(isWithinActiveHours('06:00', '22:00')).toBe(true);
  });

  it('returns true at exact end boundary', () => {
    mockTime(22, 0);
    expect(isWithinActiveHours('06:00', '22:00')).toBe(true);
  });

  // Bug 1 regression: overnight range
  it('returns true during overnight range (23:00 with 22:00-07:00)', () => {
    mockTime(23, 0);
    expect(isWithinActiveHours('22:00', '07:00')).toBe(true);
  });

  it('returns true at start of overnight range', () => {
    mockTime(22, 0);
    expect(isWithinActiveHours('22:00', '07:00')).toBe(true);
  });

  it('returns true at end of overnight range', () => {
    mockTime(7, 0);
    expect(isWithinActiveHours('22:00', '07:00')).toBe(true);
  });

  it('returns true at 2:00 AM within overnight range', () => {
    mockTime(2, 0);
    expect(isWithinActiveHours('22:00', '07:00')).toBe(true);
  });

  it('returns false at 12:00 PM outside overnight range', () => {
    mockTime(12, 0);
    expect(isWithinActiveHours('22:00', '07:00')).toBe(false);
  });
});

// ── isCooldownElapsed ────────────────────────────────────────

describe('isCooldownElapsed', () => {
  it('returns true when lastTriggeredAt is null', () => {
    expect(isCooldownElapsed(null, 120)).toBe(true);
  });

  it('returns false when within cooldown', () => {
    const recent = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 min ago
    expect(isCooldownElapsed(recent, 120)).toBe(false);
  });

  it('returns true when past cooldown', () => {
    const old = new Date(Date.now() - 150 * 60 * 1000).toISOString(); // 150 min ago
    expect(isCooldownElapsed(old, 120)).toBe(true);
  });

  it('returns true at exact boundary', () => {
    const exact = new Date(Date.now() - 120 * 60 * 1000).toISOString();
    expect(isCooldownElapsed(exact, 120)).toBe(true);
  });
});

// ── isWithinDeduplicationWindow ──────────────────────────────

describe('isWithinDeduplicationWindow', () => {
  it('returns false when lastTriggeredAt is null', () => {
    expect(isWithinDeduplicationWindow(null)).toBe(false);
  });

  it('returns true when within 5 minutes', () => {
    const recent = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 2 min ago
    expect(isWithinDeduplicationWindow(recent)).toBe(true);
  });

  it('returns false when past 5 minutes', () => {
    const old = new Date(Date.now() - 6 * 60 * 1000).toISOString(); // 6 min ago
    expect(isWithinDeduplicationWindow(old)).toBe(false);
  });
});

// ── loadTriggerSettings / saveTriggerSettings ────────────────

describe('load/save round-trip', () => {
  it('returns defaults on empty storage', async () => {
    const settings = await loadTriggerSettings();
    expect(settings).toEqual(DEFAULT_TRIGGER_SETTINGS);
  });

  it('round-trips saved settings', async () => {
    const custom: TriggerSettings = {
      ...DEFAULT_TRIGGER_SETTINGS,
      enabled: true,
      homeSSID: 'MyWiFi',
      cooldownMinutes: 60,
    };
    await saveTriggerSettings(custom);
    const loaded = await loadTriggerSettings();
    expect(loaded).toEqual(custom);
  });

  it('merges with defaults for partial data', async () => {
    await AsyncStorage.setItem(
      'doorcheck_trigger_settings',
      JSON.stringify({ enabled: true }),
    );
    const loaded = await loadTriggerSettings();
    expect(loaded.enabled).toBe(true);
    expect(loaded.cooldownMinutes).toBe(DEFAULT_TRIGGER_SETTINGS.cooldownMinutes);
  });
});
