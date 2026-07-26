import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Pressable, ScrollView, TextInput } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';
import { AddADrillSheet } from '../components/AddADrillSheet';
import { AppButton } from '../components/AppButton';
import { ModalLayout } from '../components/ModalLayout';
import { Row } from '../components/Row';
import { Screen } from '../components/Screen';
import { SessionMenuSheet } from '../components/SessionMenuSheet';
import { getAppDb } from '../db/client';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme';
import {
  ActiveSessionState,
  adHocEntries,
  canSaveDraft,
  cancelEntry,
  deleteEntryAndRefresh,
  endActiveSession,
  hydrate,
  PlannedSlot,
  pickDrill,
  pickEntry,
  pickSlot,
  plannedSlots,
  removePlannedSlot,
  saveDurationEntry,
  saveEntry,
  updateDraftAttempted,
  updateDraftValue,
} from '../use-cases/active-session';
import {
  completeToTarget,
  skipAllUnfilled,
  unfilledSlots,
} from '../use-cases/bulk-resolve-unfilled-slots';
import { Drill } from '../use-cases/drills';
import type { DrillEntry } from '../use-cases/sessions';

type Props = NativeStackScreenProps<RootStackParamList, 'InSession'> & {
  clock?: () => Date;
};

const defaultClock = () => new Date();

function formatMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function unitForMetric(metric: Drill['metric']): string {
  if (metric === 'reps') return 'reps';
  if (metric === 'duration') return 'sec';
  return '';
}

// Delete lives in its own tap region beside the row's primary surface. Per
// ergonomic-minima § destructive-adjacent, either ≥24 dp gap OR "visually
// distinct region" is required — the danger-coloured label plus the outer
// XStack gap keeps this on the right side of both.
const deleteButtonStyle = {
  minHeight: 56,
  minWidth: 56,
  paddingHorizontal: spacing.md,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

function formatEntryValue(
  entry: { value: number; attempted: number | null },
  metric: Drill['metric']
): string {
  if (metric === 'accuracy') return `${entry.value} / ${entry.attempted ?? '?'}`;
  if (metric === 'duration') return formatMmSs(entry.value);
  return `${entry.value} ${unitForMetric(metric)}`;
}

// State-driven accent per aesthetic-direction.md: cyan <90%, amber 90–100%, magenta ≥100%.
function stateAccentFor(pct: number): string {
  if (pct >= 1) return colors.accentMagenta;
  if (pct >= 0.9) return colors.accentAmber;
  return colors.accent;
}

// Bundles the "progress toward target" concept the three entry modes share.
// `ratePctInt` uncaps (0..120) so the RATE chip can read "115%"; `trackFillPct`
// caps at 100 so the progress bar never overflows its container.
type TargetProgress = {
  accent: string;
  ratePctInt: number;
  trackFillPct: number;
};

function progressFor(value: number, target: number | null): TargetProgress | null {
  if (target == null || target <= 0) return null;
  const pct = Math.min(1.2, Math.max(0, value / target));
  return {
    accent: stateAccentFor(pct),
    ratePctInt: Math.round(pct * 100),
    trackFillPct: Math.round(Math.min(1, pct) * 100),
  };
}

// Cyan is the neutral primary when no target sets state (aesthetic-direction
// § state-driven accent rule). Pass this explicitly rather than relying on
// AppButton's default variant colour.
function primaryAccentFor(progress: TargetProgress | null): string {
  return progress?.accent ?? colors.accent;
}

export function InSessionScreen({ navigation, clock = defaultClock }: Props) {
  const [state, setState] = useState<ActiveSessionState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [timerStartedAt, setTimerStartedAt] = useState<Date | null>(null);
  const [addDrillOpen, setAddDrillOpen] = useState(false);
  const [, setTick] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingDeleteEntryId, setPendingDeleteEntryId] = useState<string | null>(null);
  const [unfilledModalOpen, setUnfilledModalOpen] = useState(false);

  // Publish the three-dot handler up through navigation options so the shared
  // PillHeader (rendered by RootStack) can bind it. See App.tsx#renderPillHeader.
  useEffect(() => {
    navigation.setOptions({ onMenuPress: () => setMenuOpen(true) } as any);
  }, [navigation]);

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

  const refresh = useCallback(async () => {
    const next = await hydrate(getAppDb());
    if (!next) {
      navigation.goBack();
      return;
    }
    setState(next);
    setLoaded(true);
  }, [navigation]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function onPickDrill(drillId: string) {
    setTimerStartedAt(null);
    setState((s) => (s ? pickDrill(s, drillId) : s));
  }

  function onPickEntry(entryId: string) {
    setTimerStartedAt(null);
    setState((s) => (s ? pickEntry(s, entryId) : s));
  }

  function onPickSlot(slot: PlannedSlot) {
    setTimerStartedAt(null);
    setState((s) => (s ? pickSlot(s, slot) : s));
  }

  async function onConfirmDeleteEntry(entryId: string) {
    if (!state) return;
    setPendingDeleteEntryId(null);
    const next = await deleteEntryAndRefresh(state, getAppDb(), entryId, { now: clock });
    setState(next);
  }

  function onCancelEntry() {
    setTimerStartedAt(null);
    setState((s) => (s ? cancelEntry(s) : s));
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
    setState(next);
  }

  async function onSaveEntry() {
    if (!state) return;
    const next = await saveEntry(state, getAppDb(), { now: clock });
    setState(next);
  }

  async function onEnd() {
    if (!state) return;
    await endActiveSession(state, getAppDb(), { now: clock });
    navigation.goBack();
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
    navigation.goBack();
  }

  async function onSkipAllUnfilled() {
    if (!state) return;
    const next = skipAllUnfilled(state);
    setState(next);
    setUnfilledModalOpen(false);
    await endActiveSession(next, getAppDb(), { now: clock });
    navigation.goBack();
  }

  if (!loaded || !state) return <Screen />;

  const { pickedDrill, draft } = state;

  const menuSheet = (
    <SessionMenuSheet
      open={menuOpen}
      onOpenChange={setMenuOpen}
      onEndSession={() => {
        setMenuOpen(false);
        requestEnd();
      }}
    />
  );

  // Modal-archetype 4 (docs/conventions/navigation-surface.md § Modal): tap-outside
  // is ignored by ModalLayout; hardware back maps to onCancel (session stays active).
  const unfilledModal = (
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
  );

  if (pickedDrill?.metric === 'duration' && draft?.kind === 'duration') {
    const elapsedSeconds = timerStartedAt
      ? Math.max(0, Math.floor((clock().getTime() - timerStartedAt.getTime()) / 1000))
      : 0;
    const target = pickedDrill.target;
    const progress = progressFor(elapsedSeconds, target);
    const primaryAccent = primaryAccentFor(progress);

    return (
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <EntryHeader drill={pickedDrill} />

        <EntryHeroPanel
          digits={formatMmSs(elapsedSeconds)}
          progress={progress}
          trackTestID="duration-progress-track"
          marginTop={spacing.md}
        />

        {target != null ? (
          <EntryStatChips
            chips={[
              { label: 'TARGET', value: formatMmSs(target), testID: 'duration-target-chip' },
              {
                label: 'REMAINING',
                value: formatMmSs(Math.max(0, target - elapsedSeconds)),
                testID: 'duration-remaining-chip',
              },
              { label: 'RATE', value: `${progress!.ratePctInt}%`, testID: 'duration-rate-chip' },
            ]}
          />
        ) : null}

        <YStack gap={spacing.md} marginTop="auto">
          <AppButton
            title={timerStartedAt ? 'Stop' : 'Start'}
            onPress={timerStartedAt ? onStopTimer : onStartTimer}
            size="lg"
            testID="primary-action"
            style={{ backgroundColor: primaryAccent }}
          />
          <AppButton title="Cancel" onPress={onCancelEntry} variant="ghost" size="lg" />
        </YStack>
        {menuSheet}
        {unfilledModal}
      </Screen>
    );
  }

  if (pickedDrill?.metric === 'accuracy' && draft?.kind === 'accuracy') {
    const target = pickedDrill.target;
    const successes = Number(draft.value || '0') || 0;
    const attempted = Number(draft.attempted || '0') || 0;
    const accuracyPctInt = attempted > 0 ? Math.round((successes / attempted) * 100) : 0;
    const targetPctInt = target ?? 0;
    const progress = progressFor(accuracyPctInt, target);
    const primaryAccent = primaryAccentFor(progress);
    return (
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <EntryHeader drill={pickedDrill} />

        <EntryHeroPanel
          digits={`${accuracyPctInt}%`}
          digitsTestID="accuracy-hero-readout"
          progress={progress}
          trackTestID="accuracy-progress-track"
        />

        {target != null ? (
          <EntryStatChips
            chips={[
              { label: 'TARGET', value: `${targetPctInt}%`, testID: 'accuracy-target-chip' },
              {
                label: 'REMAINING',
                value: `${Math.max(0, targetPctInt - accuracyPctInt)}%`,
                testID: 'accuracy-remaining-chip',
              },
              { label: 'RATE', value: `${progress!.ratePctInt}%`, testID: 'accuracy-rate-chip' },
            ]}
          />
        ) : null}

        <XStack alignItems="flex-end" gap={spacing.sm} marginTop={spacing.lg}>
          <NumberField
            label="SUCCESSES"
            value={draft.value}
            onChangeText={(s) => setState((st) => (st ? updateDraftValue(st, s) : st))}
            accessibilityLabel="accuracy-value-input"
          />
          <View height={78} justifyContent="center">
            <Text style={[typography.title, { color: colors.textMuted }]}>/</Text>
          </View>
          <NumberField
            label="ATTEMPTED"
            value={draft.attempted}
            onChangeText={(s) => setState((st) => (st ? updateDraftAttempted(st, s) : st))}
            accessibilityLabel="accuracy-attempted-input"
          />
        </XStack>
        <YStack gap={spacing.md} marginTop="auto">
          <AppButton
            title="Save"
            onPress={onSaveEntry}
            size="lg"
            disabled={!canSaveDraft(state)}
            testID="primary-action"
            style={{ backgroundColor: primaryAccent }}
          />
          <AppButton title="Cancel" onPress={onCancelEntry} variant="ghost" size="lg" />
        </YStack>
        {menuSheet}
        {unfilledModal}
      </Screen>
    );
  }

  if (pickedDrill && draft?.kind === 'reps') {
    const target = pickedDrill.target;
    const draftValue = Number(draft.value || '0') || 0;
    const progress = progressFor(draftValue, target);
    const primaryAccent = primaryAccentFor(progress);
    return (
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <EntryHeader drill={pickedDrill} />

        <EntryHeroPanel
          digits={String(draftValue)}
          digitsTestID="reps-hero-readout"
          progress={progress}
          trackTestID="reps-progress-track"
        />

        {target != null ? (
          <EntryStatChips
            chips={[
              { label: 'TARGET', value: String(target), testID: 'reps-target-chip' },
              {
                label: 'REMAINING',
                value: String(Math.max(0, target - draftValue)),
                testID: 'reps-remaining-chip',
              },
              { label: 'RATE', value: `${progress!.ratePctInt}%`, testID: 'reps-rate-chip' },
            ]}
          />
        ) : null}

        <YStack alignItems="center" marginTop={spacing.lg}>
          <NumberField
            label="REPS"
            value={draft.value}
            onChangeText={(s) => setState((st) => (st ? updateDraftValue(st, s) : st))}
            accessibilityLabel="reps-input"
            wide
          />
        </YStack>
        <YStack gap={spacing.md} marginTop="auto">
          <AppButton
            title="Save"
            onPress={onSaveEntry}
            size="lg"
            disabled={!canSaveDraft(state)}
            testID="primary-action"
            style={{ backgroundColor: primaryAccent }}
          />
          <AppButton title="Cancel" onPress={onCancelEntry} variant="ghost" size="lg" />
        </YStack>
        {menuSheet}
        {unfilledModal}
      </Screen>
    );
  }

  const slots = plannedSlots(state);
  const adhoc = adHocEntries(state);

  return (
    <Screen padded={false} edges={['top', 'left', 'right', 'bottom']}>
      <YStack paddingHorizontal={spacing.lg} paddingTop={spacing.lg} paddingBottom={spacing.md}>
        <Text style={[typography.label, { color: colors.accent }]}>IN SESSION</Text>
        <Text style={[typography.title, { marginTop: spacing.xs }]}>What are you working on?</Text>
      </YStack>

      <YStack flex={1}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.lg,
          }}
        >
          {slots.length > 0 ? (
            <YStack marginBottom={spacing.md} gap={spacing.sm}>
              <SectionLabel text="PLANNED" />
              {slots.map((slot) => {
                const drill = state.drills.find((d) => d.id === slot.drillId);
                const rowKey = `${slot.itemId}-${slot.slotIndex}`;
                const armed = slot.entry != null && pendingDeleteEntryId === slot.entry.id;
                return (
                  <PlannedSlotRow
                    key={rowKey}
                    rowKey={rowKey}
                    slot={slot}
                    drill={drill}
                    armed={armed}
                    onPick={() => onPickSlot(slot)}
                    onArmDelete={() =>
                      slot.entry && setPendingDeleteEntryId(slot.entry.id)
                    }
                    onConfirmDelete={() =>
                      slot.entry && onConfirmDeleteEntry(slot.entry.id)
                    }
                    onRemoveEmpty={() =>
                      setState((s) =>
                        s ? removePlannedSlot(s, slot.itemId, slot.slotIndex) : s
                      )
                    }
                  />
                );
              })}
            </YStack>
          ) : null}

          {adhoc.length > 0 ? (
            <YStack marginTop={spacing.md} gap={spacing.sm}>
              <SectionLabel text="AD-HOC" />
              {adhoc.map((entry) => {
                const drill = state.drills.find((d) => d.id === entry.drillId);
                return (
                  <AdHocEntryRow
                    key={entry.id}
                    entry={entry}
                    drill={drill}
                    onPick={() => onPickEntry(entry.id)}
                  />
                );
              })}
            </YStack>
          ) : null}
        </ScrollView>
      </YStack>

      <YStack
        paddingHorizontal={spacing.lg}
        paddingVertical={spacing.md}
        borderTopWidth={1}
        borderTopColor={colors.surfaceHi}
        backgroundColor={colors.surface}
      >
        <AppButton
          title="Add a drill"
          onPress={() => setAddDrillOpen(true)}
          size="lg"
        />
      </YStack>

      <AddADrillSheet
        open={addDrillOpen}
        onOpenChange={setAddDrillOpen}
        drills={state.drills}
        onPick={(drill) => {
          setAddDrillOpen(false);
          onPickDrill(drill.id);
        }}
      />
      {menuSheet}
      {unfilledModal}
    </Screen>
  );
}

function EntryHeader({ drill }: { drill: Drill }) {
  return (
    <YStack marginBottom={spacing.lg}>
      <Text style={[typography.label, { color: colors.accent }]}>
        {drill.category.toUpperCase()}
      </Text>
      <Text style={[typography.title, { marginTop: spacing.xs }]}>{drill.name}</Text>
    </YStack>
  );
}

function EntryHeroPanel({
  digits,
  digitsTestID,
  progress,
  trackTestID,
  marginTop,
}: {
  digits: string;
  digitsTestID?: string;
  progress: TargetProgress | null;
  trackTestID?: string;
  marginTop?: number;
}) {
  return (
    <YStack
      backgroundColor={colors.surface}
      borderColor={colors.surfaceHi}
      borderWidth={1}
      borderRadius={radius.lg}
      padding={spacing.xl}
      alignItems="center"
      marginTop={marginTop}
    >
      <Text testID={digitsTestID} style={typography.heroDigits}>
        {digits}
      </Text>
      {progress ? (
        <YStack width="100%" marginTop={spacing.lg}>
          <View
            testID={trackTestID}
            height={10}
            width="100%"
            borderRadius={radius.pill}
            backgroundColor={colors.surfaceHi}
            overflow="hidden"
          >
            <View
              height="100%"
              width={`${progress.trackFillPct}%`}
              backgroundColor={progress.accent}
              borderRadius={radius.pill}
            />
          </View>
        </YStack>
      ) : null}
    </YStack>
  );
}

type ChipSpec = { label: string; value: string; testID?: string };

function EntryStatChips({ chips }: { chips: ChipSpec[] }) {
  return (
    <XStack gap={spacing.md} marginTop={spacing.md}>
      {chips.map((c) => (
        <StatChip key={c.label} label={c.label} value={c.value} testID={c.testID} />
      ))}
    </XStack>
  );
}

function EntryValueText({
  entry,
  metric,
  testID,
}: {
  entry: { value: number; attempted: number | null };
  metric: Drill['metric'];
  testID?: string;
}) {
  return (
    <Text
      testID={testID}
      style={[typography.body, { color: colors.textSecondary, fontVariant: ['tabular-nums'] }]}
    >
      {formatEntryValue(entry, metric)}
    </Text>
  );
}

type DeleteMode = 'empty' | 'filled' | 'confirm';

function RowDeleteButton({
  mode,
  testID,
  onPress,
}: {
  mode: DeleteMode;
  testID: string;
  onPress: () => void;
}) {
  const label = mode === 'confirm' ? 'Confirm' : 'Delete';
  const color = mode === 'empty' ? colors.textSecondary : colors.danger;
  return (
    <Pressable testID={testID} onPress={onPress} style={deleteButtonStyle}>
      <Text style={[typography.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

function PlannedSlotRow({
  rowKey,
  slot,
  drill,
  armed,
  onPick,
  onArmDelete,
  onConfirmDelete,
  onRemoveEmpty,
}: {
  rowKey: string;
  slot: PlannedSlot;
  drill: Drill | undefined;
  armed: boolean;
  onPick: () => void;
  onArmDelete: () => void;
  onConfirmDelete: () => void;
  onRemoveEmpty: () => void;
}) {
  const filled = slot.entry != null;
  const deleteMode: DeleteMode = !filled ? 'empty' : armed ? 'confirm' : 'filled';
  const deleteTestID =
    deleteMode === 'confirm'
      ? `planned-slot-${rowKey}-delete-confirm`
      : `planned-slot-${rowKey}-delete`;
  const onDeletePress =
    deleteMode === 'empty' ? onRemoveEmpty : deleteMode === 'confirm' ? onConfirmDelete : onArmDelete;
  const trailing =
    filled && slot.entry ? (
      <EntryValueText
        entry={slot.entry}
        metric={drill?.metric ?? 'reps'}
        testID={`planned-slot-${rowKey}-value`}
      />
    ) : undefined;
  return (
    <XStack alignItems="center" gap={spacing.md}>
      <View flex={1}>
        <Row
          testID={`planned-slot-${rowKey}`}
          title={drill?.name ?? 'Drill'}
          trailing={trailing}
          onPress={onPick}
        />
      </View>
      <RowDeleteButton mode={deleteMode} testID={deleteTestID} onPress={onDeletePress} />
    </XStack>
  );
}

function AdHocEntryRow({
  entry,
  drill,
  onPick,
}: {
  entry: DrillEntry;
  drill: Drill | undefined;
  onPick: () => void;
}) {
  return (
    <Row
      testID={`adhoc-entry-${entry.id}`}
      title={drill?.name ?? 'Drill'}
      trailing={
        <EntryValueText
          entry={entry}
          metric={drill?.metric ?? 'reps'}
          testID={`adhoc-entry-${entry.id}-value`}
        />
      }
      onPress={onPick}
    />
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <Text style={[typography.label, { marginTop: spacing.md, marginBottom: spacing.sm }]}>
      {text}
    </Text>
  );
}

function StatChip({
  label,
  value,
  testID,
}: {
  label: string;
  value: string;
  testID?: string;
}) {
  return (
    <YStack
      flex={1}
      backgroundColor={colors.surface}
      borderColor={colors.surfaceHi}
      borderWidth={1}
      borderRadius={radius.md}
      paddingVertical={14}
      paddingHorizontal={spacing.lg}
    >
      {/* Mid-drill target labels floor at 24 sp per ergonomic-minima.md. */}
      <Text
        style={[
          typography.label,
          { fontSize: 24, lineHeight: 28, letterSpacing: 1.5 },
        ]}
      >
        {label}
      </Text>
      <Text
        testID={testID ? `${testID}-value` : undefined}
        style={{
          fontSize: 26,
          fontWeight: '800',
          color: colors.textPrimary,
          fontVariant: ['tabular-nums'],
          marginTop: 4,
        }}
      >
        {value}
      </Text>
    </YStack>
  );
}

function NumberField({
  label,
  value,
  onChangeText,
  accessibilityLabel,
  wide,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  accessibilityLabel: string;
  wide?: boolean;
}) {
  return (
    <YStack
      backgroundColor={colors.surface}
      borderRadius={radius.md}
      borderWidth={1}
      borderColor={colors.surfaceHi}
      padding={spacing.md}
      flex={wide ? undefined : 1}
      minWidth={wide ? 200 : undefined}
      alignItems={wide ? 'center' : undefined}
    >
      <Text style={[typography.label, { marginBottom: spacing.xs }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        accessibilityLabel={accessibilityLabel}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        style={{
          fontSize: 40,
          lineHeight: 48,
          fontWeight: '800',
          color: colors.textPrimary,
          padding: 0,
          minHeight: 48,
          textAlign: 'center',
          fontVariant: ['tabular-nums'],
        }}
      />
    </YStack>
  );
}
