import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { v4 as uuidv4 } from 'uuid';
import { drills, routineItems, RoutineItemRow, routines, RoutineRow } from '../db/schema';

type Db = BaseSQLiteDatabase<'sync' | 'async', unknown>;

export type Clock = () => Date;
const defaultClock: Clock = () => new Date();

export type Routine = RoutineRow;
export type RoutineItem = RoutineItemRow;

export type NewRoutineItem = {
  drillId: string;
  plannedSets?: number | null;
};

export class EmptyRoutineError extends Error {
  constructor() {
    super('A routine must contain at least one item');
    this.name = 'EmptyRoutineError';
  }
}

export class DrillNotFoundError extends Error {
  constructor(drillId: string) {
    super(`Drill ${drillId} not found or archived`);
    this.name = 'DrillNotFoundError';
  }
}

export async function createRoutine(
  db: Db,
  input: { name: string; items: NewRoutineItem[]; now?: Clock }
): Promise<Routine> {
  if (input.items.length === 0) {
    throw new EmptyRoutineError();
  }
  await assertLiveDrills(db, input.items.map((i) => i.drillId));

  const now = (input.now ?? defaultClock)().toISOString();
  const row: Routine = {
    id: uuidv4(),
    name: input.name,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await db.insert(routines).values(row);
  await db.insert(routineItems).values(buildItemRows(row.id, input.items, now));

  return row;
}

function buildItemRows(routineId: string, items: NewRoutineItem[], now: string): RoutineItem[] {
  return items.map((item, position) => ({
    id: uuidv4(),
    routineId,
    drillId: item.drillId,
    plannedSets: item.plannedSets ?? null,
    position,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }));
}

export async function updateRoutine(
  db: Db,
  id: string,
  input: { name?: string; items?: NewRoutineItem[]; now?: Clock }
): Promise<void> {
  const now = (input.now ?? defaultClock)().toISOString();
  if (input.name !== undefined) {
    await db
      .update(routines)
      .set({ name: input.name, updatedAt: now })
      .where(eq(routines.id, id));
  }
  if (input.items !== undefined) {
    if (input.items.length === 0) {
      throw new EmptyRoutineError();
    }
    await assertLiveDrills(db, input.items.map((i) => i.drillId));

    await db.delete(routineItems).where(eq(routineItems.routineId, id));
    await db.insert(routineItems).values(buildItemRows(id, input.items, now));
  }
}

async function assertLiveDrills(db: Db, drillIds: string[]): Promise<void> {
  const liveDrills = (await db
    .select({ id: drills.id })
    .from(drills)
    .where(and(inArray(drills.id, drillIds), isNull(drills.deletedAt)))
    .all()) as Array<{ id: string }>;
  const liveIds = new Set(liveDrills.map((d) => d.id));
  for (const drillId of drillIds) {
    if (!liveIds.has(drillId)) {
      throw new DrillNotFoundError(drillId);
    }
  }
}

export async function archiveRoutine(
  db: Db,
  id: string,
  opts: { now?: Clock } = {}
): Promise<void> {
  const now = (opts.now ?? defaultClock)().toISOString();
  await db
    .update(routines)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(routines.id, id));
}

export async function listRoutines(db: Db): Promise<Routine[]> {
  return (await db
    .select()
    .from(routines)
    .where(isNull(routines.deletedAt))
    .all()) as Routine[];
}

const SEED_ROUTINES: Array<{ name: string; items: Array<{ drillName: string; plannedSets: number | null }> }> = [
  {
    name: 'Wall warmup',
    items: [
      { drillName: 'Forehand crosscourt rally', plannedSets: 1 },
      { drillName: 'Backhand rally', plannedSets: 1 },
      { drillName: 'Alternating FH/BH rally', plannedSets: 1 },
    ],
  },
  {
    name: 'Full serve session',
    items: [
      { drillName: 'Flat 1st serve, deuce box', plannedSets: 3 },
      { drillName: 'Flat 1st serve, ad box', plannedSets: 3 },
      { drillName: 'Slice serve wide', plannedSets: 3 },
      { drillName: 'Second serve, body', plannedSets: 3 },
    ],
  },
];

export async function seedRoutinesIfEmpty(db: Db, opts: { now?: Clock } = {}): Promise<void> {
  const existing = await db.select().from(routines).limit(1).all();
  if (existing.length > 0) return;

  const now = (opts.now ?? defaultClock)().toISOString();
  const allDrills = (await db.select().from(drills).all()) as Array<{ id: string; name: string }>;
  const drillIdByName = new Map(allDrills.map((d) => [d.name, d.id]));

  for (const seed of SEED_ROUTINES) {
    const items: NewRoutineItem[] = seed.items.map((i) => {
      const drillId = drillIdByName.get(i.drillName);
      if (!drillId) throw new Error(`Seed drill missing: ${i.drillName}`);
      return { drillId, plannedSets: i.plannedSets };
    });
    await createRoutine(db, { name: seed.name, items, now: opts.now });
  }
}

export async function getRoutine(
  db: Db,
  id: string
): Promise<{ routine: Routine; items: RoutineItem[] } | null> {
  const rows = (await db
    .select()
    .from(routines)
    .where(and(eq(routines.id, id), isNull(routines.deletedAt)))
    .limit(1)
    .all()) as Routine[];
  const routine = rows[0];
  if (!routine) return null;

  const items = (await db
    .select()
    .from(routineItems)
    .where(eq(routineItems.routineId, routine.id))
    .orderBy(asc(routineItems.position))
    .all()) as RoutineItem[];

  return { routine, items };
}
