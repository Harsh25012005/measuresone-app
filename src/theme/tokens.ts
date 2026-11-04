import type { OrderStatus, PaymentStatus } from '../../types';

export type BadgeColor = { bg: string; text: string; border?: string };

/**
 * "Indigo Ink" design tokens. Source of truth for colour, type, spacing,
 * radius and motion; DESIGN.md documents the rules. global.css mirrors the
 * colour values as CSS variables for NativeWind classes — keep them in sync
 * (scripts/check-design-rules.js enforces that).
 *
 * Rules: radius 2/3/4px only (status dots excepted), no shadows, no gradients.
 */

type Palette = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  onPrimary: string;
  background: string;
  surface: string;
  surfaceSubtle: string;
  white: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  borderSubtle: string;
  danger: string;
  dangerLight: string;
  success: string;
  successLight: string;
  accent: string;
  accentLight: string;
  accentInk: string;
  warning: string;
  warningLight: string;
  info: string;
  scrim: string;
  navBg: string;
  navInk: string;
  navOn: string;
  status: Record<OrderStatus, BadgeColor>;
  payment: Record<PaymentStatus, BadgeColor>;
};

export const colors: Palette = {
  primary: '#3340B8',
  primaryDark: '#28339A',
  primaryLight: '#E8EAFB',
  onPrimary: '#FFFFFF',

  background: '#F7F8FB',
  surface: '#FFFFFF',
  surfaceSubtle: '#EFF1F6',
  white: '#FFFFFF',

  text: '#12141C',
  textMuted: '#565D70',
  textFaint: '#6E7589',

  border: '#DDE1EA',
  borderSubtle: '#E9ECF2',

  danger: '#BC2F2F',
  dangerLight: '#FBE9E7',
  success: '#12724A',
  successLight: '#E4F3EC',
  accent: '#8A5300',
  accentLight: '#FBF0DC',
  accentInk: '#8A5300',
  warning: '#8A5300',
  warningLight: '#FBF0DC',
  info: '#3340B8',

  scrim: 'rgba(18, 20, 28, 0.5)',
  navBg: '#FFFFFF',
  navInk: '#565D70',
  navOn: '#3340B8',

  status: {
    order_taken: { bg: '#EFF1F6', text: '#12141C', border: '#DDE1EA' },
    cutting: { bg: '#E8EAFB', text: '#28339A', border: '#E8EAFB' },
    stitching: { bg: '#E8EAFB', text: '#28339A', border: '#E8EAFB' },
    ready: { bg: '#E4F3EC', text: '#12724A', border: '#E4F3EC' },
    delivered: { bg: '#F7F8FB', text: '#565D70', border: '#DDE1EA' },
  },

  payment: {
    paid: { bg: '#E4F3EC', text: '#12724A' },
    partial: { bg: '#FBF0DC', text: '#8A5300' },
    unpaid: { bg: '#FBE9E7', text: '#BC2F2F' },
  },
};

export const darkColors: Palette = {
  primary: '#8E9BFF',
  primaryDark: '#AAB4FF',
  primaryLight: '#1C2142',
  onPrimary: '#0D1033',

  background: '#0D0F15',
  surface: '#151821',
  surfaceSubtle: '#1C202B',
  white: '#FFFFFF',

  text: '#ECEEF4',
  textMuted: '#A3AABD',
  textFaint: '#8089A0',

  border: '#2A2F3D',
  borderSubtle: '#20242F',

  danger: '#FF8A80',
  dangerLight: '#2E1816',
  success: '#4CC38A',
  successLight: '#12261D',
  accent: '#E8A93A',
  accentLight: '#2B2111',
  accentInk: '#E8A93A',
  warning: '#E8A93A',
  warningLight: '#2B2111',
  info: '#8E9BFF',

  scrim: 'rgba(0, 0, 0, 0.6)',
  navBg: '#151821',
  navInk: '#A3AABD',
  navOn: '#8E9BFF',

  status: {
    order_taken: { bg: '#1C202B', text: '#ECEEF4', border: '#2A2F3D' },
    cutting: { bg: '#1C2142', text: '#AAB4FF', border: '#1C2142' },
    stitching: { bg: '#1C2142', text: '#AAB4FF', border: '#1C2142' },
    ready: { bg: '#12261D', text: '#4CC38A', border: '#12261D' },
    delivered: { bg: '#0D0F15', text: '#A3AABD', border: '#2A2F3D' },
  },

  payment: {
    paid: { bg: '#12261D', text: '#4CC38A' },
    partial: { bg: '#2B2111', text: '#E8A93A' },
    unpaid: { bg: '#2E1816', text: '#FF8A80' },
  },
};

/**
 * Font files per script. Latin uses Plus Jakarta Sans; Gujarati and Hindi use
 * Noto Sans Gujarati / Devanagari so Indic text never falls back to an
 * unmatched system font. `fontFamilyFor` picks the file for a language+weight.
 */
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const;

export const indicFonts = {
  gu: {
    regular: 'NotoSansGujarati_400Regular',
    medium: 'NotoSansGujarati_500Medium',
    semibold: 'NotoSansGujarati_600SemiBold',
    bold: 'NotoSansGujarati_700Bold',
  },
  hi: {
    regular: 'NotoSansDevanagari_400Regular',
    medium: 'NotoSansDevanagari_500Medium',
    semibold: 'NotoSansDevanagari_600SemiBold',
    bold: 'NotoSansDevanagari_700Bold',
  },
} as const;

export type FontWeightKey = keyof typeof fonts;

export function fontFamilyFor(language: string, weight: FontWeightKey = 'regular'): string {
  if (language === 'gu') return indicFonts.gu[weight];
  if (language === 'hi') return indicFonts.hi[weight];
  return fonts[weight];
}

/** Sizes are sp: they scale with the OS font size. Do not cap at 200%. */
export const typeScale = {
  xs: 12, // caption, badge text
  sm: 14, // labels, helper text
  base: 16, // body
  md: 18, // bodyLg, list titles
  lg: 20, // title
  xl: 24, // headline
  display: 32, // big numbers
} as const;

/** Line-height multipliers. Indic scripts need more vertical room. */
export const lineHeight = {
  latin: 1.4,
  indic: 1.6,
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  mdSm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Minimum touch target (dp). */
export const touchTarget = 48;

/**
 * The only radii allowed: 2 (chips, badges, checkboxes, thumbnails),
 * 3 (inputs, avatars, segmented controls), 4 (buttons, cards, sheets, dialogs,
 * images, tab bar). `full` is kept as an alias of 4 so legacy call sites stay
 * compliant; status dots use `dot` only.
 */
export const radius = {
  xs: 2,
  sm: 2,
  md: 3,
  lg: 4,
  full: 4,
  dot: 9999,
} as const;

export const borderWidth = { hairline: 1, focus: 2 } as const;

export const transitions = {
  fast: 150,
  normal: 200,
  slow: 250,
  easing: [0.2, 0.8, 0.2, 1] as const,
} as const;
