// Two archetype-4 modals owned by the InSession sheet:
//
//   1) SwitchTimerConfirm — asked when the player taps a different slot while
//      a duration timer is running. Options: Cancel (default), Discard the
//      elapsed time, Save & switch (persist elapsed, then switch).
//
//   2) DeleteSlotConfirm — asked when the player triggers Delete on a slot or
//      entry that has data behind it (filled slot). Empty slots delete silently.
//
// Both replace prior uses of `Alert.alert` (native OS chrome bleeds through
// the Zwift-HUD aesthetic — see navigation-surface.md § Archetype 4).

import { Text } from 'react-native';
import { AppButton } from '../../components/AppButton';
import { ModalLayout } from '../../components/ModalLayout';
import { typography } from '../../theme';

export type SwitchTimerAction = 'cancel' | 'discard' | 'save';

export function SwitchTimerConfirm({
  open,
  drillName,
  elapsedText,
  onChoice,
}: {
  open: boolean;
  drillName: string;
  elapsedText: string;
  onChoice: (action: SwitchTimerAction) => void;
}) {
  return (
    <ModalLayout
      open={open}
      onCancel={() => onChoice('cancel')}
      title="Timer running"
    >
      <Text style={typography.body}>
        Save {elapsedText} for {drillName} and switch?
      </Text>
      <AppButton
        title="Save & switch"
        size="lg"
        testID="switch-timer-save"
        onPress={() => onChoice('save')}
      />
      <AppButton
        title="Discard"
        size="lg"
        variant="dangerSolid"
        testID="switch-timer-discard"
        onPress={() => onChoice('discard')}
      />
      <AppButton
        title="Cancel"
        variant="ghost"
        testID="switch-timer-cancel"
        onPress={() => onChoice('cancel')}
      />
    </ModalLayout>
  );
}

export function DeleteSlotConfirm({
  open,
  drillName,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  drillName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalLayout open={open} onCancel={onCancel} title="Delete this entry?">
      <Text style={typography.body}>
        Deleting {drillName || 'this entry'} is permanent.
      </Text>
      <AppButton
        title="Delete"
        size="lg"
        variant="dangerSolid"
        testID="delete-slot-confirm"
        onPress={onConfirm}
      />
      <AppButton
        title="Cancel"
        variant="ghost"
        testID="delete-slot-cancel"
        onPress={onCancel}
      />
    </ModalLayout>
  );
}

