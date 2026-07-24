import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { Icon, type IconName } from './Icon';
import { colors, spacing } from '../theme';

type Variant = 'default' | 'danger';

type Props = {
  title: string;
  meta?: string;
  leading?: IconName;
  trailing?: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  testID?: string;
};

// Annex ergonomic minimum from docs/conventions/ergonomic-minima.md § Numeric floor:
// visible tap target ≥ 48 dp. Sheet, list, and drill-card shapes all live in the
// annex tier, so Row's own baseline is 48; at-the-court surfaces bump padding externally.
const MIN_TAP_TARGET = 48;

export function Row({
  title,
  meta,
  leading,
  trailing,
  onPress,
  variant = 'default',
  testID = 'row',
}: Props) {
  const titleColor = variant === 'danger' ? colors.danger : colors.textPrimary;
  const iconColor = variant === 'danger' ? colors.danger : colors.textPrimary;
  return (
    <Pressable onPress={onPress} testID={testID} style={styles.pressable}>
      <XStack alignItems="center" gap={spacing.md}>
        {leading ? (
          <View testID="row-leading-icon">
            <Icon name={leading} color={iconColor} />
          </View>
        ) : null}
        <YStack flex={1}>
          <Text style={{ color: titleColor }}>{title}</Text>
          {meta ? <Text style={{ color: colors.textSecondary }}>{meta}</Text> : null}
        </YStack>
        {trailing}
      </XStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: MIN_TAP_TARGET,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});
