import { useCallback, useState } from 'react';

/** Focus state + handlers, for the 2px primary focus ring (keyboard, switch access, web). */
export function useFocus() {
  const [focused, setFocused] = useState(false);
  const onFocus = useCallback(() => setFocused(true), []);
  const onBlur = useCallback(() => setFocused(false), []);
  return { focused, handlers: { onFocus, onBlur } };
}

export const focusRing = (color: string) =>
  ({ outlineColor: color, outlineWidth: 2, outlineOffset: 2, outlineStyle: 'solid' }) as const;
