import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export default function Drills() {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall">Drill library</Text>
      <Text variant="bodyMedium" style={styles.hint}>
        Phase 2 will list the 15 seeded drills here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 8 },
  hint: { opacity: 0.6 },
});
