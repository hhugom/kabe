import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

type Props = {
  children?: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  edges?: readonly Edge[];
};

const DEFAULT_EDGES: readonly Edge[] = ['top', 'left', 'right'];

export function Screen({ children, style, padded = true, edges = DEFAULT_EDGES }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <View style={[styles.container, padded ? styles.padded : null, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
});
