import { View, Pressable, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { focusRing, useFocus } from '../../theme/useFocus';

export type CardVariant = 'surface' | 'subtle' | 'outline' | 'panel' | 'selected';

export type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  variant?: CardVariant;
  className?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
  testID?: string;
};

const VARIANT_CLASS: Record<CardVariant, string> = {
  surface: 'bg-surface border-line',
  panel: 'bg-surface border-line',
  subtle: 'bg-surface-2 border-line',
  outline: 'bg-transparent border-line',
  selected: 'bg-primary-50 border-primary',
};

/** Surface + 1px border, radius 4, no shadow. Pressable cards darken to surface-2. */
export function Card({
  children,
  onPress,
  variant = 'surface',
  className = '',
  style,
  accessibilityLabel,
  testID,
}: CardProps) {
  const { colors } = useTheme();
  const { focused, handlers } = useFocus();
  const base = `rounded border p-4 ${VARIANT_CLASS[variant]} ${className}`;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        {...handlers}
        style={[style, focused ? focusRing(colors.primary) : null]}
        className={`active:bg-surface-2 ${base}`}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={style} className={base} testID={testID}>
      {children}
    </View>
  );
}
