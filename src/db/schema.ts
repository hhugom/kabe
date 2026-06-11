import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const now = sql`(strftime('%s','now') * 1000)`;

export const drills = sqliteTable('drills', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category', { enum: ['groundstroke', 'volley', 'specialty'] }).notNull(),
  shotType: text('shot_type', { enum: ['forehand', 'backhand', 'both', 'overhead'] }).notNull(),
  description: text('description'),
  isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull().default(now),
  updatedAt: integer('updated_at').notNull().default(now),
  syncedAt: integer('synced_at'),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  startedAt: integer('started_at').notNull().default(now),
  endedAt: integer('ended_at'),
  location: text('location'),
  overallNotes: text('overall_notes'),
  createdAt: integer('created_at').notNull().default(now),
  updatedAt: integer('updated_at').notNull().default(now),
  syncedAt: integer('synced_at'),
});

export const sessionDrills = sqliteTable('session_drills', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  drillId: text('drill_id')
    .notNull()
    .references(() => drills.id, { onDelete: 'restrict' }),
  orderIndex: integer('order_index').notNull(),
  drillNotes: text('drill_notes'),
  createdAt: integer('created_at').notNull().default(now),
  updatedAt: integer('updated_at').notNull().default(now),
  syncedAt: integer('synced_at'),
});

export const sets = sqliteTable('sets', {
  id: text('id').primaryKey(),
  sessionDrillId: text('session_drill_id')
    .notNull()
    .references(() => sessionDrills.id, { onDelete: 'cascade' }),
  setIndex: integer('set_index').notNull(),
  consecutiveHits: integer('consecutive_hits').notNull(),
  note: text('note'),
  recordedAt: integer('recorded_at').notNull().default(now),
  updatedAt: integer('updated_at').notNull().default(now),
  syncedAt: integer('synced_at'),
});

export type Drill = typeof drills.$inferSelect;
export type NewDrill = typeof drills.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SessionDrill = typeof sessionDrills.$inferSelect;
export type NewSessionDrill = typeof sessionDrills.$inferInsert;
export type Set = typeof sets.$inferSelect;
export type NewSet = typeof sets.$inferInsert;

export type DrillCategory = Drill['category'];
export type ShotType = Drill['shotType'];
