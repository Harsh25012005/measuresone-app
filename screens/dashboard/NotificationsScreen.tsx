import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { DSEmptyState } from '../../components/ds/EmptyState';
import { DSNotificationList } from '../../components/ds/Lists';
import { DSSkeletonList } from '../../components/ds/Loading';
import { DSScreen } from '../../components/ds/Screen';
import { IconAlertTriangle, IconBell, IconCalendarEvent, IconCheck, IconCurrencyRupee, IconTruckDelivery, type TablerIcon } from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { buildAlerts, type AlertKind, type AppAlert } from '../../lib/alerts';
import { useShop } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../lib/format';
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

/** Icon and colours per reminder kind, with a dark-mode background for each. */
const ALERT_META: Record<AlertKind, { icon: TablerIcon; light: string; dark: string; fg: string }> = {
  overdue: { icon: IconAlertTriangle, light: status.danger[100], dark: '#3A1414', fg: status.danger[600] },
  today: { icon: IconTruckDelivery, light: status.warning[100], dark: '#33240A', fg: status.warning[600] },
  tomorrow: { icon: IconCalendarEvent, light: '#DBEAFE', dark: '#172554', fg: '#2563EB' },
  soon: { icon: IconCalendarEvent, light: '#DBEAFE', dark: '#172554', fg: '#2563EB' },
  payment: { icon: IconCurrencyRupee, light: status.success[100], dark: '#0F2E1C', fg: status.success[600] },
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
  const shop = useShop();
  const { t } = useTranslation('dashboard');
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      // Reminders come from the local orders/bills, so they show even when offline.
      const [{ data, error }, built] = await Promise.all([
        supabase
        .from('notifications_log')
        .select('id, sent_at, status, type, customers(name)')
        .order('sent_at', { ascending: false })
        .order('id', { ascending: false }),
        buildAlerts(shop.id),
      ]);
      setAlerts(built);
      if (error) throw error;
      setItems(data ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('notifications.errorLoad'), 'error');
    }
  }, [showToast, shop.id]);

  useFocusEffect(
    useCallback(() => {
      void load().finally(() => setLoading(false));
    }, [load])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const reminderItems = alerts.map((a) => {
    const meta = ALERT_META[a.kind];
    const who = a.customerName || t('notifications.customer');
    const title =
      a.kind === 'overdue'
        ? t('notifications.alerts.overdueTitle')
        : a.kind === 'today'
          ? t('notifications.alerts.todayTitle')
          : a.kind === 'tomorrow'
            ? t('notifications.alerts.tomorrowTitle')
            : a.kind === 'soon'
              ? t('notifications.alerts.soonTitle', { count: a.days })
              : t('notifications.alerts.paymentTitle');
    const order = [`#${a.orderNumber}`, a.garment && a.pieces > 0 ? `${a.garment} ×${a.pieces}` : ''].filter(Boolean).join(' · ');
    const detail =
      a.kind === 'overdue'
        ? `${t('notifications.alerts.dueOn', { date: formatDate(a.deliveryDate) })} · ${t('notifications.alerts.daysLate', { count: a.days })}`
        : a.kind === 'payment'
          ? t('notifications.alerts.paymentMeta', { amount: formatCurrency(a.amount), number: a.orderNumber })
          : formatDate(a.deliveryDate);
    return {
      id: a.id,
      icon: meta.icon,
      bg: dark ? meta.dark : meta.light,
      fg: meta.fg,
      title: `${title} · ${who}`,
      meta: a.kind === 'payment' ? detail : `${order} · ${detail}`,
    };
  });

  const sentItems = items.map((item) => {
    const meta = TYPE_META[item.type];
    return {
      id: item.id,
      icon: meta.icon,
      bg: dark ? meta.dark : meta.light,
      fg: meta.fg,
      title: t('notifications.types.' + item.type) + ' · ' + (item.customers?.name ?? t('notifications.customer')),
      meta: relativeTime(item.sent_at, t),
      badge: item.status !== 'sent' ? item.status : undefined,
    };
  });

  const sectionTitle = (text: string) => (
    <Text style={{ fontFamily: f.bold, fontSize: 18, color: colors.textPrimary, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 }}>{text}</Text>
  );

  const nothing = reminderItems.length === 0 && sentItems.length === 0;

  return (
    <DSScreen title={t('notifications.title')} onBack={() => navigation.goBack()}>
      {loading ? (
        <View style={{ padding: 20 }}>
          <DSSkeletonList rows={7} />
        </View>
      ) : nothing ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2563EB" />}
        >
          <DSEmptyState icon={IconBell} title={t('notifications.emptyTitle')} description={t('notifications.emptyDescription')} />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2563EB" />}
        >
          {reminderItems.length > 0 ? (
            <>
              {sectionTitle(t('notifications.alerts.sectionReminders'))}
              <DSNotificationList
                edge
                items={reminderItems}
                onPressItem={(n) => {
                  const alert = alerts.find((x) => x.id === n.id);
                  if (alert) navigation.navigate('OrderDetail', { orderId: alert.orderId });
                }}
              />
            </>
          ) : null}
          {sentItems.length > 0 ? (
            <>
              {sectionTitle(t('notifications.alerts.sectionSent'))}
              <DSNotificationList edge items={sentItems} />
            </>
          ) : null}
        </ScrollView>
      )}
    </DSScreen>
  );
}
