import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStreak } from '../hooks/useStreak';

const store = (global as any).__asyncStorageStore as Map<string, string>;

beforeEach(() => {
  store.clear();
  jest.clearAllMocks();
});

async function renderAndWait() {
  const result = renderHook(() => useStreak());
  await act(async () => {});
  return result;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('useStreak', () => {
  it('starts with zero streak', async () => {
    const { result } = await renderAndWait();
    expect(result.current.currentStreak).toBe(0);
    expect(result.current.longestStreak).toBe(0);
    expect(result.current.totalChecks).toBe(0);
    expect(result.current.loading).toBe(false);
  });

  it('first check sets streak to 1', async () => {
    const { result } = await renderAndWait();
    act(() => {
      result.current.recordCheck();
    });
    expect(result.current.currentStreak).toBe(1);
    expect(result.current.totalChecks).toBe(1);
  });

  it('same-day duplicate does not change streak', async () => {
    const { result } = await renderAndWait();
    act(() => {
      result.current.recordCheck();
    });
    act(() => {
      result.current.recordCheck();
    });
    expect(result.current.currentStreak).toBe(1);
    expect(result.current.totalChecks).toBe(1);
  });

  it('consecutive day increments streak', async () => {
    // Seed: checked yesterday, streak = 1
    const yesterday = yesterdayKey();
    store.set(
      'ubett_streak',
      JSON.stringify({
        currentStreak: 1,
        longestStreak: 1,
        lastCheckDate: yesterday,
        totalChecks: 1,
        checkedDays: [yesterday],
      }),
    );

    const { result } = await renderAndWait();
    expect(result.current.currentStreak).toBe(1);

    act(() => {
      result.current.recordCheck();
    });
    expect(result.current.currentStreak).toBe(2);
    expect(result.current.longestStreak).toBe(2);
  });

  it('gap day resets streak to 1', async () => {
    // Seed: checked 3 days ago, streak = 5
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const dateStr = `${threeDaysAgo.getFullYear()}-${String(threeDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(threeDaysAgo.getDate()).padStart(2, '0')}`;

    store.set(
      'ubett_streak',
      JSON.stringify({
        currentStreak: 5,
        longestStreak: 5,
        lastCheckDate: dateStr,
        totalChecks: 5,
        checkedDays: [dateStr],
      }),
    );

    const { result } = await renderAndWait();
    act(() => {
      result.current.recordCheck();
    });
    expect(result.current.currentStreak).toBe(1);
    expect(result.current.longestStreak).toBe(5); // preserved
  });

  it('longestStreak is preserved through reset', async () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const dateStr = `${threeDaysAgo.getFullYear()}-${String(threeDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(threeDaysAgo.getDate()).padStart(2, '0')}`;

    store.set(
      'ubett_streak',
      JSON.stringify({
        currentStreak: 10,
        longestStreak: 10,
        lastCheckDate: dateStr,
        totalChecks: 10,
        checkedDays: [],
      }),
    );

    const { result } = await renderAndWait();
    act(() => {
      result.current.recordCheck();
    });
    expect(result.current.currentStreak).toBe(1);
    expect(result.current.longestStreak).toBe(10);
  });

  // Bug 5 regression: totalChecks always equals checkedDays.length
  it('totalChecks equals checkedDays count', async () => {
    const yesterday = yesterdayKey();
    store.set(
      'ubett_streak',
      JSON.stringify({
        currentStreak: 1,
        longestStreak: 1,
        lastCheckDate: yesterday,
        totalChecks: 1,
        checkedDays: [yesterday],
      }),
    );

    const { result } = await renderAndWait();
    act(() => {
      result.current.recordCheck();
    });

    // totalChecks should equal the number of unique checked days
    expect(result.current.totalChecks).toBe(2); // yesterday + today
    expect(result.current.checkedDaysSet.size).toBe(2);
    expect(result.current.totalChecks).toBe(result.current.checkedDaysSet.size);
  });
});
