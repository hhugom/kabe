import { and, asc, eq, isNull } from 'drizzle-orm';
import { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { v4 as uuidv4 } from 'uuid';
import { drillEntries, DrillEntryRow, drills, routines, sessions, SessionRow } from '../db/schema';

type Db = BaseSQLiteDatabase<'sync' | 'async', unknown>;

export type Session = SessionRow;
export type DrillEntry = DrillEntryRow;

export type Clock = () => Date;
const defaultClock: Clock = () => new Date();

export class SessionAlreadyActiveError extends Error {
  constructor() {
    super('A session is already active');
    this.name = 'SessionAlreadyActiveError';
  }
}

export class AttemptedShapeError extends Error {
  constructor(metric: string, reason: 'missing' | 'unexpected') {
    super(
      reason === 'missing'
        ? `Drill with metric "${metric}" requires attempted`
        : `Drill with metric "${metric}" must not carry attempted`
    );
    this.name = 'AttemptedShapeError';
  }
}

export class DrillNotFoundError extends Error {
  constructor(drillId: string) {
    super(`Drill ${drillId} not found or archived`);
    this.name = 'DrillNotFoundError';
  }
}

export class RoutineNotFoundError extends Error {
  constructor(routineId: string) {
    super(`Routine ${routineId} not found or archived`);
    this.name = 'RoutineNotFoundError';
  }
}

export async function startSession(
  db: Db,
  opts: { routineId?: string | null; now?: Clock } = {}
): Promise<Session> {
  const existing = await getActiveSession(db);
  if (existing) throw new SessionAlreadyActiveError();

  if (opts.routineId != null) {
    const rows = await db
      .select({ id: routines.id })
      .from(routines)
      .where(and(eq(routines.id, opts.routineId), isNull(routines.deletedAt)))
      .limit(1)
      .all();
    if (rows.length === 0) throw new RoutineNotFoundError(opts.routineId);
  }

  const now = (opts.now ?? defaultClock)().toISOString();
  const row = {
    id: uuidv4(),
    startedAt: now,
    endedAt: null,
    routineId: opts.routineId ?? null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await db.insert(sessions).values(row);
  return row;
}

export async function getActiveSession(
  db: Db
): Promise<{ session: Session; entries: DrillEntry[] } | null> {
  const rows = (await db
    .select()
    .from(sessions)
    .where(and(isNull(sessions.endedAt), isNull(sessions.deletedAt)))
    .all()) as Session[];
  const session = rows[0];
  if (!session) return null;

  const entries = (await db
    .select()
    .from(drillEntries)
    .where(and(eq(drillEntries.sessionId, session.id), isNull(drillEntries.deletedAt)))
    .orderBy(asc(drillEntries.performedAt))
    .all()) as DrillEntry[];

  return { session, entries };
}

export async function endSession(
  db: Db,
  sessionId: string,
  opts: { now?: Clock } = {}
): Promise<void> {
  const now = (opts.now ?? defaultClock)().toISOString();
  await db
    .update(sessions)
    .set({ endedAt: now, updatedAt: now })
    .where(eq(sessions.id, sessionId));
}

export async function logEntry(
  db: Db,
  input: {
    sessionId: string;
    drillId: string;
    value: number;
    attempted?: number | null;
    performedAt?: string;
    now?: Clock;
  }
): Promise<DrillEntry> {
  const drillRows = await db
    .select()
    .from(drills)
    .where(and(eq(drills.id, input.drillId), isNull(drills.deletedAt)))
    .limit(1)
    .all();
  const drill = drillRows[0];
  if (!drill) {
    throw new DrillNotFoundError(input.drillId);
  }
  if (drill.metric === 'accuracy' && input.attempted == null) {
    throw new AttemptedShapeError('accuracy', 'missing');
  }
  if (drill.metric !== 'accuracy' && input.attempted != null) {
    throw new AttemptedShapeError(drill.metric, 'unexpected');
  }

  const now = (input.now ?? defaultClock)().toISOString();
  const row: DrillEntry = {
    id: uuidv4(),
    sessionId: input.sessionId,
    drillId: input.drillId,
    value: input.value,
    attempted: input.attempted ?? null,
    notes: null,
    performedAt: input.performedAt ?? now,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  await db.insert(drillEntries).values(row);
  return row;
}

