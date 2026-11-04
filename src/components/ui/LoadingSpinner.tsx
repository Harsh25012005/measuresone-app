import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/ThemeContext';
import { Text } from './Text';

export type LoadingSpinnerProps = {
  text?: string;
  fullScreen?: boolean;
  size?: 'small' | 'large';
};

/** Last resort for short waits; prefer `Skeleton` for lists and detail screens. */
export function LoadingSpinner({ text, fullScreen = false, size = 'large' }: LoadingSpinnerProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={text ?? t('a11y.loading')}
      className={fullScreen ? 'flex-1 items-center justify-center bg-bg' : 'items-center justify-center py-6'}
    >
      <ActivityIndicator size={size} color={colors.primary} />
      {text ? (
        <Text variant="label" tone="muted" weight="regular" className="mt-2">
          {text}
        </Text>
      ) : null}
    </View>
  );
}
