import { v4 as uuidv4 } from 'uuid';
import { drills } from '../db/schema';
import { createTestDb, TestDb } from '../db/test-db';
import {
  adHocEntries,
  cancelEntry,
  deleteEntryAndRefresh,
  endActiveSession,
  hydrate,
  pickDrill,
  pickEntry,
  pickSlot,
  plannedSlots,
  removePlannedSlot,
  saveDurationEntry,
  saveEntry,
  updateDraftAttempted,
  updateDraftValue,
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
    target?: number;
  } = {}
) {
  const id = over.id ?? uuidv4();
  await db.insert(drills).values({
    id,
    name: over.name ?? 'A drill',
    category: 'wall',
    metric: over.metric ?? 'reps',
    target: over.target ?? 20,
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
    expect(state!.editingEntryId).toBeNull();
    expect(state!.skippedItemIds).toEqual(new Set());
    expect(state!.removedSlots).toEqual(new Map());
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
  it('sets pickedDrill and defaults the reps draft value to the drill target', async () => {
    const db = createTestDb();
    await startSession(db, { now: clock });
    const d = await insertDrill(db, { name: 'Wall rally', metric: 'reps', target: 50 });
    const state = (await hydrate(db))!;

    const next = pickDrill(state, d);

    expect(next.pickedDrill?.id).toBe(d);
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
    // Clear the attempted field the target pre-fills, so it's genuinely missing.
    const picked = updateDraftValue(pickDrill((await hydrate(db))!, d), '16');
    const state = updateDraftAttempted(picked, '');

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

describe('plannedSlots', () => {
  it('fills slots with entries for that drill in chronological order; overflow entries do not fill', async () => {
    const db = createTestDb();
    const d = await insertDrill(db, { name: 'Wall rally', metric: 'reps' });
    const routine = await createRoutine(db, {
      name: 'W',
      items: [{ drillId: d, plannedSets: 2 }],
      now: clock,
    });
    const session = await startSession(db, { routineId: routine.id, now: clock });
    await logEntry(db, {
      sessionId: session.id,
      drillId: d,
      value: 10,
      performedAt: '2026-07-09T12:01:00.000Z',
      now: clock,
    });
    await logEntry(db, {
      sessionId: session.id,
      drillId: d,
      value: 20,
      performedAt: '2026-07-09T12:02:00.000Z',
      now: clock,
    });
    await logEntry(db, {
      sessionId: session.id,
      drillId: d,
      value: 30,
      performedAt: '2026-07-09T12:03:00.000Z',
      now: clock,
    });
    const state = (await hydrate(db))!;

    const slots = plannedSlots(state);

    expect(slots.length).toBe(2);
    expect(slots[0].entry?.value).toBe(10);
    expect(slots[1].entry?.value).toBe(20);
    // The third entry (value 30) has no slot to fill — it does not appear in plannedSlots.
  });

  it('emits one slot per planned set (plannedSets: 3 → 3 empty rows in order)', async () => {
    const db = createTestDb();
    const d = await insertDrill(db, { name: 'Wall rally', metric: 'reps' });
    const routine = await createRoutine(db, {
      name: 'W',
      items: [{ drillId: d, plannedSets: 3 }],
      now: clock,
    });
    await startSession(db, { routineId: routine.id, now: clock });
    const state = (await hydrate(db))!;

    const slots = plannedSlots(state);

    expect(slots.map((s) => s.slotIndex)).toEqual([0, 1, 2]);
    expect(slots.every((s) => s.drillId === d)).toBe(true);
    expect(slots.every((s) => s.entry === null)).toBe(true);
    expect(slots.every((s) => s.itemId === state.plannedItems[0].id)).toBe(true);
  });
});

describe('deleteEntryAndRefresh', () => {
  it('soft-deletes the entry and returns state with entries refreshed from the DB', async () => {
    const db = createTestDb();
    const session = await startSession(db, { now: clock });
    const d = await insertDrill(db, { metric: 'reps' });
    await logEntry(db, { sessionId: session.id, drillId: d, value: 10, now: clock });
    await logEntry(db, { sessionId: session.id, drillId: d, value: 20, now: clock });
    const state = (await hydrate(db))!;
    const idToDelete = state.entries[0].id;

    const next = await deleteEntryAndRefresh(state, db, idToDelete);

    expect(next.entries.map((e) => e.id)).not.toContain(idToDelete);
    expect(next.entries.length).toBe(1);
    expect(next.entries[0].value).toBe(20);
  });
});

describe('removePlannedSlot', () => {
  it('removes a single slot from an item without touching sibling slots', async () => {
    const db = createTestDb();
    const d = await insertDrill(db, { name: 'Wall rally', metric: 'reps' });
    const routine = await createRoutine(db, {
      name: 'W',
      items: [{ drillId: d, plannedSets: 3 }],
      now: clock,
    });
    await startSession(db, { routineId: routine.id, now: clock });
    const state = (await hydrate(db))!;
    const itemId = state.plannedItems[0].id;

    const next = removePlannedSlot(state, itemId, 1);

    const slots = plannedSlots(next);
    expect(slots.map((s) => s.slotIndex)).toEqual([0, 2]);
  });
});

describe('adHocEntries', () => {
  it('returns entries not covered by any planned slot: unplanned drills + overflow', async () => {
    const db = createTestDb();
    const planned = await insertDrill(db, { name: 'Wall rally', metric: 'reps' });
    const unplanned = await insertDrill(db, { name: 'Slice serve', metric: 'reps' });
    const routine = await createRoutine(db, {
      name: 'W',
      items: [{ drillId: planned, plannedSets: 1 }],
      now: clock,
    });
    const session = await startSession(db, { routineId: routine.id, now: clock });
    // 1 planned-drill entry — fills the single slot; the second planned-drill
    // entry has no slot → ad-hoc. The unplanned-drill entry → ad-hoc.
    await logEntry(db, {
      sessionId: session.id,
      drillId: planned,
      value: 10,
      performedAt: '2026-07-09T12:01:00.000Z',
      now: clock,
    });
    await logEntry(db, {
      sessionId: session.id,
      drillId: planned,
      value: 20,
      performedAt: '2026-07-09T12:02:00.000Z',
      now: clock,
    });
    await logEntry(db, {
      sessionId: session.id,
      drillId: unplanned,
      value: 33,
      performedAt: '2026-07-09T12:03:00.000Z',
      now: clock,
    });
    const state = (await hydrate(db))!;

    const adhoc = adHocEntries(state);

    expect(adhoc.map((e) => e.value).sort((a, b) => a - b)).toEqual([20, 33]);
  });
});

describe('pickEntry', () => {
  it('opens the entry\'s drill in edit mode with the value prefilled and editingEntryId set', async () => {
    const db = createTestDb();
    const session = await startSession(db, { now: clock });
    const d = await insertDrill(db, { name: 'Wall rally', metric: 'reps' });
    await logEntry(db, { sessionId: session.id, drillId: d, value: 42, now: clock });
    const state = (await hydrate(db))!;
    const entryId = state.entries[0].id;

    const next = pickEntry(state, entryId);

    expect(next.pickedDrill?.id).toBe(d);
    expect(next.draft).toEqual({ kind: 'reps', value: '42' });
    expect(next.editingEntryId).toBe(entryId);
  });

  it('opens accuracy entries with value and attempted prefilled', async () => {
    const db = createTestDb();
    const session = await startSession(db, { now: clock });
    const d = await insertDrill(db, { name: 'Serve', metric: 'accuracy' });
    await logEntry(db, {
      sessionId: session.id,
      drillId: d,
      value: 16,
      attempted: 20,
      now: clock,
    });
    const state = (await hydrate(db))!;
    const entryId = state.entries[0].id;

    const next = pickEntry(state, entryId);

    expect(next.draft).toEqual({ kind: 'accuracy', value: '16', attempted: '20' });
    expect(next.editingEntryId).toBe(entryId);
  });
});

describe('saveEntry when editing', () => {
  it('updates the existing entry instead of inserting a new one', async () => {
    const db = createTestDb();
    const session = await startSession(db, { now: clock });
    const d = await insertDrill(db, { name: 'Wall rally', metric: 'reps' });
    await logEntry(db, { sessionId: session.id, drillId: d, value: 10, now: clock });
    let state = (await hydrate(db))!;
    const originalEntryId = state.entries[0].id;
    state = pickEntry(state, originalEntryId);
    state = updateDraftValue(state, '77');

    const next = await saveEntry(state, db, { now: clock });

    expect(next.pickedDrill).toBeNull();
    expect(next.draft).toBeNull();
    expect(next.editingEntryId).toBeNull();
    expect(next.entries.length).toBe(1);
    expect(next.entries[0].id).toBe(originalEntryId);
    expect(next.entries[0].value).toBe(77);
  });
});

describe('pickSlot', () => {
  it('routes an empty slot into pickDrill mode', async () => {
    const db = createTestDb();
    const d = await insertDrill(db, { name: 'Wall rally', metric: 'reps' });
    const routine = await createRoutine(db, {
      name: 'W',
      items: [{ drillId: d, plannedSets: 2 }],
      now: clock,
    });
    await startSession(db, { routineId: routine.id, now: clock });
    const state = (await hydrate(db))!;
    const [emptySlot] = plannedSlots(state);

    const next = pickSlot(state, emptySlot);

    expect(next.pickedDrill?.id).toBe(d);
    expect(next.editingEntryId).toBeNull();
  });

  it('routes a filled slot into pickEntry (edit) mode', async () => {
    const db = createTestDb();
    const d = await insertDrill(db, { name: 'Wall rally', metric: 'reps' });
    const routine = await createRoutine(db, {
      name: 'W',
      items: [{ drillId: d, plannedSets: 1 }],
      now: clock,
    });
    const session = await startSession(db, { routineId: routine.id, now: clock });
    await logEntry(db, { sessionId: session.id, drillId: d, value: 42, now: clock });
    const state = (await hydrate(db))!;
    const [filledSlot] = plannedSlots(state);

    const next = pickSlot(state, filledSlot);

    expect(next.pickedDrill?.id).toBe(d);
    expect(next.editingEntryId).toBe(filledSlot.entry!.id);
    expect(next.draft).toEqual({ kind: 'reps', value: '42' });
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
