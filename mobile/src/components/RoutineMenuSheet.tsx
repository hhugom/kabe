import { Row } from './Row';
import { SheetLayout } from './SheetLayout';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onArchive: () => void;
};

// Routine menu bottom sheet. Opened from the three-dot on RoutineEditor in edit
// mode (create mode has no three-dot — nothing to archive yet). Contains the
// destructive "Archive" affordance as a danger Row; more items can be added
// here without touching RoutineEditor.
export function RoutineMenuSheet({ open, onOpenChange, onArchive }: Props) {
  return (
    <SheetLayout open={open} onOpenChange={onOpenChange}>
      <Row
        title="Archive"
        variant="danger"
        testID="routine-menu-archive"
        onPress={onArchive}
      />
    </SheetLayout>
  );
}
