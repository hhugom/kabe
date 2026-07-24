import { Row } from './Row';
import { SheetLayout } from './SheetLayout';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEndSession: () => void;
};

// Header-icon Session menu sheet. See docs/conventions/primary-vs-annex.md
// § InSession-picker (End Session disposal) and
// docs/conventions/navigation-surface.md § Header-icon affordance.
export function SessionMenuSheet({ open, onOpenChange, onEndSession }: Props) {
  return (
    <SheetLayout open={open} onOpenChange={onOpenChange} title="Session menu">
      <Row
        title="End Session"
        variant="danger"
        onPress={onEndSession}
        testID="session-menu-end-session"
      />
    </SheetLayout>
  );
}
