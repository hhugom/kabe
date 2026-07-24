import { Text, YStack } from 'tamagui';
import type { Drill } from '../use-cases/drills';
import { colors, spacing, typography } from '../theme';
import { Row } from './Row';
import { SheetLayout } from './SheetLayout';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drills: Drill[];
  onPick: (drill: Drill) => void;
};

// Category order matches the domain enum in db/schema.ts (`['wall', 'service']`);
// service ships after wall so the grouping stays stable regardless of drill order.
const CATEGORY_ORDER: Array<Drill['category']> = ['wall', 'service'];

const CATEGORY_LABELS: Record<Drill['category'], string> = {
  wall: 'WALL',
  service: 'SERVICE',
};

export function AddADrillSheet({ open, onOpenChange, drills, onPick }: Props) {
  const byCategory = groupByCategory(drills);
  return (
    <SheetLayout open={open} onOpenChange={onOpenChange} title="Add a drill">
      <YStack gap={spacing.md}>
        {CATEGORY_ORDER.filter((c) => (byCategory[c]?.length ?? 0) > 0).map((category) => (
          <YStack key={category} gap={spacing.xs}>
            <Text
              style={[
                typography.label,
                { color: colors.textSecondary, marginBottom: spacing.xs },
              ]}
            >
              {CATEGORY_LABELS[category]}
            </Text>
            {byCategory[category]!.map((drill) => (
              <Row
                key={drill.id}
                testID={`add-a-drill-row-${drill.id}`}
                title={drill.name}
                onPress={() => onPick(drill)}
              />
            ))}
          </YStack>
        ))}
      </YStack>
    </SheetLayout>
  );
}

function groupByCategory(drills: Drill[]): Partial<Record<Drill['category'], Drill[]>> {
  const acc: Partial<Record<Drill['category'], Drill[]>> = {};
  for (const d of drills) {
    (acc[d.category] ??= []).push(d);
  }
  return acc;
}
