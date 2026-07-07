import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { getAppDb } from '../db/client';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme';
import { listRoutines, Routine } from '../use-cases/routines';
import { startSession } from '../use-cases/sessions';

type Props = NativeStackScreenProps<RootStackParamList, 'PickRoutine'>;

export function PickRoutineScreen({ navigation }: Props) {
  const [routines, setRoutines] = useState<Routine[] | null>(null);

  useEffect(() => {
    listRoutines(getAppDb()).then(setRoutines);
  }, []);

  async function pick(routineId: string) {
    await startSession(getAppDb(), { routineId });
    navigation.replace('InSession');
  }

  if (routines === null) return <Screen />;

  if (routines.length === 0) {
    return (
      <Screen>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No routines yet</Text>
          <Text style={styles.emptyBody}>Create a routine from the Drills tab first.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <FlatList
        data={routines}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => pick(item.id)}
            testID={`pick-routine-${item.id}`}
            style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
          >
            <Text style={styles.name}>{item.name}</Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sep: {
    height: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cardPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  name: {
    ...typography.subtitle,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.title,
  },
  emptyBody: {
    ...typography.bodyMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
