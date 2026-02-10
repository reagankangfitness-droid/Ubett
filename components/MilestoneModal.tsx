import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { colors } from '@/constants/theme';

interface Props {
  visible: boolean;
  streak: number;
  onClose: () => void;
}

const MESSAGES: Record<number, string> = {
  7: 'One week strong!',
  14: 'Two weeks running!',
  30: 'A whole month!',
  60: 'Two months of consistency!',
  100: 'Triple digits!',
};

export default function MilestoneModal({ visible, streak, onClose }: Props) {
  if (!visible) return null;

  const message = MESSAGES[streak] ?? 'Keep it up!';

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(200)} style={styles.overlay}>
        <Animated.View
          entering={ZoomIn.springify().damping(12)}
          style={styles.card}
        >
          <Text style={styles.emoji}>{'\uD83C\uDF89'}</Text>
          <Text style={styles.title}>{streak} day streak!</Text>
          <Text style={styles.subtitle}>{message}</Text>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            onPress={onClose}
          >
            <Text style={styles.btnText}>Awesome!</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  card: {
    backgroundColor: colors.warmWhite,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
    marginBottom: 6,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'System',
  },
  btn: {
    backgroundColor: colors.orange,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'System',
  },
});
