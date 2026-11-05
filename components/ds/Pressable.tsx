import { forwardRef, useState } from 'react';
import { Pressable as RNPressable, type PressableProps, type StyleProp, type View, type ViewStyle } from 'react-native';

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
};

/**
 * Drop-in for react-native's Pressable that accepts the `style={({ pressed }) => ...}` form.
 * With NativeWind's JSX runtime that function form silently loses its styles on Android
 * (cards render with no padding, background or radius), so the pressed state is tracked
 * here and a plain style object is handed down instead.
 */
export const Pressable = forwardRef<View, Props>(function Pressable({ style, onPressIn, onPressOut, ...rest }, ref) {
  const [pressed, setPressed] = useState(false);
  const resolved = typeof style === 'function' ? style({ pressed }) : style;
  return (
    <RNPressable
      ref={ref}
      {...rest}
      style={resolved}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
    />
  );
});
