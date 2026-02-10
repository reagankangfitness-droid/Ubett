import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  LinearTransition,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/theme';

interface Props {
  emoji: string;
  label: string;
  isChecked: boolean;
  onToggle: () => void;
  onLongPress?: () => void;
  /** Index in the list — drives staggered entering animation. */
  index?: number;
  // Reorder mode
  isReordering?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ChecklistCard({
  emoji,
  label,
  isChecked,
  onToggle,
  onLongPress,
  index,
  isReordering,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: Props) {
  const scale = useSharedValue(1);
  const checkboxScale = useSharedValue(isChecked ? 1 : 0);
  const checkboxBounce = useSharedValue(1);
  const rowSlide = useSharedValue(0);

  checkboxScale.value = withSpring(isChecked ? 1 : 0, { damping: 12, stiffness: 180 });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: rowSlide.value },
    ],
  }));

  const checkboxContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkboxBounce.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkboxScale.value }],
    opacity: checkboxScale.value,
  }));

  const handlePress = () => {
    if (isReordering) return;

    // Card press feedback
    scale.value = withSequence(
      withTiming(0.97, { duration: 60 }),
      withSpring(1, { damping: 10, stiffness: 300 }),
    );

    // Extra animations when checking (not unchecking)
    if (!isChecked) {
      // Checkbox bounce: 1 → 1.25 → 1
      checkboxBounce.value = withSequence(
        withSpring(1.25, { damping: 6, stiffness: 400 }),
        withSpring(1, { damping: 10, stiffness: 300 }),
      );
      // Row nudge right then back
      rowSlide.value = withSequence(
        withTiming(2, { duration: 80 }),
        withTiming(0, { duration: 120 }),
      );
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  const handleLongPress = () => {
    if (isReordering) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress?.();
  };

  const handleMove = (direction: 'up' | 'down') => {
    Haptics.selectionAsync();
    if (direction === 'up') onMoveUp?.();
    else onMoveDown?.();
  };

  return (
    <Animated.View
      layout={LinearTransition.springify().damping(18).stiffness(200)}
      entering={FadeIn.delay((index ?? 0) * 50).duration(200)}
    >
      <AnimatedPressable
        style={[styles.card, isReordering && styles.cardReorder, cardStyle]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={400}
      >
        {isReordering ? (
          <>
            {/* Drag handle icon */}
            <Text style={styles.dragHandle}>{'\u2630'}</Text>
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={[styles.label, { flex: 1 }]}>{label}</Text>
            <View style={styles.arrowGroup}>
              <Pressable
                style={[styles.arrowBtn, isFirst && styles.arrowBtnDisabled]}
                onPress={() => handleMove('up')}
                disabled={isFirst}
              >
                <Text style={[styles.arrowText, isFirst && styles.arrowTextDisabled]}>{'\u25B2'}</Text>
              </Pressable>
              <Pressable
                style={[styles.arrowBtn, isLast && styles.arrowBtnDisabled]}
                onPress={() => handleMove('down')}
                disabled={isLast}
              >
                <Text style={[styles.arrowText, isLast && styles.arrowTextDisabled]}>{'\u25BC'}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Animated.View style={[styles.checkbox, checkboxContainerStyle]}>
              <Animated.View style={[styles.checkboxFill, fillStyle]}>
                <Text style={styles.checkmark}>{'\u2713'}</Text>
              </Animated.View>
            </Animated.View>
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={[styles.label, isChecked && styles.labelChecked]}>{label}</Text>
          </>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 10,
    shadowColor: '#1A1612',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardReorder: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  checkboxFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.green,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: -1,
  },
  emoji: {
    fontSize: 22,
    marginRight: 12,
  },
  label: {
    fontSize: 17,
    fontWeight: '500',
    color: colors.ink,
    fontFamily: 'System',
  },
  labelChecked: {
    color: colors.inkSoft,
  },

  // Reorder mode
  dragHandle: {
    fontSize: 18,
    color: colors.inkSoft,
    marginRight: 12,
  },
  arrowGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBtnDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    fontSize: 12,
    color: colors.ink,
    fontWeight: '700',
  },
  arrowTextDisabled: {
    color: colors.inkSoft,
  },
});
