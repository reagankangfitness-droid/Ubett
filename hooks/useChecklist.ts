import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  items: 'doorcheck:items',
  checks: 'doorcheck:checks',
  lastReset: 'doorcheck:lastReset',
  streak: 'doorcheck:streak',
} as const;

export interface LocalCheckItem {
  id: string;
  emoji: string;
  label: string;
  sortOrder: number;
}

export interface StreakData {
  current: number;
  longest: number;
  lastDate: string | null; // "YYYY-MM-DD"
}

const DEFAULT_ITEMS: LocalCheckItem[] = [
  { id: '1', emoji: '\uD83D\uDD11', label: 'Keys', sortOrder: 0 },
  { id: '2', emoji: '\uD83D\uDCF1', label: 'Phone', sortOrder: 1 },
  { id: '3', emoji: '\uD83D\uDCB3', label: 'Wallet', sortOrder: 2 },
  { id: '4', emoji: '\uD83C\uDF92', label: 'Bag', sortOrder: 3 },
  { id: '5', emoji: '\uD83C\uDF27\uFE0F', label: 'Umbrella', sortOrder: 4 },
];

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useChecklist() {
  const [items, setItems] = useState<LocalCheckItem[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState<StreakData>({ current: 0, longest: 0, lastDate: null });
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  // ── Load from storage ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [rawItems, rawChecks, rawReset, rawStreak] = await AsyncStorage.multiGet([
          STORAGE_KEYS.items,
          STORAGE_KEYS.checks,
          STORAGE_KEYS.lastReset,
          STORAGE_KEYS.streak,
        ]);

        // Items
        const storedItems: LocalCheckItem[] = rawItems[1] ? JSON.parse(rawItems[1]) : null;
        const loadedItems = storedItems ?? DEFAULT_ITEMS;
        setItems(loadedItems);

        // Auto-reset if day changed
        const lastReset = rawReset[1] ?? '';
        const today = todayKey();
        if (lastReset !== today) {
          setChecked(new Set());
          await AsyncStorage.setItem(STORAGE_KEYS.checks, '[]');
          await AsyncStorage.setItem(STORAGE_KEYS.lastReset, today);
        } else {
          const storedChecks: string[] = rawChecks[1] ? JSON.parse(rawChecks[1]) : [];
          setChecked(new Set(storedChecks));
        }

        // Streak
        const storedStreak: StreakData = rawStreak[1]
          ? JSON.parse(rawStreak[1])
          : { current: 0, longest: 0, lastDate: null };
        setStreak(storedStreak);
      } catch {
        setItems(DEFAULT_ITEMS);
      } finally {
        initialized.current = true;
        setLoading(false);
      }
    })();
  }, []);

  // ── Persist checks whenever they change ───────────────────
  useEffect(() => {
    if (!initialized.current) return;
    AsyncStorage.setItem(STORAGE_KEYS.checks, JSON.stringify([...checked]));
  }, [checked]);

  // ── Derived state ─────────────────────────────────────────
  const allChecked = items.length > 0 && items.every((i) => checked.has(i.id));
  const checkedCount = items.filter((i) => checked.has(i.id)).length;

  // ── Toggle a single item ──────────────────────────────────
  const toggle = useCallback(
    (id: string) => {
      setChecked((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }

        // Check if this toggle completes the list
        const willBeAllChecked = items.every((i) => next.has(i.id));
        if (willBeAllChecked) {
          const today = todayKey();
          setStreak((s) => {
            const isConsecutive = s.lastDate === yesterdayKey() || s.lastDate === today;
            const newCurrent = s.lastDate === today ? s.current : isConsecutive ? s.current + 1 : 1;
            const newLongest = Math.max(s.longest, newCurrent);
            const updated: StreakData = {
              current: newCurrent,
              longest: newLongest,
              lastDate: today,
            };
            AsyncStorage.setItem(STORAGE_KEYS.streak, JSON.stringify(updated));
            return updated;
          });
        }

        return next;
      });
    },
    [items],
  );

  // ── Manual reset ──────────────────────────────────────────
  const resetChecks = useCallback(async () => {
    setChecked(new Set());
    await AsyncStorage.setItem(STORAGE_KEYS.checks, '[]');
    await AsyncStorage.setItem(STORAGE_KEYS.lastReset, todayKey());
  }, []);

  return {
    items,
    checked,
    allChecked,
    checkedCount,
    streak,
    loading,
    toggle,
    resetChecks,
  };
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
