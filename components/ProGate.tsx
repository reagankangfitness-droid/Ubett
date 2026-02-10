import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { usePro } from '@/contexts/ProContext';

interface Props {
  /** What to render when the user has PRO. */
  children: React.ReactNode;
  /** Short label shown on the gate, e.g. "Unlimited items". */
  feature?: string;
}

export default function ProGate({ children, feature }: Props) {
  const { isPro } = usePro();

  if (isPro) return <>{children}</>;

  return (
    <View style={styles.container}>
      <Text style={styles.lockIcon}>{'\uD83D\uDD12'}</Text>
      <Text style={styles.title}>PRO Feature</Text>
      {feature && <Text style={styles.subtitle}>{feature}</Text>}
      <Pressable style={styles.btn} onPress={() => router.push('/upgrade')}>
        <Text style={styles.btnText}>Upgrade to PRO</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  lockIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 14,
    color: colors.inkSoft,
    fontFamily: 'System',
  },
  btn: {
    backgroundColor: colors.orange,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'System',
  },
});
