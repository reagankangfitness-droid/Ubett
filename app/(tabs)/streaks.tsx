import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { colors } from '@/constants/theme';
import { useStreak } from '@/hooks/useStreak';
import CalendarHeatmap from '@/components/CalendarHeatmap';

function getMessage(streak: number): string {
  if (streak <= 0) return 'Every streak starts with day 1.';
  if (streak <= 3) return "You're building momentum!";
  if (streak <= 7) return 'A whole week of remembering everything!';
  if (streak <= 14) return 'Two weeks strong. This is becoming a habit.';
  if (streak <= 30) return "You're unstoppable. \uD83D\uDD25";
  return 'Legend status. Your brain thanks you.';
}

export default function StreaksScreen() {
  const insets = useSafeAreaInsets();
  const { currentStreak, longestStreak, totalChecks, checkedDaysSet, loading } =
    useStreak();

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Big streak hero ─────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.hero}>
          <Text style={styles.fireEmoji}>{'\uD83D\uDD25'}</Text>
          <Text style={styles.bigNumber}>{currentStreak}</Text>
          <Text style={styles.bigLabel}>
            day{currentStreak !== 1 ? 's' : ''} streak
          </Text>
        </Animated.View>

        {/* ── Longest streak ──────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Text style={styles.longestText}>
            Longest streak: {longestStreak} day{longestStreak !== 1 ? 's' : ''}
          </Text>
        </Animated.View>

        {/* ── Motivational message ─────────────────────── */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.messageCard}>
          <Text style={styles.messageText}>{getMessage(currentStreak)}</Text>
        </Animated.View>

        {/* ── Calendar heatmap ─────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.heatmapCard}>
          <Text style={styles.sectionTitle}>Last 30 days</Text>
          <CalendarHeatmap checkedDays={checkedDaysSet} days={30} />
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
              <Text style={styles.legendLabel}>Missed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.green }]} />
              <Text style={styles.legendLabel}>All checked</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { borderWidth: 2, borderColor: colors.orange, backgroundColor: 'transparent' }]} />
              <Text style={styles.legendLabel}>Today</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Total checks stat ────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(400).delay(500)} style={styles.statCard}>
          <Text style={styles.statNumber}>{totalChecks}</Text>
          <Text style={styles.statLabel}>
            total successful check{totalChecks !== 1 ? 's' : ''}
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingText: {
    marginTop: 100,
    textAlign: 'center',
    color: colors.inkSoft,
    fontSize: 16,
  },

  // Hero
  hero: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  fireEmoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  bigNumber: {
    fontSize: 72,
    fontWeight: '800',
    color: colors.ink,
    lineHeight: 80,
    fontFamily: 'System',
  },
  bigLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.inkSoft,
    fontFamily: 'System',
  },

  // Longest
  longestText: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
    color: colors.inkSoft,
    marginBottom: 20,
    fontFamily: 'System',
  },

  // Message
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#1A1612',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'System',
  },

  // Heatmap card
  heatmapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#1A1612',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    fontFamily: 'System',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.inkSoft,
    fontFamily: 'System',
  },

  // Stat card
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#1A1612',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.green,
    fontFamily: 'System',
  },
  statLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.inkSoft,
    marginTop: 2,
    fontFamily: 'System',
  },
});
