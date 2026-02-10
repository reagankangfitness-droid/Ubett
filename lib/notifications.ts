import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Set up the Android notification channel (no-op on iOS). */
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('departure', {
      name: 'Departure Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E85D26',
    });
  }
}

/** Fire a local "leaving home" reminder notification. */
export async function sendDepartureNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '\uD83D\uDEAA Leaving home?',
      body: 'Quick check! Make sure you have everything.',
      sound: true,
      ...(Platform.OS === 'android' ? { channelId: 'departure' } : {}),
    },
    trigger: null, // fire immediately
  });
}
