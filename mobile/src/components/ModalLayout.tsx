import { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

type Props = {
  open: boolean;
  onCancel: () => void;
  title?: string;
  children?: ReactNode;
};

// Archetype 4 — Modal. See docs/conventions/navigation-surface.md § Four screen archetypes.
// Dimmed backdrop that IGNORES tap-outside (explicit action required).
// Hardware back maps to onCancel via Modal.onRequestClose (Android).
export function ModalLayout({ open, onCancel, title, children }: Props) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop} testID="modal-backdrop">
        <Pressable style={styles.card} onPress={() => {}}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {children}
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceHi,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
  },
});
