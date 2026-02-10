import { useCallback, useEffect, useRef, useState } from 'react';
import * as Network from 'expo-network';

import {
  type TriggerSettings,
  DEFAULT_TRIGGER_SETTINGS,
  loadTriggerSettings,
  saveTriggerSettings,
} from '@/lib/triggerSettings';
import { sendDepartureNotification } from '@/lib/notifications';
import { registerBackgroundTask, unregisterBackgroundTask } from '@/lib/backgroundTask';

const POLL_INTERVAL = 10_000; // check every 10 s
const DEBOUNCE_MS = 30_000;   // 30 s disconnect debounce

function isWithinActiveHours(start: string, end: string): boolean {
  const now = new Date();
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= sh * 60 + sm && mins <= eh * 60 + em;
}

function isCooldownElapsed(lastTriggeredAt: string | null, cooldownMinutes: number): boolean {
  if (!lastTriggeredAt) return true;
  const elapsed = Date.now() - new Date(lastTriggeredAt).getTime();
  return elapsed >= cooldownMinutes * 60 * 1000;
}

export function useDepartureTrigger() {
  const [settings, setSettings] = useState<TriggerSettings>(DEFAULT_TRIGGER_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [wifiConnected, setWifiConnected] = useState<boolean | null>(null);

  const wasOnWifi = useRef(false);
  const disconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

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
  }, []);

  // ── Foreground WiFi polling ─────────────────────────────────
  useEffect(() => {
    if (!settings.enabled) {
      // Clear timers when disabled
      if (disconnectTimer.current) {
        clearTimeout(disconnectTimer.current);
        disconnectTimer.current = null;
      }
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
            const s = settingsRef.current;

            if (!s.enabled) return;
            if (!isWithinActiveHours(s.activeStart, s.activeEnd)) return;
            if (!isCooldownElapsed(s.lastTriggeredAt, s.cooldownMinutes)) return;

            // Confirm still off WiFi
            const recheck = await Network.getNetworkStateAsync();
            const stillOff = recheck.type !== Network.NetworkStateType.WIFI || !recheck.isConnected;

            if (stillOff) {
              await sendDepartureNotification();
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
  }, [settings.enabled]);

  // ── Auto-detect current WiFi state for display ──────────────
  const detectWifi = useCallback(async (): Promise<boolean> => {
    const state = await Network.getNetworkStateAsync();
    return state.type === Network.NetworkStateType.WIFI && !!state.isConnected;
  }, []);

  return {
    settings,
    loading,
    wifiConnected,
    updateSettings,
    detectWifi,
  };
}
