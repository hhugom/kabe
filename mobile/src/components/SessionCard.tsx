import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  attainmentBand,
  drillActualLabel,
  drillTargetLabel,
  formatDuration,
  type AttainmentBand,
  type DrillLine,
} from '../drill-line';
import type { HistoryDrill, HistorySession } from '../use-cases/session-history';
import { colors, radius, spacing, typography } from '../theme';

const BAND_COLOR: Record<AttainmentBand, string> = {
  good: colors.accentGreen,
  ok: colors.accentAmber,
  poor: colors.danger,
};

type Props = {
  session: HistorySession;
  /** Cap the drill lines shown; the rest collapse into a "+N more drills" row. */
  maxDrills?: number;
  onPress?: (id: string) => void;
};

function durationSeconds(startedAt: string, endedAt: string): number {
  return Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000);
}

// One completed session as a card: header (routine name / "Free session" + duration)
// above its per-drill lines. Shared by the History screen and Home's Recent practice
// teaser so the two surfaces render identical cards.
export function SessionCard({ session, maxDrills, onPress }: Props) {
  const shown =
    maxDrills != null ? session.drills.slice(0, maxDrills) : session.drills;
  const hidden = session.drills.length - shown.length;

  return (
    <Pressable
      testID="history-session-card"
      style={styles.card}
      onPress={() => onPress?.(session.id)}
    >
      <View style={styles.head}>
        <Text style={styles.routine} numberOfLines={1}>
          {session.routineName ?? 'Free session'}
        </Text>
        <Text style={styles.duration}>
          {formatDuration(durationSeconds(session.startedAt, session.endedAt))}
        </Text>
      </View>
      <View style={styles.drills}>
        {shown.map((d) => (
          <DrillRow key={d.drillId} drill={d} />
        ))}
        {hidden > 0 ? <Text style={styles.more}>+{hidden} more drills</Text> : null}
      </View>
    </Pressable>
  );
}

// One drill line laid out in columns: name (dimmed, flex) · actual (coloured by
// attainment) · "/" · target (grey), each in its own units.
function DrillRow({ drill }: { drill: HistoryDrill }) {
  const line: DrillLine = drill;
  return (
    <View style={styles.drillRow} testID="history-drill-row">
      <Text style={styles.drillName} numberOfLines={1}>
        {drill.name}
      </Text>
      <Text style={[styles.actual, { color: BAND_COLOR[attainmentBand(line)] }]}>
        {drillActualLabel(line)}
      </Text>
      <Text style={styles.sep}>/</Text>
      <Text style={styles.target}>{drillTargetLabel(line)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceHi,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  routine: { ...typography.subtitle, color: colors.accent, flex: 1 },
  duration: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  drills: { gap: spacing.sm },
  drillRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  drillName: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  actual: { ...typography.caption, fontWeight: '800', fontVariant: ['tabular-nums'] },
  sep: { ...typography.caption, color: colors.textMuted },
  target: { ...typography.caption, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  more: { ...typography.caption, color: colors.textSecondary },
});
