import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { primary, status, typography } from '../../constants/tokens';

const f = typography.family;

function Cell({
  char,
  active,
  error,
  filled,
  size,
  disabled,
}: {
  char: string;
  active: boolean;
  error: boolean;
  filled: boolean;
  size: number;
  disabled?: boolean;
}) {
  const { colors, scheme } = useTheme();
  const t = useSharedValue(active ? 1 : 0);
  const pop = useSharedValue(1);
  useEffect(() => {
    t.value = withTiming(active ? 1 : 0, { duration: 140 });
  }, [active, t]);
  useEffect(() => {
    if (char) pop.value = withSequence(withTiming(1.12, { duration: 80 }), withTiming(1, { duration: 120 }));
  }, [char, pop]);

  const rest = scheme === 'dark' ? '#3A3A3A' : '#CCCCCC';
  const style = useAnimatedStyle(() => ({
    borderColor: error ? status.danger[600] : interpolateColor(t.value, [0, 1], [filled ? primary[600] : rest, primary[600]]),
    transform: [{ scale: pop.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.cell,
        { width: size, height: size, backgroundColor: filled ? colors.primaryTint : 'transparent', opacity: disabled ? 0.45 : 1 },
        style,
      ]}
    >
      <Text style={{ fontFamily: f.semibold, fontSize: 20, color: error ? status.danger[600] : colors.textPrimary }}>
        {char}
      </Text>
    </Animated.View>
  );
}

export function DSOtpInput({
  length = 4,
  value,
  onChange,
  error,
  disabled,
  forceFocus,
}: {
  length?: 4;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  disabled?: boolean;
  forceFocus?: boolean;
}) {
  const ref = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const shake = useSharedValue(0);
  const isFocused = focused || !!forceFocus;
  const size = 48;

  useEffect(() => {
    if (error) {
      shake.value = withSequence(
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 80 }),
        withTiming(-6, { duration: 70 }),
        withTiming(0, { duration: 50 }),
      );
    }
  }, [error, shake]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const activeIndex = Math.min(value.length, length - 1);

  return (
    <View>
      <Pressable onPress={() => ref.current?.focus()} disabled={disabled}>
        <Animated.View style={[styles.row, shakeStyle]}>
          {Array.from({ length }).map((_, i) => (
            <Cell
              key={i}
              char={value[i] ?? ''}
              active={isFocused && i === activeIndex}
              filled={!!value[i]}
              error={!!error}
              size={size}
              disabled={disabled}
            />
          ))}
        </Animated.View>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={(t) => onChange(t.replace(/[^0-9]/g, '').slice(0, length))}
          keyboardType="number-pad"
          maxLength={length}
          editable={!disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          caretHidden
          style={[StyleSheet.absoluteFill, { opacity: 0 }]}
        />
      </Pressable>
      {error ? <Text style={[styles.helper, { color: status.danger[600] }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  cell: { borderWidth: 1.5, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  helper: { fontFamily: f.regular, fontSize: 12, marginTop: 8 },
});
