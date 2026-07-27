// Goal: Start a Session (with Recent practice as dashboard content below).
// Home hosts the Start hero (see docs/conventions/navigation-surface.md § Home Start hero).
import { StyleSheet, Text } from 'react-native';
import { HomeStartHero } from '../components/HomeStartHero';
import { Screen } from '../components/Screen';
import { spacing, typography } from '../theme';

export function HomeScreen() {
  return (
    <Screen>
      <Text style={styles.hello}>Kabe</Text>
      <HomeStartHero />
      <Text style={styles.sectionLabel}>Recent practice</Text>
      <Text style={styles.tagline}>No recent practice yet</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hello: {
    ...typography.display,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.body,
    marginTop: spacing.xs,
  },
});
