import { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { randomUUID } from 'expo-crypto';
import migrations from './migrations/migrations';
import { db, schema } from './client';
import { seedDrills } from '@/data/seedDrills';

export function DbProvider({ children }: { children: ReactNode }) {
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium">Database error</Text>
        <Text variant="bodySmall" style={styles.errorMsg}>
          {error.message}
        </Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text variant="bodySmall" style={styles.loadingMsg}>
          Setting up your database…
        </Text>
      </View>
    );
  }

  seedIfEmpty();

  return <>{children}</>;
}

function seedIfEmpty() {
  const existing = db.select({ id: schema.drills.id }).from(schema.drills).limit(1).all();
  if (existing.length > 0) return;

  db.insert(schema.drills)
    .values(seedDrills.map((d) => ({ ...d, id: randomUUID(), isCustom: false })))
    .run();
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  loadingMsg: { opacity: 0.6 },
  errorMsg: { textAlign: 'center', opacity: 0.7 },
});
