import { Pressable } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { focusRing, useFocus } from '../../theme/useFocus';
import { Icon } from './Icon';

export type IconButtonProps = {
  icon: string;
  onPress: () => void;
  /** Required: icon-only buttons have no visible text. */
  accessibilityLabel: string;
  variant?: 'outline' | 'ghost' | 'tonal';
  size?: 'sm' | 'md';
  selected?: boolean;
  disabled?: boolean;
  /** Overrides the icon colour (otherwise text colour, or primary when selected/tonal). */
  color?: string;
  className?: string;
  testID?: string;
};

const VARIANT_CLASS = {
  outline: 'bg-surface border-line active:bg-surface-2',
  ghost: 'bg-transparent border-transparent active:bg-surface-2',
  tonal: 'bg-primary-50 border-primary-50 active:bg-surface-2',
} as const;

/** 48dp (md) or 40dp + hit-slop (sm) square icon button, radius 4. */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  variant = 'outline',
  size = 'md',
  selected = false,
  disabled = false,
  color,
  className = '',
  testID,
}: IconButtonProps) {
  const { colors } = useTheme();
  const { focused, handlers } = useFocus();
  const iconColor = color ?? (selected || variant === 'tonal' ? colors.primary : colors.textPrimary);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      hitSlop={size === 'sm' ? 4 : 0}
      testID={testID}
      {...handlers}
      style={focused ? focusRing(colors.primary) : undefined}
      className={`items-center justify-center rounded border ${size === 'sm' ? 'h-10 w-10' : 'h-12 w-12'} ${
        selected ? 'bg-primary-50 border-primary' : VARIANT_CLASS[variant]
      } ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      <Icon name={icon} size={size === 'sm' ? 18 : 20} color={iconColor} />
    </Pressable>
  );
}
