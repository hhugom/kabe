// FocusHero — the single-goal, single-primary "log the next drill" surface
// inside the InSession sheet. Renders one of five variants based on session
// state: empty (no queue, no ad-hoc), finish (all planned slots filled), or
// one of reps / accuracy / duration for the currently focused slot's drill.
//
// Non-negotiables from the conventions:
//   - HeroPanel (surface card + surfaceHi border, per aesthetic-direction.md
//     § HUD conventions) around the digits.
//   - Progress track when the drill has a target; state-driven accent per
//     aesthetic-direction.md § State-driven accent rule.
//   - Primary action bottom-anchored (within the FocusHero card) with a ghost
//     Cancel directly below (per navigation-surface.md § Primary action).
//   - Delete slot lives in a visually distinct region (top-right of the
//     hero) — never as bottom-anchored primary (per navigation-surface.md
//     § Two hard rules).
//   - Uppercase structural labels ≥ 12 sp; content text uses textPrimary at
//     ≥ 16 sp (per ergonomic-minima.md § Numeric floor).

import { Pressable, StyleSheet, TextInput } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';
import { AppButton } from '../../components/AppButton';
import { Icon, type IconName } from '../../components/Icon';
import { colors, radius, spacing, typography } from '../../theme';
import type { ActiveSessionState, PlannedSlot } from '../../use-cases/active-session';
import { canSaveDraft } from '../../use-cases/active-session';
import type { Drill } from '../../use-cases/drills';
import { formatMmSs } from '../../lib/format';
import { formatDrillTarget, primaryAccentFor, progressFor, type TargetProgress } from './shared';

// ---------------- FocusHero surface (dispatch to per-metric variant) --

export type FocusHeroHandlers = {
  onUpdateValue: (v: string) => void;
  onUpdateAttempted: (v: string) => void;
  onSaveEntry: () => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onCancel: () => void;
  // Undefined when the focus is an ad-hoc drill (no planned slot to delete).
  onDeleteSlot?: () => void;
};

export function FocusHero({
  drill,
  draft,
  slot,
  state,
  doneCount,
  totalCount,
  timerStartedAt,
  clock,
  handlers,
}: {
  drill: Drill;
  draft: NonNullable<ActiveSessionState['draft']>;
  slot: PlannedSlot | null;
  state: ActiveSessionState;
  doneCount: number;
  totalCount: number;
  timerStartedAt: Date | null;
  clock: () => Date;
  handlers: FocusHeroHandlers;
}) {
  const allDone = totalCount > 0 && doneCount === totalCount;
  return (
    <View testID="focus-hero">
      <YStack
        backgroundColor={colors.surface}
        borderColor={colors.accent}
        borderWidth={2}
        borderRadius={radius.lg}
        padding={spacing.lg}
        gap={spacing.md}
      >
        <FocusHeroHeader
          drill={drill}
          isAdHoc={!slot}
          doneCount={doneCount}
          totalCount={totalCount}
          allDone={allDone}
          onDeleteSlot={handlers.onDeleteSlot}
        />

        {drill.metric === 'duration' && draft.kind === 'duration' ? (
          <DurationFocus
            drill={drill}
            timerStartedAt={timerStartedAt}
            clock={clock}
            onStart={handlers.onStartTimer}
            onStop={handlers.onStopTimer}
            onCancel={handlers.onCancel}
          />
        ) : drill.metric === 'accuracy' && draft.kind === 'accuracy' ? (
          <AccuracyFocus
            drill={drill}
            draft={draft}
            canSave={canSaveDraft(state)}
            onUpdateValue={handlers.onUpdateValue}
            onUpdateAttempted={handlers.onUpdateAttempted}
            onSave={handlers.onSaveEntry}
            onCancel={handlers.onCancel}
          />
        ) : drill.metric === 'reps' && draft.kind === 'reps' ? (
          <RepsFocus
            drill={drill}
            draft={draft}
            canSave={canSaveDraft(state)}
            onUpdateValue={handlers.onUpdateValue}
            onSave={handlers.onSaveEntry}
            onCancel={handlers.onCancel}
          />
        ) : null}
      </YStack>
    </View>
  );
}

function FocusHeroHeader({
  drill,
  isAdHoc,
  doneCount,
  totalCount,
  allDone,
  onDeleteSlot,
}: {
  drill: Drill;
  isAdHoc: boolean;
  doneCount: number;
  totalCount: number;
  allDone: boolean;
  onDeleteSlot?: () => void;
}) {
  return (
    <YStack>
      <XStack alignItems="center" justifyContent="space-between">
        <Text style={[typography.label, { color: colors.accent }]}>
          {isAdHoc ? 'AD-HOC' : 'NOW'}
        </Text>
        <XStack alignItems="center" gap={spacing.sm}>
          {totalCount > 0 ? (
            <Text
              testID="session-counter"
              style={[
                typography.label,
                // Counter is a structural label ≥ 12 sp — allowed to stay in
                // textSecondary per ergonomic-minima. Magenta on all-done.
                { color: allDone ? colors.accentMagenta : colors.textSecondary },
              ]}
            >
              {doneCount}/{totalCount}
            </Text>
          ) : null}
          {onDeleteSlot ? (
            // Delete lives in a visually distinct region (top-right of the
            // hero card, not inline with the bottom primary) per
            // navigation-surface.md § Two hard rules + ergonomic-minima.md
            // § Numeric floor destructive-adjacent rule.
            <Pressable
              testID="focus-delete"
              accessibilityRole="button"
              accessibilityLabel="Delete slot"
              onPress={onDeleteSlot}
              style={styles.deleteBtn}
            >
              <Icon name="delete" size={18} color={colors.danger} />
              <Text style={[typography.label, { color: colors.danger, marginLeft: 4 }]}>
                DELETE
              </Text>
            </Pressable>
          ) : null}
        </XStack>
      </XStack>
      <Text style={typography.title} numberOfLines={2}>
        {drill.name}
      </Text>
      <Text style={[typography.body, { marginTop: 2 }]}>
        {drill.metric.toUpperCase()}
        {formatDrillTarget(drill) ? ` · Target ${formatDrillTarget(drill)}` : ''}
      </Text>
    </YStack>
  );
}

// ---------------- per-metric variants --

function RepsFocus({
  drill,
  draft,
  canSave,
  onUpdateValue,
  onSave,
  onCancel,
}: {
  drill: Drill;
  draft: { kind: 'reps'; value: string };
  canSave: boolean;
  onUpdateValue: (s: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const target = drill.target;
  const draftValue = Number(draft.value || '0') || 0;
  const progress = progressFor(draftValue, target);
  const primaryAccent = primaryAccentFor(progress);
  return (
    <YStack gap={spacing.md}>
      <HeroPanel
        digits={String(draftValue)}
        digitsTestID="reps-hero-readout"
        progress={progress}
        trackTestID="reps-progress-track"
      />
      {target != null ? (
        <StatChips
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
      <NumberField
        label="REPS"
        value={draft.value}
        onChangeText={onUpdateValue}
        accessibilityLabel="reps-input"
        wide
      />
      <PrimaryActions
        primaryLabel="Save"
        primaryIcon="check"
        onPrimary={onSave}
        primaryDisabled={!canSave}
        primaryAccent={primaryAccent}
        onCancel={onCancel}
      />
    </YStack>
  );
}

function AccuracyFocus({
  drill,
  draft,
  canSave,
  onUpdateValue,
  onUpdateAttempted,
  onSave,
  onCancel,
}: {
  drill: Drill;
  draft: { kind: 'accuracy'; value: string; attempted: string };
  canSave: boolean;
  onUpdateValue: (s: string) => void;
  onUpdateAttempted: (s: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const target = drill.target;
  const successes = Number(draft.value || '0') || 0;
  const attempted = Number(draft.attempted || '0') || 0;
  const accuracyPctInt = attempted > 0 ? Math.round((successes / attempted) * 100) : 0;
  const targetPctInt = target ?? 0;
  const progress = progressFor(accuracyPctInt, target);
  const primaryAccent = primaryAccentFor(progress);
  return (
    <YStack gap={spacing.md}>
      <HeroPanel
        digits={`${accuracyPctInt}%`}
        digitsTestID="accuracy-hero-readout"
        progress={progress}
        trackTestID="accuracy-progress-track"
      />
      {target != null ? (
        <StatChips
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
      <XStack alignItems="flex-end" gap={spacing.sm}>
        <NumberField
          label="SUCCESSES"
          value={draft.value}
          onChangeText={onUpdateValue}
          accessibilityLabel="accuracy-value-input"
        />
        <View height={78} justifyContent="center">
          <Text style={[typography.title, { color: colors.textMuted }]}>/</Text>
        </View>
        <NumberField
          label="ATTEMPTED"
          value={draft.attempted}
          onChangeText={onUpdateAttempted}
          accessibilityLabel="accuracy-attempted-input"
        />
      </XStack>
      <PrimaryActions
        primaryLabel="Save"
        primaryIcon="check"
        onPrimary={onSave}
        primaryDisabled={!canSave}
        primaryAccent={primaryAccent}
        onCancel={onCancel}
      />
    </YStack>
  );
}

function DurationFocus({
  drill,
  timerStartedAt,
  clock,
  onStart,
  onStop,
  onCancel,
}: {
  drill: Drill;
  timerStartedAt: Date | null;
  clock: () => Date;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
}) {
  const elapsedSeconds = timerStartedAt
    ? Math.max(0, Math.floor((clock().getTime() - timerStartedAt.getTime()) / 1000))
    : 0;
  const target = drill.target;
  const progress = progressFor(elapsedSeconds, target);
  const primaryAccent = primaryAccentFor(progress);
  const running = timerStartedAt != null;
  return (
    <YStack gap={spacing.md}>
      <HeroPanel
        digits={formatMmSs(elapsedSeconds)}
        progress={progress}
        trackTestID="duration-progress-track"
      />
      {target != null ? (
        <StatChips
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
      <PrimaryActions
        primaryLabel={running ? 'Stop' : 'Start'}
        primaryIcon={running ? 'stop' : 'play-arrow'}
        onPrimary={running ? onStop : onStart}
        primaryDisabled={false}
        primaryAccent={primaryAccent}
        onCancel={onCancel}
      />
    </YStack>
  );
}

// ---------------- primary action row (bottom-anchored + ghost Cancel) --

// Bottom-anchored primary (single filled full-width button) with the
// canonical ghost Cancel directly below, per navigation-surface.md § Primary
// action pattern § Two hard rules.
function PrimaryActions({
  primaryLabel,
  primaryIcon,
  onPrimary,
  primaryDisabled,
  primaryAccent,
  onCancel,
}: {
  primaryLabel: string;
  primaryIcon: IconName;
  onPrimary: () => void;
  primaryDisabled: boolean;
  primaryAccent: string;
  onCancel: () => void;
}) {
  return (
    <YStack gap={spacing.sm}>
      <Pressable
        testID="primary-action"
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
        accessibilityState={{ disabled: primaryDisabled }}
        onPress={onPrimary}
        disabled={primaryDisabled}
        style={{
          minHeight: 56,
          borderRadius: radius.md,
          backgroundColor: primaryAccent,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          opacity: primaryDisabled ? 0.5 : 1,
          paddingHorizontal: spacing.lg,
        }}
      >
        <Icon name={primaryIcon} size={22} color={colors.onAccent} />
        <Text
          style={{
            color: colors.onAccent,
            fontSize: 18,
            fontWeight: '800',
            marginLeft: spacing.sm,
          }}
        >
          {primaryLabel}
        </Text>
      </Pressable>
      <AppButton
        title="Cancel"
        variant="ghost"
        testID="focus-cancel"
        onPress={onCancel}
      />
    </YStack>
  );
}

// ---------------- shared entry surfaces --

export function HeroPanel({
  digits,
  digitsTestID,
  progress,
  trackTestID,
}: {
  digits: string;
  digitsTestID?: string;
  progress: TargetProgress | null;
  trackTestID?: string;
}) {
  return (
    <YStack
      backgroundColor={colors.bg}
      borderColor={colors.surfaceHi}
      borderWidth={1}
      borderRadius={radius.md}
      padding={spacing.lg}
      alignItems="center"
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

function StatChips({ chips }: { chips: ChipSpec[] }) {
  return (
    <XStack gap={spacing.md}>
      {chips.map((c) => (
        <StatChip key={c.label} label={c.label} value={c.value} testID={c.testID} />
      ))}
    </XStack>
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
      paddingHorizontal={spacing.md}
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

export function NumberField({
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

// ---------------- empty + finish states --

export function EmptyHero({ onAddDrill }: { onAddDrill: () => void }) {
  return (
    <View testID="empty-hero">
      <YStack
        backgroundColor={colors.surface}
        borderColor={colors.surfaceHi}
        borderWidth={1}
        borderRadius={radius.lg}
        padding={spacing.xl}
        gap={spacing.md}
        alignItems="center"
      >
        <Text style={[typography.label, { color: colors.accent }]}>NOTHING QUEUED</Text>
        <Text style={typography.title}>Add a drill to start</Text>
        <AppButton
          title="Add a drill"
          size="lg"
          onPress={onAddDrill}
          style={{ alignSelf: 'stretch' }}
        />
      </YStack>
    </View>
  );
}

export function FinishHero({
  totalSlots,
  onFinish,
  onAddDrill,
}: {
  totalSlots: number;
  onFinish: () => void;
  onAddDrill: () => void;
}) {
  return (
    <View testID="finish-hero">
      <YStack
        backgroundColor={colors.surface}
        borderColor={colors.accentMagenta}
        borderWidth={2}
        borderRadius={radius.lg}
        padding={spacing.xl}
        gap={spacing.md}
        alignItems="center"
      >
        <Text style={[typography.label, { color: colors.accentMagenta }]}>
          ALL SETS COMPLETE
        </Text>
        {/* typography.display = 44 / 48 sp / weight 800 / tabular-nums,
            per aesthetic-direction.md § Type-scale sketch. Was raw fontSize: 64. */}
        <Text style={typography.display}>
          {totalSlots}/{totalSlots}
        </Text>
        <Text style={typography.body}>
          Nice work — every planned slot is filled.
        </Text>
        <AppButton
          title="Finish session"
          size="lg"
          testID="finish-session"
          onPress={onFinish}
          style={{ alignSelf: 'stretch', backgroundColor: colors.accentMagenta }}
        />
        <AppButton
          title="Add another drill"
          variant="ghost"
          onPress={onAddDrill}
          style={{ alignSelf: 'stretch' }}
        />
      </YStack>
    </View>
  );
}

const styles = StyleSheet.create({
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.danger,
  },
});
