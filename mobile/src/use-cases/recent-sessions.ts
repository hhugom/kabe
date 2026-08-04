import { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { listSessionHistory, type HistorySession } from './session-history';

type Db = BaseSQLiteDatabase<'sync' | 'async', unknown>;

// Home's "Recent practice" teaser: the most-recent completed sessions, capped small.
// Same shape and card as the full History screen (each session carries its aggregated
// drills); the teaser just limits the count and the card caps the drills shown.
export async function listRecentSessions(
  db: Db,
  opts: { limit?: number } = {}
): Promise<HistorySession[]> {
  return listSessionHistory(db, { limit: opts.limit ?? 3 });
}
