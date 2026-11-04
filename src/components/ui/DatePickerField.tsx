import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/ThemeContext';
import { usePalette } from '../../theme/usePalette';
import { focusRing, useFocus } from '../../theme/useFocus';
import { Chip } from './Chip';
import { Icon } from './Icon';
import { Text } from './Text';
import { appLocale } from '../../../lib/format';

export type DatePickerFieldProps = {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: string;
  placeholder?: string;
  quickChips?: Array<{ label: string; daysFromNow: number }>;
  className?: string;
  testID?: string;
};

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** 48dp date trigger with optional quick chips (e.g. +3, +7, +10 days). */
export function DatePickerField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  error,
  placeholder,
  quickChips,
  className = '',
  testID,
}: DatePickerFieldProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const palette = usePalette();
  const { focused, handlers } = useFocus();
  const [show, setShow] = useState(false);

  const formatDate = (date: Date): string =>
    date.toLocaleDateString(appLocale(), { day: 'numeric', month: 'short', year: 'numeric' });

  const handleValueChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') setShow(false);
    if (selectedDate) onChange(selectedDate);
  };

  const chipDate = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d;
  };

  const emphasised = !!error || focused;
  const text = value ? formatDate(value) : placeholder ?? t('fields.selectDate', { defaultValue: 'Select date...' });

  return (
    <View className={`mb-4 w-full ${className}`}>
      {label ? (
        <Text variant="label" className="mb-1.5">
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={() => setShow(true)}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}, ${text}` : text}
        accessibilityHint={error}
        testID={testID}
        {...handlers}
        style={[
          { borderWidth: emphasised ? 2 : 1, paddingHorizontal: emphasised ? 11 : 12 },
          focused ? focusRing(colors.primary) : null,
        ]}
        className={`h-12 flex-row items-center justify-between rounded-md bg-surface ${error ? 'border-danger' : focused ? 'border-primary' : 'border-line'}`}
      >
        <Text variant="body" tone={value ? 'default' : 'faint'} tabular>
          {text}
        </Text>
        <Icon name="calendar" size={20} color={colors.textMuted} />
      </Pressable>

      {quickChips && quickChips.length > 0 ? (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {quickChips.map((chip) => {
            const date = chipDate(chip.daysFromNow);
            return (
              <Chip
                key={chip.label}
                label={chip.label}
                selected={value ? sameDay(value, date) : false}
                onPress={() => onChange(date)}
              />
            );
          })}
        </View>
      ) : null}

      {error ? (
        <View className="mt-1.5 flex-row items-center">
          <Icon name="alert" size={14} color={palette.danger} />
          <Text variant="caption" tone="danger" className="ml-1 flex-1" accessibilityLiveRegion="polite">
            {error}
          </Text>
        </View>
      ) : null}

      {show ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleValueChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}
    </View>
  );
}
