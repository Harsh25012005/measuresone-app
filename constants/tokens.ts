/**
 * Design tokens for the redesigned app. Single source of truth for the design
 * system page; lib/theme.ts maps these onto the semantic light/dark palettes.
 */

export const primary = {
  50: '#EFF6FF',
  100: '#DBEAFE',
  200: '#BFDBFE',
  300: '#93C5FD',
  400: '#60A5FA',
  500: '#3B82F6',
  600: '#2563EB', // brand — same in light and dark
  700: '#1D4ED8',
  800: '#1E40AF',
  900: '#1E3A8A',
  950: '#172554',
} as const;

/** Cool slate neutrals. Dark theme page background is #0A0A0A (from Figma). */
export const neutral = {
  0: '#FFFFFF',
  50: '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
  950: '#0A0A0A',
} as const;

const scale = (s: Record<number, string>) => s;

export const status = {
  success: scale({ 50: '#F0FDF4', 100: '#DCFCE7', 500: '#22C55E', 600: '#16A34A', 700: '#15803D' }),
  warning: scale({ 50: '#FFFBEB', 100: '#FEF3C7', 500: '#F59E0B', 600: '#D97706', 700: '#B45309' }),
  danger: scale({ 50: '#FEF2F2', 100: '#FEE2E2', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C' }),
  info: scale({ 50: '#ECFEFF', 100: '#CFFAFE', 500: '#06B6D4', 600: '#0891B2', 700: '#0E7490' }),
} as const;

export const typography = {
  family: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semibold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
  },
  // size / lineHeight in px
  scale: {
    display: { size: 32, line: 40, weight: 'bold' },
    h1: { size: 28, line: 36, weight: 'bold' },
    h2: { size: 24, line: 32, weight: 'bold' },
    h3: { size: 20, line: 28, weight: 'semibold' },
    title: { size: 17, line: 24, weight: 'semibold' },
    body: { size: 15, line: 22, weight: 'regular' },
    bodyMedium: { size: 15, line: 22, weight: 'medium' },
    small: { size: 13, line: 18, weight: 'regular' },
    caption: { size: 11, line: 16, weight: 'medium' },
  },
} as const;

/** Everything is fully rounded; inputs with multiple lines use 16. */
export const radii = {
  full: 9999,
  textarea: 16,
  card: 24,
  sheet: 32,
} as const;

export const spacingScale = [2, 4, 8, 12, 16, 24, 32, 48] as const;

export const buttonHeights = { sm: 32, rg: 40, md: 48, lg: 56 } as const;
