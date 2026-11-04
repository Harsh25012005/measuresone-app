import { useCallback, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  Header,
  Icon,
  IconButton,
  ListRow,
  RadioGroup,
  RecordPaymentSheet,
  Section,
  SegmentedControl,
  Skeleton,
  Text,
  useToast,
} from '../../src/components/ui';
import { usePalette } from '../../src/theme/usePalette';
import { getDueInfo } from '../../lib/dueInfo';
import { supabase } from '../../lib/supabase';
import {
  billsRepo,
  customerMeasurementsRepo,
  customersRepo,
  ordersRepo,
  paymentsRepo,
  staffRepo,
} from '../../lib/data/repository';
import { applyOrderStatus } from '../../lib/orderStatus';
import { formatCurrency, formatDate } from '../../lib/format';
import { sendWhatsAppMessage } from '../../lib/whatsapp';
import { haptics } from '../../lib/haptics';
import { summarizePieces } from '../../lib/garments';
import { useSendBill } from '../../lib/useSendBill';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { garmentNameLabel, measurementFieldLabel } from '../../lib/measurementNames';
import { loadMeasurementView, loadMeasurementViewForCloth, type MeasurementView } from '../../lib/measurementLayout';
import type { AppScreenProps } from '../../navigation/types';
import type { Customer, Order, OrderStatus, Staff } from '../../types';
import type { Tables } from '../../lib/database.types';

type OrderDetail = Order & {
  customers: Pick<Customer, 'name' | 'phone'> | null;
  staff: Pick<Staff, 'name'> | null;
};

export default function OrderDetailScreen({ navigation, route }: AppScreenProps<'OrderDetail'>) {
  const { orderId } = route.params;
  const shop = useShop();
  const showToast = useToast();
  const { colors } = useTheme();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('orders');
  const { t: tDash } = useTranslation('dashboard');

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<Tables<'order_items'>[]>([]);
  const [measurementView, setMeasurementView] = useState<MeasurementView[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [billPayments, setBillPayments] = useState<Tables<'payments'>[]>([]);
  const [billId, setBillId] = useState<string | null>(null);
  const [billAmounts, setBillAmounts] = useState<{ total: number; paid: number } | null>(null);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);
  const [staffPickerVisible, setStaffPickerVisible] = useState(false);

  const { send: sendBill, sending: sendingBill } = useSendBill(billId);

  const load = useCallback(async () => {
    try {
      const orderData = await ordersRepo.get(orderId);
      if (!orderData) {
        showToast(t('detail.loadOrderFailed'), 'error');
        navigation.goBack();
        return;
      }

      const [customer, staffMember, orderItems, shopBills, shopPayments, allStaff, meas] =
        await Promise.all([
          customersRepo.get(orderData.customer_id),
          orderData.assigned_staff_id ? staffRepo.get(orderData.assigned_staff_id) : Promise.resolve(null),
          ordersRepo.itemsForOrder(orderId),
          billsRepo.list(shop.id),
          paymentsRepo.listForShop(shop.id),
          staffRepo.list(shop.id, { activeOnly: true }),
          customerMeasurementsRepo.getByCustomer(orderData.customer_id),
        ]);

      setOrder({
        ...orderData,
        customers: customer ? { name: customer.name, phone: customer.phone } : null,
        staff: staffMember ? { name: staffMember.name } : null,
      });
      setItems(orderItems);
      setStaffList(allStaff);
      setMeasurementView(await loadMeasurementViewForCloth(shop.id, meas, orderData.cloth_type));

      const bill = shopBills.find((b) => b.order_id === orderId) ?? null;
      let currentBill = bill;
      if (!currentBill && (orderData.total_amount ?? 0) > 0) {
        try {
          currentBill = await billsRepo.create({
            shop_id: shop.id,
            order_id: orderId,
            customer_id: orderData.customer_id,
            total_amount: orderData.total_amount,
            payment_status:
              (orderData.paid_amount ?? 0) >= (orderData.total_amount ?? 0)
                ? 'paid'
                : (orderData.paid_amount ?? 0) > 0
                ? 'partial'
                : 'unpaid',
          });
        } catch {
          // fallback
        }
      }
      setBillId(currentBill?.id ?? null);
      if (currentBill) {
        const linkedPayments = shopPayments.filter((p) => p.bill_id === currentBill.id);
        const paid = linkedPayments.reduce((s, p) => s + Number(p.amount_paid ?? 0), 0);
        setBillPayments(linkedPayments);
        setBillAmounts({
          total: Number(currentBill.total_amount ?? 0),
          paid,
        });
      } else {
        setBillPayments([]);
        setBillAmounts(null);
      }
    } catch {
      showToast(t('detail.loadOrderFailed'), 'error');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [orderId, navigation, shop.id, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const currentTotal = billAmounts ? billAmounts.total : Number(order?.total_amount ?? 0);
  const currentPaid = billAmounts ? billAmounts.paid : Number(order?.paid_amount ?? 0);
  const currentBalance = Math.max(currentTotal - currentPaid, 0);

  const executeStatusChange = async (targetStatus: OrderStatus) => {
    if (!order) return;
    setUpdating(true);
    try {
      haptics.success();
      await applyOrderStatus(shop.id, order, targetStatus, order.customers?.name ?? '');

      setOrder({ ...order, status: targetStatus });
      showToast(
        targetStatus === 'ready'
          ? t('detail.markReady') + ' ✓'
          : targetStatus === 'delivered'
          ? t('detail.orderDelivered')
          : t('detail.statusReceived'),
        'success'
      );
    } catch (err) {
      haptics.error();
      showToast(err instanceof Error ? err.message : t('detail.updateStatusFailed'), 'error');
    } finally {
      setUpdating(false);
    }
  };

  const setStatus = (targetStatus: OrderStatus) => {
    if (!order || order.status === targetStatus) return;

    if (order.status === 'delivered' && targetStatus !== 'delivered') {
      Alert.alert(
        t('detail.reopenOrderTitle'),
        t('detail.reopenOrderDesc'),
        [
          { text: t('common:actions.cancel'), style: 'cancel' },
          {
            text: t('detail.reopen'),
            onPress: () => void executeStatusChange(targetStatus),
          },
        ]
      );
      return;
    }

    if (targetStatus === 'delivered' && currentBalance > 0) {
      Alert.alert(
        t('detail.balancePendingTitle'),
        t('detail.balancePendingDesc', {
          amount: formatCurrency(currentBalance),
          number: order.order_number,
        }),
        [
          { text: t('common:actions.cancel'), style: 'cancel' },
          {
            text: t('detail.deliverWithoutPayment'),
            style: 'destructive',
            onPress: () => void executeStatusChange(targetStatus),
          },
          {
            text: t('detail.collectAndDeliver'),
            onPress: () => {
              setPaymentSheetVisible(true);
            },
          },
        ]
      );
      return;
    }

    void executeStatusChange(targetStatus);
  };

  const handleAssignStaff = async (staffId: string | null) => {
    if (!order) return;
    try {
      haptics.tap();
      await ordersRepo.update(orderId, shop.id, { assigned_staff_id: staffId });
      const staffMember = staffId ? staffList.find((s) => s.id === staffId) : null;
      setOrder({
        ...order,
        assigned_staff_id: staffId,
        staff: staffMember ? { name: staffMember.name } : null,
      });
      setStaffPickerVisible(false);
      showToast(t('detail.staffAssigned'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('detail.updateStatusFailed'), 'error');
    }
  };

  const handleAddPhoto = async () => {
    if (!order) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        const newUri = result.assets[0].uri;
        const currentUrls = order.design_photo_urls || [];
        const updatedUrls = [...currentUrls, newUri];
        await ordersRepo.update(orderId, shop.id, { design_photo_urls: updatedUrls });
        setOrder({ ...order, design_photo_urls: updatedUrls });
        showToast(t('detail.photoAdded'), 'success');
      }
    } catch {
      showToast(t('form.photoUploadFailed', { defaultValue: 'Could not add photo' }), 'error');
    }
  };

  const sendMessage = async (body: string) => {
    if (!order?.customers?.phone) {
      showToast(t('detail.whatsapp.noPhone'), 'error');
      return;
    }
    try {
      await sendWhatsAppMessage(order.customers.phone, body);
    } catch (err) {
      haptics.error();
      showToast(err instanceof Error ? err.message : t('detail.whatsapp.sendFailed'), 'error');
    }
  };

  const handleDelete = () => {
    if (!order) return;
    Alert.alert(
      t('detail.deleteConfirmTitle'),
      t('detail.deleteConfirmMessage', { number: order.order_number }),
      [
        { text: t('detail.cancel'), style: 'cancel' },
        {
          text: t('detail.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await ordersRepo.remove(orderId, shop.id);
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

  if (loading || !order) {
    return (
      <View className="flex-1 bg-bg">
        <Header title={t('detail.loadingOrder')} />
        <View className="gap-4 p-4">
          <Skeleton height={150} />
          <Skeleton height={64} />
          <Skeleton height={180} />
        </View>
      </View>
    );
  }

  const isDelivered = order.status === 'delivered';
  const isReady = order.status === 'ready';

  const photos = order.design_photo_urls?.length
    ? order.design_photo_urls
    : order.design_photo_url
    ? [order.design_photo_url]
    : [];

  const totalAmount = billAmounts ? billAmounts.total : Number(order.total_amount ?? 0);
  const paidAmount = billAmounts ? billAmounts.paid : Number(order.paid_amount ?? 0);
  const balanceDue = Math.max(totalAmount - paidAmount, 0);
  const customerName = order.customers?.name ?? t('form.customer', { defaultValue: 'Unknown customer' });
  const hasPhone = Boolean(order.customers?.phone);

  const itemsSummaryText =
    items.length > 0
      ? items.map((i) => `${i.cloth_count} x ${i.garment_type}`).join(', ')
      : order.cloth_type
      ? `${order.cloth_type}${order.cloth_count ? ` (${order.cloth_count})` : ''}`
      : t('form.defaultGarmentType', { defaultValue: 'Garment' });

  const due = isDelivered ? null : getDueInfo(order.delivery_date, order.status, tDash);
  const statusOptions = [
    { value: 'order_taken', label: t('detail.statusReceived') },
    { value: 'ready', label: t('detail.statusReady') },
    { value: 'delivered', label: t('detail.statusDelivered') },
  ];
  const statusValue = order.status === 'cutting' || order.status === 'stitching' ? 'order_taken' : order.status;

  const readyMessage = t('detail.readyWhatsAppBody', {
    customerName,
    orderNumber: order.order_number,
    shopName: shop.shop_name,
  });
  const completionMessage = t('detail.whatsapp.completionBody', {
    customerName,
    orderNumber: order.order_number,
    shopName: shop.shop_name,
  });

  return (
    <View className="flex-1 bg-bg">
      <Header
        title={`${t('orders:order', { defaultValue: 'Order' })} #${order.order_number}`}
        onBack={() => navigation.goBack()}
        right={
          <>
            <IconButton
              icon="edit"
              variant="ghost"
              accessibilityLabel={t('common:a11y.editOrder')}
              onPress={() => navigation.navigate('OrderForm', { orderId })}
            />
            <IconButton
              icon="trash"
              variant="ghost"
              color={palette.danger}
              accessibilityLabel={t('common:a11y.deleteOrder')}
              onPress={handleDelete}
            />
          </>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 16 }}>
        {/* Who, what, when, how much, with the contact shortcuts right there. */}
        <Card>
          <View className="mb-2 flex-row flex-wrap items-center gap-2">
            <Badge type="order_status" value={order.status} />
            {due && due.text ? <Badge label={due.text} tone={due.tone} icon={due.late ? 'alert' : 'clock'} /> : null}
            {order.is_rush && !isDelivered ? <Badge label={t('detail.urgent')} tone="danger" icon="flame" /> : null}
          </View>

          <Pressable
            onPress={() =>
              navigation.navigate('CustomersTab' as any, {
                screen: 'CustomerDetail',
                initial: false,
                params: { customerId: order.customer_id },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={customerName}
            className="min-h-touch flex-row items-center justify-between"
          >
            <Text variant="headline" numberOfLines={2} className="flex-1">
              {customerName}
            </Text>
            <Icon name="chev" size={20} color={colors.textFaint} />
          </Pressable>

          <Text variant="body" tone="muted" className="mt-0.5">
            {itemsSummaryText} · <Text variant="body" tabular weight="semibold">{formatCurrency(totalAmount)}</Text>
          </Text>

          <View className="mt-3 flex-row items-center justify-between border-t border-line-2 pt-3">
            <Text variant="caption" tone="muted" weight="regular">
              {t('detail.orderedOn')} {formatDate(order.order_date)}
            </Text>
            {order.delivery_date ? (
              <Text variant="caption" tone="muted" weight="regular">
                {t('detail.deliveryDate')}: {formatDate(order.delivery_date)}
              </Text>
            ) : null}
          </View>

          {hasPhone ? (
            <View className="mt-3 flex-row gap-2 border-t border-line-2 pt-3">
              <Button
                title={t('common:actions.call', { defaultValue: 'Call' })}
                variant="secondary"
                icon={<Icon name="phone" size={18} color={colors.textPrimary} />}
                className="flex-1"
                onPress={() => Linking.openURL(`tel:${order.customers?.phone}`)}
              />
              <Button
                title="WhatsApp"
                variant="tonal"
                icon={<Icon name="chat" size={18} color={colors.primary} />}
                className="flex-1"
                onPress={() => sendMessage(isReady ? readyMessage : completionMessage)}
              />
            </View>
          ) : null}
        </Card>

        {/* Status: any step can be set directly; the sticky button below does the usual next step. */}
        <Section title={t('detail.status', { defaultValue: 'Status' })} padded>
          <SegmentedControl options={statusOptions} value={statusValue} onChange={(v) => setStatus(v as OrderStatus)} />
          {isDelivered ? (
            <Text variant="label" tone="muted" weight="regular" className="mt-3 text-center">
              {t('detail.orderDelivered')} · {formatDate(order.delivery_date)}
            </Text>
          ) : null}
        </Section>

        <Section
          title={t('detail.clothes')}
          action={
            photos.length < 4 ? (
              <Button
                title={t('detail.addPhoto')}
                variant="ghost"
                size="sm"
                fullWidth={false}
                icon={<Icon name="camera" size={16} color={colors.primary} />}
                onPress={handleAddPhoto}
              />
            ) : undefined
          }
        >
          {items.map((it, idx) => (
            <View key={it.id} className={`pb-3 ${idx < items.length - 1 ? 'mb-3 border-b border-line-2' : ''}`}>
              <View className="flex-row items-center justify-between">
                <Text variant="bodyLg" className="flex-1">
                  {idx + 1}. {it.garment_type}{' '}
                  <Text variant="label" tone="muted" tabular>× {it.cloth_count}</Text>
                </Text>
                <Text variant="label" tone="muted" weight="regular" tabular>
                  {formatCurrency(Number(it.unit_price))} {t('detail.each')}
                </Text>
              </View>
              {it.notes ? (
                <Text variant="label" tone="muted" weight="regular" className="mt-1 italic">
                  &ldquo;{it.notes}&rdquo;
                </Text>
              ) : null}
            </View>
          ))}

          {photos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {photos.map((url, index) => (
                  <Image
                    key={`${url}-${index}`}
                    source={{ uri: url }}
                    accessibilityIgnoresInvertColors
                    accessibilityLabel={`${t('detail.designPhotos')} ${index + 1}`}
                    className="h-32 w-28 rounded border border-line"
                    resizeMode="cover"
                  />
                ))}
              </View>
            </ScrollView>
          ) : (
            <Button
              title={t('detail.addPhoto')}
              variant="secondary"
              icon={<Icon name="camera" size={18} color={colors.textPrimary} />}
              onPress={handleAddPhoto}
            />
          )}
        </Section>

        <Section title={t('detail.measurements')}>
          {measurementView.length > 0 ? (
            <View className="gap-3">
              {measurementView.map((group) => (
                <View key={group.title ?? 'all'} className="gap-1.5">
                  {group.title ? (
                    <Text variant="caption" tone="muted">
                      {garmentNameLabel(group.title)}
                    </Text>
                  ) : null}
                  <View className="flex-row flex-wrap gap-2">
                    {group.entries.map(([k, v]) => (
                      <View key={k} className="min-w-[88px] flex-1 rounded-md border border-line-2 bg-surface-2 px-3 py-2">
                        <Text variant="caption" tone="muted" weight="regular" numberOfLines={1}>
                          {measurementFieldLabel(k)}
                        </Text>
                        <Text variant="bodyLg" tabular>
                          {v}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
              <Button
                title={t('orders:form.measurementCard.viewEdit')}
                variant="ghost"
                size="sm"
                fullWidth={false}
                className="self-start"
                icon={<Icon name="edit" size={16} color={colors.primary} />}
                onPress={() => navigation.navigate('MeasurementForm', { customerId: order.customer_id })}
              />
            </View>
          ) : (
            <View className="flex-row items-center justify-between">
              <View className="mr-3 flex-1 flex-row items-center">
                <Icon name="ruler" size={20} color={colors.textMuted} />
                <Text variant="body" tone="muted" className="ml-2 flex-1">
                  {t('detail.noMeasurement')}
                </Text>
              </View>
              <Button
                title={t('common:actions.add', { defaultValue: 'Add' })}
                size="sm"
                fullWidth={false}
                onPress={() => navigation.navigate('MeasurementForm', { customerId: order.customer_id })}
              />
            </View>
          )}
        </Section>

        <Section title={t('detail.work')} padded={false}>
          <ListRow
            title={t('detail.karigar')}
            trailing={<Text variant="bodyLg">{order.staff?.name || t('detail.notAssigned')}</Text>}
            onPress={() => setStaffPickerVisible(true)}
            divider={!!order.bill_book_number}
          />
          {order.bill_book_number ? (
            <ListRow
              title={t('detail.billBookNumber')}
              trailing={<Text variant="bodyLg" tabular>{order.bill_book_number}</Text>}
              divider={false}
            />
          ) : null}
        </Section>

        <Section
          title={t('detail.payment')}
          action={
            balanceDue > 0 ? (
              <Button
                title={t('detail.addPayment')}
                size="sm"
                fullWidth={false}
                onPress={() => setPaymentSheetVisible(true)}
              />
            ) : undefined
          }
        >
          <View className="mb-3 border-b border-line-2 pb-3">
            <Text variant="display" tone={balanceDue > 0 ? 'danger' : 'success'} tabular>
              {balanceDue > 0 ? formatCurrency(balanceDue) : t('detail.fullyPaid')}
            </Text>
            <Text variant="label" tone="muted" weight="regular">
              {balanceDue > 0 ? t('detail.balance') : `${formatCurrency(totalAmount)} ${t('list.paidText')}`}
            </Text>
          </View>

          <View className="gap-2">
            {items.map((it) => (
              <View key={it.id} className="flex-row items-center justify-between">
                <Text variant="label" weight="regular">
                  {it.cloth_count} × {it.garment_type}
                </Text>
                <Text variant="label" tabular>
                  {formatCurrency(Number(it.cloth_count) * Number(it.unit_price))}
                </Text>
              </View>
            ))}
            <View className="flex-row items-center justify-between border-t border-line-2 pt-2">
              <Text variant="bodyLg">{t('detail.totalAmount')}</Text>
              <Text variant="bodyLg" tabular>
                {formatCurrency(totalAmount)}
              </Text>
            </View>
          </View>

          {billPayments.length > 0 ? (
            <View className="mt-3 gap-2 border-t border-line-2 pt-3">
              {billPayments.map((p) => (
                <View key={p.id} className="flex-row items-center justify-between">
                  <Text variant="caption" tone="muted" weight="regular">
                    {formatDate(p.payment_date)} ·{' '}
                    {t(`billing:detail.paymentModes.${p.payment_mode || 'Cash'}`, { defaultValue: p.payment_mode || 'Cash' })}
                  </Text>
                  <Text variant="label" tone="success" tabular>
                    +{formatCurrency(Number(p.amount_paid))}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {billId && hasPhone ? (
            <Button
              title={t('detail.receipt')}
              variant="secondary"
              className="mt-3"
              icon={<Icon name="receipt" size={18} color={colors.textPrimary} />}
              loading={sendingBill}
              onPress={sendBill}
            />
          ) : null}
        </Section>

        <Section padded={false}>
          <ListRow
            title={t('detail.repeatOrder')}
            leading={<Icon name="copy" size={20} color={colors.textPrimary} />}
            onPress={() => navigation.navigate('OrderForm', { customerId: order.customer_id })}
            divider={false}
          />
        </Section>
      </ScrollView>

      {/* Sticky next step: Mark ready, then Mark delivered. */}
      {!isDelivered ? (
        <View style={{ paddingBottom: Math.max(insets.bottom, 12) }} className="flex-row gap-2 border-t border-line bg-surface px-4 pt-3">
          {isReady && hasPhone ? (
            <IconButton
              icon="chat"
              variant="tonal"
              accessibilityLabel={t('detail.tellReadyWhatsApp')}
              onPress={() => sendMessage(readyMessage)}
            />
          ) : null}
          <View className="flex-1">
            <Button
              title={!isReady ? t('detail.markReady') : t('detail.markDelivered')}
              icon={<Icon name="check" size={20} color={colors.onPrimary} />}
              size="lg"
              loading={updating}
              onPress={() => setStatus(!isReady ? 'ready' : 'delivered')}
            />
          </View>
        </View>
      ) : null}

      <BottomSheet visible={staffPickerVisible} onClose={() => setStaffPickerVisible(false)} title={t('detail.assignedStaff')}>
        <RadioGroup
          variant="cards"
          value={order.assigned_staff_id ?? ''}
          onChange={(v) => handleAssignStaff(v === '' ? null : v)}
          options={[{ label: t('detail.notAssigned'), value: '' }, ...staffList.map((s) => ({ label: s.name, value: s.id }))]}
        />
      </BottomSheet>

      <RecordPaymentSheet
        visible={paymentSheetVisible}
        bill={
          billId && balanceDue > 0
            ? {
                id: billId,
                customerId: order.customer_id,
                customerName,
                pending: balanceDue,
              }
            : null
        }
        onClose={() => setPaymentSheetVisible(false)}
        onSaved={async () => {
          setPaymentSheetVisible(false);
          await load();
        }}
      />
    </View>
  );
}
