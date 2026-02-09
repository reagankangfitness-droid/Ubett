import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/theme';

interface Props {
  emoji: string;
  label: string;
  isChecked: boolean;
  onToggle: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function ChecklistCard({ emoji, label, isChecked, onToggle }: Props) {
  const scale = useSharedValue(1);
  const checkboxScale = useSharedValue(isChecked ? 1 : 0);

  // Keep the fill in sync when state changes externally (e.g. reset)
  checkboxScale.value = withSpring(isChecked ? 1 : 0, { damping: 12, stiffness: 180 });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkboxScale.value }],
    opacity: checkboxScale.value,
  }));

  const handlePress = () => {
    // Satisfying "pop" animation on the card
    scale.value = withSequence(
      withTiming(0.97, { duration: 60 }),
      withSpring(1, { damping: 10, stiffness: 300 }),
    );

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  return (
    <AnimatedPressable style={[styles.card, cardStyle]} onPress={handlePress}>
      {/* Checkbox */}
      <View style={styles.checkbox}>
        <Animated.View style={[styles.checkboxFill, fillStyle]}>
          <Text style={styles.checkmark}>✓</Text>
        </Animated.View>
      </View>

      {/* Emoji + Label */}
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.label, isChecked && styles.labelChecked]}>{label}</Text>
    </AnimatedPressable>
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
    // subtle shadow
    shadowColor: '#1A1612',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
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
});
