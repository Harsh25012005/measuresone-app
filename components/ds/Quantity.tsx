import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Pressable } from './Pressable';
import { useTheme } from '../../context/ThemeContext';
import { primary, typography } from '../../constants/tokens';
import { IconMinus, IconPlus } from './icons';

const f = typography.family;

/**
 * Defined at module level on purpose: declared inside DSQuantity it was a brand-new component type on
 * every keystroke/tap, so React unmounted and remounted both buttons each time the value changed (the lag).
 */
function QtyBtn({ icon: Icon, onPress, disabled, name }: { icon: typeof IconPlus; onPress: () => void; disabled: boolean; name: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: pressed ? primary[600] : colors.primaryTint, opacity: disabled ? 0.4 : 1 },
      ]}
    >
      {({ pressed }: { pressed: boolean }) => <Icon size={18} color={pressed ? '#FFFFFF' : primary[600]} strokeWidth={2.4} />}
    </Pressable>
  );
}

/** Number stepper: round − and + around an editable count. */
export function DSQuantity({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
}: {
  label?: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const clamp = (n: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? Math.floor(n) : min));

  return (
    <View style={{ gap: 8 }}>
      {label ? <Text style={{ fontFamily: f.semibold, fontSize: 13, color: colors.textSecondary }}>{label}</Text> : null}
      <View style={[styles.box, { borderColor: dark ? '#3A3A3A' : '#CCCCCC' }]}>
        <QtyBtn icon={IconMinus} name="Decrease" disabled={value <= min} onPress={() => onChange(clamp(value - 1))} />
        <TextInput
          value={String(value)}
          onChangeText={(t) => onChange(clamp(parseInt(t.replace(/[^0-9]/g, ''), 10)))}
          keyboardType="number-pad"
          selectTextOnFocus
          style={[styles.input, { color: colors.textPrimary }, { outlineStyle: 'none' } as object]}
        />
        <QtyBtn icon={IconPlus} name="Increase" disabled={value >= max} onPress={() => onChange(clamp(value + 1))} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52, borderRadius: 9999, borderWidth: 1, paddingHorizontal: 6 },
  btn: { width: 40, height: 40, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  input: { flex: 1, minWidth: 0, width: 0, textAlign: 'center', fontFamily: f.bold, fontSize: 18, padding: 0 },
});
