import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { Chip, FAB, List, Searchbar, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDrills, type DrillGroup } from '@/features/drills/useDrills';
import type { Drill } from '@/db/schema';

const SHOT_ICON: Record<Drill['shotType'], keyof typeof MaterialCommunityIcons.glyphMap> = {
  forehand: 'arrow-right-bold',
  backhand: 'arrow-left-bold',
  both: 'arrow-left-right-bold',
  overhead: 'arrow-up-bold',
};

export default function Drills() {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const groups = useDrills(search);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search drills"
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />
      </View>
      <FlatList
        data={groups}
        keyExtractor={(g) => g.category}
        renderItem={({ item }) => <DrillGroupSection group={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="bodyMedium" style={{ opacity: 0.6 }}>
              No drills match “{search}”.
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />
      <Link href="/drill/new" asChild>
        <FAB icon="plus" label="New drill" style={styles.fab} />
      </Link>
    </SafeAreaView>
  );
}

function DrillGroupSection({ group }: { group: DrillGroup }) {
  return (
    <List.Section>
      <List.Subheader>{group.label}</List.Subheader>
      {group.drills.map((drill) => (
        <List.Item
          key={drill.id}
          title={drill.name}
          description={drill.description ?? undefined}
          left={(props) => <List.Icon {...props} icon={SHOT_ICON[drill.shotType]} />}
          right={() =>
            drill.isCustom ? (
              <Chip compact mode="outlined" style={styles.chip}>
                Custom
              </Chip>
            ) : null
          }
        />
      ))}
    </List.Section>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8 },
  search: { marginBottom: 8 },
  list: { paddingBottom: 96 },
  empty: { padding: 32, alignItems: 'center' },
  chip: { alignSelf: 'center' },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
