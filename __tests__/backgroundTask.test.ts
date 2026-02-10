import * as BackgroundFetch from 'expo-background-fetch';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleDepartureNotification } from '../lib/notifications';

// Import the module to register the task via defineTask mock
import '../lib/backgroundTask';

const store = (global as any).__asyncStorageStore as Map<string, string>;
const taskRegistry = (global as any).__taskRegistry as Record<string, Function>;

jest.mock('../lib/notifications', () => ({
  scheduleDepartureNotification: jest.fn(() => Promise.resolve()),
  loadNotificationSettings: jest.fn(),
  isWithinQuietHours: jest.fn(),
}));

const TASK_NAME = 'doorcheck-departure-check';

function seedSettings(overrides: Record<string, any> = {}) {
  const settings = {
    enabled: true,
    homeSSID: 'MyWiFi',
    activeStart: '06:00',
    activeEnd: '22:00',
    cooldownMinutes: 120,
    lastTriggeredAt: null,
    geofenceEnabled: false,
    homeLatitude: null,
    homeLongitude: null,
    homeRadiusMeters: 150,
    ...overrides,
  };
  store.set('doorcheck_trigger_settings', JSON.stringify(settings));
}

function mockTime(hours: number, minutes: number) {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2025, 5, 15, hours, minutes, 0));
}

function setNetworkState(type: string, isConnected: boolean) {
  (Network.getNetworkStateAsync as jest.Mock).mockResolvedValue({
    type,
    isConnected,
  });
}

beforeEach(() => {
  store.clear();
  jest.clearAllMocks();
  setNetworkState('CELLULAR', true); // default: not on WiFi
});

afterEach(() => {
  jest.useRealTimers();
});

describe('background WiFi departure task', () => {
  it('returns NoData when disabled', async () => {
    seedSettings({ enabled: false });
    mockTime(12, 0);
    const result = await taskRegistry[TASK_NAME]();
    expect(result).toBe(BackgroundFetch.BackgroundFetchResult.NoData);
  });

  it('returns NoData when outside active hours', async () => {
    seedSettings({ enabled: true });
    mockTime(4, 0); // 4 AM — outside 06:00-22:00
    const result = await taskRegistry[TASK_NAME]();
    expect(result).toBe(BackgroundFetch.BackgroundFetchResult.NoData);
  });

  it('returns NoData when within cooldown', async () => {
    const recent = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    seedSettings({ enabled: true, lastTriggeredAt: recent });
    mockTime(12, 0);
    const result = await taskRegistry[TASK_NAME]();
    expect(result).toBe(BackgroundFetch.BackgroundFetchResult.NoData);
  });

  // Bug 6 regression: dedup window check
  it('returns NoData when within dedup window', async () => {
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    seedSettings({
      enabled: true,
      lastTriggeredAt: twoMinAgo,
      cooldownMinutes: 1, // cooldown elapsed, but dedup should block
    });
    mockTime(12, 0);
    const result = await taskRegistry[TASK_NAME]();
    expect(result).toBe(BackgroundFetch.BackgroundFetchResult.NoData);
  });

  it('returns NoData when on WiFi', async () => {
    seedSettings({ enabled: true });
    mockTime(12, 0);
    setNetworkState('WIFI', true);
    const result = await taskRegistry[TASK_NAME]();
    expect(result).toBe(BackgroundFetch.BackgroundFetchResult.NoData);
  });

  it('fires notification when off WiFi and all checks pass', async () => {
    seedSettings({ enabled: true });
    mockTime(12, 0);
    setNetworkState('CELLULAR', true);
    const result = await taskRegistry[TASK_NAME]();
    expect(result).toBe(BackgroundFetch.BackgroundFetchResult.NewData);
    expect(scheduleDepartureNotification).toHaveBeenCalledTimes(1);

    // Verify lastTriggeredAt was updated
    const stored = JSON.parse(store.get('doorcheck_trigger_settings')!);
    expect(stored.lastTriggeredAt).toBeTruthy();
  });
});
