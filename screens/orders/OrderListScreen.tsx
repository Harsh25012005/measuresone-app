import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { DSBottomSheet } from '../../components/ds/BottomSheet';
import { DSButton } from '../../components/ds/Button';
import { DSEmptyState } from '../../components/ds/EmptyState';
import { DSOrderList, type OrderItem } from '../../components/ds/Lists';
import { DSSkeletonList } from '../../components/ds/Loading';
import { DSScreen, GlassSearch } from '../../components/ds/Screen';
import { DSTabs } from '../../components/ds/Tabs';
import { DSToggle } from '../../components/ds/Selection';
import { IconAdjustmentsHorizontal, IconCircleCheck, IconClipboardPlus, IconPlus, IconSearchOff } from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { billsRepo, ordersRepo, paymentsRepo } from '../../lib/data/repository';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { typography } from '../../constants/tokens';
import type { OrdersScreenProps } from '../../navigation/types';
import type { OrderListItem, OrderPriority } from '../../types';

type PriorityFilter = OrderPriority | 'all';

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—');

function toOrderItem(o: OrderListItem, noCloth: string, bill?: { total: number; paid: number }): OrderItem {
  const total = bill ? bill.total : Number(o.total_amount ?? 0);
  const paid = bill ? bill.paid : Number(o.paid_amount ?? 0);
  return {
    id: o.id,
    number: String(o.order_number).replace(/^ORD-/i, 'O-'),
    clientName: o.customers?.name ?? '—',
    garment: o.cloth_type || noCloth,
    pieces: o.cloth_count ?? 1,
    total,
    paid,
    payment: total > 0 && paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
    // delivery date is what matters on a list; fall back to the order date
    date: fmt(o.delivery_date ?? o.order_date),
    urgent: o.priority === 'urgent',
  };
}

export default function OrderListScreen({ navigation }: OrdersScreenProps<'OrderList'>) {
  const showToast = useToast();
  const shop = useShop();
  const { t } = useTranslation('orders');
  const { colors } = useTheme();

  const PRIORITY_FILTERS: { label: string; value: PriorityFilter }[] = [
    { label: t('list.filterAllPriority'), value: 'all' },
    { label: t('list.priorityNormal'), value: 'normal' },
    { label: t('list.priorityUrgent'), value: 'urgent' },
  ];

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  // Delivered orders are hidden by default so the list answers "what's still
  // pending?" at a glance.
  const [showDelivered, setShowDelivered] = useState(true);
  // orders.paid_amount is only a snapshot from creation; the bill's payments are the live figure.
  const [billAmounts, setBillAmounts] = useState<Record<string, { total: number; paid: number }>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, bills, payments] = await Promise.all([
        ordersRepo.listWithCustomer(shop.id),
        billsRepo.list(shop.id),
        paymentsRepo.listForShop(shop.id),
      ]);
      const paidByBill: Record<string, number> = {};
      for (const p of payments) paidByBill[p.bill_id] = (paidByBill[p.bill_id] ?? 0) + Number(p.amount_paid ?? 0);
      const amounts: Record<string, { total: number; paid: number }> = {};
      for (const b of bills) {
        if (b.order_id) amounts[b.order_id] = { total: Number(b.total_amount ?? 0), paid: paidByBill[b.id] ?? 0 };
      }
      setBillAmounts(amounts);
      // Newest order first, oldest last.
      setOrders([...list].sort((x, y) => (y.created_at ?? '').localeCompare(x.created_at ?? '')));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('list.loadOrdersFailed'), 'error');
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

  const bySearch = orders.filter(
    (o) =>
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.customers?.name ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const byPriority = priorityFilter === 'all' ? bySearch : bySearch.filter((o) => o.priority === priorityFilter);
  const filtered = showDelivered ? byPriority : byPriority.filter((o) => o.status !== 'delivered');

  const deliveredCount = bySearch.filter((o) => o.status === 'delivered').length;
  const hasActiveFilters = priorityFilter !== 'all' || !showDelivered;
  /** Nothing pending, but completed orders exist and are just hidden. */
  const allCaughtUp = filtered.length === 0 && !showDelivered && deliveredCount > 0;
  /** The priority filter (or search) is what's hiding everything. */
  const hasEmptyDueToFilter = filtered.length === 0 && !allCaughtUp && (priorityFilter !== 'all' || search.length > 0);

  const reset = () => {
    setPriorityFilter('all');
    setShowDelivered(true);
  };

  return (
    <DSScreen
      title={t('list.title')}
      actions={[
        { icon: IconAdjustmentsHorizontal, label: t('list.filterModalTitle'), badge: hasActiveFilters, onPress: () => setShowFilter(true) },
        { icon: IconPlus, label: t('list.newOrder'), onPress: () => navigation.navigate('OrderForm', {}) },
      ]}
      headerExtra={<GlassSearch value={search} onChangeText={setSearch} placeholder={t('list.searchPlaceholder')} />}
    >
      {loading ? (
        <View style={{ padding: 20 }}>
          <DSSkeletonList rows={6} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={filtered.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : { paddingTop: 8, paddingBottom: 140, gap: 8 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2563EB" />}
        >
          {/* A filtered list is otherwise indistinguishable from an empty one. */}
          {hasActiveFilters && filtered.length > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }}>
              <Text style={{ fontFamily: typography.family.medium, fontSize: 13, color: colors.textMuted }}>{t('list.filterModalTitle')}</Text>
              <DSButton title={t('list.reset')} variant="link" size="sm" onPress={reset} />
            </View>
          ) : null}

          {filtered.length === 0 ? (
            // Three distinct empty cases: a filter is hiding everything, every
            // order is simply completed (a good state, not an error), or there
            // genuinely are no orders yet.
            hasEmptyDueToFilter ? (
              <DSEmptyState icon={IconSearchOff} title={t('list.noOrdersWithStatus')} description={t('list.tryDifferentFilter')} />
            ) : allCaughtUp ? (
              <DSEmptyState
                icon={IconCircleCheck}
                title={t('list.allCaughtUpTitle')}
                description={t('list.allCaughtUpDescription', { count: deliveredCount })}
                actionLabel={t('list.newOrder')}
                onAction={() => navigation.navigate('OrderForm', {})}
              />
            ) : (
              <DSEmptyState
                icon={IconClipboardPlus}
                title={t('list.noOrdersYet')}
                description={t('list.createOrderHint')}
                actionLabel={t('list.newOrder')}
                onAction={() => navigation.navigate('OrderForm', {})}
              />
            )
          ) : (
            <DSOrderList
              edge
              items={filtered.map((o) => toOrderItem(o, t('form.defaultGarmentType'), billAmounts[o.id]))}
              onPressItem={(item) => navigation.navigate('OrderDetail', { orderId: item.id })}
            />
          )}
        </ScrollView>
      )}

      <DSBottomSheet visible={showFilter} onClose={() => setShowFilter(false)} title={t('list.filterModalTitle')} actionLabel={t('list.applyFilters')}>
        <View style={{ gap: 22, paddingTop: 12, paddingBottom: 12 }}>
          {/* Completed orders — hidden by default, since the list's main job is showing what still needs work. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <DSToggle value={showDelivered} onValueChange={setShowDelivered} label={t('list.showDelivered', { count: deliveredCount })} />
            </View>
            {hasActiveFilters ? <DSButton title={t('list.reset')} variant="link" size="sm" onPress={reset} /> : null}
          </View>

          <View style={{ gap: 10 }}>
            <Text style={{ fontFamily: typography.family.semibold, fontSize: 13, color: colors.textSecondary }}>{t('list.prioritySection')}</Text>
            <DSTabs
              variant="pill"
              value={priorityFilter}
              onChange={(k) => setPriorityFilter(k as PriorityFilter)}
              items={PRIORITY_FILTERS.map((p) => ({ key: p.value, label: p.label }))}
            />
          </View>
        </View>
      </DSBottomSheet>
    </DSScreen>
  );
}
