import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getAppDb } from '../db/client';
import { listRoutines, Routine } from '../use-cases/routines';
import { startSession } from '../use-cases/sessions';
import { colors, radius, spacing, typography } from '../theme';
import { SheetLayout } from './SheetLayout';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStarted: () => void;
};

export function PickRoutineSheet({ open, onOpenChange, onStarted }: Props) {
  const [routines, setRoutines] = useState<Routine[]>([]);

  useEffect(() => {
    if (!open) return;
    listRoutines(getAppDb()).then(setRoutines);
  }, [open]);

  async function start(routineId?: string) {
    await startSession(getAppDb(), routineId ? { routineId } : {});
    onStarted();
  }

  return (
    <SheetLayout open={open} onOpenChange={onOpenChange} title="Start a session">
      <View style={styles.list}>
        <Pressable
          testID="pick-routine-empty-start"
          onPress={() => start()}
          style={styles.row}
        >
          <Text style={styles.rowLabel}>Empty start</Text>
        </Pressable>
        {routines.map((r) => (
          <Pressable
            key={r.id}
            testID={`pick-routine-${r.id}`}
            onPress={() => start(r.id)}
            style={styles.row}
          >
            <Text style={styles.rowLabel}>{r.name}</Text>
          </Pressable>
        ))}
      </View>
    </SheetLayout>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  row: {
    backgroundColor: colors.surfaceHi,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  rowLabel: {
    ...typography.subtitle,
  },
});
