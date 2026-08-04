import { SectionList, StyleSheet, Text, View } from 'react-native';
import { relativeDay } from '../relative-day';
import { SessionCard } from './SessionCard';
import type { HistorySession } from '../use-cases/session-history';
import { spacing, typography } from '../theme';

type Props = {
  sessions: HistorySession[];
  /** Reference point for relative-day labels; injectable for tests. */
  now?: Date;
  onOpenSession?: (id: string) => void;
};

type Section = { title: string; data: HistorySession[] };

// Group sessions under relative-day headers using the same `relativeDay` formatter
// as Home's "Recent practice" section, so the two surfaces read identically. Input
// is newest-first; section order follows first-seen, preserving that.
function groupByDay(sessions: HistorySession[], now: Date): Section[] {
  const sections: Section[] = [];
  const byLabel = new Map<string, Section>();
  for (const s of sessions) {
    const label = relativeDay(new Date(s.startedAt), now);
    let sec = byLabel.get(label);
    if (!sec) {
      sec = { title: label, data: [] };
      byLabel.set(label, sec);
      sections.push(sec);
    }
    sec.data.push(s);
  }
  return sections;
}

// The full practice-history screen body: completed sessions grouped under relative-day
// headers, each an uncapped SessionCard (the same card Home's Recent practice caps).
export function SessionHistory({ sessions, now = new Date(), onOpenSession }: Props) {
  if (sessions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No practice logged yet</Text>
      </View>
    );
  }

  const sections = groupByDay(sessions, now);
  const firstTitle = sections[0]?.title;

  return (
    <SectionList
      sections={sections}
      keyExtractor={(s) => s.id}
      contentContainerStyle={styles.content}
      stickySectionHeadersEnabled={false}
      renderSectionHeader={({ section }) => (
        <Text
          style={[typography.label, styles.section, section.title === firstTitle && styles.sectionFirst]}
        >
          {section.title}
        </Text>
      )}
      renderItem={({ item }: { item: HistorySession }) => (
        <SessionCard session={item} onPress={onOpenSession} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  empty: { paddingTop: spacing.xl },
  emptyText: { ...typography.body },
  content: { paddingBottom: spacing.xl },
  section: { marginTop: spacing.lg, marginBottom: spacing.xs, paddingHorizontal: spacing.xs },
  sectionFirst: { marginTop: 0 },
});
