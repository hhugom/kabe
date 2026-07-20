import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useCallback, useEffect, useState } from 'react';
import { AppState, FlatList, Pressable, TextInput } from 'react-native';
import { Text, View, XStack, YStack } from 'tamagui';
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

// State-driven accent per aesthetic-direction.md: cyan <90%, amber 90–100%, magenta ≥100%.
function stateAccentFor(pct: number): string {
  if (pct >= 1) return colors.accentMagenta;
  if (pct >= 0.9) return colors.accentAmber;
  return colors.accent;
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
    const target = pickedDrill.target;
    const pct = target != null && target > 0 ? Math.min(1.2, elapsedSeconds / target) : 0;
    const stateAccent = target != null ? stateAccentFor(pct) : colors.accent;
    const pctInt = target != null ? Math.round(Math.min(1, pct) * 100) : 0;

    return (
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <EntryHeader drill={pickedDrill} stateAccent={stateAccent} inPlay={!!timerStartedAt} />

        <YStack
          backgroundColor={colors.surface}
          borderColor={colors.surfaceHi}
          borderWidth={1}
          borderRadius={radius.lg}
          padding={spacing.xl}
          alignItems="center"
          marginTop={spacing.md}
        >
          <Text style={[typography.heroDigits, { color: stateAccent }]}>
            {formatMmSs(elapsedSeconds)}
          </Text>
          {target != null ? (
            <YStack width="100%" marginTop={spacing.lg}>
              <View
                height={10}
                width="100%"
                borderRadius={radius.pill}
                backgroundColor={colors.surfaceHi}
                overflow="hidden"
              >
                <View
                  height="100%"
                  width={`${pctInt}%`}
                  backgroundColor={stateAccent}
                  borderRadius={radius.pill}
                />
              </View>
              <XStack justifyContent="space-between" marginTop={spacing.sm}>
                <Text style={typography.label}>ELAPSED</Text>
                <Text
                  style={[
                    typography.label,
                    { color: stateAccent, fontSize: 24, letterSpacing: 0 },
                  ]}
                >
                  {pctInt}%
                </Text>
              </XStack>
            </YStack>
          ) : null}
        </YStack>

        {target != null ? (
          <XStack gap={spacing.md} marginTop={spacing.md}>
            <StatChip label="TARGET" value={formatMmSs(target)} />
            <StatChip
              label="REMAINING"
              value={formatMmSs(Math.max(0, target - elapsedSeconds))}
            />
          </XStack>
        ) : null}

        <YStack gap={spacing.md} marginTop="auto">
          {timerStartedAt ? (
            <AppButton title="Stop" onPress={onStopTimer} variant="dangerSolid" size="lg" />
          ) : (
            <AppButton title="Start" onPress={onStartTimer} size="lg" />
          )}
          <AppButton title="Cancel" onPress={onCancelEntry} variant="ghost" size="lg" />
        </YStack>
      </Screen>
    );
  }

  if (pickedDrill?.metric === 'accuracy' && draft?.kind === 'accuracy') {
    return (
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <EntryHeader drill={pickedDrill} />
        <XStack alignItems="flex-end" gap={spacing.sm} marginTop={spacing.xl}>
          <NumberField
            label="SUCCESSES"
            value={draft.value}
            onChangeText={(s) => setState((st) => (st ? updateDraftValue(st, s) : st))}
            accessibilityLabel="accuracy-value-input"
          />
          <View height={78} justifyContent="center">
            <Text style={[typography.title, { color: colors.textMuted }]}>/</Text>
          </View>
          <NumberField
            label="ATTEMPTED"
            value={draft.attempted}
            onChangeText={(s) => setState((st) => (st ? updateDraftAttempted(st, s) : st))}
            accessibilityLabel="accuracy-attempted-input"
          />
        </XStack>
        <YStack gap={spacing.md} marginTop="auto">
          <AppButton title="Save" onPress={onSaveEntry} size="lg" disabled={!canSaveDraft(state)} />
          <AppButton title="Cancel" onPress={onCancelEntry} variant="ghost" size="lg" />
        </YStack>
      </Screen>
    );
  }

  if (pickedDrill && draft?.kind === 'reps') {
    return (
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <EntryHeader drill={pickedDrill} />
        <YStack alignItems="center" marginTop={spacing.xl}>
          <NumberField
            label="REPS"
            value={draft.value}
            onChangeText={(s) => setState((st) => (st ? updateDraftValue(st, s) : st))}
            accessibilityLabel="reps-input"
            wide
          />
        </YStack>
        <YStack gap={spacing.md} marginTop="auto">
          <AppButton title="Save" onPress={onSaveEntry} size="lg" disabled={!canSaveDraft(state)} />
          <AppButton title="Cancel" onPress={onCancelEntry} variant="ghost" size="lg" />
        </YStack>
      </Screen>
    );
  }

  const planned = visiblePlannedItems(state);

  return (
    <Screen padded={false} edges={['top', 'left', 'right', 'bottom']}>
      <YStack paddingHorizontal={spacing.lg} paddingTop={spacing.lg} paddingBottom={spacing.md}>
        <Text style={[typography.label, { color: colors.accent }]}>IN SESSION</Text>
        <Text style={[typography.title, { marginTop: spacing.xs }]}>What are you working on?</Text>
      </YStack>

      <YStack flex={1}>
        <FlatList
          data={state.drills}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}
          ItemSeparatorComponent={() => <View height={spacing.sm} />}
          ListHeaderComponent={
            <>
              {planned.length > 0 ? (
                <YStack marginBottom={spacing.md} gap={spacing.sm}>
                  <SectionLabel text="PLANNED" />
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
                          {
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: colors.surface,
                            borderRadius: radius.md,
                            borderWidth: 1,
                            borderColor: colors.surfaceHi,
                            padding: spacing.lg,
                          },
                          pressed ? { backgroundColor: colors.surfaceHi } : null,
                        ]}
                      >
                        <YStack flex={1}>
                          <Text style={typography.title}>{drill?.name ?? 'Drill'}</Text>
                        </YStack>
                        <View
                          backgroundColor={colors.surfaceHi}
                          paddingHorizontal={spacing.sm}
                          paddingVertical={2}
                          borderRadius={radius.pill}
                        >
                          <Text style={[typography.caption, { color: colors.accent, fontWeight: '700' }]}>
                            {badge}
                          </Text>
                        </View>
                        <Pressable
                          testID={`skip-${item.id}`}
                          onPress={() =>
                            setState((s) => (s ? skipPlannedItem(s, item.id) : s))
                          }
                          style={{
                            minHeight: 56,
                            minWidth: 56,
                            paddingHorizontal: spacing.md,
                            marginLeft: spacing.sm,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={[typography.label, { color: colors.textSecondary }]}>
                            Skip
                          </Text>
                        </Pressable>
                      </Pressable>
                    );
                  })}
                </YStack>
              ) : null}
              <SectionLabel text="PICK A DRILL" />
            </>
          }
          ListFooterComponent={
            state.entries.length > 0 ? (
              <YStack marginTop={spacing.lg}>
                <SectionLabel text="LOGGED SO FAR" />
                {state.entries.map((e) => {
                  const drill = state.drills.find((d) => d.id === e.drillId);
                  return (
                    <XStack
                      key={e.id}
                      alignItems="center"
                      justifyContent="space-between"
                      paddingVertical={spacing.sm}
                      borderBottomWidth={1}
                      borderBottomColor={colors.surfaceHi}
                    >
                      <Text style={[typography.body, { flex: 1 }]}>{drill?.name ?? 'Drill'}</Text>
                      <Text
                        style={[
                          typography.body,
                          { color: colors.textSecondary, fontVariant: ['tabular-nums'] },
                        ]}
                      >
                        {drill?.metric === 'accuracy'
                          ? `${e.value} / ${e.attempted ?? '?'}`
                          : drill?.metric === 'duration'
                          ? formatMmSs(e.value)
                          : `${e.value} ${unitForMetric(drill?.metric ?? 'reps')}`}
                      </Text>
                    </XStack>
                  );
                })}
              </YStack>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPickDrill(item.id)}
              testID={`pick-drill-${item.id}`}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.surface,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.surfaceHi,
                  padding: spacing.lg,
                },
                pressed ? { backgroundColor: colors.surfaceHi } : null,
              ]}
            >
              <YStack flex={1}>
                <Text style={typography.title}>{item.name}</Text>
                <Text
                  style={[
                    typography.bodyMuted,
                    { textTransform: 'capitalize', marginTop: 2 },
                  ]}
                >
                  {item.category}
                </Text>
              </YStack>
              <View
                backgroundColor={colors.surfaceHi}
                paddingHorizontal={spacing.sm}
                paddingVertical={2}
                borderRadius={radius.pill}
              >
                <Text style={[typography.caption, { color: colors.accent, fontWeight: '700' }]}>
                  {item.metric}
                </Text>
              </View>
            </Pressable>
          )}
        />
      </YStack>

      <YStack
        paddingHorizontal={spacing.lg}
        paddingVertical={spacing.md}
        borderTopWidth={1}
        borderTopColor={colors.surfaceHi}
        backgroundColor={colors.surface}
      >
        <AppButton title="End Session" onPress={onEnd} variant="danger" size="lg" />
      </YStack>
    </Screen>
  );
}

function EntryHeader({
  drill,
  stateAccent,
  inPlay,
}: {
  drill: Drill;
  stateAccent?: string;
  inPlay?: boolean;
}) {
  const eyebrow = inPlay ? `${drill.category.toUpperCase()} · IN PLAY` : drill.category.toUpperCase();
  return (
    <YStack marginBottom={spacing.lg}>
      <Text style={[typography.label, { color: stateAccent ?? colors.accent }]}>{eyebrow}</Text>
      <Text style={[typography.title, { marginTop: spacing.xs }]}>{drill.name}</Text>
    </YStack>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <Text style={[typography.label, { marginTop: spacing.md, marginBottom: spacing.sm }]}>
      {text}
    </Text>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <YStack
      flex={1}
      backgroundColor={colors.surface}
      borderColor={colors.surfaceHi}
      borderWidth={1}
      borderRadius={radius.md}
      paddingVertical={14}
      paddingHorizontal={spacing.lg}
    >
      <Text style={typography.label}>{label}</Text>
      <Text
        style={{
          fontSize: 26,
          fontWeight: '800',
          color: colors.textPrimary,
          fontVariant: ['tabular-nums'],
          marginTop: 4,
        }}
      >
        {value}
      </Text>
    </YStack>
  );
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
    <YStack
      backgroundColor={colors.surface}
      borderRadius={radius.md}
      borderWidth={1}
      borderColor={colors.surfaceHi}
      padding={spacing.md}
      flex={wide ? undefined : 1}
      minWidth={wide ? 200 : undefined}
      alignItems={wide ? 'center' : undefined}
    >
      <Text style={[typography.label, { marginBottom: spacing.xs }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        accessibilityLabel={accessibilityLabel}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        style={{
          fontSize: 40,
          lineHeight: 48,
          fontWeight: '800',
          color: colors.textPrimary,
          padding: 0,
          minHeight: 48,
          textAlign: 'center',
          fontVariant: ['tabular-nums'],
        }}
      />
    </YStack>
  );
}
