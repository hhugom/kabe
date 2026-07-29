// Peripheral content that sits around FocusHero inside the InSession sheet:
//   - UpNextStrip: horizontal chip strip of remaining unfilled planned slots
//     + an "Add drill" chip. Not the goal; same-goal peripheral (what's next).
//   - DoneList: two labeled sections — PLANNED (filled slots, tap-to-edit)
//     and AD-HOC (drills logged off-plan, tap-to-edit). Both sections use
//     textPrimary for content text; textSecondary is reserved for structural
//     labels per ergonomic-minima.md § Consequences.

import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';
import { Row } from '../../components/Row';
import { colors, radius, spacing, typography } from '../../theme';
import { drillFor, slotIdOf, type PlannedSlot, type SlotId } from '../../use-cases/active-session';
import type { ActiveSessionState } from '../../use-cases/active-session';
import type { Drill } from '../../use-cases/drills';
import type { DrillEntry } from '../../use-cases/sessions';
import { formatDrillTarget, formatEntryValue } from './shared';

// ---------------- UP NEXT --

export function UpNextStrip({
  unfilled,
  focusedSlotId,
  drills,
  onPickSlot,
  onOpenAddDrill,
}: {
  unfilled: PlannedSlot[];
  focusedSlotId: SlotId | null;
  drills: Drill[];
  onPickSlot: (slot: PlannedSlot) => void;
  onOpenAddDrill: () => void;
}) {
  const queue = unfilled.filter((s) => slotIdOf(s) !== focusedSlotId);
  return (
    <YStack gap={spacing.sm}>
      <Text style={[typography.label, { color: colors.textSecondary }]}>UP NEXT</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <XStack gap={spacing.sm} paddingRight={spacing.lg}>
          {queue.map((slot) => {
            const drill = drills.find((d) => d.id === slot.drillId);
            return (
              <UpNextChip
                key={slotIdOf(slot)}
                slot={slot}
                drill={drill}
                onPress={() => onPickSlot(slot)}
              />
            );
          })}
          <AddDrillChip onPress={onOpenAddDrill} />
        </XStack>
      </ScrollView>
    </YStack>
  );
}

function UpNextChip({
  slot,
  drill,
  onPress,
}: {
  slot: PlannedSlot;
  drill: Drill | undefined;
  onPress: () => void;
}) {
  const target = drill ? formatDrillTarget(drill) : null;
  return (
    <Pressable testID={`up-next-${slotIdOf(slot)}`} onPress={onPress} style={styles.chip}>
      <Text style={[typography.label, { color: colors.textSecondary }]}>
        {drill?.metric.toUpperCase() ?? ''}
        {target ? ` · ${target}` : ''}
      </Text>
      <Text style={{ color: colors.textPrimary, fontWeight: '700' }} numberOfLines={1}>
        {drill?.name ?? 'Drill'}
      </Text>
    </Pressable>
  );
}

function AddDrillChip({ onPress }: { onPress: () => void }) {
  return (
    <Pressable testID="up-next-add-drill" onPress={onPress} style={styles.addChip}>
      <Text style={{ color: colors.accent, fontSize: 20, fontWeight: '900' }}>+</Text>
      <Text style={[typography.label, { color: colors.accent }]}>ADD DRILL</Text>
    </Pressable>
  );
}

// ---------------- DONE list (two sections) --

export function DoneList({
  filledPlanned,
  adhoc,
  state,
  onEditEntry,
}: {
  filledPlanned: PlannedSlot[];
  adhoc: DrillEntry[];
  state: ActiveSessionState;
  onEditEntry: (entryId: string) => void;
}) {
  const hasPlanned = filledPlanned.length > 0;
  const hasAdhoc = adhoc.length > 0;
  return (
    <YStack gap={spacing.md}>
      {hasPlanned ? (
        <YStack gap={spacing.sm}>
          <Text style={[typography.label, { color: colors.textSecondary }]}>
            DONE — PLANNED
          </Text>
          <YStack gap={spacing.xs}>
            {filledPlanned.map((slot) => {
              const entry = slot.entry!;
              const drill = drillFor(state, entry.drillId);
              return (
                <DoneRow
                  key={`p-${slotIdOf(slot)}`}
                  testID={`done-planned-${slotIdOf(slot)}`}
                  title={drill?.name ?? 'Drill'}
                  value={formatEntryValue(entry, drill?.metric ?? 'reps')}
                  onPress={() => onEditEntry(entry.id)}
                />
              );
            })}
          </YStack>
        </YStack>
      ) : null}
      {hasAdhoc ? (
        <YStack gap={spacing.sm}>
          <Text style={[typography.label, { color: colors.textSecondary }]}>
            AD-HOC
          </Text>
          <YStack gap={spacing.xs}>
            {adhoc.map((entry) => {
              const drill = drillFor(state, entry.drillId);
              return (
                <DoneRow
                  key={`a-${entry.id}`}
                  testID={`done-adhoc-${entry.id}`}
                  title={drill?.name ?? 'Drill'}
                  value={formatEntryValue(entry, drill?.metric ?? 'reps')}
                  onPress={() => onEditEntry(entry.id)}
                />
              );
            })}
          </YStack>
        </YStack>
      ) : null}
    </YStack>
  );
}

function DoneRow({
  testID,
  title,
  value,
  onPress,
}: {
  testID: string;
  title: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <View testID={testID}>
      <Row
        title={title}
        onPress={onPress}
        trailing={
          <Text
            testID={`${testID}-value`}
            style={[typography.body, { fontVariant: ['tabular-nums'] }]}
          >
            {value}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: colors.surfaceHi,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: 220,
    minWidth: 140,
    minHeight: 56,
    gap: 2,
    justifyContent: 'center',
  },
  addChip: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 110,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
