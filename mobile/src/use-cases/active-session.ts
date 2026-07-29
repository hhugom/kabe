import { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { Drill, listDrills } from './drills';
import { getRoutine, RoutineItem } from './routines';
import {
  DrillEntry,
  deleteEntry,
  endSession,
  getActiveSession,
  logEntry,
  Session,
  updateEntry,
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

// Per-item set of slot indices the user removed via empty-row Delete.
// In-memory only: sessions are ephemeral and the picker is the only reader.
type RemovedSlots = Map<string, Set<number>>;

export type ActiveSessionState = {
  session: Session;
  entries: DrillEntry[];
  drills: Drill[];
  plannedItems: RoutineItem[];
  // Whole-item skip: populated by bulk-resolve-unfilled-slots at End Session.
  // The picker hides all slots for any item in this set.
  skippedItemIds: Set<string>;
  removedSlots: RemovedSlots;
  pickedDrill: Drill | null;
  draft: EntryDraft | null;
  editingEntryId: string | null;
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
    removedSlots: new Map(),
    pickedDrill: null,
    draft: null,
    editingEntryId: null,
  };
}

export function pickDrill(state: ActiveSessionState, drillId: string): ActiveSessionState {
  const drill = drillFor(state, drillId);
  if (!drill) return state;
  return { ...state, pickedDrill: drill, draft: draftForMetric(drill), editingEntryId: null };
}

export function pickEntry(state: ActiveSessionState, entryId: string): ActiveSessionState {
  const entry = state.entries.find((e) => e.id === entryId);
  if (!entry) return state;
  const drill = drillFor(state, entry.drillId);
  if (!drill) return state;
  return {
    ...state,
    pickedDrill: drill,
    draft: draftFromEntry(drill, entry),
    editingEntryId: entryId,
  };
}

export function pickSlot(state: ActiveSessionState, slot: PlannedSlot): ActiveSessionState {
  return slot.entry ? pickEntry(state, slot.entry.id) : pickDrill(state, slot.drillId);
}

export function cancelEntry(state: ActiveSessionState): ActiveSessionState {
  return { ...state, pickedDrill: null, draft: null, editingEntryId: null };
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

  if (state.editingEntryId) {
    await updateEntry(db, state.editingEntryId, {
      value,
      attempted,
      now: opts.now,
    });
  } else {
    await logEntry(db, {
      sessionId: state.session.id,
      drillId: state.pickedDrill.id,
      value,
      attempted,
      now: opts.now,
    });
  }
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

// A stable identity for a planned slot, safe to compare across renders and
// use as a React key. Composite of routine-item id + slot index within that
// item. Wrapped as a branded type so callers don't accidentally mix it with
// arbitrary strings.
export type SlotId = string & { readonly __brand: 'SlotId' };

export type PlannedSlot = {
  itemId: string;
  drillId: string;
  slotIndex: number;
  entry: DrillEntry | null;
};

export function slotIdOf(slot: PlannedSlot): SlotId {
  return `${slot.itemId}-${slot.slotIndex}` as SlotId;
}

export function drillFor(state: ActiveSessionState, drillId: string): Drill | null {
  return state.drills.find((d) => d.id === drillId) ?? null;
}

function groupEntriesByDrill(entries: DrillEntry[]): Map<string, DrillEntry[]> {
  const out = new Map<string, DrillEntry[]>();
  for (const e of entries) {
    const bucket = out.get(e.drillId) ?? [];
    bucket.push(e);
    out.set(e.drillId, bucket);
  }
  return out;
}

export function adHocEntries(state: ActiveSessionState): DrillEntry[] {
  const claimed = new Set<string>();
  const entriesByDrill = groupEntriesByDrill(state.entries);
  for (const item of state.plannedItems) {
    if (state.skippedItemIds.has(item.id)) continue;
    const quota = item.plannedSets ?? 1;
    const entries = entriesByDrill.get(item.drillId) ?? [];
    for (let i = 0; i < quota; i++) {
      if (entries[i]) claimed.add(entries[i].id);
    }
  }
  return state.entries.filter((e) => !claimed.has(e.id));
}

export function plannedSlots(state: ActiveSessionState): PlannedSlot[] {
  const out: PlannedSlot[] = [];
  const entriesByDrill = groupEntriesByDrill(state.entries);
  for (const item of state.plannedItems) {
    if (state.skippedItemIds.has(item.id)) continue;
    const quota = item.plannedSets ?? 1;
    const entries = entriesByDrill.get(item.drillId) ?? [];
    const removed = state.removedSlots.get(item.id);
    for (let i = 0; i < quota; i++) {
      if (removed?.has(i)) continue;
      out.push({
        itemId: item.id,
        drillId: item.drillId,
        slotIndex: i,
        entry: entries[i] ?? null,
      });
    }
  }
  return out;
}

export async function deleteEntryAndRefresh(
  state: ActiveSessionState,
  db: Db,
  entryId: string,
  opts: { now?: Clock } = {}
): Promise<ActiveSessionState> {
  await deleteEntry(db, entryId, { now: opts.now });
  return refreshEntries(state, db);
}

export function removePlannedSlot(
  state: ActiveSessionState,
  itemId: string,
  slotIndex: number
): ActiveSessionState {
  const next = new Map(state.removedSlots);
  const existing = next.get(itemId);
  const updated = new Set(existing ?? []);
  updated.add(slotIndex);
  next.set(itemId, updated);
  return { ...state, removedSlots: next };
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

function draftFromEntry(drill: Drill, entry: DrillEntry): EntryDraft {
  if (drill.metric === 'duration') return { kind: 'duration' };
  if (drill.metric === 'accuracy') {
    return {
      kind: 'accuracy',
      value: String(entry.value),
      attempted: entry.attempted != null ? String(entry.attempted) : '',
    };
  }
  return { kind: 'reps', value: String(entry.value) };
}
