// Zwift-HUD palette — locked in docs/conventions/aesthetic-direction.md.
// Backward-compat token names (bg, surface, accent, ...) are preserved so
// screens that haven't been rebuilt on Tamagui yet keep rendering.

export const colors = {
  bg: '#0A0F14',
  surface: '#151E27',
  surfaceHi: '#1D2A36',
  surfaceAlt: '#1D2A36',
  border: '#1D2A36',
  textPrimary: '#FFFFFF',
  textSecondary: '#8FA4B8',
  textMuted: '#5A6E82',
  accent: '#00E5FF',
  accentPressed: '#00B8CC',
  accentSoft: '#1D2A36',
  accentAmber: '#FFC933',
  accentMagenta: '#FF3D71',
  danger: '#FF6B6B',
  dangerPressed: '#CC5555',
  onAccent: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
};

export const typography = {
  heroDigits: {
    fontSize: 112,
    lineHeight: 116,
    fontWeight: '800' as const,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'] as ['tabular-nums'],
    letterSpacing: -1,
  },
  display: {
    fontSize: 44,
    lineHeight: 48,
    fontWeight: '800' as const,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'] as ['tabular-nums'],
  },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const, color: colors.textPrimary },
  subtitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '500' as const, color: colors.textPrimary },
  bodyMuted: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const, color: colors.textSecondary },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800' as const,
    color: colors.textSecondary,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const, color: colors.textMuted },
};
