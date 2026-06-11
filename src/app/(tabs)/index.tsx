import { View, StyleSheet } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';

export default function Home() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={styles.title}>
        Kabe
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Track your tennis wall practice forever
      </Text>
      <Button mode="contained" style={styles.cta} disabled>
        Start session
      </Button>
      <Text variant="bodySmall" style={styles.hint}>
        Phase 2 will hook this up to SQLite.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  title: { fontWeight: '700' },
  subtitle: { opacity: 0.7, marginBottom: 24 },
  cta: { marginTop: 12 },
  hint: { marginTop: 24, opacity: 0.5 },
});
