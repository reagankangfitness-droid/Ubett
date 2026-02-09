import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

export default function StreaksScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Streaks</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warmWhite,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.ink,
  },
});
