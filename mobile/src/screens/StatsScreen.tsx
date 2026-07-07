import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { spacing, typography } from '../theme';

export function StatsScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Stats</Text>
        <Text style={styles.body}>Coming soon — per-drill totals and target hits.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.title,
  },
  body: {
    ...typography.bodyMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
