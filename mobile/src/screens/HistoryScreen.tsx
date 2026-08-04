// The full practice-history screen — destination of Home's "View history" link
// (issue #45 follow-up). Fetches every completed session with per-drill stats and
// renders them grouped by relative day.
import { useEffect, useState } from 'react';
import { Screen } from '../components/Screen';
import { SessionHistory } from '../components/SessionHistory';
import { getAppDb } from '../db/client';
import { listSessionHistory, HistorySession } from '../use-cases/session-history';

export function HistoryScreen() {
  const [sessions, setSessions] = useState<HistorySession[] | null>(null);

  useEffect(() => {
    let alive = true;
    listSessionHistory(getAppDb())
      .then((h) => alive && setSessions(h))
      .catch(() => alive && setSessions([]));
    return () => {
      alive = false;
    };
  }, []);

  return <Screen>{sessions !== null ? <SessionHistory sessions={sessions} /> : null}</Screen>;
}
