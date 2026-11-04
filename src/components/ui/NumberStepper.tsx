import { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/ThemeContext';
import { fontFamilyFor, typeScale } from '../../theme/tokens';
import { haptics } from '../../../lib/haptics';
import { Icon } from './Icon';
import { Text } from './Text';

export type NumberStepperProps = {
  label?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  /** Step for the − / + buttons. Use 0.5 for measurements (half-inch steps). */
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  /** Previous value, shown as "Last: x" so the user can compare while typing. */
  previousValue?: number | null;
  placeholder?: string;
  returnKeyType?: 'next' | 'done';
  onSubmitEditing?: () => void;
  testID?: string;
  className?: string;
};

const REPEAT_DELAY_MS = 350;
const REPEAT_EVERY_MS = 90;

function clamp(n: number, min?: number, max?: number) {
  return Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
}

function round(n: number, step: number) {
  const decimals = String(step).includes('.') ? String(step).split('.')[1].length : 0;
  return Number(n.toFixed(decimals));
}

/**
 * − [ value ] + stepper. Long-press repeats. The centre is a numeric field, so
 * a quantity or measurement can be typed directly; the − / + buttons move by `step`.
 */
export const NumberStepper = ({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  unit,
  previousValue,
  placeholder,
  returnKeyType,
  onSubmitEditing,
  testID,
  className = '',
}: NumberStepperProps) => {
  const { t, i18n } = useTranslation('common');
  const { colors } = useTheme();
  const [text, setText] = useState(value == null ? '' : String(value));
  const valueRef = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval> | null>(null);

  function stopRepeat() {
    if (timer.current) {
      clearTimeout(timer.current as ReturnType<typeof setTimeout>);
      clearInterval(timer.current as ReturnType<typeof setInterval>);
      timer.current = null;
    }
  }

  useEffect(() => {
    valueRef.current = value;
    setText(value == null ? '' : String(value));
  }, [value]);

  useEffect(() => () => stopRepeat(), []);

  const bump = (dir: 1 | -1) => {
    const current = valueRef.current ?? (dir === 1 ? (min ?? 0) - step : (min ?? 0));
    const next = round(clamp(current + dir * step, min, max), step);
    valueRef.current = next;
    onChange(next);
    haptics.tap();
  };

  const startRepeat = (dir: 1 | -1) => {
    stopRepeat();
    timer.current = setTimeout(() => {
      timer.current = setInterval(() => bump(dir), REPEAT_EVERY_MS);
    }, REPEAT_DELAY_MS);
  };

  const commit = () => {
    const cleaned = text.replace(',', '.').trim();
    if (cleaned === '') {
      onChange(null);
      return;
    }
    const n = Number(cleaned);
    if (Number.isNaN(n)) {
      setText(value == null ? '' : String(value));
      return;
    }
    onChange(clamp(n, min, max));
  };

  const stepButton = (dir: 1 | -1, icon: string, a11y: string) => (
    <Pressable
      onPress={() => bump(dir)}
      onLongPress={() => startRepeat(dir)}
      onPressOut={stopRepeat}
      delayLongPress={REPEAT_DELAY_MS}
      accessibilityRole="button"
      accessibilityLabel={label ? `${a11y}, ${label}` : a11y}
      className="h-12 w-12 items-center justify-center rounded border border-line bg-surface active:bg-surface-2"
    >
      <Icon name={icon} size={20} color={colors.textPrimary} />
    </Pressable>
  );

  return (
    <View className={`mb-4 ${className}`}>
      {label ? (
        <Text variant="label" className="mb-1.5">
          {label}
        </Text>
      ) : null}
      <View className="flex-row items-center gap-2">
        {stepButton(-1, 'minus', t('a11y.decrease'))}
        <View className="h-12 min-w-[88px] flex-1 flex-row items-center justify-center rounded-md border border-line bg-surface px-2">
          <TextInput
            value={text}
            onChangeText={setText}
            onBlur={commit}
            onSubmitEditing={() => {
              commit();
              onSubmitEditing?.();
            }}
            keyboardType="decimal-pad"
            returnKeyType={returnKeyType}
            placeholder={placeholder}
            placeholderTextColor={colors.textFaint}
            selectTextOnFocus
            accessibilityLabel={label}
            testID={testID}
            className="min-w-[48px] flex-1 p-0 text-center text-ink"
            style={{
              fontFamily: fontFamilyFor(i18n?.language ?? 'en', 'semibold'),
              fontSize: typeScale.md,
              fontVariant: ['tabular-nums'],
            }}
          />
          {unit ? (
            <Text variant="label" tone="muted" className="ml-1">
              {unit}
            </Text>
          ) : null}
        </View>
        {stepButton(1, 'plus', t('a11y.increase'))}
      </View>
      {previousValue != null ? (
        <Text variant="caption" tone="muted" weight="regular" tabular className="mt-1.5">
          {t('stepper.last', { value: previousValue, defaultValue: `Last: ${previousValue}` })}
        </Text>
      ) : null}
    </View>
  );
};

