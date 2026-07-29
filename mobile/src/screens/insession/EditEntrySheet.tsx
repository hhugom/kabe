// EditEntrySheet — opened when the player taps a DoneList row. Lets them
// edit the logged value(s) via NumberField, or Remove the entry (which
// arms the DeleteSlotConfirm modal — never a one-tap delete on filled data).

import { useEffect, useState } from 'react';
import { Text, XStack, YStack, View } from 'tamagui';
import { AppButton } from '../../components/AppButton';
import { SheetLayout } from '../../components/SheetLayout';
import { spacing, typography } from '../../theme';
import type { Drill } from '../../use-cases/drills';
import type { DrillEntry } from '../../use-cases/sessions';
import { NumberField } from './FocusHero';
import { formatDrillTarget } from './shared';

export function EditEntrySheet({
  entry,
  drill,
  onClose,
  onSave,
  onRemoveRequest,
}: {
  entry: DrillEntry | null;
  drill: Drill | null;
  onClose: () => void;
  onSave: (id: string, values: { value: number; attempted?: number | null }) => void;
  // Delegated up: filled-entry deletion always goes through a confirm modal
  // owned by the parent screen (see ConfirmModals.DeleteSlotConfirm).
  onRemoveRequest: (id: string) => void;
}) {
  const [value, setValue] = useState<string>('');
  const [attempted, setAttempted] = useState<string>('');

  useEffect(() => {
    if (!entry) return;
    setValue(String(entry.value));
    setAttempted(entry.attempted != null ? String(entry.attempted) : '');
  }, [entry?.id]);

  const open = entry != null && drill != null;
  return (
    <SheetLayout
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      title={drill?.name}
    >
      {entry && drill ? (
        <YStack gap={spacing.md}>
          <Text style={typography.body}>
            {drill.metric.toUpperCase()}
            {formatDrillTarget(drill) ? ` · Target ${formatDrillTarget(drill)}` : ''}
          </Text>
          {drill.metric === 'accuracy' ? (
            <XStack gap={spacing.md}>
              <View flex={1}>
                <NumberField
                  label="SUCCESSES"
                  value={value}
                  onChangeText={setValue}
                  accessibilityLabel="edit-value-input"
                />
              </View>
              <View flex={1}>
                <NumberField
                  label="ATTEMPTED"
                  value={attempted}
                  onChangeText={setAttempted}
                  accessibilityLabel="edit-attempted-input"
                />
              </View>
            </XStack>
          ) : (
            <NumberField
              label={drill.metric === 'duration' ? 'SECONDS' : 'REPS'}
              value={value}
              onChangeText={setValue}
              accessibilityLabel="edit-value-input"
              wide
            />
          )}
          <AppButton
            title="Save changes"
            size="lg"
            testID="edit-save"
            onPress={() =>
              onSave(entry.id, {
                value: Number(value || '0') || 0,
                attempted:
                  drill.metric === 'accuracy' ? Number(attempted || '0') || 0 : undefined,
              })
            }
          />
          <AppButton
            title="Remove"
            variant="danger"
            testID="edit-remove"
            onPress={() => onRemoveRequest(entry.id)}
          />
        </YStack>
      ) : null}
    </SheetLayout>
  );
}
