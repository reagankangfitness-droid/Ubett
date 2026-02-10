// ── Mock AsyncStorage ──────────────────────────────────────
// Variables referenced inside jest.mock() factories must be prefixed with "mock"
const mockStore = new Map();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key) => Promise.resolve(mockStore.get(key) ?? null)),
    setItem: jest.fn((key, value) => {
      mockStore.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key) => {
      mockStore.delete(key);
      return Promise.resolve();
    }),
    multiGet: jest.fn((keys) =>
      Promise.resolve(keys.map((k) => [k, mockStore.get(k) ?? null])),
    ),
    clear: jest.fn(() => {
      mockStore.clear();
      return Promise.resolve();
    }),
  },
}));

// Expose store for tests to seed/inspect
global.__asyncStorageStore = mockStore;

// ── Mock expo-notifications ────────────────────────────────
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('mock-notif-id')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  setNotificationCategoryAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
}));

// ── Mock expo-network ──────────────────────────────────────
jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(() =>
    Promise.resolve({ type: 'WIFI', isConnected: true }),
  ),
  NetworkStateType: {
    WIFI: 'WIFI',
    CELLULAR: 'CELLULAR',
    NONE: 'NONE',
  },
}));

// ── Mock expo-haptics ──────────────────────────────────────
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// ── Mock expo-location ─────────────────────────────────────
jest.mock('expo-location', () => ({
  startGeofencingAsync: jest.fn(() => Promise.resolve()),
  stopGeofencingAsync: jest.fn(() => Promise.resolve()),
  LocationGeofencingEventType: { Enter: 1, Exit: 2 },
}));

// ── Mock expo-task-manager ─────────────────────────────────
const mockTaskRegistry = {};
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn((name, fn) => {
    mockTaskRegistry[name] = fn;
  }),
  isTaskRegisteredAsync: jest.fn(() => Promise.resolve(false)),
}));
global.__taskRegistry = mockTaskRegistry;

// ── Mock expo-background-fetch ─────────────────────────────
jest.mock('expo-background-fetch', () => ({
  registerTaskAsync: jest.fn(() => Promise.resolve()),
  unregisterTaskAsync: jest.fn(() => Promise.resolve()),
  BackgroundFetchResult: {
    NewData: 'newData',
    NoData: 'noData',
    Failed: 'failed',
  },
}));

// ── Mock react-native-purchases ────────────────────────────
jest.mock('react-native-purchases', () => ({
  configure: jest.fn(),
  getOfferings: jest.fn(() => Promise.resolve({ current: null })),
  purchasePackage: jest.fn(),
  getCustomerInfo: jest.fn(() =>
    Promise.resolve({ entitlements: { active: {} } }),
  ),
}));
