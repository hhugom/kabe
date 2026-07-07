import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export type TestDb = BetterSQLite3Database;

export function createTestDb(): TestDb {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite);

  const migrationsDir = join(__dirname, '..', '..', 'drizzle');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    for (const stmt of sql.split('--> statement-breakpoint')) {
      const trimmed = stmt.trim();
      if (trimmed) sqlite.exec(trimmed);
    }
  }

  return db;
}
