import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable } from './Pressable';
import { useTheme } from '../../context/ThemeContext';
import { primary, typography } from '../../constants/tokens';
import { DSBottomSheet } from './BottomSheet';
import { DSButton } from './Button';
import { FieldShell, DSInput } from './Input';
import { IconCheck, IconChevronDown, IconPlus } from './icons';

const f = typography.family;

export type DSSelectOption = { label: string; value: string };

/**
 * Field that opens a bottom sheet to pick from a (searchable) list. Better than
 * an inline dropdown for long lists such as clients.
 */
export function DSSelect({
  label,
  value,
  onChange,
  options,
  error,
  searchable,
  searchPlaceholder,
  onAddNew,
  addNewLabel,
  emptyText,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: DSSelectOption[];
  error?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  onAddNew?: () => void;
  addNewLabel?: string;
  emptyText?: string;
}) {
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const selected = options.find((o) => o.value === value);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => o.label.toLowerCase().includes(s)) : options;
  }, [options, q]);

  const close = () => {
    setOpen(false);
    setQ('');
  };

  return (
    <>
      <FieldShell
        label={label}
        focused={open}
        filled={!!selected}
        error={error}
        onPress={() => setOpen(true)}
        right={<IconChevronDown size={20} color={open ? primary[600] : colors.textMuted} />}
      >
        <Text numberOfLines={1} style={{ fontFamily: f.regular, fontSize: 15, lineHeight: 20, color: colors.textPrimary }}>
          {selected?.label ?? ''}
        </Text>
      </FieldShell>

      <DSBottomSheet visible={open} onClose={close} title={label}>
        <View style={{ gap: 12, paddingTop: 12, paddingBottom: 8 }}>
          {searchable ? (
            <DSInput kind="search" label={searchPlaceholder} placeholder={searchPlaceholder} value={q} onChangeText={setQ} labelBg={colors.bgSurface} />
          ) : null}

          {shown.length === 0 ? (
            <Text style={{ fontFamily: f.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingVertical: 16 }}>
              {emptyText ?? '—'}
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {shown.map((o) => {
                const active = o.value === value;
                return (
                  <Pressable
                    key={o.value}
                    onPress={() => {
                      onChange(o.value);
                      close();
                    }}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.row,
                      {
                        backgroundColor: active || pressed ? colors.primaryTint : colors.bgSubtle,
                        borderColor: active ? primary[600] : dark ? '#262626' : colors.borderSubtle,
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={{ flex: 1, fontFamily: active ? f.semibold : f.medium, fontSize: 15, color: active ? primary[600] : colors.textPrimary }}
                    >
                      {o.label}
                    </Text>
                    {active ? <IconCheck size={18} color={primary[600]} strokeWidth={2.4} /> : null}
                  </Pressable>
                );
              })}
            </View>
          )}

          {onAddNew ? (
            <DSButton
              title={(addNewLabel ?? '').replace(/^\+\s*/, '') || 'Add'}
              variant="line"
              size="rg"
              leftIcon={IconPlus}
              onPress={() => {
                close();
                onAddNew();
              }}
            />
          ) : null}
        </View>
      </DSBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 50, paddingHorizontal: 18, borderRadius: 9999, borderWidth: 1 },
});
