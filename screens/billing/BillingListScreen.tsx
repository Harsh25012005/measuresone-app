import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { DSBottomSheet } from '../../components/ds/BottomSheet';
import { DSButton } from '../../components/ds/Button';
import { DSEmptyState } from '../../components/ds/EmptyState';
import { DSBillList } from '../../components/ds/Lists';
import { DSSkeletonList } from '../../components/ds/Loading';
import { DSScreen, GlassSearch } from '../../components/ds/Screen';
import { DSRadioGroup } from '../../components/ds/Selection';
import { IconAdjustmentsHorizontal, IconFileInvoice, IconPlus, IconSearchOff } from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { billsRepo, paymentsRepo } from '../../lib/data/repository';
import { useShop } from '../../context/AuthContext';
import { formatDate } from '../../lib/format';
import type { BillingScreenProps } from '../../navigation/types';
import type { BillWithRelations, PaymentStatus } from '../../types';

export default function BillingListScreen({ navigation }: BillingScreenProps<'BillingList'>) {
  const showToast = useToast();
  const shop = useShop();
  const { t } = useTranslation('billing');
  const [bills, setBills] = useState<BillWithRelations[]>([]);
  const [paidByBill, setPaidByBill] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, payments] = await Promise.all([billsRepo.listWithRelations(shop.id), paymentsRepo.listForShop(shop.id)]);
      const paid: Record<string, number> = {};
      for (const p of payments) paid[p.bill_id] = (paid[p.bill_id] ?? 0) + Number(p.amount_paid ?? 0);
      setPaidByBill(paid);
      setBills(list as unknown as BillWithRelations[]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('list.errorLoad'), 'error');
    }
  }, [showToast, shop.id]);

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

  /**
   * One row per client, not per bill. A regular customer racks up many bills
   * and a flat list repeats the same name, burying who actually owes money.
   * Each row shows the client's most recent bill plus their combined
   * outstanding total; tapping opens their full bill history.
   */
  const clientRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const byCustomer = new Map<
      string,
      { customerId: string; name: string; latest: BillWithRelations; billCount: number; outstanding: number }
    >();

    for (const bill of bills) {
      if (statusFilter && bill.payment_status !== statusFilter) continue;
      const key = bill.customer_id;
      if (!key) continue;
      const pending = Math.max(Number(bill.total_amount ?? 0) - (paidByBill[bill.id] ?? 0), 0);
      const existing = byCustomer.get(key);
      if (!existing) {
        byCustomer.set(key, { customerId: key, name: bill.customers?.name ?? '', latest: bill, billCount: 1, outstanding: pending });
      } else {
        existing.billCount += 1;
        existing.outstanding += pending;
        if (bill.created_at > existing.latest.created_at) existing.latest = bill;
      }
    }

    return [...byCustomer.values()]
      .filter((row) => !query || row.name.toLowerCase().includes(query))
      .sort((a, b) => b.outstanding - a.outstanding || (a.latest.created_at < b.latest.created_at ? 1 : -1));
  }, [bills, paidByBill, search, statusFilter]);

  const hasActiveFilters = Boolean(statusFilter);
  const filtered = search.trim().length > 0 || hasActiveFilters;

  return (
    <DSScreen
      title={t('list.title')}
      onBack={() => navigation.goBack()}
      actions={[
        { icon: IconAdjustmentsHorizontal, label: t('list.filterModalTitle'), badge: hasActiveFilters, onPress: () => setShowFilter(true) },
        { icon: IconPlus, label: t('list.newBill'), onPress: () => navigation.navigate('BillForm', {}) },
      ]}
      headerExtra={<GlassSearch value={search} onChangeText={setSearch} placeholder={t('list.searchPlaceholder')} />}
    >
      {loading ? (
        <View style={{ padding: 20 }}>
          <DSSkeletonList rows={6} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={clientRows.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : { paddingTop: 8, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2563EB" />}
        >
          {clientRows.length === 0 ? (
            filtered ? (
              <DSEmptyState icon={IconSearchOff} title={t('list.emptySearchTitle')} description={t('list.emptySearchDescription')} />
            ) : (
              <DSEmptyState
                icon={IconFileInvoice}
                title={t('list.emptyTitle')}
                description={t('list.emptyDescription')}
                actionLabel={t('list.newBill')}
                onAction={() => navigation.navigate('BillForm', {})}
              />
            )
          ) : (
            <DSBillList
              edge
              items={clientRows.map((r) => ({
                id: r.customerId,
                name: r.name,
                meta:
                  t('list.lastBill', { date: formatDate(r.latest.created_at) }) +
                  (r.billCount > 1 ? ` · ${t('list.billCount', { count: r.billCount })}` : ''),
                outstanding: r.outstanding,
                total: Number(r.latest.total_amount ?? 0),
                payment: r.latest.payment_status as PaymentStatus,
                paymentLabel: t(`list.filters.${r.latest.payment_status}`),
              }))}
              // Tapping a client opens their Bills tab — the full history lives there.
              onPressItem={(item) =>
                (navigation as unknown as { navigate: (t: string, p?: object) => void }).navigate('CustomersTab', {
                  screen: 'CustomerDetail',
                  params: { customerId: item.id, initialTab: 'bills' },
                })
              }
            />
          )}
        </ScrollView>
      )}

      <DSBottomSheet visible={showFilter} onClose={() => setShowFilter(false)} title={t('list.filterModalTitle')}>
        <View style={{ paddingTop: 12, paddingBottom: 16, gap: 16 }}>
          <DSRadioGroup
            value={statusFilter ?? 'all'}
            onChange={(v) => {
              setStatusFilter(v === 'all' ? null : (v as PaymentStatus));
              setShowFilter(false);
            }}
            options={[
              { value: 'all', label: t('list.allBills') },
              { value: 'paid', label: t('list.filters.paid') },
              { value: 'partial', label: t('list.filters.partial') },
              { value: 'unpaid', label: t('list.filters.unpaid') },
            ]}
          />
          {hasActiveFilters ? (
            <View style={{ alignItems: 'flex-start' }}>
              <DSButton title={t('list.reset')} variant="link" size="sm" onPress={() => setStatusFilter(null)} />
            </View>
          ) : null}
        </View>
      </DSBottomSheet>
    </DSScreen>
  );
}
