import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';

export const THEME_MODES = ['light', 'dark', 'system'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];
export type ResolvedScheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'measuresone:themeMode';

/**
 * Hex palette for places NativeWind's `dark:` className variant can't reach —
 * icon `color` props (FontAwesome5/Ionicons take a plain string, not a
 * className) and RN `StyleSheet.create` values (the custom SVG tab bar).
 * Keyed by resolved scheme so callers just index with the current one.
 */
export const THEME_COLORS = {
  light: {
    textPrimary: '#101828',
    textSecondary: '#475467',
    textMuted: '#667085',
    textFaint: '#98A2B3',
    iconDefault: '#101828',
    iconMuted: '#6B7280',
    bgPage: '#FFFFFF',
    bgSurface: '#FFFFFF',
    bgSubtle: '#F9FAFB',
    bgSunken: '#F4F6F9',
    borderDefault: '#E5E7EB',
    borderSubtle: '#F3F4F6',
    // Matches Tailwind's primary-600 (tailwind.config.js) — the same blue
    // every button/link/badge uses via className — so icon `color` props
    // (which can't take a className) land on the exact same hex instead of
    // the slightly darker primary-700 this drifted to.
    primary: '#2563EB',
    primaryTint: '#EFF6FF',
  },
  dark: {
    textPrimary: '#F9FAFB',
    textSecondary: '#D0D5DD',
    textMuted: '#98A2B3',
    textFaint: '#667085',
    iconDefault: '#F3F4F6',
    iconMuted: '#9CA3AF',
    bgPage: '#0A0A0A',
    bgSurface: '#141414',
    bgSubtle: '#1C1C1C',
    bgSunken: '#0F0F0F',
    borderDefault: '#2A2A2A',
    borderSubtle: '#1E1E1E',
    primary: '#2563EB',
    primaryTint: '#172554',
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
