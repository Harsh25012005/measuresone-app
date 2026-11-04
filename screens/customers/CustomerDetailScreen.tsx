import { useCallback, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import {
  Avatar,
  Badge,
  Button,
  CallButton,
  Card,
  Chip,
  EmptyState,
  Header,
  Icon,
  IconButton,
  ListRow,
  Section,
  SegmentedControl,
  Skeleton,
  Text,
  useToast,
  WhatsAppButton,
} from '../../src/components/ui';
import { usePalette } from '../../src/theme/usePalette';
import {
  billsRepo,
  customerMeasurementsRepo,
  customersRepo,
  ordersRepo,
  universalTemplatesRepo,
} from '../../lib/data/repository';
import { formatCurrency, formatDate } from '../../lib/format';
import {
  extractClothTypes,
  extractMeasurementHistory,
  loadMeasurementView,
  loadMeasurementViewForCloth,
  type ClothTypeRecord,
  type MeasurementHistoryItem,
  type MeasurementView,
} from '../../lib/measurementLayout';
import { garmentNameLabel, measurementFieldLabel } from '../../lib/measurementNames';
import { haptics } from '../../lib/haptics';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { CustomersScreenProps } from '../../navigation/types';
import type { Customer, Order } from '../../types';
import type { Tables } from '../../lib/database.types';

type TabKey = 'measurements' | 'orders';

export default function CustomerDetailScreen({
  navigation,
  route,
}: CustomersScreenProps<'CustomerDetail'>) {
  const { t } = useTranslation('customers');
  const { customerId } = route.params;
  const shop = useShop();
  const showToast = useToast();
  const { colors } = useTheme();
  const palette = usePalette();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [profile, setProfile] = useState<Tables<'customer_measurements'> | null>(null);
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [measurementView, setMeasurementView] = useState<MeasurementView[]>([]);
  const [clothTypes, setClothTypes] = useState<ClothTypeRecord[]>([]);
  const [selectedCloth, setSelectedCloth] = useState<string>('all');
  const [history, setHistory] = useState<MeasurementHistoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('measurements');

  const load = useCallback(async () => {
    try {
      const [customerData, allOrders, balanceByCustomer, profileData, allTemplates] = await Promise.all([
        customersRepo.get(customerId),
        ordersRepo.list(shop.id),
        billsRepo.pendingBalanceByCustomer(shop.id),
        customerMeasurementsRepo.getByCustomer(customerId),
        universalTemplatesRepo.list(shop.id),
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
      setProfile(profileData);

      const extracted = extractClothTypes(profileData, allTemplates);
      setClothTypes(extracted);

      const hist = extractMeasurementHistory(profileData, allTemplates);
      setHistory(hist);

      setMeasurementView(
        await loadMeasurementViewForCloth(
          shop.id,
          profileData,
          selectedCloth === 'all' ? null : selectedCloth
        )
      );

      if (profileData?.template_id) {
        const tmpl = allTemplates.find((t) => t.id === profileData.template_id);
        setTemplateName(tmpl?.template_name ?? null);
      } else {
        setTemplateName(null);
      }
    } catch {
      showToast(t('detail.loadError'), 'error');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [customerId, navigation, selectedCloth, shop.id, showToast, t]);

  const handleSelectCloth = async (cloth: string) => {
    setSelectedCloth(cloth);
    setMeasurementView(
      await loadMeasurementViewForCloth(shop.id, profile, cloth === 'all' ? null : cloth)
    );
  };

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

  if (loading || !customer) {
    return (
      <View className="flex-1 bg-bg">
        <Header title={t('detail.loading')} />
        <View className="gap-4 p-4">
          <Skeleton height={200} />
          <Skeleton height={48} />
          <Skeleton height={160} />
        </View>
      </View>
    );
  }

  const activeOrdersCount = orders.filter((o) => o.status !== 'delivered').length;
  const bookText = customer.book_number ? t('detail.bookLabel', { number: customer.book_number }) : '';
  // Active work first; delivered orders follow under their own divider.
  const activeOrders = orders.filter((o) => o.status !== 'delivered');
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');
  const measurementCount = measurementView.reduce((sum, g) => sum + g.entries.length, 0);

  const renderOrderRow = (o: (typeof orders)[number], last: boolean) => {
    const bal = Math.max(Number(o.total_amount ?? 0) - Number(o.paid_amount ?? 0), 0);
    return (
      <ListRow
        key={o.id}
        title={`#${o.order_number} · ${o.cloth_type || t('form.defaultGarmentType')}`}
        subtitle={formatDate(o.order_date)}
        meta={<Badge size="sm" type="order_status" value={o.status} />}
        trailing={
          bal > 0 ? (
            <>
              <Text variant="bodyLg" tone="danger" tabular>
                {formatCurrency(bal)}
              </Text>
              <Text variant="caption" tone="muted" weight="regular">
                {t('detail.dueText')}
              </Text>
            </>
          ) : (
            <Text variant="label" tone="success">
              {t('orders:list.paidText', { defaultValue: 'Paid' })}
            </Text>
          )
        }
        onPress={() => navigation.navigate('OrderDetail', { orderId: o.id })}
        divider={!last}
      />
    );
  };

  return (
    <View className="flex-1 bg-bg">
      <Header
        title={customer.name}
        onBack={() => navigation.goBack()}
        right={
          <IconButton
            icon="edit"
            variant="ghost"
            accessibilityLabel={t('common:a11y.editClient')}
            onPress={() => navigation.navigate('CustomerForm', { customerId })}
          />
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 16 }}>
        <Card>
          <View className="flex-row items-center">
            <Avatar name={customer.name} size="lg" />
            <View className="ml-3 min-w-0 flex-1">
              <Text variant="headline" numberOfLines={1}>
                {customer.name}
              </Text>
              <Text variant="label" tone="muted" weight="regular" numberOfLines={1} tabular>
                {[bookText, customer.phone ? `+91 ${customer.phone}` : t('detail.noPhone')].filter(Boolean).join(' · ')}
              </Text>
              {customer.address ? (
                <Text variant="caption" tone="muted" weight="regular" numberOfLines={1}>
                  {customer.address}
                </Text>
              ) : null}
            </View>
          </View>

          <View className="mt-3 flex-row items-end justify-between border-t border-line-2 pt-3">
            <View>
              <Text variant="caption" tone="muted" weight="regular">
                {t('detail.outstandingBalance')}
              </Text>
              <Text variant="display" tone={balance > 0 ? 'danger' : 'success'} tabular>
                {formatCurrency(balance)}
              </Text>
            </View>
            <View className="items-end">
              <Text variant="label" tone="muted" weight="regular" tabular>
                {orders.length} {t('detail.totalOrders')}
              </Text>
              <Text variant="label" tone="muted" weight="regular" tabular>
                {activeOrdersCount} {t('detail.activeOrders')}
              </Text>
            </View>
          </View>

          <View className="mt-3 flex-row gap-2 border-t border-line-2 pt-3">
            <Button
              title={t('detail.newOrder')}
              icon={<Icon name="plus" size={20} color={colors.onPrimary} />}
              className="flex-[1.4]"
              onPress={() => {
                haptics.tap();
                navigation.navigate('OrderForm', { customerId: customer.id });
              }}
            />
            <Button
              title={t('detail.measurements')}
              variant="secondary"
              icon={<Icon name="ruler" size={20} color={colors.textPrimary} />}
              className="flex-1"
              onPress={() => {
                haptics.tap();
                navigation.navigate('MeasurementForm', { customerId: customer.id });
              }}
            />
          </View>
          {customer.phone ? (
            <View className="mt-2 flex-row gap-2">
              <CallButton phone={customer.phone} />
              <WhatsAppButton phone={customer.phone} />
            </View>
          ) : null}
        </Card>

        <SegmentedControl
          options={[
            { label: t('detail.measurementsTab'), value: 'measurements' as TabKey, count: measurementCount || undefined },
            { label: t('detail.ordersTab'), value: 'orders' as TabKey, count: orders.length },
          ]}
          value={tab}
          onChange={(v) => {
            haptics.tap();
            setTab(v);
          }}
        />

        {tab === 'measurements' ? (
          <>
            {clothTypes.length > 0 ? (
              <View className="mb-1">
                <Text variant="caption" tone="muted" className="mb-2 px-1">
                  {t('detail.filterByCloth')}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <Chip
                    label={t('detail.allCloths')}
                    selected={selectedCloth === 'all'}
                    onPress={() => void handleSelectCloth('all')}
                  />
                  {clothTypes.map((c) => (
                    <Chip
                      key={c.clothType}
                      label={garmentNameLabel(c.clothType)}
                      selected={selectedCloth === c.clothType}
                      onPress={() => void handleSelectCloth(c.clothType)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {measurementView.length > 0 ? (
              <Section
                title={
                  selectedCloth !== 'all'
                    ? garmentNameLabel(selectedCloth)
                    : templateName
                    ? garmentNameLabel(templateName)
                    : t('detail.measurements')
                }
              >
                {measurementView.map((group, gIdx) => (
                  <View key={`${group.title ?? 'all'}-${gIdx}`} className="mb-4">
                    {group.title ? (
                      <Text variant="caption" tone="muted" className="mb-2">
                        {garmentNameLabel(group.title)}
                      </Text>
                    ) : null}
                    <View className="flex-row flex-wrap gap-2">
                      {group.entries.map(([label, val]) => (
                        <View key={label} className="min-w-[88px] flex-1 rounded-md border border-line-2 bg-surface-2 px-3 py-2">
                          <Text variant="caption" tone="muted" weight="regular" numberOfLines={1}>
                            {measurementFieldLabel(label)}
                          </Text>
                          <Text variant="bodyLg" tabular>
                            {val}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
                <Button
                  title={
                    selectedCloth !== 'all'
                      ? t('detail.editClothMeasurement', { cloth: garmentNameLabel(selectedCloth) })
                      : t('detail.addMeasurement')
                  }
                  variant="secondary"
                  onPress={() =>
                    navigation.navigate('MeasurementForm', {
                      customerId: customer.id,
                      clothType: selectedCloth !== 'all' ? selectedCloth : undefined,
                    })
                  }
                />
              </Section>
            ) : (
              <EmptyState
                variant="compact"
                icon="ruler"
                title={t('detail.noMeasurementsTitle')}
                description={t('detail.noMeasurementsDescription')}
                actionLabel={t('detail.takeMeasurement')}
                onAction={() => navigation.navigate('MeasurementForm', { customerId: customer.id })}
              />
            )}

            {history.length > 0 ? (
              <Section
                title={t('detail.measurementHistory')}
                action={
                  <Badge
                    label={`${history.length}`}
                    tone="primary"
                    size="sm"
                  />
                }
              >
                <View className="gap-3">
                  {history.map((item, idx) => (
                    <Card key={item.id || idx} variant="subtle" className="p-3">
                      <View className="mb-2 flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <Badge
                            label={garmentNameLabel(item.cloth_type)}
                            tone="primary"
                            icon="ruler"
                            size="sm"
                          />
                          <Text variant="caption" tone="muted" weight="regular">
                            {formatDate(item.date)}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row flex-wrap gap-1.5 pt-1">
                        {Object.entries(
                          typeof item.values === 'object' && item.values !== null
                            ? item.values
                            : {}
                        )
                          .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
                          .slice(0, 10)
                          .map(([field, val]) => (
                            <View key={field} className="rounded border border-line-2 bg-surface px-2 py-1">
                              <Text variant="caption" tone="muted">
                                {measurementFieldLabel(field)}:{' '}
                                <Text variant="caption" weight="bold">
                                  {String(val)}
                                </Text>
                              </Text>
                            </View>
                          ))}
                      </View>
                    </Card>
                  ))}
                </View>
              </Section>
            ) : null}
          </>
        ) : orders.length === 0 ? (
          <EmptyState
            variant="compact"
            icon="orders"
            title={t('detail.noOrdersTitle')}
            description={t('detail.noOrdersDescription')}
            actionLabel={t('detail.newOrder')}
            onAction={() => navigation.navigate('OrderForm', { customerId: customer.id })}
          />
        ) : (
          <>
            {activeOrders.length > 0 ? (
              <Section padded={false}>{activeOrders.map((o, i) => renderOrderRow(o, i === activeOrders.length - 1))}</Section>
            ) : null}
            {deliveredOrders.length > 0 ? (
              <Section title={`${t('orders:list.delivered', { defaultValue: 'Delivered' })} · ${deliveredOrders.length}`} padded={false}>
                {deliveredOrders.map((o, i) => renderOrderRow(o, i === deliveredOrders.length - 1))}
              </Section>
            ) : null}
          </>
        )}

        <Button
          title={t('detail.deleteCustomer')}
          variant="danger"
          icon={<Icon name="trash" size={20} color={palette.danger} />}
          onPress={handleDeleteCustomer}
        />
      </ScrollView>
    </View>
  );
}
