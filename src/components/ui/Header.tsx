import { View } from 'react-native';
import type { ReactNode } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { SearchBar, type SearchBarProps } from './SearchBar';
import { IconButton } from './IconButton';
import { Text } from './Text';

export type HeaderProps = {
  title: string;
  showBack?: boolean;
  backText?: string;
  right?: ReactNode;
  onBack?: () => void;
  searchProps?: SearchBarProps;
  subtitle?: string;
};

/** Surface header with a 1px bottom border. Back button is a 48dp icon button. */
export function Header({ title, showBack = true, right, onBack, searchProps, subtitle }: HeaderProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('common');

  return (
    <View style={{ paddingTop: insets.top + 4 }} className="border-b border-line-2 bg-surface px-4 pb-2">
      <View className="min-h-touch flex-row items-center">
        {showBack ? (
          <IconButton
            icon="back"
            onPress={onBack ?? (() => navigation.goBack())}
            accessibilityLabel={t('actions.back')}
            variant="ghost"
            className="-ml-2 mr-1"
          />
        ) : null}

        <View className="flex-1 justify-center">
          <Text variant="title" numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" tone="muted" weight="regular" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {right ? <View className="ml-2 flex-row items-center gap-1">{right}</View> : null}
      </View>

      {searchProps ? (
        <View className="mt-2">
          <SearchBar {...searchProps} />
        </View>
      ) : null}
    </View>
  );
}
