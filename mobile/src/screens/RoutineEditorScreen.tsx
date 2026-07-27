import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { Icon } from '../components/Icon';
import { RoutineMenuSheet } from '../components/RoutineMenuSheet';
import { Screen } from '../components/Screen';
import { getAppDb } from '../db/client';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme';
import { Drill, listDrills } from '../use-cases/drills';
import {
  archiveRoutine,
  createRoutine,
  getRoutine,
  NewRoutineItem,
  updateRoutine,
} from '../use-cases/routines';

type Props = NativeStackScreenProps<RootStackParamList, 'RoutineEditor'>;

type DraftItem = { key: string; drillId: string; plannedSets: number | null };

export function RoutineEditorScreen({ navigation, route }: Props) {
  const routineId = route.params?.routineId;
  const isEdit = !!routineId;
  const [name, setName] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [loaded, setLoaded] = useState(!isEdit);
  const [menuOpen, setMenuOpen] = useState(false);
  // Monotonic key generator for freshly-added draft rows. `prev.length` was not
  // safe: after a remove-then-add, the new row could reuse the survivor's key
  // and collide (React "same key" warning + collapsed rendering).
  const nextKeyRef = useRef(0);

  // Header three-dot visibility per navigation-surface.md § Header-icon
  // affordance: create mode publishes no handler → PillHeader hides the icon;
  // edit mode publishes onMenuPress → icon appears and opens the sheet.
  useEffect(() => {
    if (isEdit) {
      navigation.setOptions({ onMenuPress: () => setMenuOpen(true) } as any);
    }
  }, [isEdit, navigation]);

  useEffect(() => {
    const db = getAppDb();
    listDrills(db).then(setDrills);
    if (routineId) {
      getRoutine(db, routineId).then((r) => {
        if (!r) {
          navigation.goBack();
          return;
        }
        setName(r.routine.name);
        setItems(
          r.items.map((i) => ({
            key: i.id,
            drillId: i.drillId,
            plannedSets: i.plannedSets,
          }))
        );
        setLoaded(true);
      });
    }
  }, [routineId, navigation]);

  function addDrill(drillId: string) {
    const key = `new-${nextKeyRef.current++}-${drillId}`;
    setItems((prev) => [...prev, { key, drillId, plannedSets: null }]);
  }

  function setPlannedSets(key: string, text: string) {
    const parsed = text.trim() === '' ? null : /^\d+$/.test(text) ? Number(text) : undefined;
    if (parsed === undefined) return;
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, plannedSets: parsed } : i)));
  }

  function remove(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function move(index: number, delta: number) {
    setItems((prev) => {
      const next = prev.slice();
      const j = index + delta;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  async function save() {
    const db = getAppDb();
    const payload: NewRoutineItem[] = items.map((i) => ({
      drillId: i.drillId,
      plannedSets: i.plannedSets,
    }));
    if (isEdit && routineId) {
      await updateRoutine(db, routineId, { name, items: payload });
    } else {
      await createRoutine(db, { name, items: payload });
    }
    navigation.goBack();
  }

  const canSave = name.trim().length > 0 && items.length > 0;

  if (!loaded) return <Screen />;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          accessibilityLabel="routine-name-input"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Wall warmup"
          placeholderTextColor={colors.textMuted}
          style={styles.nameInput}
        />

        <Text style={styles.label}>Drills in this routine</Text>
        {items.length === 0 ? (
          <Text style={styles.emptyBody}>No drills yet — add one below.</Text>
        ) : (
          items.map((item, index) => {
            const drill = drills.find((d) => d.id === item.drillId);
            return (
              <View key={item.key} style={styles.itemRow} testID={`item-${item.key}`}>
                <View style={styles.itemMain}>
                  <Text style={styles.itemName}>{drill?.name ?? 'Drill'}</Text>
                  <View style={styles.itemMetaRow}>
                    <Text style={styles.metaLabel}>Planned sets</Text>
                    <TextInput
                      accessibilityLabel={`planned-sets-${item.key}`}
                      value={item.plannedSets == null ? '' : String(item.plannedSets)}
                      onChangeText={(text) => setPlannedSets(item.key, text)}
                      keyboardType="number-pad"
                      placeholder="—"
                      placeholderTextColor={colors.textMuted}
                      style={styles.plannedInput}
                    />
                  </View>
                </View>
                <View style={styles.itemActions}>
                  <Pressable
                    testID={`move-up-${item.key}`}
                    onPress={() => move(index, -1)}
                    disabled={index === 0}
                    style={styles.iconBtn}
                  >
                    <Icon
                      name="arrow-upward"
                      color={index === 0 ? colors.textMuted : colors.textSecondary}
                    />
                  </Pressable>
                  <Pressable
                    testID={`move-down-${item.key}`}
                    onPress={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    style={styles.iconBtn}
                  >
                    <Icon
                      name="arrow-downward"
                      color={index === items.length - 1 ? colors.textMuted : colors.textSecondary}
                    />
                  </Pressable>
                  <Pressable
                    testID={`remove-${item.key}`}
                    onPress={() => remove(item.key)}
                    style={[styles.iconBtn, styles.removeBtn]}
                  >
                    <Icon name="close" color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        <Text style={styles.label}>Add a drill</Text>
        {drills.map((d) => (
          <Pressable
            key={d.id}
            testID={`add-drill-${d.id}`}
            onPress={() => addDrill(d.id)}
            style={({ pressed }) => [styles.addCard, pressed ? styles.addCardPressed : null]}
          >
            <Text style={styles.addName}>{d.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <AppButton title="Save" onPress={save} size="lg" disabled={!canSave} />
      </View>
      <RoutineMenuSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        onArchive={async () => {
          if (!routineId) return;
          setMenuOpen(false);
          await archiveRoutine(getAppDb(), routineId);
          navigation.goBack();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  label: {
    ...typography.label,
    marginTop: spacing.md,
  },
  nameInput: {
    ...typography.subtitle,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
  },
  emptyBody: {
    ...typography.body,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  itemMain: {
    flex: 1,
  },
  itemName: {
    ...typography.body,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  metaLabel: {
    ...typography.label,
    // `typography.label` defaults to textSecondary, which clears AAA (7:1) on
    // `bg` (7.3:1) but only reaches 6.55:1 on the itemRow card's `surface` fill
    // — below the ergonomic-minima floor. Override to textPrimary in-panel so
    // the label still reads at glance under sunlight/glare (see #26).
    color: colors.textPrimary,
  },
  plannedInput: {
    ...typography.body,
    minWidth: 48,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    // Annex tap-target floor from docs/conventions/ergonomic-minima.md § Numeric floor.
    // hitSlop enlarges the hit area but not the visible target; the floor is a
    // *visible* 48 dp so a sunlit/glare/thumb user can see and hit it.
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtn: {
    // Destructive-adjacent separation from docs/conventions/ergonomic-minima.md
    // § Numeric floor: destructive next to primary needs ≥ 24 dp OR distinct region.
    marginLeft: spacing.xl,
  },
  addCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  addCardPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  addName: {
    ...typography.body,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
});
