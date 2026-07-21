import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from './Screen';
import { spacing, typography } from '../theme';

type Props = {
  hero?: ReactNode;
  children?: ReactNode;
};

// Archetype 1 — Tab-root. See docs/conventions/navigation-surface.md § Four screen archetypes.
// Chrome mark ("Kabe") + in-content hero slot + tab-bar footprint reserved at bottom.
const TAB_BAR_FOOTPRINT = 88;

export function TabRootLayout({ hero, children }: Props) {
  return (
    <Screen style={styles.container}>
      <Text style={styles.chromeMark}>Kabe</Text>
      {hero ? <View style={styles.hero}>{hero}</View> : null}
      <View style={styles.content}>{children}</View>
      <View style={styles.tabBarSpacer} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chromeMark: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  hero: {
    marginBottom: spacing.lg,
  },
  content: {
    flex: 1,
  },
  tabBarSpacer: {
    height: TAB_BAR_FOOTPRINT,
  },
});
