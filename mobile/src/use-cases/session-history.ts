import { and, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { drillEntries, drills, routines, sessions } from '../db/schema';
import type { DrillMetric } from '../drill-line';

type Db = BaseSQLiteDatabase<'sync' | 'async', unknown>;

export type HistoryDrill = {
  drillId: string;
  name: string;
  metric: DrillMetric;
  /** Summed across the session's entries for this drill. */
  value: number;
  /** Summed attempts — null for non-accuracy drills. */
  attempted: number | null;
  /** The drill's goal in the metric's units (mandatory). */
  target: number;
};

export type HistorySession = {
  id: string;
  startedAt: string;
  endedAt: string;
  routineName: string | null;
  drills: HistoryDrill[];
};

// Completed, non-deleted sessions newest-first, each with its per-drill aggregated
// stats. Unbounded by default (the History screen); pass a `limit` for the Home teaser.
export async function listSessionHistory(
  db: Db,
  opts: { limit?: number } = {}
): Promise<HistorySession[]> {
  const base = db
    .select({
      id: sessions.id,
      startedAt: sessions.startedAt,
      endedAt: sessions.endedAt,
      routineName: routines.name,
    })
    .from(sessions)
    .leftJoin(routines, eq(sessions.routineId, routines.id))
    .where(and(isNotNull(sessions.endedAt), isNull(sessions.deletedAt)))
    .orderBy(desc(sessions.startedAt));

  const rows = (await (opts.limit != null ? base.limit(opts.limit) : base).all()) as Array<{
    id: string;
    startedAt: string;
    endedAt: string;
    routineName: string | null;
  }>;

  const drillsBySession = await drillsFor(db, rows.map((r) => r.id));

  return rows.map((r) => ({ ...r, drills: drillsBySession.get(r.id) ?? [] }));
}

// Aggregate each session's drill entries into one HistoryDrill per drill (summing
// value + attempted across the drill's sets), joined to the drill's name + metric.
async function drillsFor(db: Db, sessionIds: string[]): Promise<Map<string, HistoryDrill[]>> {
  const out = new Map<string, HistoryDrill[]>();
  if (sessionIds.length === 0) return out;

  const entries = (await db
    .select({
      sessionId: drillEntries.sessionId,
      drillId: drillEntries.drillId,
      value: drillEntries.value,
      attempted: drillEntries.attempted,
      name: drills.name,
      metric: drills.metric,
      target: drills.target,
    })
    .from(drillEntries)
    .innerJoin(drills, eq(drillEntries.drillId, drills.id))
    .where(and(inArray(drillEntries.sessionId, sessionIds), isNull(drillEntries.deletedAt)))
    .all()) as Array<{
    sessionId: string;
    drillId: string;
    value: number;
    attempted: number | null;
    name: string;
    metric: DrillMetric;
    target: number;
  }>;

  // sessionId → drillId → aggregated drill
  const bySession = new Map<string, Map<string, HistoryDrill>>();
  for (const e of entries) {
    const byDrill = bySession.get(e.sessionId) ?? new Map<string, HistoryDrill>();
    const agg = byDrill.get(e.drillId) ?? {
      drillId: e.drillId,
      name: e.name,
      metric: e.metric,
      value: 0,
      attempted: null as number | null,
      target: e.target,
    };
    agg.value += e.value;
    if (e.attempted != null) agg.attempted = (agg.attempted ?? 0) + e.attempted;
    byDrill.set(e.drillId, agg);
    bySession.set(e.sessionId, byDrill);
  }

  for (const [sessionId, byDrill] of bySession) {
    const list = [...byDrill.values()].sort((a, b) => a.name.localeCompare(b.name));
    out.set(sessionId, list);
  }
  return out;
}
