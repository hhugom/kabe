import { ScrollView } from 'react-native';
import { Text, View, YStack } from 'tamagui';
import { Row } from '../components/Row';
import { Screen } from '../components/Screen';
import { colors, radius, spacing, typography } from '../theme';

// Exercises every Row shape called out in issue #11:
//   sheet row (PickRoutine, Add-a-drill, menu action rows),
//   stack-push list row (planned slots on InSession-picker, routine list),
//   drill card (Drills annex),
//   danger row (End Session, Archive).
export function RowsDemoScreen() {
  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
        <YStack gap={spacing.sm}>
          <Text style={typography.label}>SHEET ROW</Text>
          <Row title="Empty start" leading="add" onPress={() => {}} />
          <Row title="Wall warmup" onPress={() => {}} />
          <Row title="Full serve session" onPress={() => {}} />
        </YStack>

        <YStack gap={spacing.sm}>
          <Text style={typography.label}>LIST ROW (STACK-PUSH)</Text>
          <Row
            title="Wall warmup planned"
            meta="wall · 20 reps"
            trailing={<Badge>2 / 3</Badge>}
            onPress={() => {}}
          />
          <Row
            title="Service box aim"
            meta="service · duration"
            trailing={<Badge>logged: 0</Badge>}
            onPress={() => {}}
          />
        </YStack>

        <YStack gap={spacing.sm}>
          <Text style={typography.label}>DRILL CARD</Text>
          <Row
            title="Cross-court forehand"
            meta="wall · target 20"
            trailing={<Badge>reps</Badge>}
          />
        </YStack>

        <YStack gap={spacing.sm}>
          <Text style={typography.label}>DANGER ROW</Text>
          <Row title="End Session" leading="stop" variant="danger" onPress={() => {}} />
          <Row title="Archive routine" leading="delete" variant="danger" onPress={() => {}} />
        </YStack>
      </ScrollView>
    </Screen>
  );
}

function Badge({ children }: { children: string }) {
  return (
    <View
      backgroundColor={colors.surfaceHi}
      paddingHorizontal={spacing.sm}
      paddingVertical={2}
      borderRadius={radius.pill}
    >
      <Text style={[typography.caption, { color: colors.accent, fontWeight: '700' }]}>
        {children}
      </Text>
    </View>
  );
}
