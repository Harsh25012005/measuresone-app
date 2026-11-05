import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/**
 * Measured size for an absolutely-filled SVG. Android can lay out an Svg given
 * `width="100%"` against a stale (or zero) parent size, which shows up as gradients
 * that stop short of the right edge. Feeding it numeric pixels avoids that.
 */
export function useFillSize() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((p) => (Math.abs(p.w - width) < 0.5 && Math.abs(p.h - height) < 0.5 ? p : { w: width, h: height }));
  }, []);
  return { ...size, onLayout };
}
