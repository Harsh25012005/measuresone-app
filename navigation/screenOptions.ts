import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useReducedMotion } from '../src/theme/useReducedMotion';
import { transitions } from '../src/theme/tokens';

/**
 * Shared stack options: no native header (screens render their own Header),
 * 200ms push transition, and no animation at all when the OS asks to reduce motion.
 */
export function useStackScreenOptions(): NativeStackNavigationOptions {
  const reduced = useReducedMotion();
  return {
    headerShown: false,
    animation: reduced ? 'none' : 'slide_from_right',
    animationDuration: transitions.normal,
  };
}

/** Create/edit forms rise from the bottom, like a sheet. */
export function useFormScreenOptions(): NativeStackNavigationOptions {
  const reduced = useReducedMotion();
  return { animation: reduced ? 'none' : 'slide_from_bottom', animationDuration: transitions.normal };
}
