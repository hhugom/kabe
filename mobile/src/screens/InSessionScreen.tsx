// Persistent workout sheet body (archetype 5 — see docs/adr/0004 and
// navigation-surface.md § Archetype 5). Orchestrates hydration, entry state,
// the in-sheet three-dot Session menu, and three archetype-4 modals:
// unfilled-slots-at-end, mid-timer save-and-switch, delete-filled confirm.
//
// Presentation lives in ./insession/*. This file is the state machine and
// the wiring — no visual chrome except the in-sheet header row with the
// three-dot (which is the InSession-only equivalent of a stack-push header).

import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet } from 'react-native';
import { XStack, YStack } from 'tamagui';
import { AddADrillSheet } from '../components/AddADrillSheet';
import { AppButton } from '../components/AppButton';
import { Icon } from '../components/Icon';
import { ModalLayout } from '../components/ModalLayout';
import { Screen } from '../components/Screen';
import { SessionMenuSheet } from '../components/SessionMenuSheet';
import { useSessionPeekPublisher } from '../components/SessionSheet';
import { getAppDb } from '../db/client';
import { colors, spacing } from '../theme';
import {
  ActiveSessionState,
  adHocEntries,
  cancelEntry,
  drillFor,
  endActiveSession,
  hydrate,
  pickDrill,
  pickSlot,
  plannedSlots,
  removePlannedSlot,
  saveDurationEntry,
  saveEntry,
  slotIdOf,
  updateDraftAttempted,
  updateDraftValue,
  type PlannedSlot,
  type SlotId,
} from '../use-cases/active-session';
import {
  completeToTarget,
  skipAllUnfilled,
  unfilledSlots,
} from '../use-cases/bulk-resolve-unfilled-slots';
import { Drill } from '../use-cases/drills';
import type { DrillEntry } from '../use-cases/sessions';
import { deleteEntry, updateEntry } from '../use-cases/sessions';
import { EmptyHero, FinishHero, FocusHero } from './insession/FocusHero';
import { EditEntrySheet } from './insession/EditEntrySheet';
import { DoneList, UpNextStrip } from './insession/SessionPeripherals';
import { DeleteSlotConfirm, SwitchTimerConfirm } from './insession/ConfirmModals';
import { formatMmSs } from '../lib/format';

type Props = {
  clock?: () => Date;
  // The SessionSheet controller passes its `close` action so this screen can
  // signal "session ended, unmount me". Optional so a legacy call site could
  // still stub it — but there's no active call site outside the sheet.
  onClose?: () => void;
};

const defaultClock = () => new Date();

// Modal state for the mid-timer switch prompt. Populated when the player taps
// a different slot while a duration timer is running; cleared on Cancel /
// Discard / Save & switch.
type SwitchPrompt = {
  slot: PlannedSlot;
  elapsedSeconds: number;
  drill: Drill;
};

// Modal state for the delete-filled confirm. Two variants because empty-slot
// delete is a silent one-tap; only filled-entry delete needs the confirm.
type PendingDelete =
  | { kind: 'slot'; slot: PlannedSlot; drillName: string }
  | { kind: 'entry'; entryId: string; drillName: string };

export function InSessionScreen({ clock = defaultClock, onClose }: Props) {
  const close = () => onClose?.();
  const publishPeekMeta = useSessionPeekPublisher();
  const [state, setState] = useState<ActiveSessionState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [timerStartedAt, setTimerStartedAt] = useState<Date | null>(null);
  const [addDrillOpen, setAddDrillOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unfilledModalOpen, setUnfilledModalOpen] = useState(false);
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const [switchPrompt, setSwitchPrompt] = useState<SwitchPrompt | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  // Which planned slot the FocusHero represents. Distinct from `pickedDrill`
  // because the same drill can appear in multiple planned slots — the drill ID
  // alone can't tell us which slot the user tapped.
  const [focusedSlotId, setFocusedSlotId] = useState<SlotId | null>(null);
  const [, setTick] = useState(0);

  // Duration timer ticker + AppState resume — the interval keeps elapsed fresh
  // while the app is foregrounded; the AppState listener forces a re-render when
  // returning from background so the recomputed elapsed (from startedAt) shows
  // immediately instead of waiting for the next 500 ms tick.
  useEffect(() => {
    if (!timerStartedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 500);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setTick((t) => t + 1);
    });
    return () => {
      clearInterval(id);
      sub?.remove();
      deactivateKeepAwake();
    };
  }, [timerStartedAt]);

  // Feed the persistent-sheet peek. The peek can't derive this itself — its
  // last hydrated snapshot goes stale the moment focus/save/delete run here.
  // Publish label + startedAt whenever our state changes so the header line
  // stays truthful across every mutation.
  useEffect(() => {
    if (!state) {
      publishPeekMeta({ label: null, startedAtMs: null });
      return;
    }
    publishPeekMeta({
      label: currentDrillLabel(state),
      startedAtMs: Date.parse(state.session.startedAt),
    });
  }, [state, publishPeekMeta]);

  // Auto-focus the first unfilled slot inline: cheaper and safer than a
  // useEffect that re-fires on every render. Callers thread the fresh state
  // through and get back a state that already has the pick applied.
  const autoFocusFirstUnfilled = useCallback(
    (fresh: ActiveSessionState): ActiveSessionState => {
      const slots = plannedSlots(fresh);
      const first = slots.find((s) => !s.entry);
      if (!first) return fresh;
      setFocusedSlotId(slotIdOf(first));
      return pickSlot(fresh, first);
    },
    []
  );

  const refresh = useCallback(async () => {
    const next = await hydrate(getAppDb());
    if (!next) {
      close();
      return;
    }
    setState(autoFocusFirstUnfilled(next));
    setLoaded(true);
  }, [onClose, autoFocusFirstUnfilled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const derived = state ? deriveSlots(state) : null;

  function onPickSlot(slot: PlannedSlot) {
    if (!state) return;
    // Mid-timer switch prompt: if a duration timer is running for a *different*
    // slot, ask whether to save, discard, or cancel. Prevents accidental data loss.
    if (timerStartedAt && state.pickedDrill?.metric === 'duration') {
      const elapsedSeconds = Math.floor((clock().getTime() - timerStartedAt.getTime()) / 1000);
      setSwitchPrompt({ slot, elapsedSeconds, drill: state.pickedDrill });
      return;
    }
    setTimerStartedAt(null);
    setState((s) => (s ? pickSlot(s, slot) : s));
    setFocusedSlotId(slotIdOf(slot));
  }

  async function resolveSwitchPrompt(action: 'cancel' | 'discard' | 'save') {
    if (!switchPrompt || !state) {
      setSwitchPrompt(null);
      return;
    }
    const { slot, elapsedSeconds } = switchPrompt;
    if (action === 'cancel') {
      setSwitchPrompt(null);
      return;
    }
    setTimerStartedAt(null);
    deactivateKeepAwake();
    if (action === 'discard') {
      setState((s) => (s ? pickSlot(cancelEntry(s), slot) : s));
      setFocusedSlotId(slotIdOf(slot));
      setSwitchPrompt(null);
      return;
    }
    // save & switch
    const saved = await saveDurationEntry(state, getAppDb(), {
      elapsedSeconds,
      now: clock,
    });
    setState(pickSlot(saved, slot));
    setFocusedSlotId(slotIdOf(slot));
    setSwitchPrompt(null);
  }

  function onPickDrillForAdHoc(drill: Drill) {
    setAddDrillOpen(false);
    setTimerStartedAt(null);
    setState((s) => (s ? pickDrill(s, drill.id) : s));
    setFocusedSlotId(null);
  }

  function onCancelEntry() {
    setTimerStartedAt(null);
    setState((s) => (s ? autoFocusFirstUnfilled(cancelEntry(s)) : s));
  }

  function onStartTimer() {
    setTimerStartedAt(clock());
    activateKeepAwakeAsync().catch(() => {});
  }

  async function onStopTimer() {
    if (!state || !timerStartedAt) return;
    const elapsedSeconds = Math.floor((clock().getTime() - timerStartedAt.getTime()) / 1000);
    deactivateKeepAwake();
    setTimerStartedAt(null);
    const next = await saveDurationEntry(state, getAppDb(), { elapsedSeconds, now: clock });
    setState(autoFocusFirstUnfilled(next));
  }

  async function onSaveEntry() {
    if (!state) return;
    const next = await saveEntry(state, getAppDb(), { now: clock });
    setState(autoFocusFirstUnfilled(next));
  }

  // Delete requests are two-step for filled data, one-step for empty slots.
  // The FocusHero delete button fires this: if the slot is empty (no entry),
  // remove silently; if filled, arm the DeleteSlotConfirm modal.
  function onRequestDeleteFocusedSlot(slot: PlannedSlot) {
    if (!state) return;
    if (!slot.entry) {
      removeSlotSilently(slot);
      return;
    }
    const name = drillFor(state, slot.drillId)?.name ?? 'this entry';
    setPendingDelete({ kind: 'slot', slot, drillName: name });
  }

  function removeSlotSilently(slot: PlannedSlot) {
    // Optimistic: mark the slot removed and drop its entry from local state
    // BEFORE the DB write returns, so the picker updates instantly.
    setState((s) => {
      if (!s) return s;
      let next = removePlannedSlot(s, slot.itemId, slot.slotIndex);
      if (slot.entry) {
        next = { ...next, entries: next.entries.filter((e) => e.id !== slot.entry!.id) };
      }
      return autoFocusFirstUnfilled(cancelEntry(next));
    });
    if (slot.entry) {
      deleteEntry(getAppDb(), slot.entry.id, { now: clock }).catch(() => {});
    }
  }

  function onRequestDeleteEntry(entryId: string) {
    if (!state) return;
    const entry = state.entries.find((e) => e.id === entryId);
    const name = entry ? drillFor(state, entry.drillId)?.name ?? 'this entry' : 'this entry';
    setPendingDelete({ kind: 'entry', entryId, drillName: name });
  }

  function resolvePendingDelete() {
    if (!pendingDelete || !state) {
      setPendingDelete(null);
      return;
    }
    if (pendingDelete.kind === 'slot') {
      removeSlotSilently(pendingDelete.slot);
    } else {
      const { entryId } = pendingDelete;
      setState((s) => (s ? { ...s, entries: s.entries.filter((e) => e.id !== entryId) } : s));
      setEditEntryId(null);
      deleteEntry(getAppDb(), entryId, { now: clock }).catch(() => {});
    }
    setPendingDelete(null);
  }

  function onSaveEditedEntry(
    entryId: string,
    values: { value: number; attempted?: number | null }
  ) {
    if (!state) return;
    setState((s) => {
      if (!s) return s;
      return {
        ...s,
        entries: s.entries.map((e) =>
          e.id === entryId
            ? { ...e, value: values.value, attempted: values.attempted ?? e.attempted }
            : e
        ),
      };
    });
    setEditEntryId(null);
    updateEntry(getAppDb(), entryId, {
      value: values.value,
      attempted: values.attempted,
      now: clock,
    }).catch(() => {});
  }

  async function onEnd() {
    if (!state) return;
    await endActiveSession(state, getAppDb(), { now: clock });
    close();
  }

  function requestEnd() {
    if (!state) return;
    if (unfilledSlots(state).length > 0) {
      setUnfilledModalOpen(true);
    } else {
      onEnd();
    }
  }

  async function onCompleteToTarget() {
    if (!state) return;
    const next = await completeToTarget(state, getAppDb(), { now: clock });
    setState(next);
    setUnfilledModalOpen(false);
    await endActiveSession(next, getAppDb(), { now: clock });
    close();
  }

  async function onSkipAllUnfilled() {
    if (!state) return;
    const next = skipAllUnfilled(state);
    setState(next);
    setUnfilledModalOpen(false);
    await endActiveSession(next, getAppDb(), { now: clock });
    close();
  }

  if (!loaded || !state || !derived) return <Screen />;

  const { pickedDrill, draft } = state;
  const { unfilledPlanned, filledPlanned, adhoc, allDone, isEmpty } = derived;

  const focusedSlot =
    focusedSlotId != null && pickedDrill
      ? unfilledPlanned.find((s) => slotIdOf(s) === focusedSlotId) ?? null
      : null;

  const editEntry = editEntryId ? state.entries.find((e) => e.id === editEntryId) ?? null : null;
  const editDrill = editEntry ? drillFor(state, editEntry.drillId) : null;

  const doneCount = filledPlanned.length + adhoc.length;
  const totalCount = doneCount + unfilledPlanned.length;

  return (
    <Screen padded={false} edges={['left', 'right']}>
      {/* In-sheet header row (the InSession-only equivalent of a stack-push
          header, per navigation-surface.md § Header-icon affordance
          Post-ADR-0004). Just a three-dot on the right — the peek header
          above owns drag handle + title + timer. */}
      <XStack
        alignItems="center"
        justifyContent="flex-end"
        paddingHorizontal={spacing.md}
        paddingTop={spacing.sm}
        paddingBottom={spacing.sm}
      >
        <Pressable
          testID="insession-menu"
          accessibilityRole="button"
          accessibilityLabel="Session menu"
          onPress={() => setMenuOpen(true)}
          style={styles.menuBtn}
        >
          <Icon name="more-vert" size={24} color={colors.textPrimary} />
        </Pressable>
      </XStack>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.xxl,
        }}
      >
        <YStack gap={spacing.lg}>
          {isEmpty ? (
            <EmptyHero onAddDrill={() => setAddDrillOpen(true)} />
          ) : allDone ? (
            <FinishHero
              totalSlots={doneCount}
              onFinish={requestEnd}
              onAddDrill={() => setAddDrillOpen(true)}
            />
          ) : pickedDrill && draft ? (
            <FocusHero
              drill={pickedDrill}
              draft={draft}
              slot={focusedSlot}
              state={state}
              doneCount={doneCount}
              totalCount={totalCount}
              timerStartedAt={timerStartedAt}
              clock={clock}
              handlers={{
                onUpdateValue: (s) =>
                  setState((st) => (st ? updateDraftValue(st, s) : st)),
                onUpdateAttempted: (s) =>
                  setState((st) => (st ? updateDraftAttempted(st, s) : st)),
                onSaveEntry,
                onStartTimer,
                onStopTimer,
                onCancel: onCancelEntry,
                onDeleteSlot: focusedSlot
                  ? () => onRequestDeleteFocusedSlot(focusedSlot)
                  : undefined,
              }}
            />
          ) : null}

          {!allDone && !isEmpty ? (
            <UpNextStrip
              unfilled={unfilledPlanned}
              focusedSlotId={focusedSlot ? slotIdOf(focusedSlot) : null}
              drills={state.drills}
              onPickSlot={onPickSlot}
              onOpenAddDrill={() => setAddDrillOpen(true)}
            />
          ) : null}

          {filledPlanned.length + adhoc.length > 0 ? (
            <DoneList
              filledPlanned={filledPlanned}
              adhoc={adhoc}
              state={state}
              onEditEntry={(id) => setEditEntryId(id)}
            />
          ) : null}
        </YStack>
      </ScrollView>

      <AddADrillSheet
        open={addDrillOpen}
        onOpenChange={setAddDrillOpen}
        drills={state.drills}
        onPick={onPickDrillForAdHoc}
      />

      <EditEntrySheet
        entry={editEntry}
        drill={editDrill}
        onClose={() => setEditEntryId(null)}
        onSave={onSaveEditedEntry}
        onRemoveRequest={onRequestDeleteEntry}
      />

      <SessionMenuSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        onEndSession={() => {
          setMenuOpen(false);
          requestEnd();
        }}
      />

      <ModalLayout
        open={unfilledModalOpen}
        onCancel={() => setUnfilledModalOpen(false)}
        title="Unfilled planned slots"
      >
        <AppButton title="Complete to target" onPress={onCompleteToTarget} size="lg" />
        <AppButton
          title="Skip all"
          onPress={onSkipAllUnfilled}
          size="lg"
          variant="dangerSolid"
        />
      </ModalLayout>

      <SwitchTimerConfirm
        open={switchPrompt != null}
        drillName={switchPrompt?.drill.name ?? ''}
        elapsedText={switchPrompt ? formatMmSs(switchPrompt.elapsedSeconds) : ''}
        onChoice={resolveSwitchPrompt}
      />

      <DeleteSlotConfirm
        open={pendingDelete != null}
        drillName={pendingDelete?.drillName ?? ''}
        onCancel={() => setPendingDelete(null)}
        onConfirm={resolvePendingDelete}
      />
    </Screen>
  );
}

// -------------------------------------------------- derived slot buckets --

type Derived = {
  slots: PlannedSlot[];
  unfilledPlanned: PlannedSlot[];
  filledPlanned: PlannedSlot[];
  adhoc: DrillEntry[];
  allDone: boolean;
  isEmpty: boolean;
};

function deriveSlots(state: ActiveSessionState): Derived {
  const slots = plannedSlots(state);
  const unfilledPlanned = slots.filter((s) => !s.entry);
  const filledPlanned = slots.filter((s) => s.entry != null);
  const adhoc = adHocEntries(state);
  const anyLogged = filledPlanned.length + adhoc.length > 0;
  const allDone = unfilledPlanned.length === 0 && anyLogged;
  const isEmpty = slots.length === 0 && adhoc.length === 0 && state.pickedDrill == null;
  return { slots, unfilledPlanned, filledPlanned, adhoc, allDone, isEmpty };
}

// Peek label heuristic: prefer the drill in focus; else the drill for the
// next unfilled planned slot; else fall back to the generic 'Session'.
function currentDrillLabel(state: ActiveSessionState): string {
  if (state.pickedDrill) return state.pickedDrill.name;
  const nextSlot = plannedSlots(state).find((s) => !s.entry);
  if (nextSlot) return drillFor(state, nextSlot.drillId)?.name ?? 'Session';
  return 'Session';
}

const styles = StyleSheet.create({
  menuBtn: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

