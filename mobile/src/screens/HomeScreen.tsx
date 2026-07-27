// Goal: See recent practice.
// Per docs/conventions/primary-vs-annex.md (updated by #8): Home is a dashboard surface.
// Start-a-Session moved to the tab-bar center button; Home no longer hosts a session-launch CTA.
import { StyleSheet, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { spacing, typography } from '../theme';

export function HomeScreen() {
  return (
    <Screen>
      <Text style={styles.hello}>Kabe</Text>
      <Text style={styles.tagline}>No recent practice yet</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hello: {
    ...typography.display,
  },
  tagline: {
    ...typography.body,
    marginTop: spacing.xs,
  },
});
