import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { Row } from './Row';
import { relativeDay } from '../relative-day';
import type { RecentSession } from '../use-cases/recent-sessions';
import { colors, radius, spacing, typography } from '../theme';

type Props = {
  sessions: RecentSession[];
  /** Reference point for relative-day labels; injectable for tests. */
  now?: Date;
  onViewHistory?: () => void;
  onOpenSession?: (id: string) => void;
};

// Home's "Recent practice" teaser below the Start hero (issue #45, variant A):
// a lean list of the most-recent completed sessions. The active session is not shown
// here — the Start hero above already morphs to Resume.
export function RecentPractice({ sessions, now = new Date(), onViewHistory, onOpenSession }: Props) {
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
        <Row
          key={s.id}
          testID="recent-session-row"
          title={relativeDay(new Date(s.startedAt), now)}
          meta={s.routineName ?? 'Free session'}
          trailing={<Badge>{drillLabel(s.drillCount)}</Badge>}
          onPress={() => onOpenSession?.(s.id)}
        />
      ))}
    </View>
  );
}

function drillLabel(count: number): string {
  return `${count} drill${count === 1 ? '' : 's'}`;
}

function Badge({ children }: { children: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{children}</Text>
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
  badge: {
    backgroundColor: colors.surfaceHi,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badgeText: { ...typography.caption, color: colors.accent, fontWeight: '700' },
});
