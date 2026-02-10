import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Network from 'expo-network';

import { loadTriggerSettings, saveTriggerSettings } from './triggerSettings';
import { sendDepartureNotification } from './notifications';

export const DEPARTURE_TASK_NAME = 'doorcheck-departure-check';

/**
 * Returns true if the current time falls within the active window.
 */
function isWithinActiveHours(start: string, end: string): boolean {
  const now = new Date();
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= sh * 60 + sm && mins <= eh * 60 + em;
}

/**
 * Returns true if enough time has passed since the last trigger.
 */
function isCooldownElapsed(lastTriggeredAt: string | null, cooldownMinutes: number): boolean {
  if (!lastTriggeredAt) return true;
  const elapsed = Date.now() - new Date(lastTriggeredAt).getTime();
  return elapsed >= cooldownMinutes * 60 * 1000;
}

/**
 * Define the background task.  Must be called at module-level (outside components).
 */
TaskManager.defineTask(DEPARTURE_TASK_NAME, async () => {
  try {
    const settings = await loadTriggerSettings();

    if (!settings.enabled) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    if (!isWithinActiveHours(settings.activeStart, settings.activeEnd)) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    if (!isCooldownElapsed(settings.lastTriggeredAt, settings.cooldownMinutes)) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const networkState = await Network.getNetworkStateAsync();
    const isOnWifi = networkState.type === Network.NetworkStateType.WIFI && networkState.isConnected;

    // If NOT on WiFi → user may have left home → fire notification
    if (!isOnWifi) {
      await sendDepartureNotification();
      await saveTriggerSettings({
        ...settings,
        lastTriggeredAt: new Date().toISOString(),
      });
      return BackgroundFetch.BackgroundFetchResult.NewData;
    }

    return BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register the background fetch task with the OS.
 */
export async function registerBackgroundTask(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(DEPARTURE_TASK_NAME);
  if (isRegistered) return;

  await BackgroundFetch.registerTaskAsync(DEPARTURE_TASK_NAME, {
    minimumInterval: 15 * 60, // 15 minutes (OS minimum)
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

/**
 * Unregister the background fetch task.
 */
export async function unregisterBackgroundTask(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(DEPARTURE_TASK_NAME);
  if (!isRegistered) return;

  await BackgroundFetch.unregisterTaskAsync(DEPARTURE_TASK_NAME);
}
