import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { getAppDb } from '../db/client';
import { Drill, listDrills } from '../use-cases/drills';
import { listRoutines, Routine } from '../use-cases/routines';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function DrillsScreen() {
  const navigation = useNavigation<Nav>();
  const [drills, setDrills] = useState<Drill[] | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);

  const refresh = useCallback(async () => {
    const db = getAppDb();
    const [d, r] = await Promise.all([listDrills(db), listRoutines(db)]);
    setDrills(d);
    setRoutines(r);
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', refresh);
    refresh();
    return unsub;
  }, [navigation, refresh]);

  if (drills === null) return <Screen />;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.h1}>Drills</Text>
      </View>
      <FlatList
        data={drills}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <RoutinesSection
            routines={routines}
            onNew={() => navigation.navigate('RoutineEditor', { routineId: undefined })}
            onEdit={(id) => navigation.navigate('RoutineEditor', { routineId: id })}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No drills yet</Text>
            <Text style={styles.emptyBody}>
              Seed drills should appear here on first launch.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <View style={styles.metaRow}>
              <MetricBadge metric={item.metric} />
              <Text style={styles.category}>{item.category}</Text>
              {item.target != null ? (
                <Text style={styles.target}>· target {item.target}</Text>
              ) : null}
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

function RoutinesSection({
  routines,
  onNew,
  onEdit,
}: {
  routines: Routine[];
  onNew: () => void;
  onEdit: (id: string) => void;
}) {
  return (
    <View style={styles.routinesBlock}>
      <Text style={styles.sectionLabel}>Routines</Text>
      {routines.map((r) => (
        <Pressable
          key={r.id}
          testID={`routine-${r.id}`}
          onPress={() => onEdit(r.id)}
          style={({ pressed }) => [styles.routineRow, pressed ? styles.routineRowPressed : null]}
        >
          <Text style={styles.routineName}>{r.name}</Text>
        </Pressable>
      ))}
      <Pressable
        testID="new-routine"
        onPress={onNew}
        style={({ pressed }) => [styles.routineRow, styles.newRoutine, pressed ? styles.routineRowPressed : null]}
      >
        <Text style={styles.newRoutineText}>+ New routine</Text>
      </Pressable>
    </View>
  );
}

function MetricBadge({ metric }: { metric: Drill['metric'] }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{metric}</Text>
    </View>
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    ...typography.subtitle,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  category: {
    ...typography.bodyMuted,
    textTransform: 'capitalize',
  },
  target: {
    ...typography.bodyMuted,
  },
  badge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badgeText: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  routinesBlock: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  routineRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  routineRowPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  routineName: {
    ...typography.subtitle,
  },
  newRoutine: {
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  newRoutineText: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '600',
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
