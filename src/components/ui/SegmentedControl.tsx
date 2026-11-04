import { Pressable, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { focusRing, useFocus } from '../../theme/useFocus';
import { Text } from './Text';

export type SegmentOption<T extends string = string> = { label: string; value: T; count?: number };

export type SegmentedControlProps<T extends string = string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  testID?: string;
};

function Segment<T extends string>({
  option,
  selected,
  onPress,
}: {
  option: SegmentOption<T>;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { focused, handlers } = useFocus();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={option.count != null ? `${option.label}, ${option.count}` : option.label}
      accessibilityState={{ selected }}
      {...handlers}
      style={focused ? focusRing(colors.primary) : undefined}
      className={`min-h-[44px] flex-1 flex-row items-center justify-center rounded-sm border px-2 ${
        selected ? 'border-primary bg-primary-50' : 'border-transparent bg-transparent'
      }`}
    >
      <Text variant="label" tone={selected ? 'primary' : 'muted'} numberOfLines={1}>
        {option.label}
      </Text>
      {option.count != null ? (
        <Text variant="caption" tone={selected ? 'primary' : 'muted'} tabular className="ml-1">
          {option.count}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Container radius 3, selected segment radius 2 with a 1px primary border. 48dp high. */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className = '',
  testID,
}: SegmentedControlProps<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      testID={testID}
      className={`flex-row rounded-md border border-line bg-surface-2 p-0.5 ${className}`}
    >
      {options.map((opt) => (
        <Segment key={opt.value} option={opt} selected={opt.value === value} onPress={() => onChange(opt.value)} />
      ))}
    </View>
  );
}
