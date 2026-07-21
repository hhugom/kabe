import { configWithoutAnimations } from '@tamagui/config';
import { createMedia } from '@tamagui/react-native-media-driver';
import { createTamagui, type TamaguiInternalConfig } from 'tamagui';
import { colors } from './src/theme';

export { typography } from './src/theme';

// Zwift-HUD dark theme — palette from docs/conventions/aesthetic-direction.md.
// Only the tokens Tamagui-based components read at render time need to be present;
// hand-rolled StyleSheet screens still consume `colors.*` directly from src/theme.ts.
const kabe_dark = {
  background: colors.bg,
  backgroundHover: colors.surface,
  backgroundPress: colors.surfaceHi,
  backgroundFocus: colors.surface,
  backgroundStrong: colors.bg,
  backgroundTransparent: 'rgba(10,15,20,0)',
  color: colors.textPrimary,
  colorHover: colors.textPrimary,
  colorPress: colors.textPrimary,
  colorFocus: colors.textPrimary,
  colorTransparent: 'rgba(255,255,255,0)',
  borderColor: colors.surfaceHi,
  borderColorHover: colors.surfaceHi,
  borderColorPress: colors.accent,
  borderColorFocus: colors.accent,
  placeholderColor: colors.textMuted,
  color1: colors.bg,
  color2: colors.surface,
  color3: colors.surfaceHi,
  color4: colors.textMuted,
  color5: colors.textSecondary,
  color6: colors.textSecondary,
  color7: colors.textSecondary,
  color8: colors.textSecondary,
  color9: colors.accent,
  color10: colors.accentPressed,
  color11: colors.textPrimary,
  color12: colors.textPrimary,
  background1: colors.bg,
  background2: colors.surface,
  background3: colors.surfaceHi,
  background4: colors.surfaceHi,
  background5: colors.surfaceHi,
  background6: colors.surfaceHi,
  background7: colors.surface,
  background8: colors.surface,
  background9: colors.accent,
  background10: colors.accentPressed,
  background11: colors.textPrimary,
  background12: colors.textPrimary,
};

const config: TamaguiInternalConfig = createTamagui({
  ...configWithoutAnimations,
  themes: {
    ...configWithoutAnimations.themes,
    kabe_dark,
    dark: { ...configWithoutAnimations.themes.dark, ...kabe_dark },
  },
  media: createMedia(configWithoutAnimations.media),
});

export default config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends TamaguiInternalConfig {}
}
