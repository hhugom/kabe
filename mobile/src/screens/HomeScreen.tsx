// Goal: Start a Session (with Recent practice as dashboard content below).
// Home hosts the Start hero (see docs/conventions/navigation-surface.md § Home Start hero).
// The "Recent practice" section below the hero is the resolved variant A (issue #45): a lean
// list of recent completed sessions; the active session is excluded (the hero owns Resume).
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { HomeStartHero } from '../components/HomeStartHero';
import { RecentPractice } from '../components/RecentPractice';
import { Screen } from '../components/Screen';
import { useSessionActions } from '../components/session-actions';
import { getAppDb } from '../db/client';
import { listRecentSessions, RecentSession } from '../use-cases/recent-sessions';
import { spacing, typography } from '../theme';

export function HomeScreen() {
  // Refetch when the active session ends (sessionActive → false): the just-finished
  // session becomes a completed one and should surface in the list.
  const { sessionActive } = useSessionActions();
  const [sessions, setSessions] = useState<RecentSession[] | null>(null);

  useEffect(() => {
    let alive = true;
    listRecentSessions(getAppDb())
      .then((rs) => alive && setSessions(rs))
      .catch(() => alive && setSessions([]));
    return () => {
      alive = false;
    };
  }, [sessionActive]);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.hello}>Kabe</Text>
        <HomeStartHero />
        {sessions !== null ? <RecentPractice sessions={sessions} /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxl,
  },
  hello: {
    ...typography.display,
    marginBottom: spacing.lg,
  },
});
