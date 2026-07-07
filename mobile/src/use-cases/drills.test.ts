import { v4 as uuidv4 } from 'uuid';
import { drills } from '../db/schema';
import { createTestDb } from '../db/test-db';
import { listDrills, seedIfEmpty } from './drills';

describe('listDrills', () => {
  it('returns an empty array when the drills table is empty', async () => {
    const db = createTestDb();
    const result = await listDrills(db);
    expect(result).toEqual([]);
  });

  it('excludes soft-deleted drills by default', async () => {
    const db = createTestDb();
    const now = new Date().toISOString();
    await db.insert(drills).values({
      id: uuidv4(),
      name: 'Archived drill',
      category: 'wall',
      metric: 'duration',
      target: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: now,
    });
    const result = await listDrills(db);
    expect(result).toEqual([]);
  });

  it('includes archived drills when { includeArchived: true }', async () => {
    const db = createTestDb();
    const now = new Date().toISOString();
    await db.insert(drills).values({
      id: uuidv4(),
      name: 'Archived drill',
      category: 'wall',
      metric: 'duration',
      target: null,
      notes: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: now,
    });
    const result = await listDrills(db, { includeArchived: true });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Archived drill');
  });
});

describe('seedIfEmpty', () => {
  it('inserts 8 drills when the table is empty', async () => {
    const db = createTestDb();
    await seedIfEmpty(db);
    const result = await listDrills(db);
    expect(result).toHaveLength(8);
  });

  it('is idempotent — does not duplicate when called twice', async () => {
    const db = createTestDb();
    await seedIfEmpty(db);
    await seedIfEmpty(db);
    const result = await listDrills(db);
    expect(result).toHaveLength(8);
  });

  it('seeds the PRD-specified drills (name, category, metric)', async () => {
    const db = createTestDb();
    await seedIfEmpty(db);
    const result = await listDrills(db);
    const shape = result
      .map((d) => ({ name: d.name, category: d.category, metric: d.metric }))
      .sort((a, b) => a.name.localeCompare(b.name));
    expect(shape).toEqual(
      [
        { name: 'Forehand crosscourt rally', category: 'wall', metric: 'duration' },
        { name: 'Backhand rally', category: 'wall', metric: 'duration' },
        { name: 'Alternating FH/BH rally', category: 'wall', metric: 'duration' },
        { name: 'Volley sequence close to wall', category: 'wall', metric: 'duration' },
        { name: 'Flat 1st serve, deuce box', category: 'service', metric: 'accuracy' },
        { name: 'Flat 1st serve, ad box', category: 'service', metric: 'accuracy' },
        { name: 'Slice serve wide', category: 'service', metric: 'accuracy' },
        { name: 'Second serve, body', category: 'service', metric: 'accuracy' },
      ].sort((a, b) => a.name.localeCompare(b.name))
    );
  });
});
