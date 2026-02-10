import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import 'react-native-reanimated';

// Register background tasks (must be at module level)
import '@/lib/backgroundTask';
import '@/lib/geofenceTask';
import {
  requestNotificationPermissions,
  setupNotificationChannel,
  setupNotificationCategories,
  scheduleStreakReminder,
} from '@/lib/notifications';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Initialize notifications on startup
  useEffect(() => {
    (async () => {
      await setupNotificationChannel();
      await setupNotificationCategories();
      await requestNotificationPermissions();
      await scheduleStreakReminder();
    })();
  }, []);

  // Handle notification taps
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const categoryId =
          response.notification.request.content.categoryIdentifier;

        if (categoryId === 'DEPARTURE_CHECK') {
          // Reset today's checks so the user gets a fresh checklist
          const d = new Date();
          const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          await AsyncStorage.setItem('doorcheck_checks', '[]');
          await AsyncStorage.setItem('doorcheck_last_reset', today);

          // Navigate to the checklist tab
          router.navigate('/');
        }
      },
    );

    return () => subscription.remove();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
