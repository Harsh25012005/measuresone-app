import { forwardRef, useState, type ReactNode } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import type { KeyboardTypeOptions, ReturnKeyTypeOptions, TextInputProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/ThemeContext';
import { usePalette } from '../../theme/usePalette';
import { fontFamilyFor, typeScale } from '../../theme/tokens';
import { Icon } from './Icon';
import { Text } from './Text';

export type InputFieldProps = {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  secureTextEntry?: boolean;
  leftIcon?: string;
  prefix?: string;
  suffix?: string;
  rightElement?: ReactNode;
  keyboardType?: KeyboardTypeOptions;
  /** Use 'next' to chain fields (pair with `onSubmitEditing` + a ref), 'done' on the last one. */
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  onBlur?: () => void;
  onFocus?: () => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: TextInputProps['autoComplete'];
  maxLength?: number;
  selectTextOnFocus?: boolean;
  editable?: boolean;
  multiline?: boolean;
  required?: boolean;
  optional?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  /** Screen-reader name when there is no visible `label` (e.g. a field inside a labelled row). */
  accessibilityLabel?: string;
  /** No bottom margin, for fields laid out in a row or a table. */
  compact?: boolean;
  testID?: string;
};

/**
 * 48dp field (40dp `sm`), radius 3, 1px border; focus and error use a 2px
 * border (padding is adjusted so the content never shifts). The ref points at
 * the TextInput so forms can focus the next field on submit.
 */
export const InputField = forwardRef<TextInput, InputFieldProps>(function InputField(
  {
    label,
    value,
    onChangeText,
    placeholder,
    error,
    helperText,
    secureTextEntry = false,
    leftIcon,
    prefix,
    suffix,
    rightElement,
    keyboardType = 'default',
    returnKeyType,
    onSubmitEditing,
    onBlur,
    onFocus,
    autoCapitalize = 'sentences',
    autoComplete,
    maxLength,
    selectTextOnFocus = false,
    editable = true,
    multiline = false,
    required = false,
    optional = false,
    size = 'md',
    className = '',
    accessibilityLabel,
    compact = false,
    testID,
  },
  ref,
) {
  const [isFocused, setIsFocused] = useState(false);
  const [hidden, setHidden] = useState(secureTextEntry);
  const { colors } = useTheme();
  const palette = usePalette();
  const { t, i18n } = useTranslation('common');

  const emphasised = isFocused || !!error;
  const borderClass = error ? 'border-danger' : isFocused ? 'border-primary' : 'border-line';
  const bgClass = editable ? 'bg-surface' : 'bg-surface-2';
  const heightClass = multiline ? 'min-h-[96px] items-start py-3' : size === 'sm' ? 'h-10' : 'h-12';

  return (
    <View className={`w-full ${compact ? '' : 'mb-4'} ${className}`}>
      {label ? (
        <Text variant="label" className="mb-1.5">
          {label}
          {required ? <Text variant="label" tone="danger"> *</Text> : null}
          {optional ? (
            <Text variant="label" tone="muted" weight="regular">
              {' '}({t('fields.optional')})
            </Text>
          ) : null}
        </Text>
      ) : null}

      <View
        className={`flex-row items-center rounded-md ${borderClass} ${bgClass} ${heightClass}`}
        style={{ borderWidth: emphasised ? 2 : 1, paddingHorizontal: emphasised ? 11 : 12 }}
      >
        {prefix ? (
          <View className="mr-2 pr-2 border-r border-line">
            <Text variant="label" tone="muted">{prefix}</Text>
          </View>
        ) : null}

        {leftIcon ? (
          <View className="mr-2">
            <Icon name={leftIcon} size={18} color={error ? palette.danger : colors.textMuted} />
          </View>
        ) : null}

        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          blurOnSubmit={returnKeyType !== 'next'}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          maxLength={maxLength}
          selectTextOnFocus={selectTextOnFocus}
          editable={editable}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={() => {
            setIsFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          accessibilityLabel={label ?? accessibilityLabel}
          accessibilityHint={error}
          testID={testID}
          className="flex-1 text-ink p-0"
          style={{ fontFamily: fontFamilyFor(i18n?.language ?? 'en', 'regular'), fontSize: typeScale.base }}
        />

        {suffix ? (
          <View className="ml-2">
            <Text variant="label" tone="muted">{suffix}</Text>
          </View>
        ) : null}

        {secureTextEntry ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? t('a11y.showPassword') : t('a11y.hidePassword')}
            className="ml-2 h-8 w-8 items-center justify-center"
          >
            <Icon name={hidden ? 'eye' : 'eyeOff'} size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}

        {rightElement ? <View className="ml-2">{rightElement}</View> : null}
      </View>

      {error ? (
        <View className="mt-1.5 flex-row items-center">
          <Icon name="alert" size={14} color={palette.danger} />
          <Text variant="caption" tone="danger" className="ml-1 flex-1" accessibilityLiveRegion="polite">
            {error}
          </Text>
        </View>
      ) : helperText ? (
        <Text variant="caption" tone="muted" weight="regular" className="mt-1.5">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
});
