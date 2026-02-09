import { useEffect } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const SCREEN_H = Dimensions.get('window').height;
const TIMING = { duration: 280 };

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function BottomSheet({ visible, onClose, children }: Props) {
  const translateY = useSharedValue(SCREEN_H);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, TIMING);
      backdrop.value = withTiming(1, TIMING);
    } else {
      translateY.value = withTiming(SCREEN_H, TIMING);
      backdrop.value = withTiming(0, TIMING);
    }
  }, [visible, translateY, backdrop]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value * 0.4,
  }));

  const handleClose = () => {
    translateY.value = withTiming(SCREEN_H, TIMING, () => {
      runOnJS(onClose)();
    });
    backdrop.value = withTiming(0, TIMING);
  };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.wrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    backgroundColor: '#FEFCF7',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: SCREEN_H * 0.85,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E8DFD0',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
});
