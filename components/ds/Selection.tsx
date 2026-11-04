import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { primary, typography } from '../../constants/tokens';
import { IconCheck, IconMinus } from './icons';

const f = typography.family;

/** Animates 0 → 1 as `on` flips, shared by all three controls. */
function useOn(on: boolean) {
  const v = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    v.value = withSpring(on ? 1 : 0, { damping: 18, stiffness: 320, mass: 0.7 });
  }, [on, v]);
  return v;
}

function useOffColors() {
  const { scheme } = useTheme();
  return {
    border: scheme === 'dark' ? '#4A4A4A' : '#CBD5E1',
    track: scheme === 'dark' ? '#2E2E2E' : '#CBD5E1',
  };
}

function Row({
  label,
  description,
  disabled,
  onPress,
  role,
  checked,
  children,
}: {
  label?: string;
  description?: string;
  disabled?: boolean;
  onPress: () => void;
  role: 'switch' | 'checkbox' | 'radio';
  checked: boolean;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={role}
      accessibilityState={{ checked, disabled }}
      style={[styles.row, { opacity: disabled ? 0.45 : 1 }]}
    >
      {children}
      {label ? (
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: f.medium, fontSize: 15, lineHeight: 22, color: colors.textPrimary }}>{label}</Text>
          {description ? (
            <Text style={{ fontFamily: f.regular, fontSize: 13, lineHeight: 18, color: colors.textMuted }}>
              {description}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

// ───────────────────────────────── Toggle

export function DSToggle({
  value,
  onValueChange,
  label,
  description,
  disabled,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}) {
  const on = useOn(value);
  const { track } = useOffColors();
  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], [track, primary[600]]),
  }));
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(on.value, [0, 1], [0, 20]) }, { scaleX: 1 + 0.12 * Math.sin(on.value * Math.PI) }],
  }));
  return (
    <Row label={label} description={description} disabled={disabled} onPress={() => onValueChange(!value)} role="switch" checked={value}>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Row>
  );
}

// ───────────────────────────────── Checkbox

export function DSCheckbox({
  value,
  onValueChange,
  label,
  description,
  disabled,
  indeterminate,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  /** Shows a dash (partial selection). */
  indeterminate?: boolean;
}) {
  const filled = value || !!indeterminate;
  const on = useOn(filled);
  const { border } = useOffColors();
  const accent = primary[600];
  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], ['rgba(0,0,0,0)', accent]),
    borderColor: interpolateColor(on.value, [0, 1], [border, accent]),
  }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: on.value,
    transform: [{ scale: interpolate(on.value, [0, 1], [0.4, 1]) }],
  }));
  return (
    <Row label={label} description={description} disabled={disabled} onPress={() => onValueChange(!value)} role="checkbox" checked={value}>
      <Animated.View style={[styles.box, boxStyle]}>
        <Animated.View style={markStyle}>
          {indeterminate ? (
            <IconMinus size={15} color="#FFFFFF" strokeWidth={3} />
          ) : (
            <IconCheck size={15} color="#FFFFFF" strokeWidth={3} />
          )}
        </Animated.View>
      </Animated.View>
    </Row>
  );
}

// ───────────────────────────────── Radio

export function DSRadio({
  selected,
  onSelect,
  label,
  description,
  disabled,
}: {
  selected: boolean;
  onSelect: () => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}) {
  const on = useOn(selected);
  const ring = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    ring.value = withTiming(selected ? 1 : 0, { duration: 160 });
  }, [selected, ring]);
  const { border } = useOffColors();
  const ringStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(ring.value, [0, 1], [border, primary[600]]),
  }));
  const dotStyle = useAnimatedStyle(() => ({
    opacity: on.value,
    transform: [{ scale: on.value }],
  }));
  return (
    <Row label={label} description={description} disabled={disabled} onPress={onSelect} role="radio" checked={selected}>
      <Animated.View style={[styles.radio, ringStyle]}>
        <Animated.View style={[styles.dot, dotStyle]} />
      </Animated.View>
    </Row>
  );
}

export type RadioOption = { value: string; label: string; description?: string; disabled?: boolean };

export function DSRadioGroup({
  options,
  value,
  onChange,
}: {
  options: RadioOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ gap: 14 }} accessibilityRole="radiogroup">
      {options.map((o) => (
        <DSRadio
          key={o.value}
          label={o.label}
          description={o.description}
          disabled={o.disabled}
          selected={o.value === value}
          onSelect={() => onChange(o.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 28 },
  track: { width: 48, height: 28, borderRadius: 9999, padding: 3, justifyContent: 'center' },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  box: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 9999, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 9999, backgroundColor: primary[600] },
});
