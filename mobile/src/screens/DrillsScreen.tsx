import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { getAppDb } from '../db/client';
import { Drill, listDrills } from '../use-cases/drills';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing, typography } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Drills annex screen — reached only via the Routines tab's "Browse drills"
// affordance. Per docs/conventions/primary-vs-annex.md § Drills-screen fate
// and issue #17: no top-level tab entry, no other entry.
export function DrillsScreen() {
  const navigation = useNavigation<Nav>();
  const [drills, setDrills] = useState<Drill[] | null>(null);

  const refresh = useCallback(async () => {
    const d = await listDrills(getAppDb());
    setDrills(d);
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', refresh);
    refresh();
    return unsub;
  }, [navigation, refresh]);

  if (drills === null) return <Screen />;

  return (
    <Screen padded={false}>
      <FlatList
        data={drills}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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

function MetricBadge({ metric }: { metric: Drill['metric'] }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{metric}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
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
  emptyTitle: {
    ...typography.title,
  },
  emptyBody: {
    ...typography.bodyMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
