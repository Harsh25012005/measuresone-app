import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { DSEmptyState } from '../../components/ds/EmptyState';
import { DSSkeletonList } from '../../components/ds/Loading';
import { DSScreen, GlassSearch } from '../../components/ds/Screen';
import { IconCurrencyRupee, IconReceipt } from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { customersRepo, paymentsRepo } from '../../lib/data/repository';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { status, typography } from '../../constants/tokens';
import type { DashboardScreenProps } from '../../navigation/types';
import type { Tables } from '../../lib/database.types';

const f = typography.family;

type Transaction = Tables<'payments'> & { customerName: string };

export default function TransactionsScreen({ navigation }: DashboardScreenProps<'Transactions'>) {
  const { t } = useTranslation('dashboard');
  const shop = useShop();
  const showToast = useToast();
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
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

  return (
    <DSScreen
      title={t('transactions.title')}
      onBack={() => navigation.goBack()}
      headerExtra={<GlassSearch value={search} onChangeText={setSearch} placeholder={t('transactions.searchPlaceholder')} />}
    >
      {loading ? (
        <View style={{ padding: 20 }}>
          <DSSkeletonList rows={6} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={filtered.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : { padding: 20, paddingBottom: 140, gap: 10 }}
          ListEmptyComponent={
            <DSEmptyState icon={IconReceipt} title={t('transactions.emptyTitle')} description={t('transactions.emptyDescription')} />
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(280)}
              style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: dark ? '#262626' : colors.borderDefault }]}
            >
              <View style={[styles.icon, { backgroundColor: dark ? '#0F2E1C' : status.success[100] }]}>
                <IconCurrencyRupee size={20} color={status.success[600]} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: f.semibold, fontSize: 15, color: colors.textPrimary }} numberOfLines={1}>
                  {item.customerName}
                </Text>
                <Text style={{ fontFamily: f.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
                  {formatDateTime(item.payment_date)}
                  {item.payment_mode ? ` · ${item.payment_mode}` : ''}
                </Text>
              </View>
              <Text style={{ fontFamily: f.bold, fontSize: 16, color: status.success[600] }}>+{formatCurrency(item.amount_paid)}</Text>
            </Animated.View>
          )}
        />
      )}
    </DSScreen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 24, borderWidth: 1 },
  icon: { width: 44, height: 44, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
});
