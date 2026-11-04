import { useCallback, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { EmptyState, Header, Icon, ListRow, SkeletonList, Text, useToast } from '../../src/components/ui';
import { usePalette } from '../../src/theme/usePalette';
import { customersRepo, paymentsRepo } from '../../lib/data/repository';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { useShop } from '../../context/AuthContext';
import type { DashboardScreenProps } from '../../navigation/types';
import type { Tables } from '../../lib/database.types';

type Transaction = Tables<'payments'> & { customerName: string };

export default function TransactionsScreen({ navigation }: DashboardScreenProps<'Transactions'>) {
  const { t } = useTranslation('dashboard');
  const shop = useShop();
  const showToast = useToast();
  const insets = useSafeAreaInsets();
  const palette = usePalette();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [payments, customers] = await Promise.all([
        paymentsRepo.listForShop(shop.id),
        customersRepo.list(shop.id),
      ]);
      const nameById = new Map(customers.map((c) => [c.id, c.name]));
      setTransactions(
        payments.map((p) => ({
          ...p,
          customerName: nameById.get(p.customer_id) ?? t('transactions.unknownCustomer'),
        }))
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('transactions.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  }, [shop.id, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const filtered = transactions.filter((tx) => tx.customerName.toLowerCase().includes(search.toLowerCase()));

  const header = (
    <Header
      title={t('transactions.title')}
      onBack={() => navigation.goBack()}
      searchProps={{
        value: search,
        onChangeText: setSearch,
        placeholder: t('transactions.searchPlaceholder'),
      }}
    />
  );

  if (loading && transactions.length === 0) {
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
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filtered.length === 0 ? { flexGrow: 1 } : { paddingBottom: insets.bottom + 80 }}
        ListEmptyComponent={<EmptyState icon="receipt" title={t('transactions.emptyTitle')} description={t('transactions.emptyDescription')} />}
        renderItem={({ item }) => (
          <ListRow
            title={item.customerName}
            subtitle={`${formatDateTime(item.payment_date)}${item.payment_mode ? ` · ${item.payment_mode}` : ''}`}
            leading={
              <View className="h-10 w-10 items-center justify-center rounded bg-success-50">
                <Icon name="rupee" size={20} color={palette.success} />
              </View>
            }
            trailing={
              <Text variant="bodyLg" tone="success" tabular>
                +{formatCurrency(item.amount_paid)}
              </Text>
            }
          />
        )}
      />
    </View>
  );
}
