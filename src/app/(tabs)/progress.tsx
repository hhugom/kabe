import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export default function Progress() {
  const theme = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineSmall">Progress</Text>
      <Text variant="bodyMedium" style={styles.hint}>
        Phase 4 will show your PRs and charts here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 8 },
  hint: { opacity: 0.6 },
});
