import { v4 as uuidv4 } from 'uuid';
import { drills } from '../db/schema';
import { createTestDb, TestDb } from '../db/test-db';
import { hydrate } from './active-session';
import { completeToTarget, skipAllUnfilled, unfilledSlots } from './bulk-resolve-unfilled-slots';
import { createRoutine } from './routines';
import { logEntry, startSession } from './sessions';

const FIXED_NOW = '2026-07-26T12:00:00.000Z';
const clock = () => new Date(FIXED_NOW);

async function insertDrill(
  db: TestDb,
  over: {
    id?: string;
    name?: string;
    metric?: 'reps' | 'duration' | 'accuracy';
    target?: number | null;
  } = {}
) {
  const id = over.id ?? uuidv4();
  await db.insert(drills).values({
    id,
    name: over.name ?? 'A drill',
    category: 'wall',
    metric: over.metric ?? 'reps',
    target: over.target ?? null,
    notes: null,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    deletedAt: null,
  });
  return id;
}

describe('unfilledSlots', () => {
  it('returns [] when no routine is attached to the session', async () => {
    const db = createTestDb();
    await startSession(db, { now: clock });
    await insertDrill(db);
    const state = (await hydrate(db))!;

    expect(unfilledSlots(state)).toEqual([]);
  });

  it('reports (plannedSets - logged) unfilled slots per item, in position order', async () => {
    const db = createTestDb();
    const dA = await insertDrill(db, { name: 'A', metric: 'reps', target: 20 });
    const dB = await insertDrill(db, { name: 'B', metric: 'reps', target: 30 });
    const routine = await createRoutine(db, {
      name: 'R',
      items: [
        { drillId: dA, plannedSets: 3 },
        { drillId: dB, plannedSets: 1 },
      ],
      now: clock,
    });
    const session = await startSession(db, { routineId: routine.id, now: clock });
    await logEntry(db, { sessionId: session.id, drillId: dA, value: 20, now: clock });

    const state = (await hydrate(db))!;
    const slots = unfilledSlots(state);

    expect(slots).toEqual([
      expect.objectContaining({ drillId: dA, count: 2 }),
      expect.objectContaining({ drillId: dB, count: 1 }),
    ]);
    expect(slots[0].itemId).toBe(state.plannedItems[0].id);
    expect(slots[1].itemId).toBe(state.plannedItems[1].id);
  });

  it('excludes items whose planned quota is fully met', async () => {
    const db = createTestDb();
    const dA = await insertDrill(db, { name: 'A', metric: 'reps', target: 10 });
    const routine = await createRoutine(db, {
      name: 'R',
      items: [{ drillId: dA, plannedSets: 2 }],
      now: clock,
    });
    const session = await startSession(db, { routineId: routine.id, now: clock });
    await logEntry(db, { sessionId: session.id, drillId: dA, value: 5, now: clock });
    await logEntry(db, { sessionId: session.id, drillId: dA, value: 5, now: clock });

    const state = (await hydrate(db))!;

    expect(unfilledSlots(state)).toEqual([]);
  });

  it('treats plannedSets=null as one slot (unfilled when zero logged)', async () => {
    const db = createTestDb();
    const dA = await insertDrill(db, { name: 'A', metric: 'reps' });
    const routine = await createRoutine(db, {
      name: 'R',
      items: [{ drillId: dA, plannedSets: null }],
      now: clock,
    });
    await startSession(db, { routineId: routine.id, now: clock });
    const state = (await hydrate(db))!;

    expect(unfilledSlots(state)).toEqual([
      expect.objectContaining({ drillId: dA, count: 1 }),
    ]);
  });

  it('treats plannedSets=null as filled once any entry is logged for that drill', async () => {
    const db = createTestDb();
    const dA = await insertDrill(db, { name: 'A', metric: 'reps' });
    const routine = await createRoutine(db, {
      name: 'R',
      items: [{ drillId: dA, plannedSets: null }],
      now: clock,
    });
    const session = await startSession(db, { routineId: routine.id, now: clock });
    await logEntry(db, { sessionId: session.id, drillId: dA, value: 5, now: clock });
    const state = (await hydrate(db))!;

    expect(unfilledSlots(state)).toEqual([]);
  });

  it('excludes items the player has already skipped', async () => {
    const db = createTestDb();
    const dA = await insertDrill(db, { name: 'A', metric: 'reps', target: 10 });
    const routine = await createRoutine(db, {
      name: 'R',
      items: [{ drillId: dA, plannedSets: 2 }],
      now: clock,
    });
    await startSession(db, { routineId: routine.id, now: clock });
    const state = (await hydrate(db))!;
    const withSkip = { ...state, skippedItemIds: new Set([state.plannedItems[0].id]) };

    expect(unfilledSlots(withSkip)).toEqual([]);
  });
});

describe('completeToTarget', () => {
  it('creates one DrillEntry per unfilled slot at the drill target (reps)', async () => {
    const db = createTestDb();
    const dA = await insertDrill(db, { name: 'A', metric: 'reps', target: 20 });
    const routine = await createRoutine(db, {
      name: 'R',
      items: [{ drillId: dA, plannedSets: 3 }],
      now: clock,
    });
    await startSession(db, { routineId: routine.id, now: clock });
    const state = (await hydrate(db))!;

    const next = await completeToTarget(state, db, { now: clock });

    expect(next.entries.length).toBe(3);
    expect(next.entries.map((e) => e.value)).toEqual([20, 20, 20]);
    expect(next.entries.every((e) => e.drillId === dA)).toBe(true);
    expect(unfilledSlots(next)).toEqual([]);
  });

  it('logs value=target AND attempted=target for accuracy drills', async () => {
    const db = createTestDb();
    const dA = await insertDrill(db, { name: 'Serve', metric: 'accuracy', target: 25 });
    const routine = await createRoutine(db, {
      name: 'R',
      items: [{ drillId: dA, plannedSets: 2 }],
      now: clock,
    });
    await startSession(db, { routineId: routine.id, now: clock });
    const state = (await hydrate(db))!;

    const next = await completeToTarget(state, db, { now: clock });

    expect(next.entries.length).toBe(2);
    expect(next.entries.every((e) => e.value === 25 && e.attempted === 25)).toBe(true);
  });

  it('logs value=target for duration drills', async () => {
    const db = createTestDb();
    const dA = await insertDrill(db, { name: 'Wall', metric: 'duration', target: 600 });
    const routine = await createRoutine(db, {
      name: 'R',
      items: [{ drillId: dA, plannedSets: 1 }],
      now: clock,
    });
    await startSession(db, { routineId: routine.id, now: clock });
    const state = (await hydrate(db))!;

    const next = await completeToTarget(state, db, { now: clock });

    expect(next.entries.length).toBe(1);
    expect(next.entries[0].value).toBe(600);
    expect(next.entries[0].attempted).toBeNull();
  });

  it('only fills the missing count, leaving already-logged entries alone', async () => {
    const db = createTestDb();
    const dA = await insertDrill(db, { name: 'A', metric: 'reps', target: 10 });
    const routine = await createRoutine(db, {
      name: 'R',
      items: [{ drillId: dA, plannedSets: 3 }],
      now: clock,
    });
    const session = await startSession(db, { routineId: routine.id, now: clock });
    await logEntry(db, { sessionId: session.id, drillId: dA, value: 7, now: clock });

    const state = (await hydrate(db))!;
    const next = await completeToTarget(state, db, { now: clock });

    expect(next.entries.length).toBe(3);
    expect(next.entries.map((e) => e.value).sort((a, b) => a - b)).toEqual([7, 10, 10]);
  });

  it('skips unfilled slots for drills that have no target (nothing to auto-log)', async () => {
    const db = createTestDb();
    const dA = await insertDrill(db, { name: 'A', metric: 'reps', target: null });
    const routine = await createRoutine(db, {
      name: 'R',
      items: [{ drillId: dA, plannedSets: 2 }],
      now: clock,
    });
    await startSession(db, { routineId: routine.id, now: clock });
    const state = (await hydrate(db))!;

    const next = await completeToTarget(state, db, { now: clock });

    expect(next.entries).toEqual([]);
  });
});

describe('skipAllUnfilled', () => {
  it('marks every item with an unfilled slot as skipped, leaving other items alone', async () => {
    const db = createTestDb();
    const dA = await insertDrill(db, { name: 'A', metric: 'reps', target: 10 });
    const dB = await insertDrill(db, { name: 'B', metric: 'reps', target: 5 });
    const routine = await createRoutine(db, {
      name: 'R',
      items: [
        { drillId: dA, plannedSets: 2 },
        { drillId: dB, plannedSets: 1 },
      ],
      now: clock,
    });
    const session = await startSession(db, { routineId: routine.id, now: clock });
    await logEntry(db, { sessionId: session.id, drillId: dB, value: 5, now: clock });

    const state = (await hydrate(db))!;
    const next = skipAllUnfilled(state);

    // dA still unfilled → skipped; dB already met → untouched
    expect(next.skippedItemIds.has(state.plannedItems[0].id)).toBe(true);
    expect(next.skippedItemIds.has(state.plannedItems[1].id)).toBe(false);
    expect(unfilledSlots(next)).toEqual([]);
  });

  it('preserves entries already logged (skip is display-only, not destructive)', async () => {
    const db = createTestDb();
    const dA = await insertDrill(db, { name: 'A', metric: 'reps', target: 10 });
    const routine = await createRoutine(db, {
      name: 'R',
      items: [{ drillId: dA, plannedSets: 3 }],
      now: clock,
    });
    const session = await startSession(db, { routineId: routine.id, now: clock });
    await logEntry(db, { sessionId: session.id, drillId: dA, value: 8, now: clock });

    const state = (await hydrate(db))!;
    const next = skipAllUnfilled(state);

    expect(next.entries.map((e) => e.value)).toEqual([8]);
  });
});
