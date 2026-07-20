import { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { Drill, listDrills } from './drills';
import { getRoutine, RoutineItem } from './routines';
import {
  DrillEntry,
  endSession,
  getActiveSession,
  logEntry,
  Session,
} from './sessions';

type Clock = () => Date;

export class InvalidDraftError extends Error {
  constructor(reason: string) {
    super(`Cannot save entry: ${reason}`);
    this.name = 'InvalidDraftError';
  }
}

type Db = BaseSQLiteDatabase<'sync' | 'async', unknown>;

function parseNonNegInt(s: string): number | null {
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : null;
}

export type EntryDraft =
  | { kind: 'reps'; value: string }
  | { kind: 'accuracy'; value: string; attempted: string }
  | { kind: 'duration' };

export type ActiveSessionState = {
  session: Session;
  entries: DrillEntry[];
  drills: Drill[];
  plannedItems: RoutineItem[];
  skippedItemIds: Set<string>;
  pickedDrill: Drill | null;
  draft: EntryDraft | null;
};

export async function hydrate(db: Db): Promise<ActiveSessionState | null> {
  const active = await getActiveSession(db);
  if (!active) return null;

  const allDrills = await listDrills(db);
  const plannedItems = active.session.routineId
    ? (await getRoutine(db, active.session.routineId))?.items ?? []
    : [];

  return {
    session: active.session,
    entries: active.entries,
    drills: allDrills,
    plannedItems,
    skippedItemIds: new Set(),
    pickedDrill: null,
    draft: null,
  };
}

export function pickDrill(state: ActiveSessionState, drillId: string): ActiveSessionState {
  const drill = state.drills.find((d) => d.id === drillId);
  if (!drill) return state;
  return { ...state, pickedDrill: drill, draft: draftForMetric(drill) };
}

export function cancelEntry(state: ActiveSessionState): ActiveSessionState {
  return { ...state, pickedDrill: null, draft: null };
}

export function updateDraftValue(state: ActiveSessionState, value: string): ActiveSessionState {
  if (!state.draft) return state;
  if (state.draft.kind === 'duration') return state;
  return { ...state, draft: { ...state.draft, value } };
}

export function updateDraftAttempted(
  state: ActiveSessionState,
  attempted: string
): ActiveSessionState {
  if (!state.draft || state.draft.kind !== 'accuracy') return state;
  return { ...state, draft: { ...state.draft, attempted } };
}

export async function saveEntry(
  state: ActiveSessionState,
  db: Db,
  opts: { now?: Clock } = {}
): Promise<ActiveSessionState> {
  if (!state.pickedDrill || !state.draft) {
    throw new InvalidDraftError('no drill picked');
  }
  if (state.draft.kind === 'duration') {
    throw new InvalidDraftError('duration entries must go through saveDurationEntry');
  }

  const value = parseNonNegInt(state.draft.value);
  if (value === null) throw new InvalidDraftError('value must be a non-negative integer');

  let attempted: number | undefined;
  if (state.draft.kind === 'accuracy') {
    const a = parseNonNegInt(state.draft.attempted);
    if (a === null) throw new InvalidDraftError('attempted must be a non-negative integer');
    attempted = a;
  }

  await logEntry(db, {
    sessionId: state.session.id,
    drillId: state.pickedDrill.id,
    value,
    attempted,
    now: opts.now,
  });
  return refreshEntries(cancelEntry(state), db);
}

export async function saveDurationEntry(
  state: ActiveSessionState,
  db: Db,
  opts: { elapsedSeconds: number; now?: Clock }
): Promise<ActiveSessionState> {
  if (!state.pickedDrill || state.draft?.kind !== 'duration') {
    throw new InvalidDraftError('no duration draft in progress');
  }
  await logEntry(db, {
    sessionId: state.session.id,
    drillId: state.pickedDrill.id,
    value: opts.elapsedSeconds,
    now: opts.now,
  });
  return refreshEntries(cancelEntry(state), db);
}

export async function endActiveSession(
  state: ActiveSessionState,
  db: Db,
  opts: { now?: Clock } = {}
): Promise<void> {
  await endSession(db, state.session.id, { now: opts.now });
}

export function skipPlannedItem(
  state: ActiveSessionState,
  itemId: string
): ActiveSessionState {
  const next = new Set(state.skippedItemIds);
  next.add(itemId);
  return { ...state, skippedItemIds: next };
}

export function visiblePlannedItems(state: ActiveSessionState): RoutineItem[] {
  return state.plannedItems.filter((i) => !state.skippedItemIds.has(i.id));
}

export function loggedCountForDrill(state: ActiveSessionState, drillId: string): number {
  return state.entries.filter((e) => e.drillId === drillId).length;
}

export function canSaveDraft(state: ActiveSessionState): boolean {
  if (!state.draft) return false;
  if (state.draft.kind === 'duration') return false;
  const value = parseNonNegInt(state.draft.value);
  if (value === null) return false;
  if (state.draft.kind === 'accuracy') {
    return parseNonNegInt(state.draft.attempted) !== null;
  }
  return true;
}

async function refreshEntries(state: ActiveSessionState, db: Db): Promise<ActiveSessionState> {
  const active = await getActiveSession(db);
  if (!active) return state;
  return { ...state, session: active.session, entries: active.entries };
}

function draftForMetric(drill: Drill): EntryDraft {
  if (drill.metric === 'duration') return { kind: 'duration' };
  if (drill.metric === 'accuracy') {
    return {
      kind: 'accuracy',
      value: '',
      attempted: drill.target != null ? String(drill.target) : '',
    };
  }
  return { kind: 'reps', value: drill.target != null ? String(drill.target) : '' };
}
