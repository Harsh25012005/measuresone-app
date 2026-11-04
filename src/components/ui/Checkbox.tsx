import { Pressable, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { focusRing, useFocus } from '../../theme/useFocus';
import { Icon } from './Icon';
import { Text } from './Text';

export type CheckboxProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  testID?: string;
};

/** 24dp box (radius 2) inside a 48dp-high row. */
export function Checkbox({ checked, onChange, label, disabled = false, className = '', testID }: CheckboxProps) {
  const { colors } = useTheme();
  const { focused, handlers } = useFocus();

  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      testID={testID}
      {...handlers}
      style={focused ? focusRing(colors.primary) : undefined}
      className={`min-h-touch flex-row items-center ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      <View
        className={`h-6 w-6 items-center justify-center rounded-sm border-2 ${
          checked ? 'border-primary bg-primary' : 'border-faint bg-surface'
        }`}
      >
        {checked ? <Icon name="check" size={16} color={colors.onPrimary} strokeWidth={3} /> : null}
      </View>
      {label ? (
        <Text variant="body" className="ml-3 flex-1">
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}
