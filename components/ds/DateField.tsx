import { useState } from 'react';
import { Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { primary, typography } from '../../constants/tokens';
import { DSBottomSheet } from './BottomSheet';
import { DSCalendar } from './Calendar';
import { FieldShell } from './Input';
import { IconCalendarEvent } from './icons';

const f = typography.family;

const format = (d: Date) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

/** Date field: shows the chosen day and opens the calendar in a bottom sheet. */
export function DSDateField({
  label,
  value,
  onChange,
  minimumDate,
  confirmLabel = 'Confirm',
  error,
}: {
  label: string;
  value: Date | null;
  onChange: (d: Date) => void;
  minimumDate?: Date;
  confirmLabel?: string;
  error?: string;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date | null>(value);

  return (
    <>
      <FieldShell
        label={label}
        focused={open}
        filled={!!value}
        error={error}
        onPress={() => {
          setDraft(value);
          setOpen(true);
        }}
        right={<IconCalendarEvent size={20} color={open ? primary[600] : colors.textMuted} />}
      >
        <Text numberOfLines={1} style={{ fontFamily: f.regular, fontSize: 15, lineHeight: 20, color: colors.textPrimary }}>
          {value ? format(value) : ''}
        </Text>
      </FieldShell>

      <DSBottomSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        actionLabel={confirmLabel}
        onAction={() => {
          if (draft) onChange(draft);
          setOpen(false);
        }}
      >
        <DSCalendar value={draft} onChange={setDraft} minDate={minimumDate} />
      </DSBottomSheet>
    </>
  );
}
