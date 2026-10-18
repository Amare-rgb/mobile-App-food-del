export const COLORS = {
  primary: '#FF6B35',
  secondary: '#F7C948',
  dark: '#1A1A1A',
  gray: '#8E8E93',
  lightGray: '#F2F2F7',
  white: '#FFFFFF',
  black: '#000000',
  success: '#34C759',
  danger: '#FF3B30',
  border: '#E5E5EA',
};

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  radius: 12,
  radiusLg: 20,
};

export const FONTS = {
  h1: { fontSize: 32, fontWeight: '700' as const, color: COLORS.dark },
  h2: { fontSize: 24, fontWeight: '700' as const, color: COLORS.dark },
  h3: { fontSize: 20, fontWeight: '600' as const, color: COLORS.dark },
  h4: { fontSize: 16, fontWeight: '600' as const, color: COLORS.dark },
  body: { fontSize: 14, fontWeight: '400' as const, color: COLORS.dark },
  small: { fontSize: 12, fontWeight: '400' as const, color: COLORS.gray },
};