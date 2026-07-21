import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../components/AppButton';
import { ModalLayout } from '../components/ModalLayout';
import { Screen } from '../components/Screen';
import { SheetLayout } from '../components/SheetLayout';
import { StackPushLayout } from '../components/StackPushLayout';
import { TabRootLayout } from '../components/TabRootLayout';
import type { RootStackParamList } from '../navigation/types';
import { spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ArchetypesDemo'>;

type Mode = 'menu' | 'tabroot' | 'stackpush';

export function ArchetypesDemoScreen(_props: Props) {
  const [mode, setMode] = useState<Mode>('menu');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  if (mode === 'tabroot') {
    return (
      <TabRootLayout
        hero={
          <View>
            <Text style={typography.label}>DEMO</Text>
            <Text style={typography.title}>Tab-root archetype</Text>
          </View>
        }
      >
        <Text style={typography.body}>Chrome mark above, hero right below, tab-bar footprint reserved at the bottom.</Text>
        <View style={styles.gap} />
        <AppButton title="Back to menu" onPress={() => setMode('menu')} variant="secondary" />
      </TabRootLayout>
    );
  }

  if (mode === 'stackpush') {
    return (
      <StackPushLayout
        entryHeader={
          <View>
            <Text style={typography.label}>DEMO · ENTRY</Text>
            <Text style={typography.title}>Stack-push archetype</Text>
          </View>
        }
        primary={{ title: 'Save (demo)', onPress: () => setMode('menu') }}
        cancel={{ title: 'Cancel', onPress: () => setMode('menu') }}
      >
        <Text style={typography.body}>RN header sits above (rendered by the navigator). Bottom-anchored primary + ghost Cancel below.</Text>
      </StackPushLayout>
    );
  }

  return (
    <Screen>
      <Text style={typography.label}>DEMO</Text>
      <Text style={typography.title}>Screen archetypes</Text>
      <Text style={[typography.bodyMuted, { marginTop: spacing.xs }]}>Pick one to see it in isolation.</Text>
      <View style={styles.gap} />
      <View style={styles.stack}>
        <AppButton title="Show Tab-root" onPress={() => setMode('tabroot')} size="lg" />
        <AppButton title="Show Stack-push" onPress={() => setMode('stackpush')} size="lg" />
        <AppButton title="Show Sheet" onPress={() => setSheetOpen(true)} size="lg" />
        <AppButton title="Show Modal" onPress={() => setModalOpen(true)} size="lg" />
      </View>

      <SheetLayout open={sheetOpen} onOpenChange={setSheetOpen} title="Sheet (demo)">
        <Text style={typography.body}>Drag down, tap outside, or hardware-back to dismiss.</Text>
      </SheetLayout>

      <ModalLayout open={modalOpen} onCancel={() => setModalOpen(false)} title="Modal (demo)">
        <Text style={typography.body}>Tap outside is ignored. Hardware-back = Cancel.</Text>
        <AppButton title="Confirm" onPress={() => setModalOpen(false)} />
        <AppButton title="Cancel" onPress={() => setModalOpen(false)} variant="ghost" />
      </ModalLayout>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: {
    height: spacing.xl,
  },
  stack: {
    gap: spacing.md,
  },
});
