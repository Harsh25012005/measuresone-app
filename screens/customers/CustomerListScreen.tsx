import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { DSBottomSheet } from '../../components/ds/BottomSheet';
import { DSEmptyState } from '../../components/ds/EmptyState';
import { DSClientList } from '../../components/ds/Lists';
import { DSSkeletonList } from '../../components/ds/Loading';
import { DSRadioGroup } from '../../components/ds/Selection';
import { DSScreen, GlassSearch } from '../../components/ds/Screen';
import { IconAdjustmentsHorizontal, IconPlus, IconSearchOff, IconUsers } from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { customersRepo, billsRepo } from '../../lib/data/repository';
import { useShop } from '../../context/AuthContext';
import type { CustomersScreenProps } from '../../navigation/types';
import type { CustomerWithBalance } from '../../types';

async function fetchCustomersWithBalance(shopId: string): Promise<CustomerWithBalance[]> {
  const [customers, balanceByCustomer] = await Promise.all([
    customersRepo.list(shopId),
    billsRepo.pendingBalanceByCustomer(shopId),
  ]);
  return customers.map((c) => ({ ...c, balance: balanceByCustomer[c.id] ?? 0 }));
}

export default function CustomerListScreen({ navigation }: CustomersScreenProps<'CustomerList'>) {
  const { t } = useTranslation('customers');
  const showToast = useToast();
  const shop = useShop();
  const [customers, setCustomers] = useState<(CustomerWithBalance & { book_number?: string | null })[]>([]);
  const [search, setSearch] = useState('');
  const [balanceOnly, setBalanceOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  const load = useCallback(async () => {
    try {
      setCustomers(await fetchCustomersWithBalance(shop.id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('list.loadError'), 'error');
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

  const filtered = customers.filter(
    (c) =>
      (c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone ?? '').includes(search)) &&
      (!balanceOnly || c.balance > 0)
  );

  return (
    <DSScreen
      title={t('list.title')}
      actions={[
        { icon: IconAdjustmentsHorizontal, label: t('list.filterModalTitle'), badge: balanceOnly, onPress: () => setShowFilter(true) },
        { icon: IconPlus, label: t('list.addCustomer'), onPress: () => navigation.navigate('CustomerForm') },
      ]}
      headerExtra={<GlassSearch value={search} onChangeText={setSearch} placeholder={t('list.searchPlaceholder')} />}
    >
      {loading ? (
        <View style={{ padding: 20 }}>
          <DSSkeletonList rows={7} />
        </View>
      ) : filtered.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2563EB" />}
        >
          <DSEmptyState
            icon={search ? IconSearchOff : IconUsers}
            title={search ? t('list.emptySearchTitle') : t('list.emptyTitle')}
            description={search ? t('list.emptySearchDescription') : t('list.emptyDescription')}
            actionLabel={search ? undefined : t('list.addCustomer')}
            onAction={search ? undefined : () => navigation.navigate('CustomerForm')}
          />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2563EB" />}
        >
          <DSClientList
            edge
            items={filtered.map((c) => ({
              id: c.id,
              number: c.book_number || '—',
              name: c.name,
              phone: c.phone ?? t('list.noPhone'),
              balance: c.balance,
            }))}
            onPressItem={(c) => navigation.navigate('CustomerDetail', { customerId: c.id })}
          />
        </ScrollView>
      )}

      <DSBottomSheet visible={showFilter} onClose={() => setShowFilter(false)} title={t('list.filterModalTitle')}>
        <View style={{ paddingTop: 12, paddingBottom: 16 }}>
          <DSRadioGroup
            value={balanceOnly ? 'balance' : 'all'}
            onChange={(v) => {
              setBalanceOnly(v === 'balance');
              setShowFilter(false);
            }}
            options={[
              { value: 'all', label: t('list.allCustomers') },
              { value: 'balance', label: t('list.hasBalanceFilter') },
            ]}
          />
        </View>
      </DSBottomSheet>
    </DSScreen>
  );
}
