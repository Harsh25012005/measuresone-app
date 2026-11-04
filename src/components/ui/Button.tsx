import { ActivityIndicator, Pressable, View } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { focusRing, useFocus } from '../../theme/useFocus';
import { Text, type TextTone } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'outline' | 'ghost' | 'danger' | 'google' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  title?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
  accessibilityLabel?: string;
  testID?: string;
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-primary border-primary active:bg-primary-dark active:border-primary-dark',
  secondary: 'bg-surface border-line active:bg-surface-2',
  tonal: 'bg-primary-50 border-primary-50 active:bg-surface-2',
  outline: 'bg-transparent border-primary active:bg-primary-50',
  ghost: 'bg-transparent border-transparent active:bg-surface-2',
  danger: 'bg-danger-50 border-danger-50 active:bg-surface-2',
  google: 'bg-surface border-line active:bg-surface-2',
  icon: 'bg-surface border-line active:bg-surface-2',
};

const VARIANT_TONE: Record<ButtonVariant, TextTone> = {
  primary: 'onPrimary',
  secondary: 'default',
  tonal: 'primary',
  outline: 'primary',
  ghost: 'primary',
  danger: 'danger',
  google: 'default',
  icon: 'default',
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  icon,
  className = '',
  children,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  const { focused, handlers } = useFocus();
  const isDisabled = disabled || loading;
  const isIcon = variant === 'icon';

  // 48dp default, 56dp large; `sm` is 40dp with a 4dp hit-slop so the touch
  // target is still 48dp.
  const sizeClass = isIcon
    ? size === 'sm'
      ? 'h-10 w-10'
      : 'h-12 w-12'
    : size === 'sm'
    ? 'h-10 px-3'
    : size === 'lg'
    ? 'h-14 px-6'
    : 'h-12 px-4';

  const tone = VARIANT_TONE[variant];
  const spinnerColor = variant === 'primary' ? colors.onPrimary : colors.primary;

  const content =
    children ?? (
      <>
        {icon ? <View className={title ? 'mr-2' : ''}>{icon}</View> : null}
        {title ? (
          <Text variant={size === 'lg' ? 'bodyLg' : size === 'md' ? 'bodyLg' : 'label'} tone={tone} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </>
    );

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      hitSlop={size === 'sm' ? 4 : 0}
      testID={testID}
      {...handlers}
      style={focused ? focusRing(colors.primary) : undefined}
      className={`flex-row items-center justify-center rounded border ${sizeClass} ${VARIANT_CLASS[variant]} ${
        fullWidth && !isIcon ? 'w-full' : ''
      } ${disabled && !loading ? 'opacity-50' : ''} ${className}`}
    >
      {/* Keep the label in layout while loading so the button never changes width. */}
      <View className={`flex-row items-center justify-center ${loading ? 'opacity-0' : ''}`}>{content}</View>
      {loading ? (
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator size="small" color={spinnerColor} />
        </View>
      ) : null}
    </Pressable>
  );
}
