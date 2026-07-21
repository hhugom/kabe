import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { colors, spacing, typography } from '../theme';

type Props = {
  onPress: () => void;
};

// Amber active-session pill — see docs/conventions/primary-vs-annex.md § allow-list
// and docs/conventions/navigation-surface.md § Active-session pill for the render rule
// (stack-push-with-header only; absent on tab-roots, sheets, modals, InSession itself).
// Parents supply the top safe-area inset (typically via SafeAreaView top edge).
export function ActiveSessionPill({ onPress }: Props) {
  return (
    <Pressable onPress={onPress} testID="active-session-pill" style={styles.pill}>
      <View style={styles.row}>
        <Icon name="play-arrow" size={24} color={colors.onAccent} />
        <Text style={styles.label}>Resume Session</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: '100%',
    minHeight: 56,
    backgroundColor: colors.accentAmber,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.title,
    color: colors.onAccent,
  },
});
