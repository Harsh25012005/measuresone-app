import { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome5 } from '../../components/ds/legacyIcons';
import { Avatar, Badge, Card, EmptyState, Header, LoadingSpinner, SearchBar, useToast } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { customersRepo, ordersRepo, billsRepo, customerMeasurementsRepo, universalTemplatesRepo } from '../../lib/data/repository';
import { formatCurrency, formatDate } from '../../lib/format';
import { sendWhatsAppMessage, buildPaymentDueMessage } from '../../lib/whatsapp';
import { useShop } from '../../context/AuthContext';
import type { CustomersScreenProps } from '../../navigation/types';
import type { Bill, Customer, Order } from '../../types';
import type { Tables } from '../../lib/database.types';

const TABS = ['info', 'orders', 'bills'] as const;
type TabKey = (typeof TABS)[number];

export default function CustomerDetailScreen({
  navigation,
  route,
}: CustomersScreenProps<'CustomerDetail'>) {
  const { t } = useTranslation('customers');
  const { customerId } = route.params;
  const shop = useShop();
  const showToast = useToast();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerMeasurementProfile, setCustomerMeasurementProfile] = useState<Tables<'customer_measurements'> | null>(null);
  const [profileTemplateName, setProfileTemplateName] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bills, setBills] = useState<(Bill & { paid: number })[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  // Billing list deep-links straight into the Bills tab for a client.
  const [tab, setTab] = useState<TabKey>(route.params?.initialTab ?? 'info');
  const [search, setSearch] = useState('');

  const q = search.trim().toLowerCase();
  const filteredOrders = q
    ? orders.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          (o.cloth_type ?? '').toLowerCase().includes(q)
      )
    : orders;
  const filteredBills = q
    ? bills.filter(
        (b) =>
          String(b.total_amount ?? '').includes(q) ||
          (b.payment_status ?? '').toLowerCase().includes(q) ||
          formatDate(b.created_at).toLowerCase().includes(q)
      )
    : bills;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [customerData, allOrders, balanceByCustomer, allBills, profile] = await Promise.all([
        customersRepo.get(customerId),
        ordersRepo.list(shop.id),
        billsRepo.pendingBalanceByCustomer(shop.id),
        billsRepo.listWithPayments(shop.id),
        customerMeasurementsRepo.getByCustomer(customerId),
      ]);

      if (!customerData) {
        showToast(t('detail.loadError'), 'error');
        navigation.goBack();
        return;
      }

      setCustomer(customerData);
      setOrders(
        allOrders
          .filter((o) => o.customer_id === customerId)
          .sort((a, b) => (a.order_date < b.order_date ? 1 : -1))
      );
      setBalance(balanceByCustomer[customerId] ?? 0);
      setBills(
        allBills
          .filter((b) => b.customer_id === customerId)
          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      );

      setCustomerMeasurementProfile(profile);
      if (profile?.template_id) {
        const tmpl = await universalTemplatesRepo.get(profile.template_id);
        setProfileTemplateName(tmpl?.template_name ?? null);
      } else {
        setProfileTemplateName(null);
      }
    } catch {
      showToast(t('detail.loadError'), 'error');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [customerId, navigation, shop.id, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleDeleteCustomer = () => {
    if (!customer) return;
    Alert.alert(
      t('detail.deleteConfirmTitle'),
      t('detail.deleteConfirmMessage', { name: customer.name }),
      [
        { text: t('detail.cancel'), style: 'cancel' },
        {
          text: t('detail.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await customersRepo.remove(customerId, shop.id);
              showToast(t('detail.deleteSuccess'), 'success');
              navigation.goBack();
            } catch (err) {
              showToast(err instanceof Error ? err.message : t('detail.deleteFailed'), 'error');
            }
          },
        },
      ]
    );
  };

  const handleDeleteMeasurement = (measurementId: string, garmentType: string) => {
    Alert.alert(
      t('detail.deleteMeasurementConfirmTitle'),
      t('detail.deleteMeasurementConfirmMessage', { garmentType }),
      [
        { text: t('detail.cancel'), style: 'cancel' },
        {
          text: t('detail.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('measurements').delete().eq('id', measurementId);
              if (error) throw error;
              showToast(t('detail.deleteMeasurementSuccess'), 'success');
              void load();
            } catch {
              showToast(t('detail.deleteMeasurementFailed'), 'error');
            }
          },
        },
      ]
    );
  };

  const handleRemind = async () => {
    if (!customer) return;
    try {
      await sendWhatsAppMessage(
        customer.phone,
        buildPaymentDueMessage({
          shopName: shop.shop_name,
          customerName: customer.name,
          pending: balance,
        })
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('detail.whatsappError'), 'error');
    }
  };

  if (loading || !customer) return <LoadingSpinner fullScreen text={t('detail.loading')} />;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      <Header
        title={customer.name}
        onBack={() => navigation.goBack()}
        right={
          <View className="flex-row items-center">
            <Pressable
              onPress={() => navigation.navigate('CustomerForm', { customerId })}
              hitSlop={8}
              className="h-10 w-10 items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-gray-800"
            >
              <FontAwesome5 name="pen" size={15} color="#1D4ED8" />
            </Pressable>
            <Pressable
              onPress={handleDeleteCustomer}
              hitSlop={8}
              className="h-10 w-10 items-center justify-center rounded-full active:bg-gray-100 dark:active:bg-gray-800"
            >
              <FontAwesome5 name="trash-alt" size={15} color="#DC2626" />
            </Pressable>
          </View>
        }
      />
      {/* Client card sits above the tabs — who this person is stays visible
          no matter which tab is open, rather than being tab-one content. */}
      <View className="bg-gray-50 px-4 pt-6 dark:bg-gray-950">
        <Card>
          <View className="flex-row items-center">
            <Avatar name={customer.name} size="lg" />
            <View className="ml-4 flex-1">
              <Text className="text-lg font-semibold text-gray-900 dark:text-gray-50">{customer.name}</Text>
              <Text className="font-sans text-base text-gray-500 dark:text-gray-400">{customer.phone ?? t('detail.noPhone')}</Text>
              {customer.address ? (
                <Text className="font-sans text-base text-gray-500 dark:text-gray-400">{customer.address}</Text>
              ) : null}
              {customer.book_number ? (
                <Text className="font-sans text-base text-gray-500 dark:text-gray-400">
                  {t('detail.bookNumberPrefix')} {customer.book_number}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>
      </View>

      {/* Three tabs instead of one long scroll: a client page mixes three
          unrelated jobs (who they are, what they've ordered, what they owe)
          and stacking them meant scrolling past measurements to reach money. */}
      <View className="mt-4 flex-row border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
        {TABS.map((tabKey) => {
          const active = tab === tabKey;
          return (
            <Pressable
              key={tabKey}
              onPress={() => setTab(tabKey)}
              className={`min-h-[52px] flex-1 items-center justify-center border-b-2 ${
                active ? 'border-primary-600' : 'border-transparent'
              }`}
            >
              <Text
                className={`text-base font-semibold ${
                  active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {t(`detail.tabs.${tabKey}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab !== 'info' ? (
        <View className="bg-white px-4 pt-3 dark:bg-gray-950">
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder={t(tab === 'orders' ? 'detail.searchOrders' : 'detail.searchBills')}
          />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 224 }}>
        {tab === 'info' ? (
        <>

        <View>
          <View className="mb-2 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <FontAwesome5 name="ruler-combined" size={13} color="#6B7280" />
              <Text className="ml-2 text-base font-semibold text-gray-900 dark:text-gray-50">{t('detail.measurements')}</Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('MeasurementForm', { customerId })}
              className="rounded-md bg-primary-50 px-3 py-1.5 dark:bg-primary-950"
            >
              <Text className="text-base font-semibold text-primary-600 dark:text-primary-400">
                {customerMeasurementProfile ? 'Edit Measurements' : 'Add Measurements'}
              </Text>
            </Pressable>
          </View>

          {customerMeasurementProfile ? (
            <Card
              onPress={() => navigation.navigate('MeasurementForm', { customerId })}
              className="p-4"
            >
              <View className="flex-row items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-3">
                <View>
                  <Text className="text-base font-semibold text-gray-900 dark:text-gray-50">
                    {profileTemplateName ?? 'Customer Measurements'}
                  </Text>
                  <Text className="text-xs text-gray-500">Universal Profile</Text>
                </View>
                <Text className="text-xs text-primary-600 font-semibold">Edit</Text>
              </View>

              <View className="flex-row flex-wrap gap-y-3">
                {Object.entries(
                  typeof customerMeasurementProfile.measurements === 'object' && customerMeasurementProfile.measurements
                    ? (customerMeasurementProfile.measurements as Record<string, unknown>)
                    : {}
                ).map(([key, val]) => (
                  <View key={key} className="w-1/3 pr-2">
                    <Text className="font-sans text-xs text-gray-500 dark:text-gray-400">{key}</Text>
                    <Text className="text-base font-semibold text-gray-900 dark:text-gray-50">{String(val)}</Text>
                  </View>
                ))}
              </View>

              <Text className="font-sans mt-3 text-xs text-gray-400 dark:text-gray-500">
                {t('detail.updated', { date: formatDate(customerMeasurementProfile.updated_at) })}
              </Text>
            </Card>
          ) : (
            <EmptyState
              variant="compact"
              icon="ruler-combined"
              title="No measurements added"
              description="Add measurements once for this customer to reuse across all orders."
            />
          )}
        </View>
        </>
        ) : null}

        {tab === 'orders' ? (
        <View>
          <View className="mb-2 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <FontAwesome5 name="tshirt" size={13} color="#6B7280" />
              <Text className="ml-2 text-base font-semibold text-gray-900 dark:text-gray-50">{t('detail.orderHistory')}</Text>
            </View>
            <Pressable
              onPress={() => navigation.navigate('OrderForm', { customerId })}
              className="rounded-md bg-primary-50 px-3 py-1.5 dark:bg-primary-950"
            >
              <Text className="text-base font-semibold text-primary-600 dark:text-primary-400">{t('detail.newOrderShort')}</Text>
            </Pressable>
          </View>
          {filteredOrders.length > 0 ? (
            <View className="gap-2">
              {filteredOrders.map((o) => (
                <Card
                  key={o.id}
                  onPress={() => navigation.navigate('OrderDetail', { orderId: o.id })}
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-gray-900 dark:text-gray-50">#{o.order_number}</Text>
                    {o.delivery_date ? (
                      <Badge
                        label={t('detail.deliveryBadge', { date: formatDate(o.delivery_date) })}
                        bg="#F3F4F6"
                        color="#374151"
                      />
                    ) : null}
                  </View>
                  <Text className="font-sans mt-1 text-base text-gray-500 dark:text-gray-400">
                    {o.cloth_type ?? t('detail.noClothType')} · {t('detail.ordered', { date: formatDate(o.order_date) })}
                  </Text>
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState
              variant="compact"
              icon="tshirt"
              title={t('detail.noOrdersTitle')}
              description={t('detail.noOrdersDescription')}
            />
          )}
        </View>
        ) : null}

        {tab === 'bills' ? (
          <View>
            <View className="mb-3 flex-row items-center justify-between rounded-lg bg-gray-100 px-4 py-3 dark:bg-gray-800">
              <Text className="text-base text-gray-600 dark:text-gray-300">{t('detail.outstandingBalance')}</Text>
              <Text className={`text-xl font-bold ${balance > 0 ? 'text-danger' : 'text-success'}`}>
                {formatCurrency(balance)}
              </Text>
            </View>

            {filteredBills.length > 0 ? (
              <View className="gap-2">
                {filteredBills.map((b) => {
                  const pending = Math.max(Number(b.total_amount ?? 0) - Number(b.paid ?? 0), 0);
                  return (
                    <Card key={b.id} onPress={() => navigation.navigate('BillDetail', { billId: b.id })}>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-base font-semibold text-gray-900 dark:text-gray-50">
                          {formatCurrency(b.total_amount)}
                        </Text>
                        <Badge type="payment_status" value={b.payment_status} />
                      </View>
                      <View className="mt-1 flex-row items-center justify-between">
                        <Text className="font-sans text-base text-gray-500 dark:text-gray-400">
                          {formatDate(b.created_at)}
                        </Text>
                        {pending > 0 ? (
                          <Text className="text-base font-semibold text-danger">
                            {t('detail.pendingAmount', { amount: formatCurrency(pending) })}
                          </Text>
                        ) : null}
                      </View>
                    </Card>
                  );
                })}
              </View>
            ) : (
              <EmptyState
                variant="compact"
                icon="file-invoice-dollar"
                title={t('detail.noBillsTitle')}
                description={t('detail.noBillsDescription')}
              />
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
