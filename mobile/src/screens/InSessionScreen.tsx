import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppButton } from '../components/AppButton';
import { Screen } from '../components/Screen';
import { getAppDb } from '../db/client';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme';
import {
  ActiveSessionState,
  canSaveDraft,
  cancelEntry,
  endActiveSession,
  hydrate,
  loggedCountForDrill,
  pickDrill,
  saveDurationEntry,
  saveEntry,
  skipPlannedItem,
  updateDraftAttempted,
  updateDraftValue,
  visiblePlannedItems,
} from '../use-cases/active-session';
import { Drill } from '../use-cases/drills';

type Props = NativeStackScreenProps<RootStackParamList, 'InSession'> & {
  clock?: () => Date;
};

const defaultClock = () => new Date();

function formatMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function unitForMetric(metric: Drill['metric']): string {
  if (metric === 'reps') return 'reps';
  if (metric === 'duration') return 'sec';
  return '';
}

export function InSessionScreen({ navigation, clock = defaultClock }: Props) {
  const [state, setState] = useState<ActiveSessionState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [timerStartedAt, setTimerStartedAt] = useState<Date | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!timerStartedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 500);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setTick((t) => t + 1);
    });
    return () => {
      clearInterval(id);
      sub.remove();
      // Backstop: release the wake lock on any teardown path (Cancel, back-nav, unmount).
      deactivateKeepAwake();
    };
  }, [timerStartedAt]);

  const refresh = useCallback(async () => {
    const next = await hydrate(getAppDb());
    if (!next) {
      navigation.goBack();
      return;
    }
    setState(next);
    setLoaded(true);
  }, [navigation]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function onPickDrill(drillId: string) {
    setTimerStartedAt(null);
    setState((s) => (s ? pickDrill(s, drillId) : s));
  }

  function onCancelEntry() {
    setTimerStartedAt(null);
    setState((s) => (s ? cancelEntry(s) : s));
  }

  function onStartTimer() {
    setTimerStartedAt(clock());
    activateKeepAwakeAsync().catch(() => {});
  }

  async function onStopTimer() {
    if (!state || !timerStartedAt) return;
    const elapsedSeconds = Math.floor((clock().getTime() - timerStartedAt.getTime()) / 1000);
    deactivateKeepAwake();
    setTimerStartedAt(null);
    const next = await saveDurationEntry(state, getAppDb(), { elapsedSeconds, now: clock });
    setState(next);
  }

  async function onSaveEntry() {
    if (!state) return;
    const next = await saveEntry(state, getAppDb(), { now: clock });
    setState(next);
  }

  async function onEnd() {
    if (!state) return;
    await endActiveSession(state, getAppDb(), { now: clock });
    navigation.goBack();
  }

  if (!loaded || !state) return <Screen />;

  const { pickedDrill, draft } = state;

  if (pickedDrill?.metric === 'duration' && draft?.kind === 'duration') {
    const elapsedSeconds = timerStartedAt
      ? Math.max(0, Math.floor((clock().getTime() - timerStartedAt.getTime()) / 1000))
      : 0;
    return (
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <EntryHeader drill={pickedDrill} />
        <View style={styles.timerBlock}>
          <Text style={styles.timerClock}>{formatMmSs(elapsedSeconds)}</Text>
          {pickedDrill.target != null ? (
            <Text style={styles.timerTargetLabel}>target {formatMmSs(pickedDrill.target)}</Text>
          ) : null}
        </View>
        <View style={styles.actionColumn}>
          {timerStartedAt ? (
            <AppButton title="Stop" onPress={onStopTimer} variant="dangerSolid" size="lg" />
          ) : (
            <AppButton title="Start" onPress={onStartTimer} size="lg" />
          )}
          <AppButton title="Cancel" onPress={onCancelEntry} variant="ghost" />
        </View>
      </Screen>
    );
  }

  if (pickedDrill?.metric === 'accuracy' && draft?.kind === 'accuracy') {
    return (
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <EntryHeader drill={pickedDrill} />
        <View style={styles.fieldRow}>
          <NumberField
            label="Successes"
            value={draft.value}
            onChangeText={(s) => setState((st) => (st ? updateDraftValue(st, s) : st))}
            accessibilityLabel="accuracy-value-input"
          />
          <View style={styles.slashWrap}>
            <Text style={styles.slash}>/</Text>
          </View>
          <NumberField
            label="Attempted"
            value={draft.attempted}
            onChangeText={(s) => setState((st) => (st ? updateDraftAttempted(st, s) : st))}
            accessibilityLabel="accuracy-attempted-input"
          />
        </View>
        <View style={styles.actionColumn}>
          <AppButton title="Save" onPress={onSaveEntry} size="lg" disabled={!canSaveDraft(state)} />
          <AppButton title="Cancel" onPress={onCancelEntry} variant="ghost" />
        </View>
      </Screen>
    );
  }

  if (pickedDrill && draft?.kind === 'reps') {
    return (
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <EntryHeader drill={pickedDrill} />
        <View style={styles.singleFieldWrap}>
          <NumberField
            label="Reps"
            value={draft.value}
            onChangeText={(s) => setState((st) => (st ? updateDraftValue(st, s) : st))}
            accessibilityLabel="reps-input"
            wide
          />
        </View>
        <View style={styles.actionColumn}>
          <AppButton title="Save" onPress={onSaveEntry} size="lg" disabled={!canSaveDraft(state)} />
          <AppButton title="Cancel" onPress={onCancelEntry} variant="ghost" />
        </View>
      </Screen>
    );
  }

  const planned = visiblePlannedItems(state);

  return (
    <Screen padded={false} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.sessionHeader}>
        <Text style={styles.eyebrow}>In session</Text>
        <Text style={styles.headerTitle}>What are you working on?</Text>
      </View>

      <View style={styles.body}>
        <FlatList
          data={state.drills}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.pickerList}
          ItemSeparatorComponent={() => <View style={styles.rowSep} />}
          ListHeaderComponent={
            <>
              {planned.length > 0 ? (
                <View style={styles.plannedBlock}>
                  <SectionLabel text="Planned" />
                  {planned.map((item) => {
                    const drill = state.drills.find((d) => d.id === item.drillId);
                    const logged = loggedCountForDrill(state, item.drillId);
                    const badge =
                      item.plannedSets != null
                        ? `${logged} / ${item.plannedSets}`
                        : `logged: ${logged}`;
                    return (
                      <Pressable
                        key={item.id}
                        testID={`planned-item-${item.id}`}
                        onPress={() => drill && onPickDrill(drill.id)}
                        style={({ pressed }) => [
                          styles.pickerCard,
                          pressed ? styles.pickerCardPressed : null,
                        ]}
                      >
                        <View style={styles.pickerCardMain}>
                          <Text style={styles.pickerName}>{drill?.name ?? 'Drill'}</Text>
                        </View>
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{badge}</Text>
                        </View>
                        <Pressable
                          testID={`skip-${item.id}`}
                          onPress={() =>
                            setState((s) => (s ? skipPlannedItem(s, item.id) : s))
                          }
                          hitSlop={8}
                          style={styles.skipHit}
                        >
                          <Text style={styles.skipText}>Skip</Text>
                        </Pressable>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              <SectionLabel text="Pick a drill" />
            </>
          }
          ListFooterComponent={
            state.entries.length > 0 ? (
              <View style={styles.entriesBlock}>
                <SectionLabel text="Logged so far" />
                {state.entries.map((e) => {
                  const drill = state.drills.find((d) => d.id === e.drillId);
                  return (
                    <View key={e.id} style={styles.entryRow}>
                      <Text style={styles.entryName}>{drill?.name ?? 'Drill'}</Text>
                      <Text style={styles.entryValue}>
                        {drill?.metric === 'accuracy'
                          ? `${e.value} / ${e.attempted ?? '?'}`
                          : drill?.metric === 'duration'
                          ? formatMmSs(e.value)
                          : `${e.value} ${unitForMetric(drill?.metric ?? 'reps')}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPickDrill(item.id)}
              testID={`pick-drill-${item.id}`}
              style={({ pressed }) => [styles.pickerCard, pressed ? styles.pickerCardPressed : null]}
            >
              <View style={styles.pickerCardMain}>
                <Text style={styles.pickerName}>{item.name}</Text>
                <Text style={styles.pickerMeta}>{item.category}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.metric}</Text>
              </View>
            </Pressable>
          )}
        />
      </View>

      <View style={styles.footer}>
        <AppButton title="End Session" onPress={onEnd} variant="danger" size="lg" />
      </View>
    </Screen>
  );
}

function EntryHeader({ drill }: { drill: Drill }) {
  return (
    <View style={styles.entryHeader}>
      <Text style={styles.entryEyebrow}>{drill.category}</Text>
      <Text style={styles.entryHeaderTitle}>{drill.name}</Text>
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function NumberField({
  label,
  value,
  onChangeText,
  accessibilityLabel,
  wide,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  accessibilityLabel: string;
  wide?: boolean;
}) {
  return (
    <View style={[styles.field, wide ? styles.fieldWide : styles.fieldFlex]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        accessibilityLabel={accessibilityLabel}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        style={styles.numberInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sessionHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  eyebrow: {
    ...typography.label,
    color: colors.accent,
  },
  headerTitle: {
    ...typography.title,
    marginTop: spacing.xs,
  },
  body: {
    flex: 1,
  },
  pickerList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.label,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  rowSep: {
    height: spacing.sm,
  },
  pickerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  pickerCardPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  pickerCardMain: {
    flex: 1,
  },
  pickerName: {
    ...typography.subtitle,
  },
  pickerMeta: {
    ...typography.bodyMuted,
    textTransform: 'capitalize',
    marginTop: 2,
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
  },
  entriesBlock: {
    marginTop: spacing.lg,
  },
  plannedBlock: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  skipHit: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginLeft: spacing.sm,
  },
  skipText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  entryName: {
    ...typography.body,
    flex: 1,
  },
  entryValue: {
    ...typography.body,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },

  entryHeader: {
    marginBottom: spacing.xl,
  },
  entryEyebrow: {
    ...typography.label,
    color: colors.accent,
    textTransform: 'uppercase',
  },
  entryHeaderTitle: {
    ...typography.title,
    marginTop: spacing.xs,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  slashWrap: {
    height: 78,
    justifyContent: 'center',
  },
  slash: {
    ...typography.title,
    color: colors.textMuted,
  },
  singleFieldWrap: {
    alignItems: 'center',
  },
  field: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  fieldFlex: {
    flex: 1,
  },
  fieldWide: {
    minWidth: 200,
    alignItems: 'center',
  },
  fieldLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  numberInput: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '600',
    color: colors.textPrimary,
    padding: 0,
    minHeight: 40,
    textAlign: 'center',
  },
  actionColumn: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  timerBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  timerClock: {
    ...typography.mono,
    fontVariant: ['tabular-nums'],
  },
  timerTargetLabel: {
    ...typography.bodyMuted,
    marginTop: spacing.sm,
  },
});
