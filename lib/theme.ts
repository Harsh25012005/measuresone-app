import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';

export const THEME_MODES = ['light', 'dark', 'system'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];
export type ResolvedScheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'measuresone:themeMode';

/**
 * Hex palette for places NativeWind's `dark:` className variant can't reach —
 * icon `color` props (FontAwesome5/Ionicons take a plain string, not a
 * className) and RN `StyleSheet.create` values.
 * Keyed by resolved scheme so callers just index with the current one.
 * Mirrors src/theme/tokens.ts ("Indigo Ink").
 */
export const THEME_COLORS = {
  light: {
    textPrimary: '#12141C',
    textSecondary: '#565D70',
    textMuted: '#565D70',
    textFaint: '#6E7589',
    iconDefault: '#12141C',
    iconMuted: '#565D70',
    bgPage: '#F7F8FB',
    bgSurface: '#FFFFFF',
    bgSubtle: '#EFF1F6',
    bgSunken: '#E9ECF2',
    borderDefault: '#DDE1EA',
    borderSubtle: '#E9ECF2',
    primary: '#3340B8',
    primaryTint: '#E8EAFB',
    onPrimary: '#FFFFFF',
  },
  dark: {
    textPrimary: '#ECEEF4',
    textSecondary: '#A3AABD',
    textMuted: '#A3AABD',
    textFaint: '#8089A0',
    iconDefault: '#ECEEF4',
    iconMuted: '#A3AABD',
    bgPage: '#0D0F15',
    bgSurface: '#151821',
    bgSubtle: '#1C202B',
    bgSunken: '#20242F',
    borderDefault: '#2A2F3D',
    borderSubtle: '#20242F',
    primary: '#8E9BFF',
    primaryTint: '#1C2142',
    onPrimary: '#0D1033',
  },
} as const;

/** Loads the persisted theme mode and applies it before first paint. */
export async function initTheme(): Promise<ThemeMode> {
  try {
    const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    const mode: ThemeMode =
      stored && (THEME_MODES as readonly string[]).includes(stored) ? (stored as ThemeMode) : 'light';
    colorScheme.set(mode);
    return mode;
  } catch {
    colorScheme.set('light');
    return 'light';
  }
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  colorScheme.set(mode);
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Non-fatal — the choice just won't persist across restarts.
  }
}
