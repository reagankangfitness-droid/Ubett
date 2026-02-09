import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { colors } from '@/constants/theme';
import { useChecklist } from '@/hooks/useChecklist';
import ChecklistCard from '@/components/ChecklistCard';
import StreakBar from '@/components/StreakBar';

export default function CheckScreen() {
  const insets = useSafeAreaInsets();
  const { items, checked, allChecked, checkedCount, streak, loading, toggle } =
    useChecklist();

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const handleToggle = (id: string) => {
    const willBeAllChecked =
      items.every((i) => (i.id === id ? !checked.has(id) : checked.has(i.id)));
    toggle(id);
    if (willBeAllChecked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.location}>{'\uD83D\uDCCD'} Leaving Home</Text>
          <Text style={styles.title}>Morning Check</Text>

          <Animated.Text
            key={allChecked ? 'done' : 'tap'}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={[styles.subtitle, allChecked && styles.subtitleDone]}
          >
            {allChecked ? '\u2713 All clear \u2014 go!' : 'Tap to confirm'}
          </Animated.Text>
        </View>

        {/* ── Progress pill ───────────────────────────── */}
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <Animated.View
              layout={LinearTransition.springify().damping(16)}
              style={[
                styles.progressFill,
                { width: `${items.length > 0 ? (checkedCount / items.length) * 100 : 0}%` as `${number}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {checkedCount}/{items.length}
          </Text>
        </View>

        {/* ── Checklist ───────────────────────────────── */}
        <View style={styles.list}>
          {items.map((item) => (
            <ChecklistCard
              key={item.id}
              emoji={item.emoji}
              label={item.label}
              isChecked={checked.has(item.id)}
              onToggle={() => handleToggle(item.id)}
            />
          ))}
        </View>
      </ScrollView>

      {/* ── Streak bar (pinned to bottom) ─────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        <StreakBar current={streak.current} longest={streak.longest} />
      </View>
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
    paddingBottom: 120,
  },
  loadingText: {
    marginTop: 100,
    textAlign: 'center',
    color: colors.inkSoft,
    fontSize: 16,
  },

  // Header
  header: {
    marginTop: 16,
    marginBottom: 20,
  },
  location: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.inkSoft,
    marginBottom: 4,
    fontFamily: 'System',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.ink,
    letterSpacing: -0.5,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.inkSoft,
    marginTop: 4,
    fontFamily: 'System',
  },
  subtitleDone: {
    color: colors.green,
  },

  // Progress
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.green,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkSoft,
    minWidth: 32,
    textAlign: 'right',
    fontFamily: 'System',
  },

  // List
  list: {
    gap: 0,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.cream,
  },
});
