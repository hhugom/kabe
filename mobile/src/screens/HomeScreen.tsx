import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { Screen } from '../components/Screen';
import { getAppDb } from '../db/client';
import { getActiveSession, Session, startSession } from '../use-cases/sessions';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function formatStartedAgo(startedAt: string, now: Date): string {
  const ms = now.getTime() - new Date(startedAt).getTime();
  const mins = Math.max(0, Math.floor(ms / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [active, setActive] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const result = await getActiveSession(getAppDb());
    setActive(result?.session ?? null);
    setLoaded(true);
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', refresh);
    refresh();
    return unsub;
  }, [navigation, refresh]);

  async function onStart() {
    await startSession(getAppDb());
    await refresh();
    navigation.navigate('InSession');
  }

  if (!loaded) return <Screen />;

  return (
    <Screen>
      <Text style={styles.hello}>Kabe</Text>
      <Text style={styles.tagline}>Solo tennis, tracked.</Text>

      <View style={styles.gap} />

      {active ? (
        <Pressable
          onPress={() => navigation.navigate('InSession')}
          style={({ pressed }) => [styles.resumeCard, pressed ? styles.resumeCardPressed : null]}
        >
          <Text style={styles.resumeLabel}>Session in progress</Text>
          <Text style={styles.resumeTitle}>Resume Session</Text>
          <Text style={styles.resumeMeta}>
            started {formatStartedAgo(active.startedAt, new Date())}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.startStack}>
          <AppButton title="Start Session" onPress={onStart} size="lg" />
          <AppButton
            title="Start from Routine"
            onPress={() => navigation.navigate('PickRoutine')}
            variant="secondary"
            size="lg"
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hello: {
    ...typography.display,
  },
  tagline: {
    ...typography.bodyMuted,
    marginTop: spacing.xs,
  },
  gap: {
    height: spacing.xxl,
  },
  startStack: {
    gap: spacing.md,
  },
  resumeCard: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  resumeCardPressed: {
    opacity: 0.85,
  },
  resumeLabel: {
    ...typography.label,
    color: colors.accent,
  },
  resumeTitle: {
    ...typography.title,
    marginTop: spacing.xs,
  },
  resumeMeta: {
    ...typography.bodyMuted,
    marginTop: spacing.xs,
  },
});
