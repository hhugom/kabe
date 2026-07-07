import { Pressable, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'dangerSolid' | 'ghost';
type Size = 'md' | 'lg';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  style?: ViewStyle;
};

export function AppButton({ title, onPress, variant = 'primary', size = 'md', disabled, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        variantStyles[variant].container,
        pressed && !disabled ? variantStyles[variant].pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      <Text style={[styles.text, variantStyles[variant].text, size === 'lg' ? styles.textLg : null]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  lg: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    minHeight: 60,
  },
  text: {
    ...typography.subtitle,
    fontWeight: '600',
  },
  textLg: {
    fontSize: 18,
    lineHeight: 24,
  },
  disabled: {
    opacity: 0.5,
  },
});

const variantStyles: Record<Variant, { container: ViewStyle; pressed: ViewStyle; text: TextStyle }> = {
  primary: {
    container: { backgroundColor: colors.accent },
    pressed: { backgroundColor: colors.accentPressed },
    text: { color: colors.onAccent },
  },
  secondary: {
    container: { backgroundColor: colors.surface, borderColor: colors.border },
    pressed: { backgroundColor: colors.surfaceAlt },
    text: { color: colors.textPrimary },
  },
  danger: {
    container: { backgroundColor: colors.surface, borderColor: colors.border },
    pressed: { backgroundColor: colors.surfaceAlt },
    text: { color: colors.danger },
  },
  dangerSolid: {
    container: { backgroundColor: colors.danger },
    pressed: { backgroundColor: colors.dangerPressed },
    text: { color: colors.onAccent },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    pressed: { backgroundColor: colors.surfaceAlt },
    text: { color: colors.textSecondary },
  },
};
