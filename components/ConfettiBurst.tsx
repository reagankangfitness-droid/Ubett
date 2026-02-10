import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const COLORS = ['#E85D26', '#2D8B5F', '#F5A623', '#FF6B6B', '#4ECDC4', '#E8DFD0'];
const PARTICLE_COUNT = 24;
const DURATION = 700;
const GRAVITY = 400;

interface ParticleConfig {
  cosAngle: number;
  sinAngle: number;
  speed: number;
  size: number;
  color: string;
  shape: 'circle' | 'square';
}

function createParticles(): ParticleConfig[] {
  return Array.from({ length: PARTICLE_COUNT }, () => {
    const angle = Math.random() * Math.PI * 2;
    return {
      cosAngle: Math.cos(angle),
      sinAngle: Math.sin(angle),
      speed: 100 + Math.random() * 200,
      size: 4 + Math.random() * 5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: Math.random() > 0.5 ? 'circle' : 'square',
    };
  });
}

function Particle({
  config,
  progress,
}: {
  config: ParticleConfig;
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const x = config.cosAngle * config.speed * t;
    const y = config.sinAngle * config.speed * t + GRAVITY * t * t;
    return {
      opacity: interpolate(t, [0, 0.6, 1], [1, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: x },
        { translateY: y },
        {
          scale: interpolate(
            t,
            [0, 0.2, 1],
            [0, 1.2, 0.3],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: config.size,
          height: config.size,
          borderRadius: config.shape === 'circle' ? config.size / 2 : 2,
          backgroundColor: config.color,
        },
        style,
      ]}
    />
  );
}

interface Props {
  /** Increment to fire a new burst. 0 = idle. */
  trigger: number;
}

export default function ConfettiBurst({ trigger }: Props) {
  const progress = useSharedValue(0);
  const [particles, setParticles] = useState<ParticleConfig[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger > 0) {
      setParticles(createParticles());
      setVisible(true);
      progress.value = 0;
      progress.value = withTiming(1, { duration: DURATION });
      const timer = setTimeout(() => setVisible(false), DURATION + 50);
      return () => clearTimeout(timer);
    }
  }, [trigger, progress]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((p, i) => (
        <Particle key={i} config={p} progress={progress} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
