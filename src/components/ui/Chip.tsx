import { Pressable, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { focusRing, useFocus } from '../../theme/useFocus';
import { Icon } from './Icon';
import { Text } from './Text';

export type ChipProps = {
  label: string;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  icon?: string;
  /** Small trailing number, e.g. a count of late orders. */
  count?: number;
  className?: string;
  testID?: string;
};

/** Filter / quick-pick chip, radius 2. 36dp visual, 48dp touch (hit-slop). */
export function Chip({ label, onPress, selected = false, disabled = false, icon, count, className = '', testID }: ChipProps) {
  const { colors } = useTheme();
  const { focused, handlers } = useFocus();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={count != null ? `${label}, ${count}` : label}
      accessibilityState={{ selected, disabled }}
      hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
      testID={testID}
      {...handlers}
      style={focused ? focusRing(colors.primary) : undefined}
      className={`h-9 flex-row items-center rounded-sm border px-3 ${
        selected ? 'bg-primary-50 border-primary' : 'bg-surface border-line active:bg-surface-2'
      } ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      {selected ? (
        <View className="mr-1.5">
          <Icon name="check" size={14} color={colors.primary} strokeWidth={2.5} />
        </View>
      ) : icon ? (
        <View className="mr-1.5">
          <Icon name={icon} size={14} color={colors.textMuted} />
        </View>
      ) : null}
      <Text variant="label" tone={selected ? 'primary' : 'default'} numberOfLines={1}>
        {label}
      </Text>
      {count != null ? (
        <Text variant="caption" tone={selected ? 'primary' : 'muted'} tabular className="ml-1.5">
          {count}
        </Text>
      ) : null}
    </Pressable>
  );
}
