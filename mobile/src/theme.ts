export const colors = {
  bg: '#F4F6F4',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFBFA',
  border: '#E4E7E5',
  textPrimary: '#141B17',
  textSecondary: '#5A6660',
  textMuted: '#8A948F',
  accent: '#2F7A56',
  accentPressed: '#256143',
  accentSoft: '#E4F1EA',
  danger: '#B03A2E',
  dangerPressed: '#8A2C22',
  onAccent: '#FFFFFF',
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
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700' as const, color: colors.textPrimary },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const, color: colors.textPrimary },
  subtitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const, color: colors.textPrimary },
  bodyMuted: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const, color: colors.textSecondary },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const, color: colors.textMuted },
  mono: { fontSize: 64, lineHeight: 72, fontWeight: '300' as const, color: colors.textPrimary },
};
