import { useCallback, useEffect, useRef, useState } from 'react';
import * as Network from 'expo-network';

import {
  type TriggerSettings,
  DEFAULT_TRIGGER_SETTINGS,
  loadTriggerSettings,
  saveTriggerSettings,
  isWithinActiveHours,
  isCooldownElapsed,
} from '@/lib/triggerSettings';
import { scheduleDepartureNotification } from '@/lib/notifications';
import { registerBackgroundTask, unregisterBackgroundTask } from '@/lib/backgroundTask';
import { startGeofencing, stopGeofencing } from '@/lib/geofenceTask';

const POLL_INTERVAL = 10_000; // check every 10 s
const DEBOUNCE_MS = 30_000;   // 30 s disconnect debounce

export function useDepartureTrigger() {
  const [settings, setSettings] = useState<TriggerSettings>(DEFAULT_TRIGGER_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [wifiConnected, setWifiConnected] = useState<boolean | null>(null);

  const wasOnWifi = useRef(false);
  const disconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Track component mount status
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // ── Load settings on mount ──────────────────────────────────
  useEffect(() => {
    (async () => {
      const loaded = await loadTriggerSettings();
      setSettings(loaded);
      setLoading(false);
    })();
  }, []);

  // ── Save + sync background task when settings change ─────────
  const updateSettings = useCallback(async (next: TriggerSettings) => {
    setSettings(next);
    await saveTriggerSettings(next);

    if (next.enabled) {
      await registerBackgroundTask();
    } else {
      await unregisterBackgroundTask();
    }

    // Sync geofence lifecycle
    try {
      if (next.enabled && next.geofenceEnabled && next.homeLatitude != null && next.homeLongitude != null) {
        await startGeofencing(next.homeLatitude, next.homeLongitude, next.homeRadiusMeters);
      } else {
        await stopGeofencing();
      }
    } catch {
      // User may have revoked location permission
    }
  }, []);

  // ── Foreground WiFi polling ─────────────────────────────────
  useEffect(() => {
    if (!settings.enabled) {
      // Clear timers and reset state when disabled
      if (disconnectTimer.current) {
        clearTimeout(disconnectTimer.current);
        disconnectTimer.current = null;
      }
      wasOnWifi.current = false;
      return;
    }

    const check = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        const onWifi = state.type === Network.NetworkStateType.WIFI && !!state.isConnected;
        setWifiConnected(onWifi);

        if (onWifi) {
          // On WiFi → remember this, clear any pending debounce
          wasOnWifi.current = true;
          if (disconnectTimer.current) {
            clearTimeout(disconnectTimer.current);
            disconnectTimer.current = null;
          }
        } else if (wasOnWifi.current && !disconnectTimer.current) {
          // Just lost WiFi → start 30 s debounce
          disconnectTimer.current = setTimeout(async () => {
            disconnectTimer.current = null;
            if (!isMounted.current) return;
            const s = settingsRef.current;

            if (!s.enabled) return;
            if (!isWithinActiveHours(s.activeStart, s.activeEnd)) return;
            if (!isCooldownElapsed(s.lastTriggeredAt, s.cooldownMinutes)) return;

            // Confirm still off WiFi
            const recheck = await Network.getNetworkStateAsync();
            const stillOff = recheck.type !== Network.NetworkStateType.WIFI || !recheck.isConnected;

            if (stillOff) {
              await scheduleDepartureNotification();
              const updated = { ...s, lastTriggeredAt: new Date().toISOString() };
              setSettings(updated);
              await saveTriggerSettings(updated);
              wasOnWifi.current = false;
            }
          }, DEBOUNCE_MS);
        }
      } catch {
        // Network check failed, skip this cycle
      }
    };

    check(); // initial check
    const interval = setInterval(check, POLL_INTERVAL);

    return () => {
      clearInterval(interval);
      if (disconnectTimer.current) {
        clearTimeout(disconnectTimer.current);
        disconnectTimer.current = null;
      }
    };
  }, [settings.enabled, settings.cooldownMinutes, settings.activeStart, settings.activeEnd]);

  // ── Auto-detect current WiFi state for display ──────────────
  const detectWifi = useCallback(async (): Promise<boolean> => {
    const state = await Network.getNetworkStateAsync();
    return state.type === Network.NetworkStateType.WIFI && !!state.isConnected;
  }, []);

  const geofenceActive =
    settings.enabled &&
    settings.geofenceEnabled &&
    settings.homeLatitude != null &&
    settings.homeLongitude != null;

  return {
    settings,
    loading,
    wifiConnected,
    updateSettings,
    detectWifi,
    geofenceActive,
  };
}
