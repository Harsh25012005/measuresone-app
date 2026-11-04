import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePalette } from '../../theme/usePalette';
import { Icon } from './Icon';
import { Text } from './Text';

export type FilterNoticeProps = {
  visible: boolean;
  label: string;
  onClear: () => void;
};

/** Warning-tint strip telling the user a filter is hiding rows, with a Clear action. */
export function FilterNotice({ visible, label, onClear }: FilterNoticeProps) {
  const { t } = useTranslation('common');
  const palette = usePalette();
  if (!visible) return null;

  return (
    <View className="mb-2 min-h-touch flex-row items-center rounded border border-line bg-accent-50 pl-3">
      <Icon name="filter" size={16} color={palette.warning} />
      <Text variant="label" tone="warning" className="ml-2 flex-1 py-2" numberOfLines={2}>
        {label}
      </Text>
      <Pressable
        onPress={onClear}
        accessibilityRole="button"
        accessibilityLabel={t('filters.clear', { defaultValue: 'Clear' })}
        className="min-h-touch min-w-touch items-center justify-center px-3 active:bg-surface-2"
      >
        <Text variant="label" tone="warning" weight="bold">
          {t('filters.clear', { defaultValue: 'Clear' })}
        </Text>
      </Pressable>
    </View>
  );
}
