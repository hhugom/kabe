import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Button, SegmentedButtons, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { randomUUID } from 'expo-crypto';
import { db, schema } from '@/db/client';
import type { DrillCategory, ShotType } from '@/db/schema';
import { CATEGORY_LABELS } from '@/features/drills/useDrills';

const SHOT_LABELS: Record<ShotType, string> = {
  forehand: 'Forehand',
  backhand: 'Backhand',
  both: 'Both',
  overhead: 'Overhead',
};

export default function NewDrill() {
  const theme = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<DrillCategory>('groundstroke');
  const [shotType, setShotType] = useState<ShotType>('forehand');
  const [description, setDescription] = useState('');

  const trimmedName = name.trim();
  const canSave = trimmedName.length > 0;

  const onSave = () => {
    if (!canSave) return;
    db.insert(schema.drills)
      .values({
        id: randomUUID(),
        name: trimmedName,
        category,
        shotType,
        description: description.trim() || null,
        isCustom: true,
      })
      .run();
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'New drill', headerShown: true }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <TextInput
          label="Name"
          value={name}
          onChangeText={setName}
          mode="outlined"
          autoFocus
        />
        <View style={styles.section}>
          <Text variant="labelLarge" style={styles.label}>
            Category
          </Text>
          <SegmentedButtons
            value={category}
            onValueChange={(v) => setCategory(v as DrillCategory)}
            buttons={(Object.keys(CATEGORY_LABELS) as DrillCategory[]).map((c) => ({
              value: c,
              label: CATEGORY_LABELS[c],
            }))}
          />
        </View>
        <View style={styles.section}>
          <Text variant="labelLarge" style={styles.label}>
            Shot type
          </Text>
          <SegmentedButtons
            value={shotType}
            onValueChange={(v) => setShotType(v as ShotType)}
            buttons={(Object.keys(SHOT_LABELS) as ShotType[]).map((s) => ({
              value: s,
              label: SHOT_LABELS[s],
            }))}
          />
        </View>
        <TextInput
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          multiline
          numberOfLines={3}
        />
        <Button mode="contained" onPress={onSave} disabled={!canSave} style={styles.save}>
          Save drill
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 16 },
  section: { gap: 8 },
  label: { opacity: 0.8 },
  save: { marginTop: 8 },
});
