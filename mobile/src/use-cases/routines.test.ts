import { asc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { drills, routineItems, routines } from '../db/schema';
import { createTestDb, TestDb } from '../db/test-db';
import { seedIfEmpty } from './drills';
import {
  archiveRoutine,
  createRoutine,
  DrillNotFoundError,
  EmptyRoutineError,
  getRoutine,
  listRoutines,
  seedRoutinesIfEmpty,
  updateRoutine,
} from './routines';

const FIXED_NOW = '2026-07-01T09:00:00.000Z';
const clock = () => new Date(FIXED_NOW);

async function insertDrill(db: TestDb, id = uuidv4()) {
  await db.insert(drills).values({
    id,
    name: 'A drill',
    category: 'wall',
    metric: 'reps',
    target: null,
    notes: null,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    deletedAt: null,
  });
  return id;
}

describe('createRoutine', () => {
  it('returns a routine with the given name and a generated id', async () => {
    const db = createTestDb();
    const drillId = await insertDrill(db);

    const routine = await createRoutine(db, {
      name: 'Wall warmup',
      items: [{ drillId }],
      now: clock,
    });

    expect(routine.id).toEqual(expect.any(String));
    expect(routine.name).toBe('Wall warmup');
  });

  it('rejects an empty items array', async () => {
    const db = createTestDb();
    await expect(
      createRoutine(db, { name: 'Empty', items: [], now: clock })
    ).rejects.toBeInstanceOf(EmptyRoutineError);
  });

  it('does not persist a routine row when items validation fails', async () => {
    const db = createTestDb();
    await expect(
      createRoutine(db, { name: 'Empty', items: [], now: clock })
    ).rejects.toBeInstanceOf(EmptyRoutineError);
    expect(await listRoutines(db)).toEqual([]);
  });

  it('rejects an item whose drillId does not resolve to a live drill', async () => {
    const db = createTestDb();
    await expect(
      createRoutine(db, {
        name: 'Bad',
        items: [{ drillId: uuidv4() }],
        now: clock,
      })
    ).rejects.toBeInstanceOf(DrillNotFoundError);
  });

  it('rejects an item whose drill has been soft-deleted', async () => {
    const db = createTestDb();
    const drillId = await insertDrill(db);
    await db.update(drills).set({ deletedAt: FIXED_NOW }).where(eq(drills.id, drillId));

    await expect(
      createRoutine(db, {
        name: 'Bad',
        items: [{ drillId }],
        now: clock,
      })
    ).rejects.toBeInstanceOf(DrillNotFoundError);
  });

  it('does not persist a routine when any drill is invalid', async () => {
    const db = createTestDb();
    const goodDrill = await insertDrill(db);

    await expect(
      createRoutine(db, {
        name: 'Bad',
        items: [{ drillId: goodDrill }, { drillId: uuidv4() }],
        now: clock,
      })
    ).rejects.toBeInstanceOf(DrillNotFoundError);
    expect(await listRoutines(db)).toEqual([]);
  });

  it('persists items with positions 0..n matching input order', async () => {
    const db = createTestDb();
    const drillA = await insertDrill(db);
    const drillB = await insertDrill(db);
    const drillC = await insertDrill(db);

    const routine = await createRoutine(db, {
      name: 'Full serve session',
      items: [
        { drillId: drillA },
        { drillId: drillB, plannedSets: 3 },
        { drillId: drillC },
      ],
      now: clock,
    });

    const rows = await db
      .select()
      .from(routineItems)
      .where(eq(routineItems.routineId, routine.id))
      .orderBy(asc(routineItems.position))
      .all();

    expect(rows.map((r) => ({ drillId: r.drillId, position: r.position, plannedSets: r.plannedSets }))).toEqual([
      { drillId: drillA, position: 0, plannedSets: null },
      { drillId: drillB, position: 1, plannedSets: 3 },
      { drillId: drillC, position: 2, plannedSets: null },
    ]);
  });
});

describe('getRoutine', () => {
  it('returns the routine with items in position order', async () => {
    const db = createTestDb();
    const drillA = await insertDrill(db);
    const drillB = await insertDrill(db);

    const created = await createRoutine(db, {
      name: 'Wall warmup',
      items: [{ drillId: drillA }, { drillId: drillB, plannedSets: 2 }],
      now: clock,
    });

    const fetched = await getRoutine(db, created.id);

    expect(fetched?.routine.id).toBe(created.id);
    expect(fetched?.routine.name).toBe('Wall warmup');
    expect(fetched?.items.map((i) => ({ drillId: i.drillId, position: i.position }))).toEqual([
      { drillId: drillA, position: 0 },
      { drillId: drillB, position: 1 },
    ]);
  });

  it('returns null for an id that does not exist', async () => {
    const db = createTestDb();
    expect(await getRoutine(db, uuidv4())).toBeNull();
  });

  it('returns null for a soft-deleted routine', async () => {
    const db = createTestDb();
    const drillId = await insertDrill(db);
    const created = await createRoutine(db, {
      name: 'Archived',
      items: [{ drillId }],
      now: clock,
    });

    await db.update(routines).set({ deletedAt: FIXED_NOW }).where(eq(routines.id, created.id));

    expect(await getRoutine(db, created.id)).toBeNull();
  });
});

describe('updateRoutine', () => {
  it('renames the routine without touching its items when items is omitted', async () => {
    const db = createTestDb();
    const drillA = await insertDrill(db);
    const drillB = await insertDrill(db);

    const created = await createRoutine(db, {
      name: 'Old name',
      items: [{ drillId: drillA }, { drillId: drillB, plannedSets: 5 }],
      now: clock,
    });

    await updateRoutine(db, created.id, { name: 'New name', now: clock });

    const fetched = await getRoutine(db, created.id);
    expect(fetched?.routine.name).toBe('New name');
    expect(
      fetched?.items.map((i) => ({ drillId: i.drillId, position: i.position, plannedSets: i.plannedSets }))
    ).toEqual([
      { drillId: drillA, position: 0, plannedSets: null },
      { drillId: drillB, position: 1, plannedSets: 5 },
    ]);
  });

  it('replaces the item list with fresh positions when items is provided', async () => {
    const db = createTestDb();
    const drillA = await insertDrill(db);
    const drillB = await insertDrill(db);
    const drillC = await insertDrill(db);

    const created = await createRoutine(db, {
      name: 'Original',
      items: [{ drillId: drillA }, { drillId: drillB }],
      now: clock,
    });

    await updateRoutine(db, created.id, {
      items: [{ drillId: drillC }, { drillId: drillA, plannedSets: 4 }],
      now: clock,
    });

    const fetched = await getRoutine(db, created.id);
    expect(
      fetched?.items.map((i) => ({ drillId: i.drillId, position: i.position, plannedSets: i.plannedSets }))
    ).toEqual([
      { drillId: drillC, position: 0, plannedSets: null },
      { drillId: drillA, position: 1, plannedSets: 4 },
    ]);
  });
});

describe('listRoutines', () => {
  it('returns only live routines, excluding soft-deleted ones', async () => {
    const db = createTestDb();
    const drillId = await insertDrill(db);
    const live = await createRoutine(db, {
      name: 'Live',
      items: [{ drillId }],
      now: clock,
    });
    const archived = await createRoutine(db, {
      name: 'Archived',
      items: [{ drillId }],
      now: clock,
    });
    await db.update(routines).set({ deletedAt: FIXED_NOW }).where(eq(routines.id, archived.id));

    const result = await listRoutines(db);

    expect(result.map((r) => r.id)).toEqual([live.id]);
  });
});

describe('seedRoutinesIfEmpty', () => {
  it('inserts the 2 PRD-specified routines with correct names on an empty DB', async () => {
    const db = createTestDb();
    await seedIfEmpty(db);
    await seedRoutinesIfEmpty(db);

    const list = await listRoutines(db);
    const names = list.map((r) => r.name).sort();
    expect(names).toEqual(['Full serve session', 'Wall warmup']);
  });

  it('is idempotent — calling twice does not duplicate routines or items', async () => {
    const db = createTestDb();
    await seedIfEmpty(db);
    await seedRoutinesIfEmpty(db);
    await seedRoutinesIfEmpty(db);

    const list = await listRoutines(db);
    expect(list).toHaveLength(2);

    const allItems = await db.select().from(routineItems).all();
    expect(allItems).toHaveLength(3 + 4);
  });
});

describe('archiveRoutine', () => {
  it('soft-deletes the routine so it disappears from listRoutines and getRoutine', async () => {
    const db = createTestDb();
    const drillId = await insertDrill(db);
    const created = await createRoutine(db, {
      name: 'To archive',
      items: [{ drillId }],
      now: clock,
    });

    await archiveRoutine(db, created.id, { now: clock });

    expect(await listRoutines(db)).toEqual([]);
    expect(await getRoutine(db, created.id)).toBeNull();
  });
});
