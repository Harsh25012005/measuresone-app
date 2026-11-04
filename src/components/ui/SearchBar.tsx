import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/ThemeContext';
import { fontFamilyFor, typeScale } from '../../theme/tokens';
import { IconButton } from './IconButton';
import { Icon } from './Icon';

export type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  className?: string;
  onFilterPress?: () => void;
  hasActiveFilter?: boolean;
  onMicPress?: () => void;
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
  testID?: string;
};

/** 48dp search field (radius 3) with clear, optional mic and filter buttons. */
export function SearchBar({
  value,
  onChangeText,
  placeholder,
  className = '',
  onFilterPress,
  hasActiveFilter = false,
  onMicPress,
  onSubmitEditing,
  autoFocus = false,
  testID,
}: SearchBarProps) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation('common');
  const [focused, setFocused] = useState(false);

  return (
    <View className={`flex-row items-center gap-2 ${className}`}>
      <View
        className={`h-12 flex-1 flex-row items-center rounded-md bg-surface ${focused ? 'border-primary' : 'border-line'}`}
        style={{ borderWidth: focused ? 2 : 1, paddingLeft: focused ? 11 : 12 }}
      >
        <View className="mr-2">
          <Icon name="search" size={20} color={colors.textMuted} />
        </View>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={onSubmitEditing}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={placeholder ?? t('actions.search')}
          testID={testID}
          className="flex-1 p-0 text-ink"
          style={{ fontFamily: fontFamilyFor(i18n?.language ?? 'en', 'regular'), fontSize: typeScale.base }}
        />

        {value.length > 0 ? (
          <Pressable
            onPress={() => onChangeText('')}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.clear')}
            className="h-11 w-11 items-center justify-center"
          >
            <Icon name="x" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}

        {onMicPress ? (
          <Pressable
            onPress={onMicPress}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.voiceSearch')}
            className="h-11 w-11 items-center justify-center"
          >
            <Icon name="mic" size={20} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>

      {onFilterPress ? (
        <View>
          <IconButton
            icon="sliders"
            onPress={onFilterPress}
            accessibilityLabel={t('a11y.filter')}
            selected={hasActiveFilter}
          />
          {hasActiveFilter ? <View className="absolute right-2 top-2 h-2 w-2 rounded-dot bg-primary" /> : null}
        </View>
      ) : null}
    </View>
  );
}
