import { StyleSheet, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { spacing, typography } from '../theme';

export function HomeScreen() {
  return (
    <Screen>
      <Text style={styles.hello}>Kabe</Text>
      <Text style={styles.tagline}>Solo tennis, tracked.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hello: {
    ...typography.display,
  },
  tagline: {
    ...typography.bodyMuted,
    marginTop: spacing.xs,
  },
});
