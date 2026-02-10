import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useChecklist, FREE_TIER_LIMIT } from '../hooks/useChecklist';

const store = (global as any).__asyncStorageStore as Map<string, string>;

beforeEach(() => {
  store.clear();
  jest.clearAllMocks();
});

// Helper: wait for hook to finish loading
async function renderAndWait() {
  const result = renderHook(() => useChecklist());
  // Wait for the async load effect
  await act(async () => {});
  return result;
}

describe('useChecklist', () => {
  it('loads default items on first launch', async () => {
    const { result } = await renderAndWait();
    expect(result.current.items).toHaveLength(5);
    expect(result.current.items[0].label).toBe('Phone');
    expect(result.current.loading).toBe(false);
  });

  it('starts with no items checked', async () => {
    const { result } = await renderAndWait();
    expect(result.current.checked.size).toBe(0);
    expect(result.current.allChecked).toBe(false);
  });

  it('toggles an item to checked', async () => {
    const { result } = await renderAndWait();
    act(() => {
      result.current.toggle('1');
    });
    expect(result.current.checked.has('1')).toBe(true);
    expect(result.current.checkedCount).toBe(1);
  });

  it('toggles an item back to unchecked', async () => {
    const { result } = await renderAndWait();
    act(() => {
      result.current.toggle('1');
    });
    act(() => {
      result.current.toggle('1');
    });
    expect(result.current.checked.has('1')).toBe(false);
  });

  it('allChecked becomes true when all items are toggled', async () => {
    const { result } = await renderAndWait();
    const ids = result.current.items.map((i) => i.id);

    // Toggle all but the last
    for (let i = 0; i < ids.length - 1; i++) {
      act(() => {
        result.current.toggle(ids[i]);
      });
    }
    expect(result.current.allChecked).toBe(false);

    // Toggle the last — allChecked should become true
    act(() => {
      result.current.toggle(ids[ids.length - 1]);
    });
    expect(result.current.allChecked).toBe(true);
    expect(result.current.checkedCount).toBe(ids.length);
  });

  it('adds a new item', async () => {
    const { result } = await renderAndWait();
    act(() => {
      result.current.addItem('🎒', 'Backpack');
    });
    expect(result.current.items).toHaveLength(6);
    expect(result.current.items[5].label).toBe('Backpack');
    expect(result.current.items[5].emoji).toBe('🎒');
  });

  it('deletes an item', async () => {
    const { result } = await renderAndWait();
    act(() => {
      result.current.deleteItem('1');
    });
    expect(result.current.items).toHaveLength(4);
    expect(result.current.items.find((i) => i.id === '1')).toBeUndefined();
  });

  it('removes deleted item from checked set', async () => {
    const { result } = await renderAndWait();
    act(() => {
      result.current.toggle('1');
    });
    expect(result.current.checked.has('1')).toBe(true);
    act(() => {
      result.current.deleteItem('1');
    });
    expect(result.current.checked.has('1')).toBe(false);
  });

  it('allChecked becomes false when a checked item is deleted and others remain', async () => {
    const { result } = await renderAndWait();
    // Check all items
    for (const item of result.current.items) {
      act(() => {
        result.current.toggle(item.id);
      });
    }
    expect(result.current.allChecked).toBe(true);

    // Add a new item (unchecked)
    act(() => {
      result.current.addItem('🎒', 'Backpack');
    });
    expect(result.current.allChecked).toBe(false);
  });

  it('persists checks to AsyncStorage', async () => {
    const { result } = await renderAndWait();
    act(() => {
      result.current.toggle('1');
    });
    // Wait for the persist effect
    await act(async () => {});
    const stored = store.get('doorcheck_checks');
    expect(stored).toBeDefined();
    expect(JSON.parse(stored!)).toContain('1');
  });

  it('counts active items correctly', async () => {
    const { result } = await renderAndWait();
    expect(result.current.activeItemCount).toBe(5);
  });

  it('resets checks on midnight rollover', async () => {
    // Seed storage with yesterday's reset date and some checks
    store.set('doorcheck_items', JSON.stringify([
      { id: '1', emoji: '📱', label: 'Phone', sortOrder: 0, isActive: true },
    ]));
    store.set('doorcheck_checks', JSON.stringify(['1']));
    store.set('doorcheck_last_reset', '2020-01-01'); // old date

    const { result } = await renderAndWait();
    expect(result.current.checked.size).toBe(0);
  });
});
