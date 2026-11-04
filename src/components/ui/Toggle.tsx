import { useEffect, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { focusRing, useFocus } from '../../theme/useFocus';
import { radius, transitions } from '../../theme/tokens';
import { useReducedMotion } from '../../theme/useReducedMotion';
import { Text } from './Text';

export type ToggleProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  testID?: string;
};

const TRACK_W = 48;
const THUMB = 20;
const PAD = 4;
const TRAVEL = TRACK_W - THUMB - PAD * 2 - 2; // 2 = track border

/** Squared switch (track and thumb radius 3) in a 48dp-high row. */
export function Toggle({ value, onChange, label, description, disabled = false, className = '', testID }: ToggleProps) {
  const { colors } = useTheme();
  const { focused, handlers } = useFocus();
  const reduced = useReducedMotion();
  const [position] = useState(() => new Animated.Value(value ? TRAVEL : 0));

  useEffect(() => {
    Animated.timing(position, {
      toValue: value ? TRAVEL : 0,
      duration: reduced ? 0 : transitions.fast,
      useNativeDriver: true,
    }).start();
  }, [value, position, reduced]);

  return (
    <Pressable
      onPress={() => !disabled && onChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
      testID={testID}
      {...handlers}
      style={focused ? focusRing(colors.primary) : undefined}
      className={`min-h-touch flex-row items-center justify-between ${disabled ? 'opacity-50' : ''} ${className}`}
    >
      {label || description ? (
        <View className="mr-3 flex-1">
          {label ? <Text variant="body">{label}</Text> : null}
          {description ? (
            <Text variant="caption" tone="muted" weight="regular">
              {description}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View
        className={`h-7 justify-center border ${value ? 'border-primary bg-primary' : 'border-faint bg-surface-2'}`}
        style={{ width: TRACK_W, borderRadius: radius.md, paddingHorizontal: PAD }}
      >
        <Animated.View
          style={{
            width: THUMB,
            height: THUMB,
            borderRadius: radius.sm,
            backgroundColor: value ? colors.onPrimary : colors.textMuted,
            transform: [{ translateX: position }],
          }}
        />
      </View>
    </Pressable>
  );
}
