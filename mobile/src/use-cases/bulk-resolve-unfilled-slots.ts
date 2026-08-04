import { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { ActiveSessionState, drillFor, hydrate } from './active-session';
import { logEntry } from './sessions';

type Db = BaseSQLiteDatabase<'sync' | 'async', unknown>;
type Clock = () => Date;

export type UnfilledSlot = {
  itemId: string;
  drillId: string;
  count: number;
};

export function unfilledSlots(state: ActiveSessionState): UnfilledSlot[] {
  const out: UnfilledSlot[] = [];
  for (const item of state.plannedItems) {
    if (state.skippedItemIds.has(item.id)) continue;
    const logged = state.entries.filter((e) => e.drillId === item.drillId).length;
    const quota = item.plannedSets ?? 1;
    const missing = Math.max(0, quota - logged);
    if (missing > 0) {
      out.push({ itemId: item.id, drillId: item.drillId, count: missing });
    }
  }
  return out;
}

// Complete-to-target branch of the End-Session modal.
// For each unfilled slot, log one DrillEntry at the drill's (mandatory) target value.
export async function completeToTarget(
  state: ActiveSessionState,
  db: Db,
  opts: { now?: Clock } = {}
): Promise<ActiveSessionState> {
  for (const slot of unfilledSlots(state)) {
    const drill = drillFor(state, slot.drillId);
    if (!drill) continue;
    for (let i = 0; i < slot.count; i++) {
      await logEntry(db, {
        sessionId: state.session.id,
        drillId: drill.id,
        value: drill.target,
        attempted: drill.metric === 'accuracy' ? drill.target : undefined,
        now: opts.now,
      });
    }
  }
  const refreshed = await hydrate(db);
  return refreshed ?? state;
}

// Skip-all branch of the End-Session modal. In-memory only: adds every item
// that still has unfilled slots to skippedItemIds so the picker no longer
// shows them. Logged entries are preserved.
export function skipAllUnfilled(state: ActiveSessionState): ActiveSessionState {
  const next = new Set(state.skippedItemIds);
  for (const slot of unfilledSlots(state)) {
    next.add(slot.itemId);
  }
  return { ...state, skippedItemIds: next };
}
