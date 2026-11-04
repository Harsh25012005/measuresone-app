import { ActivityIndicator, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePalette } from '../../theme/usePalette';
import { Icon } from './Icon';
import { Text } from './Text';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export type SyncChipProps = {
  status: SyncStatus;
  /** Local changes not yet uploaded. Shown as "N pending" when offline, syncing or failed. */
  pending?: number;
  onPress?: () => void;
  testID?: string;
};

/** Header chip: synced / syncing / offline + pending count / sync failed. Radius 2. */
export function SyncChip({ status, pending = 0, onPress, testID }: SyncChipProps) {
  const { t } = useTranslation('common');
  const palette = usePalette();

  const cfg = {
    synced: { icon: 'check', fg: palette.success, bg: palette.successLight },
    syncing: { icon: 'refresh', fg: palette.primaryDark, bg: palette.primaryLight },
    offline: { icon: 'cloudOff', fg: palette.warning, bg: palette.warningLight },
    error: { icon: 'alert', fg: palette.danger, bg: palette.dangerLight },
  }[status];

  const label = t(`sync.${status}`);
  const detail = pending > 0 && status !== 'synced' ? t('sync.pending', { count: pending }) : null;
  const a11y = detail ? `${label}, ${detail}` : label;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={a11y}
      accessibilityLiveRegion="polite"
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      testID={testID}
      className="h-8 flex-row items-center self-start rounded-sm px-2"
      style={{ backgroundColor: cfg.bg }}
    >
      {status === 'syncing' ? (
        <ActivityIndicator size="small" color={cfg.fg} style={{ transform: [{ scale: 0.7 }] }} />
      ) : (
        <Icon name={cfg.icon} size={14} color={cfg.fg} strokeWidth={2.25} />
      )}
      <Text variant="caption" className="ml-1" style={{ color: cfg.fg }}>
        {label}
      </Text>
      {detail ? (
        <View className="ml-1.5 border-l pl-1.5" style={{ borderColor: cfg.fg }}>
          <Text variant="caption" tabular style={{ color: cfg.fg }}>
            {detail}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
