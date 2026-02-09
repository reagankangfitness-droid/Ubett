import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  items: 'doorcheck_items',
  checks: 'doorcheck:checks',
  lastReset: 'doorcheck:lastReset',
} as const;

export const FREE_TIER_LIMIT = 6;

export interface TimeRule {
  days: number[]; // 0 = Sun … 6 = Sat
  start: string;  // "HH:mm"
  end: string;    // "HH:mm"
}

export interface LocalCheckItem {
  id: string;
  emoji: string;
  label: string;
  sortOrder: number;
  timeRule?: TimeRule | null;
  isActive: boolean;
}

const DEFAULT_ITEMS: LocalCheckItem[] = [
  { id: '1', emoji: '\uD83D\uDCF1', label: 'Phone', sortOrder: 0, isActive: true },
  { id: '2', emoji: '\uD83D\uDC5B', label: 'Wallet', sortOrder: 1, isActive: true },
  { id: '3', emoji: '\uD83D\uDD11', label: 'Keys', sortOrder: 2, isActive: true },
  { id: '4', emoji: '\uD83D\uDC8A', label: 'Medication', sortOrder: 3, isActive: true },
  { id: '5', emoji: '\uD83E\uDD57', label: 'Lunch', sortOrder: 4, isActive: true },
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useChecklist() {
  const [items, setItems] = useState<LocalCheckItem[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  // ── Load from storage ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [rawItems, rawChecks, rawReset] = await AsyncStorage.multiGet([
          STORAGE_KEYS.items,
          STORAGE_KEYS.checks,
          STORAGE_KEYS.lastReset,
        ]);

        const storedItems: LocalCheckItem[] | null = rawItems[1] ? JSON.parse(rawItems[1]) : null;
        const loadedItems = storedItems ?? DEFAULT_ITEMS;
        setItems(loadedItems);

        if (!storedItems) {
          await AsyncStorage.setItem(STORAGE_KEYS.items, JSON.stringify(DEFAULT_ITEMS));
        }

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

  // ── Helper: persist items ─────────────────────────────────
  const persistItems = useCallback((next: LocalCheckItem[]) => {
    AsyncStorage.setItem(STORAGE_KEYS.items, JSON.stringify(next));
  }, []);

  // ── Derived state ─────────────────────────────────────────
  const activeItems = items.filter((i) => i.isActive);
  const allChecked = activeItems.length > 0 && activeItems.every((i) => checked.has(i.id));
  const checkedCount = activeItems.filter((i) => checked.has(i.id)).length;

  // ── Toggle a single item ──────────────────────────────────
  // Returns true if this toggle completes the list.
  const toggle = useCallback(
    (id: string): boolean => {
      let completed = false;
      setChecked((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }

        const currentActive = items.filter((i) => i.isActive);
        completed = currentActive.every((i) => next.has(i.id));
        return next;
      });
      return completed;
    },
    [items],
  );

  // ── Add item ──────────────────────────────────────────────
  const addItem = useCallback(
    (emoji: string, label: string, timeRule?: TimeRule | null) => {
      setItems((prev) => {
        const newItem: LocalCheckItem = {
          id: generateId(),
          emoji,
          label,
          sortOrder: prev.length,
          timeRule: timeRule ?? null,
          isActive: true,
        };
        const next = [...prev, newItem];
        persistItems(next);
        return next;
      });
    },
    [persistItems],
  );

  // ── Update item ───────────────────────────────────────────
  const updateItem = useCallback(
    (id: string, updates: Partial<Pick<LocalCheckItem, 'emoji' | 'label' | 'timeRule' | 'isActive'>>) => {
      setItems((prev) => {
        const next = prev.map((item) => (item.id === id ? { ...item, ...updates } : item));
        persistItems(next);
        return next;
      });
    },
    [persistItems],
  );

  // ── Delete item ───────────────────────────────────────────
  const deleteItem = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev
          .filter((item) => item.id !== id)
          .map((item, i) => ({ ...item, sortOrder: i }));
        persistItems(next);
        return next;
      });
      setChecked((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [persistItems],
  );

  // ── Reorder: move item from one index to another ──────────
  const reorderItems = useCallback(
    (fromIndex: number, toIndex: number) => {
      setItems((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        const renumbered = next.map((item, i) => ({ ...item, sortOrder: i }));
        persistItems(renumbered);
        return renumbered;
      });
    },
    [persistItems],
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
    loading,
    toggle,
    addItem,
    updateItem,
    deleteItem,
    reorderItems,
    resetChecks,
  };
}
