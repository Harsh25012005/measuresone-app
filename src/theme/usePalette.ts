import { colors, darkColors } from './tokens';
import { useTheme } from '../../context/ThemeContext';

/** Full token palette (status/payment colours included) for the active scheme. */
export function usePalette() {
  return useTheme().scheme === 'dark' ? darkColors : colors;
}
