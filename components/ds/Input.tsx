import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Pressable } from './Pressable';
import Animated, {
  FadeInDown,
  FadeOutUp,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { primary, radii, status, typography } from '../../constants/tokens';
import { IconChevronDown, IconEye, IconEyeOff, IconSearch, IconX } from './icons';

const HEIGHT = 48;
const f = typography.family;

export type DSInputKind = 'text' | 'textarea' | 'password' | 'search';

type FieldShellProps = {
  label?: string;
  focused: boolean;
  filled: boolean;
  error?: string;
  disabled?: boolean;
  multiline?: boolean;
  left?: ReactNode;
  right?: ReactNode;
  /** Background the floating label sits on — must match whatever is behind the field. */
  labelBg?: string;
  helper?: string;
  children: ReactNode;
  onPress?: () => void;
};

/**
 * Outlined field with a label that floats up onto the border (Figma "Input
 * field"): grey border at rest, primary border + primary label on focus.
 * Shared by every input type so they all animate and colour the same way.
 */
export function FieldShell({
  label,
  focused,
  filled,
  error,
  disabled,
  multiline,
  left,
  right,
  labelBg,
  helper,
  children,
  onPress,
}: FieldShellProps) {
  const { colors, scheme } = useTheme();
  const floated = focused || filled;
  const float = useSharedValue(floated ? 1 : 0);
  const focus = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    float.value = withTiming(floated ? 1 : 0, { duration: 160 });
    focus.value = withTiming(focused ? 1 : 0, { duration: 160 });
  }, [floated, focused, float, focus]);

  const restBorder = scheme === 'dark' ? '#3A3A3A' : '#CCCCCC';
  const restLabel = '#808080';
  const errColor = status.danger[600];

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: error ? errColor : interpolateColor(focus.value, [0, 1], [restBorder, primary[600]]),
  }));
  const labelStyle = useAnimatedStyle(() => {
    const restY = multiline ? 14 : HEIGHT / 2 - 11;
    return {
      transform: [{ translateY: interpolate(float.value, [0, 1], [restY, -10]) }],
      color: error ? errColor : interpolateColor(focus.value, [0, 1], [restLabel, primary[600]]),
      fontSize: interpolate(float.value, [0, 1], [14, 12]),
    };
  });

  const bg = labelBg ?? colors.bgPage;

  return (
    <View style={{ opacity: disabled ? 0.45 : 1 }}>
      <Pressable onPress={onPress} disabled={!onPress || disabled}>
        <Animated.View
          style={[
            styles.shell,
            multiline ? styles.shellMulti : { height: HEIGHT },
            borderStyle,
          ]}
        >
          {left}
          <View style={{ flex: 1, justifyContent: multiline ? 'flex-start' : 'center' }}>{children}</View>
          {right}
          {label ? (
            <Animated.Text
              pointerEvents="none"
              numberOfLines={1}
              style={[styles.label, { backgroundColor: bg, fontFamily: f.medium }, labelStyle]}
            >
              {label}
            </Animated.Text>
          ) : null}
        </Animated.View>
      </Pressable>
      {error || helper ? (
        <Text style={[styles.helper, { color: error ? errColor : colors.textMuted }]}>{error ?? helper}</Text>
      ) : null}
    </View>
  );
}

export type DSInputProps = {
  kind?: DSInputKind;
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  error?: string;
  helper?: string;
  disabled?: boolean;
  labelBg?: string;
  /** Presentation only: render in the focused state without real focus. */
  forceFocus?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
};

export function DSInput({
  kind = 'text',
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helper,
  disabled,
  labelBg,
  forceFocus,
  keyboardType,
  autoCapitalize,
}: DSInputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isFocused = focused || !!forceFocus;
  const multiline = kind === 'textarea';
  const iconColor = isFocused ? primary[600] : colors.textMuted;

  const left = kind === 'search' ? <IconSearch size={18} color={iconColor} style={{ marginRight: 8 }} /> : undefined;
  const right =
    kind === 'password' ? (
      <Pressable hitSlop={10} onPress={() => setHidden((h) => !h)} accessibilityLabel="Toggle password visibility">
        {hidden ? <IconEyeOff size={20} color={iconColor} /> : <IconEye size={20} color={iconColor} />}
      </Pressable>
    ) : kind === 'search' && value ? (
      <Pressable hitSlop={10} onPress={() => onChangeText('')} accessibilityLabel="Clear">
        <IconX size={18} color={iconColor} />
      </Pressable>
    ) : undefined;

  return (
    <FieldShell
      label={kind === 'search' ? undefined : label}
      focused={isFocused}
      filled={value.length > 0}
      error={error}
      helper={helper}
      disabled={disabled}
      multiline={multiline}
      left={left}
      right={right}
      labelBg={labelBg}
    >
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={!disabled}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        secureTextEntry={kind === 'password' && hidden}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? (kind === 'password' ? 'none' : undefined)}
        placeholder={kind === 'search' ? (placeholder ?? label) : isFocused ? placeholder : undefined}
        placeholderTextColor={colors.textFaint}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          { color: colors.textPrimary, fontFamily: f.regular },
          multiline && { minHeight: 96, textAlignVertical: 'top', paddingTop: 14 },
          // react-native-web draws a default focus outline we replace with the border.
          { outlineStyle: 'none' } as object,
        ]}
      />
    </FieldShell>
  );
}

export type DropdownOption = { value: string; label: string; prefix?: string };

export function DSDropdown({
  label,
  options,
  value,
  onChange,
  error,
  disabled,
  labelBg,
}: {
  label?: string;
  options: DropdownOption[];
  value: string | null;
  onChange: (v: string) => void;
  error?: string;
  disabled?: boolean;
  labelBg?: string;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const chevron = useSharedValue(0);
  useEffect(() => {
    chevron.value = withTiming(open ? 1 : 0, { duration: 180 });
  }, [open, chevron]);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(chevron.value, [0, 1], [0, 180])}deg` }],
  }));

  return (
    <View style={{ zIndex: open ? 50 : 0 }}>
      <FieldShell
        label={label}
        focused={open}
        filled={!!selected}
        error={error}
        disabled={disabled}
        labelBg={labelBg}
        onPress={() => setOpen((o) => !o)}
        right={
          <Animated.View style={chevronStyle}>
            <IconChevronDown size={20} color={open ? primary[600] : colors.textMuted} />
          </Animated.View>
        }
      >
        <Text numberOfLines={1} style={[styles.input, { color: colors.textPrimary, fontFamily: f.regular }]}>
          {selected?.label ?? ''}
        </Text>
      </FieldShell>
      {open ? (
        <Animated.View
          entering={FadeInDown.duration(160)}
          exiting={FadeOutUp.duration(120)}
          style={[styles.menu, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <Pressable
                key={o.value}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.option,
                  { backgroundColor: active || pressed ? colors.primaryTint : 'transparent' },
                ]}
              >
                <Text
                  style={{
                    fontFamily: active ? f.semibold : f.regular,
                    fontSize: 15,
                    color: active ? primary[600] : colors.textPrimary,
                  }}
                >
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>
      ) : null}
    </View>
  );
}

export const COUNTRIES: DropdownOption[] = [
  { value: 'IN', label: 'India (+91)', prefix: '+91' },
  { value: 'US', label: 'United States (+1)', prefix: '+1' },
  { value: 'GB', label: 'United Kingdom (+44)', prefix: '+44' },
  { value: 'AE', label: 'UAE (+971)', prefix: '+971' },
];

export function DSPhoneInput({
  label = 'Phone number',
  country,
  onCountryChange,
  value,
  onChangeText,
  error,
  disabled,
  labelBg,
  forceFocus,
}: {
  label?: string;
  country: string;
  onCountryChange: (c: string) => void;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  disabled?: boolean;
  labelBg?: string;
  forceFocus?: boolean;
}) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [picking, setPicking] = useState(false);
  const isFocused = focused || picking || !!forceFocus;
  const current = COUNTRIES.find((c) => c.value === country) ?? COUNTRIES[0];

  return (
    <View style={{ zIndex: picking ? 50 : 0 }}>
      <FieldShell
        label={label}
        focused={isFocused}
        filled={value.length > 0}
        error={error}
        disabled={disabled}
        labelBg={labelBg}
        left={
          <Pressable
            onPress={() => setPicking((p) => !p)}
            disabled={disabled}
            hitSlop={6}
            style={[styles.code, { borderRightColor: colors.borderDefault }]}
            accessibilityLabel="Select country code"
          >
            <Text style={{ fontFamily: f.medium, fontSize: 15, color: colors.textPrimary }}>{current.prefix}</Text>
            <IconChevronDown size={16} color={colors.textMuted} />
          </Pressable>
        }
      >
        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/[^0-9]/g, ''))}
          editable={!disabled}
          keyboardType="phone-pad"
          maxLength={12}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={isFocused ? '98765 43210' : undefined}
          placeholderTextColor={colors.textFaint}
          style={[
            styles.input,
            { color: colors.textPrimary, fontFamily: f.regular },
            { outlineStyle: 'none' } as object,
          ]}
        />
      </FieldShell>
      {picking ? (
        <Animated.View
          entering={FadeInDown.duration(160)}
          exiting={FadeOutUp.duration(120)}
          style={[styles.menu, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}
        >
          {COUNTRIES.map((c) => (
            <Pressable
              key={c.value}
              onPress={() => {
                onCountryChange(c.value);
                setPicking(false);
              }}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: c.value === country || pressed ? colors.primaryTint : 'transparent' },
              ]}
            >
              <Text style={{ fontFamily: f.regular, fontSize: 15, color: colors.textPrimary }}>{c.label}</Text>
            </Pressable>
          ))}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderWidth: 1,
    borderRadius: radii.full,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shellMulti: { borderRadius: radii.textarea, minHeight: 120, alignItems: 'flex-start', paddingVertical: 0 },
  label: {
    position: 'absolute',
    left: 14,
    top: 0,
    paddingHorizontal: 4,
    lineHeight: 18,
  },
  input: { fontSize: 15, lineHeight: 20, paddingVertical: 0, margin: 0, padding: 0 },
  helper: { fontFamily: f.regular, fontSize: 12, marginTop: 6, marginLeft: 16 },
  menu: {
    position: 'absolute',
    top: HEIGHT + 4,
    left: 0,
    right: 0,
    zIndex: 50,
    elevation: 8,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  option: { paddingHorizontal: 18, paddingVertical: 12 },
  code: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
    marginRight: 12,
    height: 24,
    borderRightWidth: 1,
  },
});
