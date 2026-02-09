import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors } from '@/constants/theme';

interface Props {
  current: number;
  longest: number;
}

export default function StreakBar({ current, longest }: Props) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(current > 0 ? 1 : 0.95, { damping: 14 }) }],
    opacity: withSpring(current > 0 ? 1 : 0.5, { damping: 14 }),
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.row}>
        <Text style={styles.fire}>{'\uD83D\uDD25'}</Text>
        <Text style={styles.streakCount}>{current}</Text>
        <Text style={styles.streakLabel}>day streak</Text>
      </View>
      {longest > 0 && (
        <Text style={styles.best}>Best: {longest}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#1A1612',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fire: {
    fontSize: 22,
  },
  streakCount: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.orange,
    fontFamily: 'System',
  },
  streakLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.inkSoft,
    fontFamily: 'System',
  },
  best: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.inkSoft,
    fontFamily: 'System',
  },
});
