import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import {
  BottomSheet,
  Button,
  Chip,
  EmptyState,
  Header,
  IconButton,
  SkeletonList,
  Text,
  useToast,
  VoiceListeningOverlay,
} from '../../src/components/ui';
import { OrderRow } from '../../components/OrderRow';
import { SyncNotice } from '../../components/SyncNotice';
import { ordersRepo, staffRepo } from '../../lib/data/repository';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useOrderStatusChange } from '../../lib/useOrderStatusChange';
import {
  countByFilter,
  filterOrders,
  getOrderBalance,
  groupByDue,
  localDateString,
  sortOrders,
  type OrderFilterType,
  type SortOption,
} from '../../lib/orderList';
import { haptics } from '../../lib/haptics';
import type { OrdersScreenProps } from '../../navigation/types';
import type { OrderListItem } from '../../types';
import type { Tables } from '../../lib/database.types';

type StaffMember = Tables<'staff'>;

const FILTERS: { key: OrderFilterType; labelKey: string }[] = [
  { key: 'Active', labelKey: 'active' },
  { key: 'Due today', labelKey: 'dueToday' },
  { key: 'Overdue', labelKey: 'overdue' },
  { key: 'Unpaid', labelKey: 'unpaid' },
  { key: 'Received', labelKey: 'received' },
  { key: 'Ready', labelKey: 'ready' },
  { key: 'Delivered', labelKey: 'delivered' },
  { key: 'All', labelKey: 'all' },
];

const PRIMARY_FILTERS: OrderFilterType[] = ['Active', 'Overdue', 'Due today', 'Ready', 'Delivered'];

const SORT_OPTIONS: { id: SortOption; labelKey: string }[] = [
  { id: 'due', labelKey: 'sortDueDate' },
  { id: 'new', labelKey: 'sortNewest' },
  { id: 'old', labelKey: 'sortOldest' },
  { id: 'amount', labelKey: 'sortAmount' },
  { id: 'balance', labelKey: 'sortBalanceDue' },
];

export default function OrderListScreen({ navigation, route }: OrdersScreenProps<'OrderList'>) {
  const showToast = useToast();
  const shop = useShop();
  const { colors } = useTheme();
  const { t } = useTranslation('orders');

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [activeFilter, setActiveFilter] = useState<OrderFilterType>('Active');
  const [sortBy, setSortBy] = useState<SortOption>('due');
  const [staffFilter, setStaffFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dictating, setDictating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const requestedFilter = route.params?.filter;
  useEffect(() => {
    if (!requestedFilter) return;
    setActiveFilter(requestedFilter);
    setSearch('');
    // Clear it so returning to the tab later doesn't re-apply a stale filter.
    navigation.setParams({ filter: undefined });
  }, [requestedFilter, navigation]);

  const load = useCallback(async () => {
    try {
      const [orderData, staffData] = await Promise.all([
        ordersRepo.listWithCustomer(shop.id),
        staffRepo.list(shop.id),
      ]);
      setOrders(orderData);
      setStaffList(staffData);
      setLoadFailed(false);
    } catch (err) {
      setLoadFailed(true);
      showToast(err instanceof Error ? err.message : t('list.loadOrdersFailed'), 'error');
    }
  }, [showToast, shop.id, t]);

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

  // Speech recognition events
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) setSearch(transcript);
  });
  useSpeechRecognitionEvent('end', () => setDictating(false));
  useSpeechRecognitionEvent('error', () => {
    setDictating(false);
    showToast(t('form.dictationFailed', { defaultValue: 'Could not hear that' }), 'error');
  });

  const startDictation = async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      showToast(
        t('form.microphonePermissionDenied', { defaultValue: 'Microphone permission needed' }),
        'error'
      );
      return;
    }
    setDictating(true);
    ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: false, continuous: false });
  };

  const today = localDateString();

  // Filter, sort and group once per input change, not on every render: with
  // thousands of orders this is the work that keeps scrolling smooth.
  const sorted = useMemo(
    () => sortOrders(filterOrders(orders, { filter: activeFilter, staffId: staffFilter, search, today }), sortBy),
    [orders, activeFilter, staffFilter, search, today, sortBy]
  );
  const counts = useMemo(() => countByFilter(orders, FILTERS.map((f) => f.key), today), [orders, today]);

  const hasActiveModalFilter = sortBy !== 'due' || staffFilter !== null;
  const isSortDue = sortBy === 'due';
  const groups = useMemo(
    () => (isSortDue ? groupByDue(sorted, today).map((g) => ({ key: g.key, title: t(`list.${g.titleKey}`, { defaultValue: g.key }), orders: g.orders })) : []),
    [isSortDue, sorted, today, t]
  );

  const getSortName = () => {
    const found = SORT_OPTIONS.find((s) => s.id === sortBy);
    return found ? t(`list.${found.labelKey}`) : t('list.sortDueDate');
  };

  const { change: handleStatusChange } = useOrderStatusChange({
    shopId: shop.id,
    getBalance: getOrderBalance,
    onChanged: load,
  });

  const openOrder = useCallback(
    (order: OrderListItem) => navigation.navigate('OrderDetail', { orderId: order.id }),
    [navigation]
  );

  // One flat list (group headers + orders) so the FlatList can virtualise thousands of orders.
  type Row = { type: 'header'; key: string; title: string; count: number } | { type: 'order'; key: string; order: OrderListItem };
  const rows: Row[] = isSortDue
    ? groups.flatMap((g) => [
        { type: 'header' as const, key: `h-${g.key}`, title: g.title, count: g.orders.length },
        ...g.orders.map((order) => ({ type: 'order' as const, key: order.id, order })),
      ])
    : sorted.map((order) => ({ type: 'order' as const, key: order.id, order }));

  const resetAll = () => {
    setActiveFilter('Active');
    setSearch('');
    setSortBy('due');
    setStaffFilter(null);
  };

  const hasAnyFilter = activeFilter !== 'Active' || search.length > 0 || hasActiveModalFilter;
  const selectedStaff = staffFilter ? staffList.find((s) => s.id === staffFilter)?.name : null;

  const header = (
    <Header
      showBack={false}
      title={t('list.title')}
      right={
        <IconButton
          icon="plus"
          variant="tonal"
          accessibilityLabel={t('common:a11y.newOrder')}
          onPress={() => {
            haptics.tap();
            navigation.navigate('OrderForm', {});
          }}
        />
      }
      searchProps={{
        value: search,
        onChangeText: setSearch,
        placeholder: t('list.searchPlaceholderDetailed'),
        onFilterPress: () => setShowFilterModal(true),
        hasActiveFilter: hasActiveModalFilter || !PRIMARY_FILTERS.includes(activeFilter),
        onMicPress: startDictation,
      }}
    />
  );

  if (loading && orders.length === 0) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <SkeletonList count={7} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      {header}

      {/* The five filters that matter day to day; the rest live in the sort & filter sheet. */}
      <View className="border-b border-line-2 bg-surface py-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}>
          {PRIMARY_FILTERS.map((key) => {
            const f = FILTERS.find((x) => x.key === key)!;
            return (
              <Chip
                key={key}
                label={t(`list.${f.labelKey}`, { defaultValue: key })}
                count={counts[key] ?? 0}
                selected={activeFilter === key}
                onPress={() => {
                  haptics.tap();
                  setActiveFilter(key);
                }}
              />
            );
          })}
          {!PRIMARY_FILTERS.includes(activeFilter) ? (
            <Chip
              label={t(`list.${FILTERS.find((x) => x.key === activeFilter)?.labelKey ?? 'all'}`, { defaultValue: activeFilter })}
              count={counts[activeFilter] ?? 0}
              selected
              onPress={() => setShowFilterModal(true)}
            />
          ) : null}
        </ScrollView>
      </View>

      <View className="min-h-[40px] flex-row items-center justify-between px-4">
        <Text variant="caption" tone="muted" weight="regular" className="flex-1 py-2">
          {t('list.ordersCount', { count: sorted.length })} · {getSortName()}
          {selectedStaff ? ` · ${selectedStaff}` : ''}
        </Text>
        <SyncNotice />
        {hasAnyFilter ? <Button title={t('list.reset')} variant="ghost" size="sm" fullWidth={false} onPress={resetAll} /> : null}
      </View>

      {loadFailed && orders.length === 0 ? (
        <EmptyState
          variant="full"
          icon="alert"
          title={t('common:errors.loadTitle')}
          description={t('common:errors.loadDescription')}
          actionLabel={t('common:actions.retry')}
          onAction={() => {
            setLoading(true);
            void load().finally(() => setLoading(false));
          }}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          variant="full"
          icon="orders"
          title={t('list.noOrdersYetTitle')}
          description={t('list.noOrdersYetDesc')}
          actionLabel={t('list.newOrder')}
          onAction={() => navigation.navigate('OrderForm', {})}
        />
      ) : sorted.length === 0 ? (
        <EmptyState
          variant="full"
          icon="search"
          title={t('list.noMatchingOrdersTitle')}
          description={t('list.noMatchingOrdersDesc')}
          actionLabel={t('list.showAllActive')}
          onAction={resetAll}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.key}
          renderItem={({ item }) =>
            item.type === 'header' ? (
              <View className="flex-row items-center justify-between bg-bg px-4 pb-1 pt-4">
                <Text variant="label" tone="muted" accessibilityRole="header">
                  {item.title}
                </Text>
                <Text variant="label" tone="faint" tabular>
                  {item.count}
                </Text>
              </View>
            ) : (
              <OrderRow order={item.order} balance={getOrderBalance(item.order)} onOpen={openOrder} onChangeStatus={handleStatusChange} />
            )
          }
          initialNumToRender={12}
          windowSize={9}
          removeClippedSubviews
          contentContainerStyle={{ paddingBottom: 140 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        />
      )}

      <BottomSheet
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title={t('list.sortAndFilter')}
        footer={
          <View className="flex-row gap-2">
            <Button
              title={t('list.reset')}
              variant="secondary"
              className="flex-1"
              onPress={() => {
                setSortBy('due');
                setStaffFilter(null);
                setActiveFilter('Active');
              }}
            />
            <Button title={t('list.applyFilters')} className="flex-[1.5]" onPress={() => setShowFilterModal(false)} />
          </View>
        }
      >
        <Text variant="label" tone="muted" className="mb-2">
          {t('list.filterByStatus')}
        </Text>
        <View className="mb-5 flex-row flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Chip
              key={f.key}
              label={t(`list.${f.labelKey}`, { defaultValue: f.key })}
              selected={activeFilter === f.key}
              onPress={() => setActiveFilter(f.key)}
            />
          ))}
        </View>

        <Text variant="label" tone="muted" className="mb-2">
          {t('list.sortBy')}
        </Text>
        <View className="mb-5 flex-row flex-wrap gap-2">
          {SORT_OPTIONS.map((opt) => (
            <Chip key={opt.id} label={t(`list.${opt.labelKey}`)} selected={sortBy === opt.id} onPress={() => setSortBy(opt.id)} />
          ))}
        </View>

        {staffList.length > 0 ? (
          <>
            <Text variant="label" tone="muted" className="mb-2">
              {t('list.staffSection')}
            </Text>
            <View className="mb-2 flex-row flex-wrap gap-2">
              <Chip label={t('list.allStaff')} selected={staffFilter === null} onPress={() => setStaffFilter(null)} />
              {staffList.map((s) => (
                <Chip key={s.id} label={s.name} selected={staffFilter === s.id} onPress={() => setStaffFilter(s.id)} />
              ))}
            </View>
          </>
        ) : null}
      </BottomSheet>

      <VoiceListeningOverlay
        visible={dictating}
        onStop={() => {
          ExpoSpeechRecognitionModule.stop();
          setDictating(false);
        }}
        label={t('search.listening', { defaultValue: 'Listening…' })}
        hint={t('search.listeningHint', {
          defaultValue: 'Say customer name or order #, tap anywhere to stop',
        })}
      />
    </View>
  );
}
