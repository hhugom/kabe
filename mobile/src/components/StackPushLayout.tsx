import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from './AppButton';
import { Screen } from './Screen';
import { spacing } from '../theme';

type ButtonSlot = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
};

type Props = {
  entryHeader?: ReactNode;
  children?: ReactNode;
  primary: ButtonSlot;
  cancel?: ButtonSlot;
};

// Archetype 2 — Stack push. See docs/conventions/navigation-surface.md § Four screen archetypes.
// RN header sits above (rendered by the navigator). This layout owns:
//   in-content EntryHeader slot → content → bottom-anchored primary → optional ghost Cancel.
export function StackPushLayout({ entryHeader, children, primary, cancel }: Props) {
  return (
    <Screen edges={['left', 'right', 'bottom']}>
      {entryHeader ? <View style={styles.header}>{entryHeader}</View> : null}
      <View style={styles.content}>{children}</View>
      <View style={styles.footer}>
        <AppButton
          title={primary.title}
          onPress={primary.onPress}
          disabled={primary.disabled}
          size="lg"
        />
        {cancel ? (
          <AppButton
            title={cancel.title}
            onPress={cancel.onPress}
            variant="ghost"
            size="lg"
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.md,
  },
  content: {
    flex: 1,
  },
  footer: {
    gap: spacing.sm,
  },
});
