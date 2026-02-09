import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

interface Props {
  checkedDays: Set<string>;
  /** Number of past days to show (default 30) */
  days?: number;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short' });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function CalendarHeatmap({ checkedDays, days = 30 }: Props) {
  const today = new Date();
  const todayStr = dateKey(today);

  // Build array of dates from (days-1) ago to today
  const dates: Date[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    dates.push(d);
  }

  // Layout: 7 rows (Sun-Sat), fill columns left-to-right
  const ROWS = 7;
  const cols = Math.ceil(dates.length / ROWS);

  // Pad the beginning so the last day lands in the correct weekday row
  const lastDayOfWeek = dates[dates.length - 1].getDay(); // 0=Sun
  const paddingEnd = ROWS - 1 - lastDayOfWeek;
  const paddingStart = cols * ROWS - dates.length - paddingEnd;

  type CellData = { date: Date; key: string } | null;
  const grid: CellData[][] = Array.from({ length: ROWS }, () => []);

  // Fill with null padding at start
  let dateIdx = 0;
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < ROWS; row++) {
      const flatIdx = col * ROWS + row;
      if (flatIdx < paddingStart || dateIdx >= dates.length) {
        grid[row].push(null);
      } else {
        const d = dates[dateIdx];
        grid[row].push({ date: d, key: dateKey(d) });
        dateIdx++;
      }
    }
  }

  // Month labels: find first occurrence of each month in the top row
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  for (let col = 0; col < cols; col++) {
    // Find the first non-null cell in this column
    for (let row = 0; row < ROWS; row++) {
      const cell = grid[row][col];
      if (cell) {
        if (cell.date.getMonth() !== lastMonth) {
          lastMonth = cell.date.getMonth();
          monthLabels.push({ col, label: monthLabel(cell.date) });
        }
        break;
      }
    }
  }

  const CELL = 28;
  const GAP = 4;

  return (
    <View style={styles.container}>
      {/* Month labels */}
      <View style={[styles.monthRow, { marginLeft: 24 }]}>
        {monthLabels.map(({ col, label }) => (
          <Text
            key={`m-${col}`}
            style={[styles.monthText, { position: 'absolute', left: col * (CELL + GAP) }]}
          >
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.gridWrapper}>
        {/* Day labels */}
        <View style={styles.dayLabels}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <View key={i} style={{ height: CELL, marginBottom: GAP, justifyContent: 'center' }}>
              <Text style={styles.dayText}>{i % 2 === 1 ? d : ''}</Text>
            </View>
          ))}
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {grid.map((row, rowIdx) => (
            <View key={rowIdx} style={styles.row}>
              {row.map((cell, colIdx) => {
                if (!cell) {
                  return <View key={`e-${rowIdx}-${colIdx}`} style={[styles.cell, { width: CELL, height: CELL, marginRight: GAP, marginBottom: GAP, backgroundColor: 'transparent' }]} />;
                }
                const checked = checkedDays.has(cell.key);
                const isToday = cell.key === todayStr;
                return (
                  <View
                    key={cell.key}
                    style={[
                      styles.cell,
                      {
                        width: CELL,
                        height: CELL,
                        marginRight: GAP,
                        marginBottom: GAP,
                        backgroundColor: checked ? colors.green : colors.border,
                      },
                      isToday && styles.cellToday,
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  monthRow: {
    height: 18,
    marginBottom: 4,
    position: 'relative',
  },
  monthText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  gridWrapper: {
    flexDirection: 'row',
  },
  dayLabels: {
    width: 20,
    marginRight: 4,
  },
  dayText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.inkSoft,
    textAlign: 'center',
  },
  grid: {},
  row: {
    flexDirection: 'row',
  },
  cell: {
    borderRadius: 5,
  },
  cellToday: {
    borderWidth: 2,
    borderColor: colors.orange,
  },
});
