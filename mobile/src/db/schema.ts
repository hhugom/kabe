import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const drills = sqliteTable('drills', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category', { enum: ['wall', 'service'] }).notNull(),
  metric: text('metric', { enum: ['reps', 'duration', 'accuracy'] }).notNull(),
  target: integer('target'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export type DrillRow = typeof drills.$inferSelect;
export type NewDrillRow = typeof drills.$inferInsert;

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  routineId: text('routine_id'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;

export const drillEntries = sqliteTable('drill_entries', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  drillId: text('drill_id').notNull(),
  value: integer('value').notNull(),
  attempted: integer('attempted'),
  notes: text('notes'),
  performedAt: text('performed_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export type DrillEntryRow = typeof drillEntries.$inferSelect;
export type NewDrillEntryRow = typeof drillEntries.$inferInsert;

export const routines = sqliteTable('routines', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export type RoutineRow = typeof routines.$inferSelect;
export type NewRoutineRow = typeof routines.$inferInsert;

export const routineItems = sqliteTable('routine_items', {
  id: text('id').primaryKey(),
  routineId: text('routine_id').notNull(),
  drillId: text('drill_id').notNull(),
  plannedSets: integer('planned_sets'),
  position: integer('position').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export type RoutineItemRow = typeof routineItems.$inferSelect;
export type NewRoutineItemRow = typeof routineItems.$inferInsert;
