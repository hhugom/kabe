import { drizzle, ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

let cached: ExpoSQLiteDatabase | null = null;

export function getAppDb(): ExpoSQLiteDatabase {
  if (cached) return cached;
  const sqlite = openDatabaseSync('kabe.db');
  cached = drizzle(sqlite);
  return cached;
}
