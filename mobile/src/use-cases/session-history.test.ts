import { v4 as uuidv4 } from 'uuid';
import { drills } from '../db/schema';
import { createTestDb, TestDb } from '../db/test-db';
import { createRoutine } from './routines';
import { endSession, logEntry, startSession } from './sessions';
import { listSessionHistory } from './session-history';

const at = (iso: string) => () => new Date(iso);

async function insertDrill(
  db: TestDb,
  opts: { name?: string; metric?: 'reps' | 'duration' | 'accuracy'; target?: number } = {}
) {
  const drillId = uuidv4();
  const now = '2026-06-01T00:00:00.000Z';
  await db.insert(drills).values({
    id: drillId,
    name: opts.name ?? 'A drill',
    category: 'wall',
    metric: opts.metric ?? 'reps',
    target: opts.target ?? 20,
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
  opts: { startedAt: string; endedAt?: string; routineId?: string }
) {
  const s = await startSession(db, { routineId: opts.routineId, now: at(opts.startedAt) });
  await endSession(db, s.id, { now: at(opts.endedAt ?? opts.startedAt) });
  return s.id;
}

describe('listSessionHistory', () => {
  it('returns all completed sessions newest-first, with no limit', async () => {
    const db = createTestDb();
    const ids = [];
    for (const day of ['26', '27', '28', '29']) {
      ids.push(await completedSession(db, { startedAt: `2026-06-${day}T10:00:00.000Z` }));
    }

    const history = await listSessionHistory(db);

    // All four (unlike the 3-capped teaser), newest-first.
    expect(history.map((h) => h.id)).toEqual([ids[3], ids[2], ids[1], ids[0]]);
  });

  it('aggregates each drill across its entries, carrying name, metric and target', async () => {
    const db = createTestDb();
    const splitStep = await insertDrill(db, { name: 'Split step', metric: 'accuracy', target: 90 });
    const chestPass = await insertDrill(db, { name: 'Chest pass', metric: 'reps', target: 30 });
    const s = await startSession(db, { now: at('2026-06-28T10:00:00.000Z') });
    // Two accuracy entries (two sets) for the same drill → summed: 18 made / 22 attempted.
    await logEntry(db, { sessionId: s.id, drillId: splitStep, value: 10, attempted: 12, now: at('2026-06-28T10:01:00.000Z') });
    await logEntry(db, { sessionId: s.id, drillId: splitStep, value: 8, attempted: 10, now: at('2026-06-28T10:02:00.000Z') });
    await logEntry(db, { sessionId: s.id, drillId: chestPass, value: 24, now: at('2026-06-28T10:03:00.000Z') });
    await endSession(db, s.id, { now: at('2026-06-28T10:30:00.000Z') });

    const [session] = await listSessionHistory(db);

    // Ordered by drill name for a stable list (Chest pass < Split step).
    expect(session.drills).toEqual([
      { drillId: chestPass, name: 'Chest pass', metric: 'reps', value: 24, attempted: null, target: 30 },
      { drillId: splitStep, name: 'Split step', metric: 'accuracy', value: 18, attempted: 22, target: 90 },
    ]);
  });

  it('excludes the active (in-progress) session', async () => {
    const db = createTestDb();
    const done = await completedSession(db, { startedAt: '2026-06-28T10:00:00.000Z' });
    await startSession(db, { now: at('2026-06-29T10:00:00.000Z') }); // never ended

    const history = await listSessionHistory(db);

    expect(history.map((h) => h.id)).toEqual([done]);
  });

  it('carries endedAt and the routine name (null for a free session)', async () => {
    const db = createTestDb();
    const drillId = await insertDrill(db);
    const routine = await createRoutine(db, {
      name: 'Wall warmup',
      items: [{ drillId }],
      now: at('2026-06-01T00:00:00.000Z'),
    });
    await completedSession(db, {
      startedAt: '2026-06-28T10:00:00.000Z',
      endedAt: '2026-06-28T10:42:00.000Z',
      routineId: routine.id,
    });
    await completedSession(db, { startedAt: '2026-06-29T10:00:00.000Z' }); // free

    const history = await listSessionHistory(db);

    expect(history.map((h) => h.routineName)).toEqual([null, 'Wall warmup']);
    expect(history[1].endedAt).toBe('2026-06-28T10:42:00.000Z');
  });
});
