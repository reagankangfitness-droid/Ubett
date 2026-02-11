import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
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
import { ProProvider } from '@/contexts/ProContext';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Check onboarding status, setup notifications, then reveal app
  useEffect(() => {
    if (!loaded) return;

    (async () => {
      // Always safe to setup channels/categories
      await setupNotificationChannel();
      await setupNotificationCategories();

      const done = await AsyncStorage.getItem('ubett_onboarding_complete');

      if (done === 'true') {
        // Returning user — normal startup
        await requestNotificationPermissions();
        await scheduleStreakReminder();
      } else {
        // First launch — send to onboarding
        router.replace('/onboarding');
      }

      setIsReady(true);
      await SplashScreen.hideAsync();
    })();
  }, [loaded]);

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
          await AsyncStorage.setItem('ubett_checks', '[]');
          await AsyncStorage.setItem('ubett_last_reset', today);

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
    <ProProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="upgrade"
          options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </ProProvider>
  );
}
