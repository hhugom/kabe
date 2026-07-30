import 'react-native-get-random-values';

import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  type NativeStackHeaderProps,
  type NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { TamaguiProvider } from 'tamagui';

import tamaguiConfig from './tamagui.config';
import { colors, spacing, typography } from './src/theme';

import { getAppDb } from './src/db/client';
import migrations from './src/db/migrations';
import type { RootStackParamList } from './src/navigation/types';
import { PickRoutineSheet } from './src/components/PickRoutineSheet';
import { PillHeader } from './src/components/PillHeader';
import { SessionActionsProvider } from './src/components/session-actions';
import { SessionSheetProvider, useSessionSheet } from './src/components/SessionSheet';
import { TabBar } from './src/components/TabBar';
import { ArchetypesDemoScreen } from './src/screens/ArchetypesDemoScreen';
import { RowsDemoScreen } from './src/screens/RowsDemoScreen';
import { DrillsScreen } from './src/screens/DrillsScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { RoutineEditorScreen } from './src/screens/RoutineEditorScreen';
import { RoutinesScreen } from './src/screens/RoutinesScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { seedIfEmpty } from './src/use-cases/drills';
import { seedRoutinesIfEmpty } from './src/use-cases/routines';
import { getActiveSession } from './src/use-cases/sessions';

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator<RootStackParamList>();

type TabsProps = {
  sessionActive: boolean;
  refreshSessionActive: () => void;
};

function Tabs({ sessionActive, refreshSessionActive }: TabsProps) {
  const { openFull } = useSessionSheet();
  const [pickerOpen, setPickerOpen] = useState(false);
  const onStartPress = () => setPickerOpen(true);
  const onResumePress = () => openFull();
  return (
    <SessionActionsProvider value={{ sessionActive, onStartPress, onResumePress }}>
      <Tab.Navigator
        screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}
        tabBar={(props) => <TabBar {...props} />}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Routines" component={RoutinesScreen} />
        <Tab.Screen name="Stats" component={StatsScreen} />
      </Tab.Navigator>
      <PickRoutineSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onStarted={() => {
          setPickerOpen(false);
          refreshSessionActive();
          openFull();
        }}
      />
    </SessionActionsProvider>
  );
}

export default function App() {
  const db = getAppDb();
  const { success: migrated, error: migrateError } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<Error | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  // Sheet peek needs to sit above the tab bar on tab-root screens, and just
  // above the bottom safe-area on pushed screens. useNavigationState can't be
  // called from SessionSheetProvider (it's outside a Navigator), so we track
  // the top-level route here via NavigationContainer.onStateChange.
  const [tabBarVisible, setTabBarVisible] = useState(true);

  const refreshSessionActive = useCallback(() => {
    getActiveSession(db)
      .then((result) => setSessionActive(!!result))
      .catch(() => setSessionActive(false));
  }, [db]);

  // Session-active only flips at two moments — session start (PickRoutineSheet)
  // and session end (SessionSheet's close). Both call refreshSessionActive
  // themselves; we don't need a DB round-trip on every nav transition here.
  const handleNavStateChange = useCallback(
    (state: Parameters<NonNullable<React.ComponentProps<typeof NavigationContainer>['onStateChange']>>[0]) => {
      if (!state) return;
      const top = state.routes[state.index];
      setTabBarVisible(top?.name === 'Tabs');
    },
    []
  );

  useEffect(() => {
    if (!seeded) return;
    refreshSessionActive();
  }, [seeded, refreshSessionActive]);

  useEffect(() => {
    if (!migrated) return;
    seedIfEmpty(db)
      .then(() => seedRoutinesIfEmpty(db))
      .then(() => setSeeded(true))
      .catch((e) => setSeedError(e));
  }, [migrated, db]);

  const renderPillHeader = useCallback(
    ({ options, navigation, back }: NativeStackHeaderProps) => {
      const nav = navigation as NativeStackNavigationProp<RootStackParamList>;
      const onMenuPress = (options as any).onMenuPress as (() => void) | undefined;
      return (
        <PillHeader
          title={typeof options.title === 'string' ? options.title : ''}
          onBack={back ? () => nav.goBack() : undefined}
          onMenuPress={onMenuPress}
        />
      );
    },
    []
  );

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
      <NavigationContainer onStateChange={handleNavStateChange}>
        <SessionSheetProvider
          sessionActive={sessionActive}
          onSessionEnded={refreshSessionActive}
          tabBarVisible={tabBarVisible}
        >
          <RootStack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerShadowVisible: false,
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <RootStack.Screen name="Tabs" options={{ headerShown: false }}>
              {() => (
                <Tabs
                  sessionActive={sessionActive}
                  refreshSessionActive={refreshSessionActive}
                />
              )}
            </RootStack.Screen>
            <RootStack.Screen
              name="RoutineEditor"
              component={RoutineEditorScreen}
              options={({ route }) => ({
                title: route.params?.routineId ? 'Edit routine' : 'New routine',
                header: renderPillHeader,
              })}
            />
            <RootStack.Screen
              name="Drills"
              component={DrillsScreen}
              options={{ title: 'Drills', header: renderPillHeader }}
            />
            <RootStack.Screen
              name="ArchetypesDemo"
              component={ArchetypesDemoScreen}
              options={{ title: 'Screen archetypes' }}
            />
            <RootStack.Screen
              name="RowsDemo"
              component={RowsDemoScreen}
              options={{ title: 'Row primitive' }}
            />
          </RootStack.Navigator>
        </SessionSheetProvider>
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
    ...typography.body,
    textAlign: 'center',
  },
});
