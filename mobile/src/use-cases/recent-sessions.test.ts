import { v4 as uuidv4 } from 'uuid';
import { drills } from '../db/schema';
import { createTestDb, TestDb } from '../db/test-db';
import { createRoutine } from './routines';
import { endSession, logEntry, startSession } from './sessions';
import { listRecentSessions } from './recent-sessions';

const at = (iso: string) => () => new Date(iso);

async function insertDrill(db: TestDb, id?: string) {
  const drillId = id ?? uuidv4();
  const now = '2026-06-01T00:00:00.000Z';
  await db.insert(drills).values({
    id: drillId,
    name: 'A drill',
    category: 'wall',
    metric: 'reps',
    target: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  return drillId;
}

/** Start a session, end it, and return its id. */
async function completedSession(
  db: TestDb,
  opts: { startedAt: string; routineId?: string } = { startedAt: '2026-06-30T10:00:00.000Z' }
) {
  const s = await startSession(db, { routineId: opts.routineId, now: at(opts.startedAt) });
  await endSession(db, s.id, { now: at(opts.startedAt) });
  return s.id;
}

describe('listRecentSessions', () => {
  it('returns completed sessions newest-first by startedAt', async () => {
    const db = createTestDb();
    const older = await completedSession(db, { startedAt: '2026-06-28T10:00:00.000Z' });
    const newer = await completedSession(db, { startedAt: '2026-06-29T10:00:00.000Z' });

    const recent = await listRecentSessions(db);

    expect(recent.map((r) => r.id)).toEqual([newer, older]);
  });

  it('excludes the active (in-progress) session', async () => {
    const db = createTestDb();
    const done = await completedSession(db, { startedAt: '2026-06-28T10:00:00.000Z' });
    // Leave this one active (started, never ended).
    await startSession(db, { now: at('2026-06-29T10:00:00.000Z') });

    const recent = await listRecentSessions(db);

    expect(recent.map((r) => r.id)).toEqual([done]);
  });

  it('carries the routine name, or null for a free session', async () => {
    const db = createTestDb();
    const drillId = await insertDrill(db);
    const routine = await createRoutine(db, {
      name: 'Wall warmup',
      items: [{ drillId }],
      now: at('2026-06-01T00:00:00.000Z'),
    });
    await completedSession(db, { startedAt: '2026-06-28T10:00:00.000Z', routineId: routine.id });
    await completedSession(db, { startedAt: '2026-06-29T10:00:00.000Z' }); // free

    const recent = await listRecentSessions(db);

    expect(recent.map((r) => r.routineName)).toEqual([null, 'Wall warmup']);
  });

  it('counts distinct drills logged, not entries', async () => {
    const db = createTestDb();
    const drillA = await insertDrill(db);
    const drillB = await insertDrill(db);
    const s = await startSession(db, { now: at('2026-06-28T10:00:00.000Z') });
    // Two entries for drill A, one for drill B → 2 distinct drills.
    await logEntry(db, { sessionId: s.id, drillId: drillA, value: 10, now: at('2026-06-28T10:01:00.000Z') });
    await logEntry(db, { sessionId: s.id, drillId: drillA, value: 12, now: at('2026-06-28T10:02:00.000Z') });
    await logEntry(db, { sessionId: s.id, drillId: drillB, value: 8, now: at('2026-06-28T10:03:00.000Z') });
    await endSession(db, s.id, { now: at('2026-06-28T10:30:00.000Z') });

    const [recent] = await listRecentSessions(db);

    expect(recent.drillCount).toBe(2);
  });

  it('reports a drill count of 0 for a session with no entries', async () => {
    const db = createTestDb();
    await completedSession(db, { startedAt: '2026-06-28T10:00:00.000Z' });

    const [recent] = await listRecentSessions(db);

    expect(recent.drillCount).toBe(0);
  });

  it('returns at most the 3 most-recent sessions by default', async () => {
    const db = createTestDb();
    await completedSession(db, { startedAt: '2026-06-26T10:00:00.000Z' });
    await completedSession(db, { startedAt: '2026-06-27T10:00:00.000Z' });
    const c = await completedSession(db, { startedAt: '2026-06-28T10:00:00.000Z' });
    const b = await completedSession(db, { startedAt: '2026-06-29T10:00:00.000Z' });
    const a = await completedSession(db, { startedAt: '2026-06-30T10:00:00.000Z' });

    const recent = await listRecentSessions(db);

    expect(recent.map((r) => r.id)).toEqual([a, b, c]);
  });
});
