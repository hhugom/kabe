import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../components/AppButton';
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
    setItems((prev) => [
      ...prev,
      { key: `new-${prev.length}-${drillId}`, drillId, plannedSets: null },
    ]);
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
                    hitSlop={8}
                    style={styles.iconBtn}
                  >
                    <Text style={[styles.iconText, index === 0 ? styles.iconDisabled : null]}>▲</Text>
                  </Pressable>
                  <Pressable
                    testID={`move-down-${item.key}`}
                    onPress={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    hitSlop={8}
                    style={styles.iconBtn}
                  >
                    <Text
                      style={[styles.iconText, index === items.length - 1 ? styles.iconDisabled : null]}
                    >
                      ▼
                    </Text>
                  </Pressable>
                  <Pressable
                    testID={`remove-${item.key}`}
                    onPress={() => remove(item.key)}
                    hitSlop={8}
                    style={styles.iconBtn}
                  >
                    <Text style={[styles.iconText, styles.removeText]}>✕</Text>
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
        {isEdit ? (
          <AppButton
            title="Archive routine"
            variant="danger"
            onPress={async () => {
              if (!routineId) return;
              await archiveRoutine(getAppDb(), routineId);
              navigation.goBack();
            }}
          />
        ) : null}
      </View>
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
    ...typography.bodyMuted,
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
    ...typography.bodyMuted,
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  iconText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  iconDisabled: {
    color: colors.textMuted,
  },
  removeText: {
    color: colors.danger,
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
