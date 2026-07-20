import { v4 as uuidv4 } from 'uuid';
import { drills } from '../db/schema';
import { createTestDb, TestDb } from '../db/test-db';
import {
  cancelEntry,
  endActiveSession,
  hydrate,
  loggedCountForDrill,
  pickDrill,
  saveDurationEntry,
  saveEntry,
  skipPlannedItem,
  updateDraftAttempted,
  updateDraftValue,
  visiblePlannedItems,
} from './active-session';
import { createRoutine } from './routines';
import { logEntry, startSession } from './sessions';

const FIXED_NOW = '2026-07-09T12:00:00.000Z';
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

describe('hydrate', () => {
  it('returns null when no session is active', async () => {
    const db = createTestDb();
    expect(await hydrate(db)).toBeNull();
  });

  it('returns session, entries in chronological order, and all live drills', async () => {
    const db = createTestDb();
    const session = await startSession(db, { now: clock });
    const d1 = await insertDrill(db, { name: 'Wall rally', metric: 'reps' });
    const d2 = await insertDrill(db, { name: 'Serve', metric: 'accuracy' });

    await logEntry(db, {
      sessionId: session.id,
      drillId: d1,
      value: 10,
      performedAt: '2026-07-09T12:02:00.000Z',
      now: clock,
    });
    await logEntry(db, {
      sessionId: session.id,
      drillId: d1,
      value: 20,
      performedAt: '2026-07-09T12:01:00.000Z',
      now: clock,
    });

    const state = await hydrate(db);

    expect(state).not.toBeNull();
    expect(state!.session.id).toBe(session.id);
    expect(state!.entries.map((e) => e.value)).toEqual([20, 10]);
    expect(state!.drills.map((d) => d.id).sort()).toEqual([d1, d2].sort());
    expect(state!.plannedItems).toEqual([]);
    expect(state!.pickedDrill).toBeNull();
    expect(state!.draft).toBeNull();
    expect(state!.skippedItemIds).toEqual(new Set());
  });

  it('loads plannedItems in position order when the session was launched from a routine', async () => {
    const db = createTestDb();
    const dA = await insertDrill(db, { name: 'A', metric: 'reps' });
    const dB = await insertDrill(db, { name: 'B', metric: 'reps' });
    const routine = await createRoutine(db, {
      name: 'Warmup',
      items: [
        { drillId: dB, plannedSets: 1 },
        { drillId: dA, plannedSets: 2 },
      ],
      now: clock,
    });
    await startSession(db, { routineId: routine.id, now: clock });

    const state = await hydrate(db);

    expect(state!.plannedItems.map((i) => i.drillId)).toEqual([dB, dA]);
    expect(state!.plannedItems.map((i) => i.plannedSets)).toEqual([1, 2]);
  });
});

describe('pickDrill', () => {
  it('sets pickedDrill and opens a reps draft with empty value when no target', async () => {
    const db = createTestDb();
    await startSession(db, { now: clock });
    const d = await insertDrill(db, { name: 'Wall rally', metric: 'reps' });
    const state = (await hydrate(db))!;

    const next = pickDrill(state, d);

    expect(next.pickedDrill?.id).toBe(d);
    expect(next.draft).toEqual({ kind: 'reps', value: '' });
  });

  it('defaults reps draft value to the drill target when set', async () => {
    const db = createTestDb();
    await startSession(db, { now: clock });
    const d = await insertDrill(db, { name: 'Wall rally', metric: 'reps', target: 50 });
    const state = (await hydrate(db))!;

    const next = pickDrill(state, d);

    expect(next.draft).toEqual({ kind: 'reps', value: '50' });
  });

  it('opens an accuracy draft with attempted defaulted to drill target', async () => {
    const db = createTestDb();
    await startSession(db, { now: clock });
    const d = await insertDrill(db, {
      name: 'Serve accuracy',
      metric: 'accuracy',
      target: 25,
    });
    const state = (await hydrate(db))!;

    const next = pickDrill(state, d);

    expect(next.draft).toEqual({ kind: 'accuracy', value: '', attempted: '25' });
  });

  it('opens an accuracy draft with empty attempted when no drill target', async () => {
    const db = createTestDb();
    await startSession(db, { now: clock });
    const d = await insertDrill(db, { name: 'Serve accuracy', metric: 'accuracy' });
    const state = (await hydrate(db))!;

    const next = pickDrill(state, d);

    expect(next.draft).toEqual({ kind: 'accuracy', value: '', attempted: '' });
  });

  it('opens a duration draft for a duration drill (no text input state)', async () => {
    const db = createTestDb();
    await startSession(db, { now: clock });
    const d = await insertDrill(db, { name: 'Wall rally', metric: 'duration' });
    const state = (await hydrate(db))!;

    const next = pickDrill(state, d);

    expect(next.draft).toEqual({ kind: 'duration' });
  });
});

describe('cancelEntry', () => {
  it('clears pickedDrill and draft, leaving entries untouched', async () => {
    const db = createTestDb();
    const session = await startSession(db, { now: clock });
    const d = await insertDrill(db, { name: 'Wall rally', metric: 'reps' });
    await logEntry(db, { sessionId: session.id, drillId: d, value: 7, now: clock });
    const picked = pickDrill((await hydrate(db))!, d);

    const next = cancelEntry(picked);

    expect(next.pickedDrill).toBeNull();
    expect(next.draft).toBeNull();
    expect(next.entries.map((e) => e.value)).toEqual([7]);
  });
});

describe('updateDraftValue', () => {
  it('sets value on a reps draft', async () => {
    const db = createTestDb();
    await startSession(db, { now: clock });
    const d = await insertDrill(db, { metric: 'reps' });
    const state = pickDrill((await hydrate(db))!, d);

    const next = updateDraftValue(state, '42');

    expect(next.draft).toEqual({ kind: 'reps', value: '42' });
  });

  it('sets value on an accuracy draft, preserving attempted', async () => {
    const db = createTestDb();
    await startSession(db, { now: clock });
    const d = await insertDrill(db, { metric: 'accuracy', target: 20 });
    const state = pickDrill((await hydrate(db))!, d);

    const next = updateDraftValue(state, '16');

    expect(next.draft).toEqual({ kind: 'accuracy', value: '16', attempted: '20' });
  });

  it('is a no-op when there is no draft', async () => {
    const db = createTestDb();
    await startSession(db, { now: clock });
    await insertDrill(db, { metric: 'reps' });
    const state = (await hydrate(db))!;

    const next = updateDraftValue(state, '10');

    expect(next.draft).toBeNull();
  });
});

describe('updateDraftAttempted', () => {
  it('sets attempted on an accuracy draft, preserving value', async () => {
    const db = createTestDb();
    await startSession(db, { now: clock });
    const d = await insertDrill(db, { metric: 'accuracy' });
    const state = updateDraftValue(pickDrill((await hydrate(db))!, d), '16');

    const next = updateDraftAttempted(state, '20');

    expect(next.draft).toEqual({ kind: 'accuracy', value: '16', attempted: '20' });
  });

  it('is a no-op when draft is not accuracy', async () => {
    const db = createTestDb();
    await startSession(db, { now: clock });
    const d = await insertDrill(db, { metric: 'reps' });
    const state = pickDrill((await hydrate(db))!, d);

    const next = updateDraftAttempted(state, '5');

    expect(next.draft).toEqual(state.draft);
  });
});

describe('saveEntry', () => {
  it('persists a reps entry from the draft, clears draft, refreshes entries', async () => {
    const db = createTestDb();
    await startSession(db, { now: clock });
    const d = await insertDrill(db, { metric: 'reps' });
    const state = updateDraftValue(pickDrill((await hydrate(db))!, d), '30');

    const next = await saveEntry(state, db, { now: clock });

    expect(next.pickedDrill).toBeNull();
    expect(next.draft).toBeNull();
    expect(next.entries.length).toBe(1);
    expect(next.entries[0].value).toBe(30);
    expect(next.entries[0].attempted).toBeNull();
    expect(next.entries[0].drillId).toBe(d);
  });

  it('persists an accuracy entry with value and attempted', async () => {
    const db = createTestDb();
    await startSession(db, { now: clock });
    const d = await insertDrill(db, { metric: 'accuracy' });
    let state = pickDrill((await hydrate(db))!, d);
    state = updateDraftValue(state, '16');
    state = updateDraftAttempted(state, '20');

    const next = await saveEntry(state, db, { now: clock });

    expect(next.entries.length).toBe(1);
    expect(next.entries[0].value).toBe(16);
    expect(next.entries[0].attempted).toBe(20);
  });

  it('rejects a reps draft with a non-integer value (state unchanged)', async () => {
    const db = createTestDb();
    await startSession(db, { now: clock });
    const d = await insertDrill(db, { metric: 'reps' });
    const state = updateDraftValue(pickDrill((await hydrate(db))!, d), 'abc');

    await expect(saveEntry(state, db, { now: clock })).rejects.toThrow();
    const hydrated = (await hydrate(db))!;
    expect(hydrated.entries).toEqual([]);
  });

  it('rejects an accuracy draft with missing attempted', async () => {
    const db = createTestDb();
    await startSession(db, { now: clock });
    const d = await insertDrill(db, { metric: 'accuracy' });
    const state = updateDraftValue(pickDrill((await hydrate(db))!, d), '16');

    await expect(saveEntry(state, db, { now: clock })).rejects.toThrow();
  });
});

describe('saveDurationEntry', () => {
  it('persists a duration entry from elapsed seconds and clears the draft', async () => {
    const db = createTestDb();
    await startSession(db, { now: clock });
    const d = await insertDrill(db, { metric: 'duration' });
    const state = pickDrill((await hydrate(db))!, d);

    const next = await saveDurationEntry(state, db, { elapsedSeconds: 187, now: clock });

    expect(next.pickedDrill).toBeNull();
    expect(next.draft).toBeNull();
    expect(next.entries.length).toBe(1);
    expect(next.entries[0].value).toBe(187);
    expect(next.entries[0].attempted).toBeNull();
    expect(next.entries[0].drillId).toBe(d);
  });

  it('rejects when the current draft is not a duration draft', async () => {
    const db = createTestDb();
    await startSession(db, { now: clock });
    const d = await insertDrill(db, { metric: 'reps' });
    const state = pickDrill((await hydrate(db))!, d);

    await expect(
      saveDurationEntry(state, db, { elapsedSeconds: 5, now: clock })
    ).rejects.toThrow();
  });
});

describe('skipPlannedItem + visiblePlannedItems', () => {
  it('hides the skipped item from visiblePlannedItems, others unchanged', async () => {
    const db = createTestDb();
    const dA = await insertDrill(db, { name: 'A', metric: 'reps' });
    const dB = await insertDrill(db, { name: 'B', metric: 'reps' });
    const routine = await createRoutine(db, {
      name: 'Warmup',
      items: [
        { drillId: dA, plannedSets: 3 },
        { drillId: dB, plannedSets: 1 },
      ],
      now: clock,
    });
    await startSession(db, { routineId: routine.id, now: clock });
    const state = (await hydrate(db))!;
    const firstItemId = state.plannedItems[0].id;

    const next = skipPlannedItem(state, firstItemId);

    expect(visiblePlannedItems(next).map((i) => i.id)).toEqual([state.plannedItems[1].id]);
    expect(next.drills.map((d) => d.id).sort()).toEqual([dA, dB].sort());
  });
});

describe('loggedCountForDrill', () => {
  it('counts entries for a drill in the active session', async () => {
    const db = createTestDb();
    const session = await startSession(db, { now: clock });
    const dA = await insertDrill(db, { metric: 'reps' });
    const dB = await insertDrill(db, { metric: 'reps' });
    await logEntry(db, { sessionId: session.id, drillId: dA, value: 1, now: clock });
    await logEntry(db, { sessionId: session.id, drillId: dA, value: 2, now: clock });
    await logEntry(db, { sessionId: session.id, drillId: dB, value: 3, now: clock });
    const state = (await hydrate(db))!;

    expect(loggedCountForDrill(state, dA)).toBe(2);
    expect(loggedCountForDrill(state, dB)).toBe(1);
    expect(loggedCountForDrill(state, 'missing')).toBe(0);
  });
});

describe('endActiveSession', () => {
  it('ends the session so a fresh hydrate returns null', async () => {
    const db = createTestDb();
    await startSession(db, { now: clock });
    const state = (await hydrate(db))!;

    await endActiveSession(state, db, { now: clock });

    expect(await hydrate(db)).toBeNull();
  });
});
