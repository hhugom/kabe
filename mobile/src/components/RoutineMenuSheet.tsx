import { YStack } from 'tamagui';
import { spacing } from '../theme';
import { Row } from './Row';
import { SheetLayout } from './SheetLayout';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onArchive: () => void;
};

// Routine menu bottom sheet, opened from the RoutineEditor header three-dot
// on edit mode only (see docs/conventions/primary-vs-annex.md § RoutineEditor
// and docs/conventions/navigation-surface.md § Header-icon affordance).
export function RoutineMenuSheet({ open, onOpenChange, onArchive }: Props) {
  return (
    <SheetLayout open={open} onOpenChange={onOpenChange} title="Routine">
      <YStack gap={spacing.sm}>
        <Row
          testID="routine-menu-archive"
          title="Archive routine"
          leading="delete"
          variant="danger"
          onPress={onArchive}
        />
      </YStack>
    </SheetLayout>
  );
}
