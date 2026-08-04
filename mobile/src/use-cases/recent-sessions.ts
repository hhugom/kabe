import { and, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { drillEntries, routines, sessions } from '../db/schema';

type Db = BaseSQLiteDatabase<'sync' | 'async', unknown>;

export type RecentSession = {
  id: string;
  startedAt: string;
  routineName: string | null;
  /** Number of distinct drills logged in the session — its size measure in the teaser. */
  drillCount: number;
};

export async function listRecentSessions(
  db: Db,
  opts: { limit?: number } = {}
): Promise<RecentSession[]> {
  const rows = (await db
    .select({
      id: sessions.id,
      startedAt: sessions.startedAt,
      routineName: routines.name,
    })
    .from(sessions)
    .leftJoin(routines, eq(sessions.routineId, routines.id))
    .where(and(isNotNull(sessions.endedAt), isNull(sessions.deletedAt)))
    .orderBy(desc(sessions.startedAt))
    .limit(opts.limit ?? 3)
    .all()) as Array<{ id: string; startedAt: string; routineName: string | null }>;

  const drillCounts = await distinctDrillCounts(db, rows.map((r) => r.id));

  return rows.map((r) => ({ ...r, drillCount: drillCounts.get(r.id) ?? 0 }));
}

async function distinctDrillCounts(db: Db, sessionIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (sessionIds.length === 0) return counts;

  const entries = (await db
    .select({ sessionId: drillEntries.sessionId, drillId: drillEntries.drillId })
    .from(drillEntries)
    .where(and(inArray(drillEntries.sessionId, sessionIds), isNull(drillEntries.deletedAt)))
    .all()) as Array<{ sessionId: string; drillId: string }>;

  const drillsBySession = new Map<string, Set<string>>();
  for (const e of entries) {
    const set = drillsBySession.get(e.sessionId) ?? new Set<string>();
    set.add(e.drillId);
    drillsBySession.set(e.sessionId, set);
  }
  for (const [sessionId, set] of drillsBySession) {
    counts.set(sessionId, set.size);
  }
  return counts;
}
