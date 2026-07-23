import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { Screen } from '../components/Screen';
import { getAppDb } from '../db/client';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme';
import { listRoutines, Routine } from '../use-cases/routines';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function RoutinesScreen() {
  const navigation = useNavigation<Nav>();
  const [routines, setRoutines] = useState<Routine[] | null>(null);

  const refresh = useCallback(async () => {
    const rs = await listRoutines(getAppDb());
    setRoutines(rs);
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', refresh);
    refresh();
    return unsub;
  }, [navigation, refresh]);

  if (routines === null) return <Screen />;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.h1}>Routines</Text>
      </View>
      <FlatList
        data={routines}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <Pressable
            testID={`routine-${item.id}`}
            onPress={() => navigation.navigate('RoutineEditor', { routineId: item.id })}
            style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
          >
            <Text style={styles.rowLabel}>{item.name}</Text>
          </Pressable>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Pressable
              testID="new-routine"
              onPress={() => navigation.navigate('RoutineEditor', { routineId: undefined })}
              style={({ pressed }) => [
                styles.row,
                styles.newRow,
                pressed ? styles.rowPressed : null,
              ]}
            >
              <Text style={styles.newRowText}>+ New routine</Text>
            </Pressable>
            <AppButton
              title="Browse drills"
              variant="ghost"
              onPress={() => navigation.navigate('Drills')}
              style={styles.browseButton}
            />
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  h1: {
    ...typography.display,
    fontSize: 28,
    lineHeight: 34,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  separator: {
    height: spacing.sm,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  rowPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  rowLabel: {
    ...typography.subtitle,
  },
  footer: {
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  newRow: {
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  newRowText: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '600',
  },
  browseButton: {
    alignSelf: 'stretch',
  },
});
