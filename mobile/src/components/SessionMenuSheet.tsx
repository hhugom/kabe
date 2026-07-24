import { Row } from './Row';
import { SheetLayout } from './SheetLayout';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEndSession: () => void;
};

// Session menu bottom sheet. Opened from the three-dot on InSession mode-screens.
// Contains the destructive "End Session" affordance as a danger Row; more items
// (Notes, Save routine as…) can be added here without touching InSession screens.
export function SessionMenuSheet({ open, onOpenChange, onEndSession }: Props) {
  return (
    <SheetLayout open={open} onOpenChange={onOpenChange}>
      <Row
        title="End Session"
        variant="danger"
        testID="session-menu-end-session"
        onPress={onEndSession}
      />
    </SheetLayout>
  );
}
