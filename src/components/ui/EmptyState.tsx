import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';
import { useTheme } from '../../../context/ThemeContext';

export type EmptyStateProps = {
  icon?: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'full' | 'compact';
};

/** Icon, a title, one line of help and at most one primary action. */
export function EmptyState({
  icon = 'box',
  title,
  description,
  actionLabel,
  onAction,
  variant = 'full',
}: EmptyStateProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const compact = variant === 'compact';

  return (
    <View
      accessible
      className={
        compact
          ? 'items-center justify-center rounded border border-dashed border-line bg-surface px-4 py-6'
          : 'flex-1 items-center justify-center px-6 py-10'
      }
    >
      <View className={`items-center justify-center rounded bg-primary-50 ${compact ? 'mb-3 h-10 w-10' : 'mb-4 h-14 w-14'}`}>
        <Icon name={icon} size={compact ? 20 : 28} color={colors.primary} />
      </View>

      <Text variant={compact ? 'bodyLg' : 'title'} className="mb-1 text-center">
        {title ?? t('empty.title', { defaultValue: 'Nothing here yet' })}
      </Text>

      {description ? (
        <Text variant="body" tone="muted" className="mb-4 max-w-[300px] text-center">
          {description}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} size={compact ? 'sm' : 'md'} fullWidth={false} className="px-6" />
      ) : null}
    </View>
  );
}
