import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { EmptyState, Header, Icon, ListRow, SkeletonList, useToast } from '../../src/components/ui';
import { usePalette } from '../../src/theme/usePalette';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../context/ThemeContext';
import type { DashboardScreenProps } from '../../navigation/types';
import type { Enums } from '../../lib/database.types';
import { appLocale } from '../../lib/format';

type NotificationRow = {
  id: string;
  sent_at: string | null;
  status: Enums<'notification_status'>;
  type: Enums<'notification_type'>;
  customers: { name: string } | null;
};

function relativeTime(dateString: string | null, t: TFunction<'dashboard'>): string {
  if (!dateString) return '';
  const then = new Date(dateString).getTime();
  const diffMs = Date.now() - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return t('notifications.justNow');
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t('notifications.minutesAgo', { count: diffMin });
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return t('notifications.hoursAgo', { count: diffHr });
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return t('notifications.daysAgo', { count: diffDay });
  return new Date(dateString).toLocaleDateString(appLocale(), { day: '2-digit', month: 'short' });
}

export default function NotificationsScreen({ navigation }: DashboardScreenProps<'Notifications'>) {
  const showToast = useToast();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const palette = usePalette();
  const { t } = useTranslation('dashboard');
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notifications_log')
        .select('id, sent_at, status, type, customers(name)')
        .order('sent_at', { ascending: false })
        .order('id', { ascending: false });
      if (error) throw error;
      setItems(data ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('notifications.errorLoad'), 'error');
    }
  }, [showToast, t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load().finally(() => setLoading(false));
    }, [load])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const meta = (type: Enums<'notification_type'>) =>
    type === 'payment_due'
      ? { icon: 'rupee', bg: palette.warningLight, fg: palette.warning }
      : type === 'order_ready'
      ? { icon: 'circleCheck', bg: palette.successLight, fg: palette.success }
      : { icon: 'bell', bg: palette.surfaceSubtle, fg: colors.primary };

  if (loading && items.length === 0) {
    return (
      <View className="flex-1 bg-bg">
        <Header title={t('notifications.title')} onBack={() => navigation.goBack()} />
        <SkeletonList count={6} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <Header title={t('notifications.title')} onBack={() => navigation.goBack()} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={items.length === 0 ? { flexGrow: 1 } : { paddingBottom: insets.bottom + 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <EmptyState icon="bell" title={t('notifications.emptyTitle')} description={t('notifications.emptyDescription')} />
        }
        renderItem={({ item }) => {
          const m = meta(item.type);
          return (
            <ListRow
              title={`${t(`notifications.types.${item.type}`)} · ${item.customers?.name ?? t('notifications.customer')}`}
              subtitle={`${relativeTime(item.sent_at, t)}${item.status !== 'sent' ? ` · ${item.status}` : ''}`}
              leading={
                <View className="h-10 w-10 items-center justify-center rounded" style={{ backgroundColor: m.bg }}>
                  <Icon name={m.icon} size={20} color={m.fg} />
                </View>
              }
            />
          );
        }}
      />
    </View>
  );
}
