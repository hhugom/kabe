import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { SessionCard } from './SessionCard';
import type { HistorySession } from '../use-cases/session-history';
import { colors, spacing, typography } from '../theme';

type Props = {
  sessions: HistorySession[];
  /** Reference point for relative-day labels; injectable for tests. */
  now?: Date;
  onViewHistory?: () => void;
  onOpenSession?: (id: string) => void;
};

// Home's "Recent practice" teaser below the Start hero (issue #45): the most-recent
// completed sessions as the same SessionCard the History screen uses, each capped to
// its first three drills. The active session is not shown here — the Start hero above
// already morphs to Resume.
export function RecentPractice({ sessions, onViewHistory, onOpenSession }: Props) {
  if (sessions.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={typography.label}>Recent practice</Text>
        <Text style={styles.empty}>No recent practice yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={typography.label}>Recent practice</Text>
        <Pressable onPress={onViewHistory} hitSlop={8} style={styles.inlineLink}>
          <Text style={styles.inlineLinkText}>View history</Text>
          <Icon name="chevron-right" size={16} color={colors.accent} />
        </Pressable>
      </View>

      {sessions.map((s) => (
        <SessionCard key={s.id} session={s} maxDrills={3} onPress={onOpenSession} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.xs },
  empty: { ...typography.body, marginTop: spacing.xs },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  inlineLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  inlineLinkText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '700',
    textTransform: 'none',
  },
});
