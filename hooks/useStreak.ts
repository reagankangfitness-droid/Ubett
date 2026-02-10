import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'doorcheck_streak';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCheckDate: string | null; // "YYYY-MM-DD"
  totalChecks: number;
  checkedDays: string[];         // ["2025-03-01", "2025-03-02", …]
}

const EMPTY: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastCheckDate: null,
  totalChecks: 0,
  checkedDays: [],
};

function dateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
}

export function useStreak() {
  const [data, setData] = useState<StreakData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  // ── Load ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: StreakData = JSON.parse(raw);
          // Ensure checkedDays exists for older data
          if (!parsed.checkedDays) parsed.checkedDays = [];
          if (parsed.totalChecks == null) parsed.totalChecks = parsed.checkedDays.length;
          setData(parsed);
        }
      } catch {
        // first launch — leave EMPTY
      } finally {
        initialized.current = true;
        setLoading(false);
      }
    })();
  }, []);

  // ── Persist whenever data changes (after React commits state) ──
  useEffect(() => {
    if (!initialized.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch((err) =>
      console.warn('[useStreak] persist failed:', err),
    );
  }, [data]);

  // ── Record a successful check for today ───────────────────
  const recordCheck = useCallback(() => {
    setData((prev) => {
      const today = dateKey();

      // Already recorded today — no change
      if (prev.lastCheckDate === today) return prev;

      const yesterday = yesterdayKey();
      const isConsecutive = prev.lastCheckDate === yesterday;
      const newCurrent = isConsecutive ? prev.currentStreak + 1 : 1;
      const newLongest = Math.max(prev.longestStreak, newCurrent);

      // Add today to checkedDays (deduplicate)
      const days = new Set(prev.checkedDays);
      days.add(today);

      return {
        currentStreak: newCurrent,
        longestStreak: newLongest,
        lastCheckDate: today,
        totalChecks: days.size,
        checkedDays: [...days],
      };
    });
  }, []);

  // ── Derived: Set of checked days for fast lookup ──────────
  const checkedDaysSet = useMemo(() => new Set(data.checkedDays), [data.checkedDays]);

  return {
    currentStreak: data.currentStreak,
    longestStreak: data.longestStreak,
    lastCheckDate: data.lastCheckDate,
    totalChecks: data.totalChecks,
    checkedDaysSet,
    loading,
    recordCheck,
  };
}
