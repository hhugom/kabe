import { ReactNode } from 'react';
import { Sheet, Text, YStack } from 'tamagui';
import { colors, radius, spacing, typography } from '../theme';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children?: ReactNode;
};

// Archetype 3 — Sheet. See docs/conventions/navigation-surface.md § Four screen archetypes.
// Wraps Tamagui `Sheet` with the archetype's non-negotiables:
//   drag handle + backdrop dimming + drag-down / tap-outside / hardware-back dismissal.
export function SheetLayout({ open, onOpenChange, title, children }: Props) {
  return (
    <Sheet
      modal
      open={open}
      onOpenChange={onOpenChange}
      dismissOnOverlayPress
      dismissOnSnapToBottom
      snapPointsMode="fit"
      animation="quick"
    >
      <Sheet.Overlay backgroundColor="rgba(0,0,0,0.6)" />
      <Sheet.Handle backgroundColor={colors.surfaceHi} />
      <Sheet.Frame
        backgroundColor={colors.surface}
        borderTopLeftRadius={radius.lg}
        borderTopRightRadius={radius.lg}
        padding={spacing.lg}
      >
        {title ? (
          <YStack marginBottom={spacing.md}>
            <Text style={typography.title}>{title}</Text>
          </YStack>
        ) : null}
        {children}
      </Sheet.Frame>
    </Sheet>
  );
}
