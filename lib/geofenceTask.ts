import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import {
  loadTriggerSettings,
  saveTriggerSettings,
  isWithinActiveHours,
  isCooldownElapsed,
  isWithinDeduplicationWindow,
} from './triggerSettings';
import { scheduleDepartureNotification } from './notifications';

export const GEOFENCE_TASK_NAME = 'ubett-geofence-task';

/**
 * Define the geofence background task. Must be called at module level.
 */
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }) => {
  if (error) return;

  const { eventType } = data as { eventType: Location.LocationGeofencingEventType };

  // Only handle exit events
  if (eventType !== Location.LocationGeofencingEventType.Exit) return;

  try {
    const settings = await loadTriggerSettings();

    if (!settings.enabled) return;
    if (!settings.geofenceEnabled) return;
    if (!isWithinActiveHours(settings.activeStart, settings.activeEnd)) return;
    if (!isCooldownElapsed(settings.lastTriggeredAt, settings.cooldownMinutes)) return;

    // Skip if WiFi (or another geofence event) already triggered within 5 min
    if (isWithinDeduplicationWindow(settings.lastTriggeredAt)) return;

    await scheduleDepartureNotification();
    await saveTriggerSettings({
      ...settings,
      lastTriggeredAt: new Date().toISOString(),
    });
  } catch {
    // Silently fail — background tasks should not throw
  }
});

/**
 * Start geofencing around the given coordinates.
 */
export async function startGeofencing(
  lat: number,
  lng: number,
  radius: number,
): Promise<void> {
  await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, [
    {
      identifier: 'home',
      latitude: lat,
      longitude: lng,
      radius,
      notifyOnExit: true,
      notifyOnEnter: false,
    },
  ]);
}

/**
 * Stop geofencing if currently running.
 */
export async function stopGeofencing(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK_NAME);
  if (!isRegistered) return;
  await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
}
