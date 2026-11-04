import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { DSAiAssistant } from '../../components/ds/AiAssistant';
import { DSButton } from '../../components/ds/Button';
import { DSEmptyState } from '../../components/ds/EmptyState';
import { DSOrderList, type OrderItem } from '../../components/ds/Lists';
import { DSSkeletonCard, DSSkeletonList } from '../../components/ds/Loading';
import { GlassButton } from '../../components/ds/Screen';
import {
  IconBell,
  IconCalendarEvent,
  IconCheck,
  IconClipboardList,
  IconCurrencyRupee,
  IconPlus,
  IconReceipt,
  IconSearch,
  IconUsers,
  type TablerIcon,
} from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { ordersRepo, customersRepo, billsRepo, paymentsRepo } from '../../lib/data/repository';
import { formatCurrency } from '../../lib/format';
import { loadOrderBillAmounts, type BillAmounts } from '../../lib/orderPayments';
import { haptics } from '../../lib/haptics';
import { hasSeenProductTour, markProductTourSeen } from '../../lib/productTour';
import { useShop } from '../../context/AuthContext';
import { useProductTour } from '../../context/ProductTourContext';
import { useTheme } from '../../context/ThemeContext';
import { useHeroStatusBar } from '../../context/StatusBarContext';
import { primary, status, typography } from '../../constants/tokens';
import type { DashboardScreenProps } from '../../navigation/types';
import type { OrderListItem } from '../../types';

const f = typography.family;

type ClientItem = { id: string; name: string; phone: string | null };

type RecentPaymentItem = { id: string; customerName: string; amount: number; mode: string; date: string };

type Stats = {
  todaysOrders: OrderListItem[];
  todaysDeliveries: OrderListItem[];
  recentOrders: OrderListItem[];
  topClients: ClientItem[];
  recentPayments: RecentPaymentItem[];
  /** Money received today (sum of payments). */
  todaysRevenue: number;
  billAmounts: BillAmounts;
};

const AVATAR_COLORS = ['#2563EB', '#7C3AED', '#0891B2', '#D97706', '#DB2777', '#16A34A'];

/** Local-time day boundaries as ISO strings, plus the plain YYYY-MM-DD date. */
function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const localDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(
    start.getDate()
  ).padStart(2, '0')}`;

  return { start: start.toISOString(), end: end.toISOString(), localDate };
}



/** YYYY-MM-DD of an instant in the device's local time zone. */
function localDay(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Order → row for the shared order list. */
function toOrderItem(o: OrderListItem, fallbackGarment: string, bill?: { total: number; paid: number }): OrderItem {
  const total = bill ? bill.total : Number(o.total_amount ?? 0);
  const paid = bill ? bill.paid : Number(o.paid_amount ?? 0);
  return {
    id: o.id,
    number: String(o.order_number).replace(/^ORD-/i, 'O-'),
    clientName: o.customers?.name ?? '—',
    garment: o.cloth_type || fallbackGarment,
    pieces: o.cloth_count ?? 1,
    total,
    paid,
    payment: total > 0 && paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
    date: o.order_date
      ? new Date(o.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      : '—',
  };
}

function StatTile({ icon: Icon, label, value, tint, fg, onPress }: { icon: TablerIcon; label: string; value: string; tint: string; fg: string; onPress: () => void }) {
  const { colors, scheme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: pressed ? colors.bgSubtle : colors.bgSurface,
          borderColor: scheme === 'dark' ? '#262626' : colors.borderDefault,
        },
      ]}
    >
      <View style={[styles.tileIcon, { backgroundColor: tint }]}>
        <Icon size={18} color={fg} strokeWidth={2} />
      </View>
      <Text style={{ fontFamily: f.bold, fontSize: 22, lineHeight: 28, color: colors.textPrimary, marginTop: 10 }}>{value}</Text>
      <Text style={{ fontFamily: f.medium, fontSize: 12, color: colors.textMuted }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHead}>
      <Text style={{ fontFamily: f.bold, fontSize: 18, color: colors.textPrimary }}>{title}</Text>
      {action ? <DSButton title={action} variant="link" size="sm" onPress={onAction} /> : null}
    </View>
  );
}

export default function DashboardScreen({ navigation }: DashboardScreenProps<'Dashboard'>) {
  const shop = useShop();
  const insets = useSafeAreaInsets();
  const showToast = useToast();
  const { t } = useTranslation('dashboard');
  const { colors, scheme } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const tour = useProductTour();
  useHeroStatusBar();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop.id]);

  const load = useCallback(async () => {
    try {
      const { localDate } = todayRange();

      // Everything reads from the local-first mirror (same one every
      // create/order/payment flow writes through) rather than Supabase
      // directly, so the dashboard reflects the real current data instead of
      // racing the background sync.
      const [allOrders, customers, allBills, allPayments, billAmounts] = await Promise.all([
        ordersRepo.listWithCustomer(shop.id),
        customersRepo.list(shop.id),
        billsRepo.list(shop.id),
        paymentsRepo.listForShop(shop.id),
        loadOrderBillAmounts(shop.id),
      ]);
      const customerById = new Map(customers.map((c) => [c.id, c]));
      const billById = new Map(allBills.map((b) => [b.id, b]));

      // order_date was stored as the UTC date, which is yesterday for part of every
      // local day — so an order also counts as today's when it was created today locally.
      const todaysOrders = allOrders.filter((o) => o.order_date === localDate || localDay(o.created_at) === localDate);
      const todaysDeliveries = todaysOrders.filter((o) => o.status === 'delivered');
      const recentOrders = [...allOrders]
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 6);

      // "Top clients" = best customers, ranked by how many orders they've
      // placed (ties broken by total value billed to them). Customers with no
      // orders at all are excluded — the row is meant to surface regulars.
      const customerScores = new Map<string, { orders: number; value: number }>();
      for (const o of allOrders) {
        if (!o.customer_id) continue;
        const prev = customerScores.get(o.customer_id) ?? { orders: 0, value: 0 };
        customerScores.set(o.customer_id, {
          orders: prev.orders + 1,
          value: prev.value + Number(o.total_amount ?? 0),
        });
      }
      const topClients: ClientItem[] = [...customerScores.entries()]
        .sort((a, b) => b[1].orders - a[1].orders || b[1].value - a[1].value)
        .slice(0, 8)
        .map(([id]) => customerById.get(id))
        .filter((c): c is (typeof customers)[number] => !!c)
        .map((c) => ({ id: c.id, name: c.name, phone: c.phone }));

      const todaysRevenue = allPayments
        .filter((p) => localDay(p.payment_date) === localDate)
        .reduce((sum, p) => sum + Number(p.amount_paid ?? 0), 0);

      // Latest payments received, regardless of which bill/order they're
      // tied to — a fast "money coming in" pulse distinct from Transaction
      // History below (which is orders, not payments).
      const recentPayments: RecentPaymentItem[] = [...allPayments]
        .sort((a, b) => (a.payment_date < b.payment_date ? 1 : -1))
        .slice(0, 5)
        .map((p) => {
          const bill = billById.get(p.bill_id);
          const customer = bill?.customer_id ? customerById.get(bill.customer_id) : null;
          return {
            id: p.id,
            customerName: customer?.name ?? t('customer'),
            amount: Number(p.amount_paid ?? 0),
            mode: p.payment_mode ?? '',
            date: p.payment_date,
          };
        });

      setStats({
        todaysOrders,
        todaysDeliveries,
        recentOrders,
        topClients,
        recentPayments,
        todaysRevenue,
        billAmounts,
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('errorLoad'), 'error');
    }
  }, [showToast, t, shop.id]);

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

  const dark = scheme === 'dark';
  const openAi = () => {
    haptics.tap();
    navigation.navigate('AIOrderAssistant');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPage }}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FFFFFF" />}
      >
        {/* ── header: greeting and search on solid black ── */}
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 44, backgroundColor: '#000000' }}>
          <Animated.View entering={FadeInDown.duration(300)} style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.welcome}>{t('welcomeBack')}</Text>
              <Text style={styles.greeting} numberOfLines={1}>
                {t('greeting', { name: shop.shop_name || t('defaultUser') })}
              </Text>
            </View>
            <GlassButton icon={IconCalendarEvent} label={t('calendarNavLabel')} onPress={() => navigation.navigate('Calendar')} />
            <GlassButton icon={IconBell} label={t('alerts')} onPress={() => navigation.navigate('Notifications')} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(80).duration(300)} style={{ marginTop: 18 }}>
            <Pressable onPress={() => navigation.navigate('Search')} accessibilityRole="search" style={styles.search}>
              <IconSearch size={18} color="rgba(255,255,255,0.6)" />
              <Text style={styles.searchText} numberOfLines={1}>
                {t('searchPlaceholder')}
              </Text>
            </Pressable>
          </Animated.View>

        </View>

        {/* ── content sheet ── */}
        <View style={[styles.sheet, { backgroundColor: colors.bgPage }]}>
          {loading || !stats ? (
            <View style={{ gap: 16 }}>
              <DSSkeletonCard />
              <DSSkeletonList rows={3} />
            </View>
          ) : (
            <>
              <Animated.View entering={FadeInDown.duration(320)} style={styles.tiles}>
                <StatTile
                  icon={IconClipboardList}
                  label={t('stats.ordersToday')}
                  value={String(stats.todaysOrders.length)}
                  tint={dark ? primary[950] : primary[100]}
                  fg={primary[600]}
                  onPress={() => navigation.navigate('OrdersTab' as any)}
                />
                <StatTile
                  icon={IconCurrencyRupee}
                  label={t('stats.todaysRevenue')}
                  value={formatCurrency(stats.todaysRevenue)}
                  tint={dark ? '#0F2E1C' : status.success[100]}
                  fg={status.success[600]}
                  onPress={() => navigation.navigate('SettingsTab' as any, { screen: 'Revenue' })}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(60).duration(320)} style={{ marginTop: 16 }}>
                <DSButton
                  title={t('newOrder')}
                  size="lg"
                  fullWidth
                  leftIcon={IconPlus}
                  onPress={() => {
                    haptics.tap();
                    navigation.navigate('OrderForm', {});
                  }}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(120).duration(320)} style={{ marginTop: 20 }}>
                <DSAiAssistant
                  title={t('aiCard.title')}
                  subtitle={t('aiCard.subtitle')}
                  placeholder={t('aiCard.placeholder')}
                  onSend={openAi}
                  onMicPress={openAi}
                />
              </Animated.View>

              {/* Top clients — ranked by order count */}
              <View style={{ marginTop: 28 }}>
                <SectionHeader title={t('topClients')} />
                {stats.topClients.length === 0 ? (
                  <DSEmptyState
                    variant="compact"
                    icon={IconUsers}
                    title={t('emptyTopClients.title')}
                    description={t('emptyTopClients.description')}
                  />
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingRight: 8 }}>
                    {stats.topClients.map((client, idx) => (
                      <Pressable
                        key={client.id}
                        onPress={() =>
                          navigation.navigate('CustomersTab' as any, {
                            screen: 'CustomerDetail',
                            params: { customerId: client.id },
                          })
                        }
                        accessibilityRole="button"
                        style={{ width: 64, alignItems: 'center', gap: 6 }}
                      >
                        <View style={[styles.clientAvatar, { backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }]}>
                          <Text style={{ fontFamily: f.bold, fontSize: 20, color: '#FFFFFF' }}>
                            {client.name ? client.name.charAt(0).toUpperCase() : 'C'}
                          </Text>
                        </View>
                        <Text style={{ fontFamily: f.medium, fontSize: 12, color: colors.textPrimary }} numberOfLines={1}>
                          {client.name.split(' ')[0]}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Today's delivery — capped to 3 with a link into the full Orders list */}
              <View style={{ marginTop: 28 }}>
                <SectionHeader
                  title={t('todaysDelivery.title')}
                  action={stats.todaysDeliveries.length > 3 ? t('viewMore') : undefined}
                  onAction={() => navigation.navigate('OrdersTab' as any)}
                />
                {stats.todaysDeliveries.length === 0 ? (
                  <DSEmptyState
                    variant="compact"
                    icon={IconCalendarEvent}
                    title={t('emptyTransactionsTitle')}
                    description={t('emptyTransactionsDescription')}
                  />
                ) : (
                  <DSOrderList
                    items={stats.todaysDeliveries.slice(0, 3).map((o) => toOrderItem(o, t('garmentOrder'), stats.billAmounts[o.id]))}
                    onPressItem={(item) => navigation.navigate('OrderDetail', { orderId: item.id })}
                  />
                )}
              </View>

              {/* Recent payments — a fast "money coming in" pulse */}
              <View style={{ marginTop: 28 }}>
                <SectionHeader
                  title={t('recentPayments.title')}
                  action={stats.recentPayments.length > 0 ? t('seeAll') : undefined}
                  onAction={() => navigation.navigate('Transactions')}
                />
                {stats.recentPayments.length === 0 ? (
                  <DSEmptyState
                    variant="compact"
                    icon={IconCurrencyRupee}
                    title={t('recentPayments.emptyTitle')}
                    description={t('recentPayments.emptyDescription')}
                  />
                ) : (
                  <View style={[styles.list, { backgroundColor: colors.bgSurface, borderColor: dark ? '#262626' : colors.borderDefault }]}>
                    {stats.recentPayments.map((payment, i) => (
                      <View key={payment.id}>
                        <View style={styles.payRow}>
                          <View style={[styles.payIcon, { backgroundColor: dark ? '#0F2E1C' : status.success[100] }]}>
                            <IconCurrencyRupee size={18} color={status.success[600]} strokeWidth={2.2} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: f.semibold, fontSize: 15, color: colors.textPrimary }} numberOfLines={1}>
                              {payment.customerName}
                            </Text>
                            <Text style={{ fontFamily: f.regular, fontSize: 13, color: colors.textMuted }}>
                              {new Date(payment.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              {payment.mode ? ` · ${payment.mode}` : ''}
                            </Text>
                          </View>
                          <Text style={{ fontFamily: f.bold, fontSize: 15, color: status.success[600] }}>
                            +{formatCurrency(payment.amount)}
                          </Text>
                        </View>
                        {i < stats.recentPayments.length - 1 ? (
                          <View style={{ height: StyleSheet.hairlineWidth, marginLeft: 16, backgroundColor: colors.borderSubtle }} />
                        ) : null}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  welcome: { fontFamily: f.medium, fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  greeting: { fontFamily: f.bold, fontSize: 24, lineHeight: 30, color: '#FFFFFF', marginTop: 6 },
  search: {
    height: 48,
    borderRadius: 9999,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  searchText: { flex: 1, fontFamily: f.medium, fontSize: 14, color: 'rgba(255,255,255,0.55)' },
  sheet: { marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 24, paddingHorizontal: 20, minHeight: 500 },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderWidth: 1, borderRadius: 22, padding: 14 },
  tileIcon: { width: 36, height: 36, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, minHeight: 32 },
  clientAvatar: { width: 58, height: 58, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  list: { borderWidth: 1, borderRadius: 24, overflow: 'hidden' },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  payIcon: { width: 40, height: 40, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
});
