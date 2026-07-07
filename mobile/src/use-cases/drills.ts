import { isNull } from 'drizzle-orm';
import { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { v4 as uuidv4 } from 'uuid';
import { drills, DrillRow, NewDrillRow } from '../db/schema';

type Db = BaseSQLiteDatabase<'sync' | 'async', unknown>;

export type Drill = DrillRow;

export async function listDrills(
  db: Db,
  opts: { includeArchived?: boolean } = {}
): Promise<Drill[]> {
  const query = db.select().from(drills);
  if (opts.includeArchived) {
    return query.all() as Promise<Drill[]>;
  }
  return query.where(isNull(drills.deletedAt)).all() as Promise<Drill[]>;
}

const SEED_DRILLS: Array<Pick<NewDrillRow, 'name' | 'category' | 'metric'>> = [
  { name: 'Forehand crosscourt rally', category: 'wall', metric: 'duration' },
  { name: 'Backhand rally', category: 'wall', metric: 'duration' },
  { name: 'Alternating FH/BH rally', category: 'wall', metric: 'duration' },
  { name: 'Volley sequence close to wall', category: 'wall', metric: 'duration' },
  { name: 'Flat 1st serve, deuce box', category: 'service', metric: 'accuracy' },
  { name: 'Flat 1st serve, ad box', category: 'service', metric: 'accuracy' },
  { name: 'Slice serve wide', category: 'service', metric: 'accuracy' },
  { name: 'Second serve, body', category: 'service', metric: 'accuracy' },
];

export async function seedIfEmpty(db: Db): Promise<void> {
  const existing = await db.select().from(drills).limit(1).all();
  if (existing.length > 0) return;

  const now = new Date().toISOString();
  const rows: NewDrillRow[] = SEED_DRILLS.map((d) => ({
    id: uuidv4(),
    name: d.name,
    category: d.category,
    metric: d.metric,
    target: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }));
  await db.insert(drills).values(rows);
}
