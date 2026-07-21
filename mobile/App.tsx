import 'react-native-get-random-values';

import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider } from 'tamagui';

import tamaguiConfig from './tamagui.config';
import { colors, spacing, typography } from './src/theme';

import { getAppDb } from './src/db/client';
import migrations from './src/db/migrations';
import type { RootStackParamList } from './src/navigation/types';
import { ArchetypesDemoScreen } from './src/screens/ArchetypesDemoScreen';
import { DrillsScreen } from './src/screens/DrillsScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { InSessionScreen } from './src/screens/InSessionScreen';
import { PickRoutineScreen } from './src/screens/PickRoutineScreen';
import { RoutineEditorScreen } from './src/screens/RoutineEditorScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { seedIfEmpty } from './src/use-cases/drills';
import { seedRoutinesIfEmpty } from './src/use-cases/routines';

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator<RootStackParamList>();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Drills" component={DrillsScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const db = getAppDb();
  const { success: migrated, error: migrateError } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<Error | null>(null);

  useEffect(() => {
    if (!migrated) return;
    seedIfEmpty(db)
      .then(() => seedRoutinesIfEmpty(db))
      .then(() => setSeeded(true))
      .catch((e) => setSeedError(e));
  }, [migrated, db]);

  if (migrateError) {
    return (
      <BootView>
        <Text style={bootStyles.title}>Migration failed</Text>
        <Text style={bootStyles.body}>{migrateError.message}</Text>
      </BootView>
    );
  }
  if (seedError) {
    return (
      <BootView>
        <Text style={bootStyles.title}>Seed failed</Text>
        <Text style={bootStyles.body}>{seedError.message}</Text>
      </BootView>
    );
  }
  if (!migrated || !seeded) {
    return (
      <BootView>
        <Text style={bootStyles.body}>Loading…</Text>
      </BootView>
    );
  }

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="kabe_dark">
    <SafeAreaProvider>
      <NavigationContainer>
        <RootStack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <RootStack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <RootStack.Screen
            name="PickRoutine"
            component={PickRoutineScreen}
            options={{ title: 'Pick a routine' }}
          />
          <RootStack.Screen
            name="RoutineEditor"
            component={RoutineEditorScreen}
            options={({ route }) => ({
              title: route.params?.routineId ? 'Edit routine' : 'New routine',
            })}
          />
          <RootStack.Screen
            name="InSession"
            component={InSessionScreen}
            options={{ title: 'Session' }}
          />
          <RootStack.Screen
            name="ArchetypesDemo"
            component={ArchetypesDemoScreen}
            options={{ title: 'Screen archetypes' }}
          />
        </RootStack.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
    </TamaguiProvider>
  );
}

function BootView({ children }: { children: React.ReactNode }) {
  return <View style={bootStyles.container}>{children}</View>;
}

const bootStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  title: {
    ...typography.title,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.bodyMuted,
    textAlign: 'center',
  },
});
