import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { DSEmptyState } from '../../components/ds/EmptyState';
import { DSSkeletonList } from '../../components/ds/Loading';
import { DSScreen } from '../../components/ds/Screen';
import { IconBell, IconCheck, IconCurrencyRupee, type TablerIcon } from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { status, typography } from '../../constants/tokens';
import type { DashboardScreenProps } from '../../navigation/types';
import type { Enums } from '../../lib/database.types';

const f = typography.family;

type NotificationRow = {
  id: string;
  sent_at: string | null;
  status: Enums<'notification_status'>;
  type: Enums<'notification_type'>;
  customers: { name: string } | null;
};

const TYPE_META: Record<Enums<'notification_type'>, { icon: TablerIcon; light: string; dark: string; fg: string }> = {
  order_ready: { icon: IconCheck, light: status.success[100], dark: '#0F2E1C', fg: status.success[600] },
  payment_due: { icon: IconCurrencyRupee, light: status.warning[100], dark: '#33240A', fg: status.warning[600] },
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
  return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export default function NotificationsScreen({ navigation }: DashboardScreenProps<'Notifications'>) {
  const showToast = useToast();
  const { t } = useTranslation('dashboard');
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
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
  }, [showToast]);

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

  return (
    <DSScreen title={t('notifications.title')} onBack={() => navigation.goBack()}>
      {loading ? (
        <View style={{ padding: 20 }}>
          <DSSkeletonList rows={5} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={items.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : { padding: 20, paddingBottom: 140, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2563EB" />}
          ListEmptyComponent={
            <DSEmptyState icon={IconBell} title={t('notifications.emptyTitle')} description={t('notifications.emptyDescription')} />
          }
          renderItem={({ item, index }) => {
            const meta = TYPE_META[item.type];
            const Icon = meta.icon;
            return (
              <Animated.View
                entering={FadeInDown.delay(Math.min(index, 8) * 45).duration(280)}
                style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: dark ? '#262626' : colors.borderDefault }]}
              >
                <View style={[styles.icon, { backgroundColor: dark ? meta.dark : meta.light }]}>
                  <Icon size={20} color={meta.fg} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: f.semibold, fontSize: 15, color: colors.textPrimary }} numberOfLines={2}>
                    {t(`notifications.types.${item.type}`)} · {item.customers?.name ?? t('notifications.customer')}
                  </Text>
                  <Text style={{ fontFamily: f.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                    {relativeTime(item.sent_at, t)}
                    {item.status !== 'sent' ? ` · ${item.status}` : ''}
                  </Text>
                </View>
              </Animated.View>
            );
          }}
        />
      )}
    </DSScreen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 24, borderWidth: 1 },
  icon: { width: 44, height: 44, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
});
