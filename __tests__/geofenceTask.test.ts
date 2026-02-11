import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleDepartureNotification } from '../lib/notifications';

// Import the module to register the task via defineTask mock
import '../lib/geofenceTask';

const store = (global as any).__asyncStorageStore as Map<string, string>;
const taskRegistry = (global as any).__taskRegistry as Record<string, Function>;

jest.mock('../lib/notifications', () => ({
  scheduleDepartureNotification: jest.fn(() => Promise.resolve()),
  loadNotificationSettings: jest.fn(),
  isWithinQuietHours: jest.fn(),
}));

const TASK_NAME = 'ubett-geofence-task';

function seedSettings(overrides: Record<string, any> = {}) {
  const settings = {
    enabled: true,
    homeSSID: 'MyWiFi',
    activeStart: '06:00',
    activeEnd: '22:00',
    cooldownMinutes: 120,
    lastTriggeredAt: null,
    geofenceEnabled: true,
    homeLatitude: 37.7749,
    homeLongitude: -122.4194,
    homeRadiusMeters: 150,
    ...overrides,
  };
  store.set('ubett_trigger_settings', JSON.stringify(settings));
}

function mockTime(hours: number, minutes: number) {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2025, 5, 15, hours, minutes, 0));
}

beforeEach(() => {
  store.clear();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('geofence task', () => {
  it('ignores enter events', async () => {
    seedSettings();
    mockTime(12, 0);
    await taskRegistry[TASK_NAME]({
      data: { eventType: Location.LocationGeofencingEventType.Enter },
      error: null,
    });
    expect(scheduleDepartureNotification).not.toHaveBeenCalled();
  });

  it('fires notification on exit event with all checks passing', async () => {
    seedSettings();
    mockTime(12, 0);
    await taskRegistry[TASK_NAME]({
      data: { eventType: Location.LocationGeofencingEventType.Exit },
      error: null,
    });
    expect(scheduleDepartureNotification).toHaveBeenCalledTimes(1);
  });

  it('skips when disabled', async () => {
    seedSettings({ enabled: false });
    mockTime(12, 0);
    await taskRegistry[TASK_NAME]({
      data: { eventType: Location.LocationGeofencingEventType.Exit },
      error: null,
    });
    expect(scheduleDepartureNotification).not.toHaveBeenCalled();
  });

  it('skips when geofence is disabled', async () => {
    seedSettings({ geofenceEnabled: false });
    mockTime(12, 0);
    await taskRegistry[TASK_NAME]({
      data: { eventType: Location.LocationGeofencingEventType.Exit },
      error: null,
    });
    expect(scheduleDepartureNotification).not.toHaveBeenCalled();
  });

  it('skips when within dedup window', async () => {
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    seedSettings({
      lastTriggeredAt: twoMinAgo,
      cooldownMinutes: 1, // cooldown elapsed, but dedup should block
    });
    mockTime(12, 0);
    await taskRegistry[TASK_NAME]({
      data: { eventType: Location.LocationGeofencingEventType.Exit },
      error: null,
    });
    expect(scheduleDepartureNotification).not.toHaveBeenCalled();
  });

  it('skips when outside active hours', async () => {
    seedSettings();
    mockTime(4, 0); // 4 AM
    await taskRegistry[TASK_NAME]({
      data: { eventType: Location.LocationGeofencingEventType.Exit },
      error: null,
    });
    expect(scheduleDepartureNotification).not.toHaveBeenCalled();
  });
});
