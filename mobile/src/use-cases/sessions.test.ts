import { v4 as uuidv4 } from 'uuid';
import { drills } from '../db/schema';
import { createTestDb, TestDb } from '../db/test-db';
import { archiveRoutine, createRoutine } from './routines';
import {
  AttemptedShapeError,
  DrillNotFoundError,
  endSession,
  getActiveSession,
  logEntry,
  RoutineNotFoundError,
  SessionAlreadyActiveError,
  startSession,
} from './sessions';

const FIXED_NOW = '2026-06-30T12:00:00.000Z';
const clock = () => new Date(FIXED_NOW);

async function insertDrill(
  db: TestDb,
  over: { id?: string; metric?: 'reps' | 'duration' | 'accuracy'; target?: number | null } = {}
) {
  const id = over.id ?? uuidv4();
  const now = FIXED_NOW;
  await db.insert(drills).values({
    id,
    name: 'A drill',
    category: 'wall',
    metric: over.metric ?? 'reps',
    target: over.target ?? null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });
  return id;
}

describe('startSession', () => {
  it('creates a blank session with started_at = now and ended_at = null', async () => {
    const db = createTestDb();
    const session = await startSession(db, { now: clock });

    expect(session.startedAt).toBe(FIXED_NOW);
    expect(session.endedAt).toBeNull();
    expect(session.routineId).toBeNull();

    const active = await getActiveSession(db);
    expect(active?.session.id).toBe(session.id);
  });

  it('rejects a second start while a session is still active', async () => {
    const db = createTestDb();
    await startSession(db, { now: clock });
    await expect(startSession(db, { now: clock })).rejects.toBeInstanceOf(
      SessionAlreadyActiveError
    );
  });

  it('succeeds after the previous session has been ended', async () => {
    const db = createTestDb();
    const first = await startSession(db, { now: clock });
    await endSession(db, first.id, { now: clock });
    const second = await startSession(db, { now: clock });
    expect(second.id).not.toBe(first.id);
  });

  it('persists routineId on the session when launched from a live routine', async () => {
    const db = createTestDb();
    const drillId = await insertDrill(db, { metric: 'reps' });
    const routine = await createRoutine(db, {
      name: 'Wall warmup',
      items: [{ drillId }],
      now: clock,
    });

    const session = await startSession(db, { routineId: routine.id, now: clock });

    expect(session.routineId).toBe(routine.id);
  });

  it('rejects a routineId that does not resolve to a live routine', async () => {
    const db = createTestDb();
    await expect(
      startSession(db, { routineId: uuidv4(), now: clock })
    ).rejects.toBeInstanceOf(RoutineNotFoundError);
    expect(await getActiveSession(db)).toBeNull();
  });

  it('rejects a routineId whose routine has been archived', async () => {
    const db = createTestDb();
    const drillId = await insertDrill(db, { metric: 'reps' });
    const routine = await createRoutine(db, {
      name: 'Archived',
      items: [{ drillId }],
      now: clock,
    });
    await archiveRoutine(db, routine.id, { now: clock });

    await expect(
      startSession(db, { routineId: routine.id, now: clock })
    ).rejects.toBeInstanceOf(RoutineNotFoundError);
    expect(await getActiveSession(db)).toBeNull();
  });
});

describe('getActiveSession', () => {
  it('returns null when no session is active', async () => {
    const db = createTestDb();
    expect(await getActiveSession(db)).toBeNull();
  });

  it('returns the active session with its entries in chronological order', async () => {
    const db = createTestDb();
    const session = await startSession(db, { now: clock });
    const drillId = await insertDrill(db, { metric: 'reps' });

    await logEntry(db, {
      sessionId: session.id,
      drillId,
      value: 10,
      performedAt: '2026-06-30T12:01:00.000Z',
      now: clock,
    });
    await logEntry(db, {
      sessionId: session.id,
      drillId,
      value: 15,
      performedAt: '2026-06-30T12:02:00.000Z',
      now: clock,
    });

    const active = await getActiveSession(db);
    expect(active?.session.id).toBe(session.id);
    expect(active?.entries.map((e) => e.value)).toEqual([10, 15]);
  });
});

describe('endSession', () => {
  it('sets ended_at = now so the session is no longer active', async () => {
    const db = createTestDb();
    const session = await startSession(db, { now: clock });
    await endSession(db, session.id, { now: clock });

    const active = await getActiveSession(db);
    expect(active).toBeNull();
  });
});

describe('logEntry', () => {
  it('writes a row with the given value, session_id, drill_id, and performed_at = now', async () => {
    const db = createTestDb();
    const session = await startSession(db, { now: clock });
    const drillId = await insertDrill(db, { metric: 'reps' });

    const entry = await logEntry(db, {
      sessionId: session.id,
      drillId,
      value: 20,
      now: clock,
    });

    expect(entry.sessionId).toBe(session.id);
    expect(entry.drillId).toBe(drillId);
    expect(entry.value).toBe(20);
    expect(entry.performedAt).toBe(FIXED_NOW);
  });

  it('persists value with attempted=null for duration drills', async () => {
    const db = createTestDb();
    const session = await startSession(db, { now: clock });
    const drillId = await insertDrill(db, { metric: 'duration' });

    const entry = await logEntry(db, {
      sessionId: session.id,
      drillId,
      value: 600,
      now: clock,
    });

    expect(entry.value).toBe(600);
    expect(entry.attempted).toBeNull();
  });

  it('rejects an accuracy drill without an attempted denominator', async () => {
    const db = createTestDb();
    const session = await startSession(db, { now: clock });
    const drillId = await insertDrill(db, { metric: 'accuracy' });

    await expect(
      logEntry(db, { sessionId: session.id, drillId, value: 16, now: clock })
    ).rejects.toBeInstanceOf(AttemptedShapeError);
  });

  it('rejects a reps drill that carries an attempted denominator', async () => {
    const db = createTestDb();
    const session = await startSession(db, { now: clock });
    const drillId = await insertDrill(db, { metric: 'reps' });

    await expect(
      logEntry(db, { sessionId: session.id, drillId, value: 20, attempted: 30, now: clock })
    ).rejects.toBeInstanceOf(AttemptedShapeError);
  });

  it('rejects a duration drill that carries an attempted denominator', async () => {
    const db = createTestDb();
    const session = await startSession(db, { now: clock });
    const drillId = await insertDrill(db, { metric: 'duration' });

    await expect(
      logEntry(db, { sessionId: session.id, drillId, value: 600, attempted: 60, now: clock })
    ).rejects.toBeInstanceOf(AttemptedShapeError);
  });

  it('persists value and attempted for accuracy drills', async () => {
    const db = createTestDb();
    const session = await startSession(db, { now: clock });
    const drillId = await insertDrill(db, { metric: 'accuracy' });

    const entry = await logEntry(db, {
      sessionId: session.id,
      drillId,
      value: 16,
      attempted: 20,
      now: clock,
    });

    expect(entry.value).toBe(16);
    expect(entry.attempted).toBe(20);
  });

  it('rejects a drillId that does not resolve to a drill', async () => {
    const db = createTestDb();
    const session = await startSession(db, { now: clock });

    await expect(
      logEntry(db, {
        sessionId: session.id,
        drillId: 'nonexistent',
        value: 10,
        now: clock,
      })
    ).rejects.toBeInstanceOf(DrillNotFoundError);
  });

  it('rejects a soft-deleted drill (deletedAt IS NOT NULL)', async () => {
    const db = createTestDb();
    const session = await startSession(db, { now: clock });
    const drillId = uuidv4();
    await db.insert(drills).values({
      id: drillId,
      name: 'Archived',
      category: 'wall',
      metric: 'reps',
      target: null,
      notes: null,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
      deletedAt: FIXED_NOW,
    });

    await expect(
      logEntry(db, {
        sessionId: session.id,
        drillId,
        value: 10,
        now: clock,
      })
    ).rejects.toBeInstanceOf(DrillNotFoundError);
  });
});
