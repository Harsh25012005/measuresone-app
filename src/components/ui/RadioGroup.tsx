import { Pressable, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { focusRing, useFocus } from '../../theme/useFocus';
import { SegmentedControl } from './SegmentedControl';
import { Text } from './Text';

export type RadioButtonProps = {
  selected: boolean;
  onPress: () => void;
  label?: string;
  disabled?: boolean;
  testID?: string;
};

/** 24dp squared radio (radius 3) in a 48dp-high row. */
export function RadioButton({ selected, onPress, label, disabled = false, testID }: RadioButtonProps) {
  const { colors } = useTheme();
  const { focused, handlers } = useFocus();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      testID={testID}
      {...handlers}
      style={focused ? focusRing(colors.primary) : undefined}
      className={`min-h-touch flex-row items-center ${disabled ? 'opacity-50' : ''}`}
    >
      <View
        className={`h-6 w-6 items-center justify-center rounded-md border-2 ${
          selected ? 'border-primary' : 'border-faint'
        }`}
      >
        {selected ? <View className="h-3 w-3 rounded-sm bg-primary" /> : null}
      </View>
      {label ? (
        <Text variant="body" className="ml-3 flex-1">
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

export type RadioOption<T extends string = string> = { label: string; value: T; subtext?: string };

export type RadioGroupProps<T extends string = string> = {
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  direction?: 'row' | 'column';
  variant?: 'dots' | 'cards' | 'segmented';
  className?: string;
};

function RadioCard<T extends string>({
  option,
  selected,
  fill,
  onPress,
}: {
  option: RadioOption<T>;
  selected: boolean;
  fill: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { focused, handlers } = useFocus();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={option.subtext ? `${option.label}, ${option.subtext}` : option.label}
      accessibilityState={{ selected }}
      {...handlers}
      style={focused ? focusRing(colors.primary) : undefined}
      className={`min-h-touch flex-row items-center justify-between rounded border p-3 ${
        fill ? 'min-w-[120px] flex-1' : 'w-full'
      } ${selected ? 'border-primary bg-primary-50' : 'border-line bg-surface active:bg-surface-2'}`}
    >
      <View className="mr-2 flex-1">
        <Text variant="bodyLg" tone={selected ? 'primary' : 'default'}>
          {option.label}
        </Text>
        {option.subtext ? (
          <Text variant="caption" tone="muted" weight="regular">
            {option.subtext}
          </Text>
        ) : null}
      </View>
      <View
        className={`h-5 w-5 items-center justify-center rounded-md border-2 ${
          selected ? 'border-primary bg-primary' : 'border-faint'
        }`}
      >
        {selected ? <View className="h-2 w-2 rounded-sm bg-on-primary" /> : null}
      </View>
    </Pressable>
  );
}

export function RadioGroup<T extends string = string>({
  options,
  value,
  onChange,
  direction = 'column',
  variant = 'dots',
  className = '',
}: RadioGroupProps<T>) {
  if (variant === 'segmented') {
    return <SegmentedControl options={options} value={value} onChange={onChange} className={className} />;
  }

  if (variant === 'cards') {
    return (
      <View accessibilityRole="radiogroup" className={`${direction === 'row' ? 'flex-row flex-wrap gap-2' : 'gap-2'} ${className}`}>
        {options.map((opt) => (
          <RadioCard
            key={opt.value}
            option={opt}
            selected={value === opt.value}
            fill={direction === 'row'}
            onPress={() => onChange(opt.value)}
          />
        ))}
      </View>
    );
  }

  return (
    <View accessibilityRole="radiogroup" className={`${direction === 'row' ? 'flex-row flex-wrap gap-x-4' : ''} ${className}`}>
      {options.map((opt) => (
        <RadioButton key={opt.value} selected={value === opt.value} onPress={() => onChange(opt.value)} label={opt.label} />
      ))}
    </View>
  );
}
