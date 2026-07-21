import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActiveSessionPill } from './ActiveSessionPill';
import { Icon } from './Icon';
import { colors, spacing, typography } from '../theme';

type Props = {
  title: string;
  onBack?: () => void;
  sessionActive: boolean;
  onResumePress: () => void;
};

// Custom stack-push header: [status bar → pill (if session) → header row → content],
// per docs/conventions/navigation-surface.md § Active-session pill.
// Wired via RootStack.Screen `options.header` for RoutineEditor.
export function PillHeader({ title, onBack, sessionActive, onResumePress }: Props) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      {sessionActive ? <ActiveSessionPill onPress={onResumePress} /> : null}
      <View testID="pill-header-row" style={styles.row}>
        {onBack ? (
          <Pressable
            testID="pill-header-back"
            onPress={onBack}
            hitSlop={16}
            style={styles.backBtn}
          >
            <Icon name="chevron-left" size={28} color={colors.textPrimary} />
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.backBtn} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.bg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.sm,
  },
  backBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.subtitle,
    flex: 1,
    textAlign: 'center',
  },
});
