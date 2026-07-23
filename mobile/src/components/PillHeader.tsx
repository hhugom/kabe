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
  onMenuPress?: () => void;
};

// Custom stack-push header: [status bar → pill (if session) → header row → content],
// per docs/conventions/navigation-surface.md § Active-session pill.
// Wired via RootStack.Screen `options.header` for RoutineEditor.
export function PillHeader({ title, onBack, sessionActive, onResumePress, onMenuPress }: Props) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      {sessionActive ? <ActiveSessionPill onPress={onResumePress} /> : null}
      <View testID="pill-header-row" style={styles.row}>
        {onBack ? (
          <Pressable
            testID="pill-header-back"
            onPress={onBack}
            hitSlop={14}
            style={styles.iconSlot}
          >
            <Icon name="chevron-left" size={28} color={colors.textPrimary} />
          </Pressable>
        ) : (
          <View style={styles.iconSlot} />
        )}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {onMenuPress ? (
          <Pressable
            testID="pill-header-menu"
            onPress={onMenuPress}
            hitSlop={14}
            style={styles.iconSlot}
          >
            <Icon name="more-vert" size={24} color={colors.textPrimary} />
          </Pressable>
        ) : (
          <View style={styles.iconSlot} />
        )}
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
  iconSlot: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.caption,
    flex: 1,
    textAlign: 'center',
  },
});
