import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Button,
  Card,
  Icon,
  IconButton,
  ListRow,
  Skeleton,
  SkeletonList,
  SwipeRow,
  SyncChip,
  Text,
  useToast,
} from '../../src/components/ui';
import { usePalette } from '../../src/theme/usePalette';
import { sendWhatsAppMessage } from '../../lib/whatsapp';
import { getDueInfo } from '../../lib/dueInfo';
import { useSyncStatus } from '../../lib/data/useSyncStatus';
import { ordersRepo, customersRepo, billsRepo, paymentsRepo } from '../../lib/data/repository';
import { formatCurrency, appLocale } from '../../lib/format';
import { haptics } from '../../lib/haptics';
import { useOrderStatusChange } from '../../lib/useOrderStatusChange';
import { hasSeenProductTour, markProductTourSeen } from '../../lib/productTour';
import { useShop } from '../../context/AuthContext';
import { useProductTour } from '../../context/ProductTourContext';
import { useTheme } from '../../context/ThemeContext';
import type { DashboardScreenProps, OrderListFilter } from '../../navigation/types';
import type { OrderListItem } from '../../types';

type DashboardStats = {
  todayCollected: number;
  todayNewOrdersCount: number;
  todayDeliveredCount: number;
  workOrders: OrderListItem[];
  upcomingThisWeek: number;
  readyToGiveCount: number;
  pendingRemindersCount: number;
  totalPendingBalance: number;
  balanceByOrder: Record<string, number>;
};

/** Formats currency with K / L abbreviation matching truefit.html moneyK */
function moneyK(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}k`;
  return `₹${Math.round(amount)}`;
}

/** Local-time day boundaries as ISO strings, plus the plain YYYY-MM-DD date. */
function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const localDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(
    start.getDate()
  ).padStart(2, '0')}`;
  return { localDate };
}

export default function DashboardScreen({ navigation }: DashboardScreenProps<'Dashboard'>) {
  const shop = useShop();
  const insets = useSafeAreaInsets();
  const showToast = useToast();
  const { t } = useTranslation('dashboard');
  const { colors } = useTheme();
  const palette = usePalette();
  const sync = useSyncStatus();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const tour = useProductTour();

  // First visit to the home page after signing up: show the tour once,
  // then never again on this device for this shop.
  useEffect(() => {
    let cancelled = false;
    void hasSeenProductTour(shop.id).then((seen) => {
      if (!seen && !cancelled) {
        void markProductTourSeen(shop.id);
        tour.start();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [shop.id, tour]);

  const load = useCallback(async () => {
    try {
      const { localDate } = todayRange();

      const [allOrders, customers, allBills, allPayments] = await Promise.all([
        ordersRepo.listWithCustomer(shop.id),
        customersRepo.list(shop.id),
        billsRepo.list(shop.id),
        paymentsRepo.listForShop(shop.id),
      ]);

      // 1. Today's collections
      const todayCollected = allPayments.reduce((sum, p) => {
        const day = p.payment_date ? String(p.payment_date).slice(0, 10) : '';
        return day === localDate ? sum + Number(p.amount_paid ?? 0) : sum;
      }, 0);

      // 2. Today's new orders
      const todayNewOrdersCount = allOrders.filter((o) => o.order_date === localDate).length;

      // 3. Today's delivered orders
      const todayDeliveredCount = allOrders.filter(
        (o) =>
          o.status === 'delivered' &&
          (o.updated_at?.slice(0, 10) === localDate ||
            o.delivery_date === localDate ||
            o.order_date === localDate)
      ).length;

      // Active orders (not delivered)
      const activeOrders = allOrders.filter((o) => o.status !== 'delivered');

      // 4. Work queue: active orders due on or before today, sorted by due date then urgency
      const workOrders = activeOrders
        .filter((o) => o.delivery_date && o.delivery_date <= localDate)
        .sort((a, b) => {
          const dateA = a.delivery_date ?? '';
          const dateB = b.delivery_date ?? '';
          if (dateA !== dateB) return dateA.localeCompare(dateB);
          if (a.is_rush !== b.is_rush) return a.is_rush ? -1 : 1;
          return a.order_number.localeCompare(b.order_number);
        });

      // 5. Coming up this week (active orders due in next 7 days after today)
      const nextWeekDate = new Date();
      nextWeekDate.setDate(nextWeekDate.getDate() + 7);
      const nextWeekStr = `${nextWeekDate.getFullYear()}-${String(nextWeekDate.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(nextWeekDate.getDate()).padStart(2, '0')}`;
      const upcomingThisWeek = activeOrders.filter(
        (o) => o.delivery_date && o.delivery_date > localDate && o.delivery_date <= nextWeekStr
      ).length;

      // 6. Ready to give
      const readyToGiveCount = activeOrders.filter((o) => o.status === 'ready').length;

      // 7. Pending reminders count (overdue orders + ready orders)
      const pendingRemindersCount = activeOrders.filter(
        (o) => (o.delivery_date && o.delivery_date < localDate) || o.status === 'ready'
      ).length;

      // 8. Total pending balance to collect across all bills
      const paymentsByBill = new Map<string, number>();
      for (const p of allPayments) {
        paymentsByBill.set(p.bill_id, (paymentsByBill.get(p.bill_id) ?? 0) + Number(p.amount_paid));
      }
      const totalPendingBalance = allBills.reduce((sum, bill) => {
        const paid = paymentsByBill.get(bill.id) ?? 0;
        return sum + Math.max(Number(bill.total_amount ?? 0) - paid, 0);
      }, 0);

      const billByOrder = new Map(allBills.filter((b) => b.order_id).map((b) => [b.order_id as string, b]));
      const balanceByOrder: Record<string, number> = {};
      for (const o of workOrders) {
        const bill = billByOrder.get(o.id);
        const total = bill ? Number(bill.total_amount ?? 0) : Number(o.total_amount ?? 0);
        const paid = bill ? paymentsByBill.get(bill.id) ?? 0 : Number(o.paid_amount ?? 0);
        balanceByOrder[o.id] = Math.max(total - paid, 0);
      }

      setStats({
        todayCollected,
        todayNewOrdersCount,
        todayDeliveredCount,
        workOrders,
        upcomingThisWeek,
        readyToGiveCount,
        pendingRemindersCount,
        totalPendingBalance,
        balanceByOrder,
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('errorLoad'), 'error');
      setStats((prev) =>
        prev ?? {
          todayCollected: 0,
          todayNewOrdersCount: 0,
          todayDeliveredCount: 0,
          workOrders: [],
          upcomingThisWeek: 0,
          readyToGiveCount: 0,
          pendingRemindersCount: 0,
          totalPendingBalance: 0,
          balanceByOrder: {},
        }
      );
    }
  }, [showToast, t, shop.id]);

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

  const { change: handleStatusChange, updatingId } = useOrderStatusChange({
    shopId: shop.id,
    getBalance: (o) => stats?.balanceByOrder[o.id] ?? 0,
    onChanged: load,
  });

  const openOrders = (filter: OrderListFilter) =>
    (navigation as unknown as { navigate: (n: string, p?: object) => void }).navigate('OrdersTab', {
      screen: 'OrderList',
      params: { filter },
    });

  if (loading || !stats) {
    return (
      <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 8 }}>
        <View className="px-4 pb-3">
          <Skeleton width="55%" height={22} />
          <View className="mt-2">
            <Skeleton width="35%" height={14} />
          </View>
        </View>
        <View className="flex-row flex-wrap gap-3 px-4">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="w-[47%] flex-grow">
              <Skeleton height={84} />
            </View>
          ))}
        </View>
        <View className="mt-6">
          <SkeletonList count={4} />
        </View>
      </View>
    );
  }

  const hr = new Date().getHours();
  const greeting = t(hr < 12 ? 'goodMorning' : hr < 17 ? 'goodAfternoon' : 'goodEvening');
  const ownerName = shop.shop_name ? shop.shop_name.split(' ')[0] : t('defaultUser');
  const todayFormatted = new Date().toLocaleDateString(appLocale(), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const today = todayRange().localDate;
  const lateCount = stats.workOrders.filter((o) => (o.delivery_date ?? '') < today).length;
  const dueTodayCount = stats.workOrders.length - lateCount;

  const cards: { key: string; label: string; value: string; tone: 'danger' | 'warning' | 'success' | 'primary'; icon: string; onPress: () => void }[] = [
    { key: 'late', label: t('cards.late'), value: String(lateCount), tone: 'danger', icon: 'alert', onPress: () => openOrders('Overdue') },
    { key: 'today', label: t('cards.dueToday'), value: String(dueTodayCount), tone: 'warning', icon: 'clock', onPress: () => openOrders('Due today') },
    { key: 'ready', label: t('cards.readyToGive'), value: String(stats.readyToGiveCount), tone: 'success', icon: 'circleCheck', onPress: () => openOrders('Ready') },
    {
      key: 'collect',
      label: t('cards.toCollect'),
      value: moneyK(stats.totalPendingBalance),
      tone: 'primary',
      icon: 'coin',
      onPress: () => openOrders('Unpaid'),
    },
  ];
  const toneText = { danger: 'danger', warning: 'warning', success: 'success', primary: 'primary' } as const;
  const toneBg = {
    danger: palette.dangerLight,
    warning: palette.warningLight,
    success: palette.successLight,
    primary: palette.primaryLight,
  } as const;
  const toneFg = { danger: palette.danger, warning: palette.warning, success: palette.success, primary: palette.primaryDark } as const;

  return (
    <View className="flex-1 bg-bg">
      <View style={{ paddingTop: insets.top + 8 }} className="border-b border-line-2 bg-surface px-4 pb-3">
        <View className="min-h-touch flex-row items-center">
          <View className="min-w-0 flex-1 pr-2">
            <Text variant="title" numberOfLines={1} accessibilityRole="header">
              {greeting}, {ownerName}
            </Text>
            <Text variant="caption" tone="muted" weight="regular" numberOfLines={1}>
              {shop.shop_name || 'TrueFit'} · {todayFormatted}
            </Text>
            <View className="mt-1">
              <SyncChip status={sync.status} pending={sync.pending} />
            </View>
          </View>
          <View>
            <IconButton
              icon="bell"
              variant="ghost"
              accessibilityLabel={t('common:a11y.notifications')}
              onPress={() => navigation.navigate('Notifications')}
            />
            {stats.pendingRemindersCount > 0 ? (
              <View className="absolute right-1 top-1 h-[18px] min-w-[18px] items-center justify-center rounded-sm bg-danger px-1" pointerEvents="none">
                <Text variant="caption" maxFontSizeMultiplier={1.3} style={{ color: palette.white, fontSize: 11, lineHeight: 14 }}>
                  {stats.pendingRemindersCount > 9 ? '9+' : stats.pendingRemindersCount}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Search entry: opens the global search (customer, phone, order no., book no.). */}
        <Pressable
          onPress={() => navigation.navigate('Search')}
          accessibilityRole="search"
          accessibilityLabel={t('searchEntry')}
          className="mt-2 h-12 flex-row items-center rounded-md border border-line bg-surface px-3 active:bg-surface-2"
        >
          <Icon name="search" size={20} color={colors.textMuted} />
          <Text variant="body" tone="faint" numberOfLines={1} className="ml-2 flex-1">
            {t('searchEntry')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* The four things to act on today. Each opens the matching Orders filter. */}
        <View className="flex-row flex-wrap gap-3">
          {cards.map((c) => (
            <Pressable
              key={c.key}
              onPress={() => {
                haptics.tap();
                c.onPress();
              }}
              accessibilityRole="button"
              accessibilityLabel={`${c.label}: ${c.value}`}
              className="min-h-[88px] flex-grow basis-[46%] justify-between rounded border border-line bg-surface p-3 active:bg-surface-2"
            >
              <View className="flex-row items-center">
                <View className="mr-2 h-7 w-7 items-center justify-center rounded-sm" style={{ backgroundColor: toneBg[c.tone] }}>
                  <Icon name={c.icon} size={16} color={toneFg[c.tone]} />
                </View>
                <Text variant="label" tone="muted" numberOfLines={2} className="flex-1">
                  {c.label}
                </Text>
              </View>
              <Text variant="headline" tone={toneText[c.tone]} tabular numberOfLines={1}>
                {c.value}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-3 flex-row gap-2">
          <Button
            title={t('newOrder')}
            icon={<Icon name="plus" size={20} color={colors.onPrimary} />}
            onPress={() => {
              haptics.tap();
              navigation.navigate('OrderForm', {});
            }}
            className="flex-[1.4]"
            testID="home-new-order"
          />
          <Button
            title={t('measure')}
            variant="secondary"
            icon={<Icon name="ruler" size={20} color={colors.textPrimary} />}
            onPress={() => {
              haptics.tap();
              navigation.navigate('CustomersTab' as any);
            }}
            className="flex-1"
          />
        </View>

        {/* Do now: swipe right = next status, swipe left = Call / WhatsApp. */}
        <View className="mb-2 mt-6 flex-row items-center">
          <Text variant="label" tone="muted">
            {t('doNow')}
          </Text>
          {stats.workOrders.length > 0 ? (
            <Text variant="label" tone="faint" tabular className="ml-1.5">
              {stats.workOrders.length}
            </Text>
          ) : null}
        </View>

        {stats.workOrders.length === 0 ? (
          <Card className="flex-row items-center">
            <Icon name="circleCheck" size={28} color={palette.success} />
            <View className="ml-3 flex-1">
              <Text variant="bodyLg">{t('allCaughtUp')}</Text>
              <Text variant="label" tone="muted" weight="regular">
                {t('noDeliveriesToday')}
              </Text>
            </View>
          </Card>
        ) : (
          <View className="overflow-hidden rounded border border-line">
            {stats.workOrders.map((order, idx) => {
              const customerName = order.customers?.name || t('customer');
              const due = getDueInfo(order.delivery_date, order.status, t);
              const isReady = order.status === 'ready';
              const balance = stats.balanceByOrder[order.id] ?? 0;
              const next: 'ready' | 'delivered' = isReady ? 'delivered' : 'ready';
              const phone = order.customers?.phone;

              const reveal = [
                ...(phone
                  ? [
                      { key: 'call', label: t('common:actions.call'), icon: 'phone', onPress: () => void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`).catch(() => showToast(t('common:call.failed'), 'error')) },
                      {
                        key: 'whatsapp',
                        label: 'WhatsApp',
                        icon: 'chat',
                        onPress: () => void sendWhatsAppMessage(phone, '').catch((e) => showToast(e instanceof Error ? e.message : t('errorLoad'), 'error')),
                      },
                    ]
                  : []),
              ];

              return (
                <SwipeRow
                  key={order.id}
                  commitAction={{
                    key: next,
                    label: isReady ? t('deliver') : t('ready'),
                    icon: isReady ? 'truck' : 'circleCheck',
                    tone: isReady ? 'primary' : 'success',
                    onPress: () => handleStatusChange(order, next),
                  }}
                  revealActions={reveal}
                >
                  <View className={`min-h-[72px] flex-row items-center bg-surface pl-4 pr-2 ${idx < stats.workOrders.length - 1 ? 'border-b border-line-2' : ''}`}>
                    <Pressable
                      onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
                      accessibilityRole="button"
                      accessibilityLabel={`${customerName}, #${order.order_number}, ${due.text}`}
                      className="min-w-0 flex-1 py-3 pr-2"
                    >
                      <Text variant="bodyLg" numberOfLines={1}>
                        {customerName}{' '}
                        <Text variant="label" tone="faint" tabular>
                          #{order.order_number}
                        </Text>
                      </Text>
                      <Text variant="label" tone="muted" weight="regular" numberOfLines={1}>
                        {order.cloth_type || t('garmentOrder')}
                        {balance > 0 ? ` · ${formatCurrency(balance)}` : ''}
                      </Text>
                      <View className="mt-1 flex-row flex-wrap gap-1.5">
                        <Badge
                          size="sm"
                          label={due.text}
                          tone={due.tone}
                          icon={due.tone === 'danger' ? 'alert' : 'clock'}
                        />
                        {order.is_rush ? <Badge size="sm" tone="danger" label={t('orders:form.rushOrder')} icon="flame" /> : null}
                        {isReady ? <Badge size="sm" type="order_status" value="ready" /> : null}
                      </View>
                    </Pressable>

                    <Button
                      title={isReady ? t('deliver') : t('ready')}
                      variant={isReady ? 'primary' : 'tonal'}
                      size="sm"
                      fullWidth={false}
                      loading={updatingId === order.id}
                      onPress={() => handleStatusChange(order, next)}
                    />
                  </View>
                </SwipeRow>
              );
            })}
          </View>
        )}

        <View className="mt-6 overflow-hidden rounded border border-line">
          <ListRow
            title={t('comingUpThisWeek')}
            trailing={<Text variant="bodyLg" tabular>{stats.upcomingThisWeek}</Text>}
            onPress={() => openOrders('Active')}
            showChevron
          />
          <ListRow
            title={t('whatsappReminders')}
            trailing={<Text variant="bodyLg" tabular>{stats.pendingRemindersCount}</Text>}
            onPress={() => navigation.navigate('Notifications')}
            divider={false}
          />
        </View>

        {/* Today's numbers (collected / new / delivered), quieter than the action cards. */}
        <View className="mt-6 flex-row rounded border border-line bg-surface">
          {[
            { label: t('collected'), value: formatCurrency(stats.todayCollected) },
            { label: t('newOrders'), value: String(stats.todayNewOrdersCount) },
            { label: t('delivered'), value: String(stats.todayDeliveredCount) },
          ].map((s, i) => (
            <View key={s.label} className={`min-w-0 flex-1 px-3 py-3 ${i > 0 ? 'border-l border-line-2' : ''}`}>
              <Text variant="bodyLg" tabular numberOfLines={1}>
                {s.value}
              </Text>
              <Text variant="caption" tone="muted" weight="regular" numberOfLines={2}>
                {s.label}
              </Text>
            </View>
          ))}
        </View>
        <Text variant="caption" tone="faint" weight="regular" className="mt-1.5 px-1">
          {t('today')}
        </Text>
      </ScrollView>
    </View>
  );
}
