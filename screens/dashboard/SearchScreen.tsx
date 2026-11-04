import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { SectionList, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import {
  Avatar,
  Badge,
  BottomSheet,
  Button,
  EmptyState,
  Header,
  Icon,
  ListRow,
  QuickAddCustomerSheet,
  SearchBar,
  Text,
  useToast,
  VoiceListeningOverlay,
} from '../../src/components/ui';
import { customersRepo, ordersRepo } from '../../lib/data/repository';
import { formatCurrency } from '../../lib/format';
import { searchAll } from '../../lib/search';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { DashboardScreenProps } from '../../navigation/types';
import type { OrderListItem } from '../../types';
import type { Tables } from '../../lib/database.types';

type Customer = Tables<'customers'>;

type Row =
  | { kind: 'customer'; key: string; customer: Customer }
  | { kind: 'order'; key: string; order: OrderListItem };

type Section = { key: string; title: string; data: Row[] };

const RECENT_LIMIT = 5;

export default function SearchScreen({ navigation }: DashboardScreenProps<'Search'>) {
  const { t } = useTranslation('dashboard');
  const { t: to } = useTranslation('orders');
  const shop = useShop();
  const showToast = useToast();
  const { colors } = useTheme();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [query, setQuery] = useState('');
  const [dictating, setDictating] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [quickAddVisible, setQuickAddVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void customersRepo.list(shop.id).then(setCustomers);
      void ordersRepo.listWithCustomer(shop.id).then(setOrders);
    }, [shop.id])
  );

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) setQuery(transcript);
  });
  useSpeechRecognitionEvent('end', () => setDictating(false));
  useSpeechRecognitionEvent('error', () => {
    setDictating(false);
    showToast(t('search.dictationFailed'), 'error');
  });

  const startDictation = async () => {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      showToast(t('search.micPermissionRequired'), 'error');
      return;
    }
    setDictating(true);
    ExpoSpeechRecognitionModule.start({ lang: 'en-IN', interimResults: true });
  };

  const stopDictation = () => {
    ExpoSpeechRecognitionModule.stop();
    setDictating(false);
  };

  const sections = useMemo<Section[]>(() => {
    if (query.trim() === '') {
      // Recent clients = the people on the latest orders, newest first.
      const seen = new Set<string>();
      const recent: Customer[] = [];
      const byId = new Map(customers.map((c) => [c.id, c]));
      for (const o of [...orders].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))) {
        const c = byId.get(o.customer_id);
        if (c && !seen.has(c.id)) {
          seen.add(c.id);
          recent.push(c);
          if (recent.length === RECENT_LIMIT) break;
        }
      }
      return recent.length
        ? [{ key: 'recent', title: t('search.recent'), data: recent.map((c) => ({ kind: 'customer' as const, key: `r-${c.id}`, customer: c })) }]
        : [];
    }
    const found = searchAll(query, customers, orders);
    const out: Section[] = [];
    if (found.orders.length)
      out.push({ key: 'orders', title: t('search.orders'), data: found.orders.slice(0, 30).map((o) => ({ kind: 'order' as const, key: `o-${o.id}`, order: o })) });
    if (found.customers.length)
      out.push({ key: 'customers', title: t('search.clients'), data: found.customers.slice(0, 30).map((c) => ({ kind: 'customer' as const, key: `c-${c.id}`, customer: c })) });
    return out;
  }, [query, customers, orders, t]);

  const handleCreated = (customer: Customer) => {
    setQuickAddVisible(false);
    setCustomers((prev) => [...prev, customer]);
    setActiveCustomer(customer);
  };

  const closeThen = (fn: (customer: Customer) => void) => () => {
    const customer = activeCustomer;
    setActiveCustomer(null);
    if (customer) fn(customer);
  };

  const searching = query.trim() !== '';

  return (
    <View className="flex-1 bg-bg">
      <Header title={t('search.title')} onBack={() => navigation.goBack()} />

      <View className="px-4 pt-3">
        <SearchBar
          value={query}
          onChangeText={setQuery}
          placeholder={t('search.placeholder')}
          autoFocus
          onMicPress={() => (dictating ? stopDictation() : startDictation())}
        />
      </View>

      {sections.length === 0 ? (
        searching ? (
          <EmptyState
            icon="users"
            title={t('search.noResultsTitle')}
            description={t('search.noResultsDescription')}
            actionLabel={t('search.addClient')}
            onAction={() => setQuickAddVisible(true)}
          />
        ) : (
          <EmptyState icon="search" title={t('search.emptyPromptTitle')} description={t('search.emptyPromptDescription')} />
        )
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(r) => r.key}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderSectionHeader={({ section }) => (
            <View className="px-4 pb-1 pt-4">
              <Text variant="label" tone="muted" accessibilityRole="header">
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }) =>
            item.kind === 'order' ? (
              <ListRow
                title={`#${item.order.order_number} · ${item.order.customers?.name ?? to('form.customer')}`}
                subtitle={item.order.cloth_type ?? undefined}
                meta={
                  <View className="flex-row flex-wrap gap-1.5">
                    <Badge size="sm" type="order_status" value={item.order.status} />
                    {item.order.bill_book_number ? <Badge size="sm" icon="receipt" label={item.order.bill_book_number} /> : null}
                  </View>
                }
                trailing={
                  Number(item.order.total_amount ?? 0) - Number(item.order.paid_amount ?? 0) > 0 ? (
                    <Text variant="bodyLg" tone="danger" tabular>
                      {formatCurrency(Number(item.order.total_amount ?? 0) - Number(item.order.paid_amount ?? 0))}
                    </Text>
                  ) : undefined
                }
                onPress={() => navigation.navigate('OrderDetail', { orderId: item.order.id })}
              />
            ) : (
              <ListRow
                title={item.customer.name}
                subtitle={[item.customer.book_number ? t('search.book', { number: item.customer.book_number }) : null, item.customer.phone ? `+91 ${item.customer.phone}` : t('search.noPhone')]
                  .filter(Boolean)
                  .join(' · ')}
                leading={<Avatar name={item.customer.name} size="md" />}
                onPress={() => setActiveCustomer(item.customer)}
              />
            )
          }
        />
      )}

      <BottomSheet visible={!!activeCustomer} onClose={() => setActiveCustomer(null)} title={activeCustomer?.name}>
        <View className="gap-3">
          <Button
            title={t('search.createOrder')}
            icon={<Icon name="plus" size={20} color={colors.onPrimary} />}
            onPress={closeThen((c) => navigation.navigate('OrderForm', { customerId: c.id }))}
          />
          <Button
            title={t('search.takeMeasurements')}
            variant="secondary"
            icon={<Icon name="ruler" size={20} color={colors.textPrimary} />}
            onPress={closeThen((c) => navigation.navigate('MeasurementForm', { customerId: c.id }))}
          />
          <Button
            title={t('search.viewDetails')}
            variant="tonal"
            onPress={closeThen((c) =>
              (navigation as unknown as { navigate: (t: string, p?: object) => void }).navigate('CustomersTab', {
                screen: 'CustomerDetail',
                initial: false,
                params: { customerId: c.id },
              })
            )}
          />
        </View>
      </BottomSheet>

      <QuickAddCustomerSheet visible={quickAddVisible} onClose={() => setQuickAddVisible(false)} onCreated={handleCreated} />

      <VoiceListeningOverlay
        visible={dictating}
        onStop={stopDictation}
        label={t('search.listening', { defaultValue: 'Listening…' })}
        hint={t('search.listeningHint', { defaultValue: 'Say customer name, tap to stop' })}
      />
    </View>
  );
}
