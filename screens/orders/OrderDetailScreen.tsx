import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { DSBadge, useBadgeTones } from '../../components/ds/Badge';
import { useConfirmDelete } from '../../components/ds/ConfirmDelete';
import { DSButton } from '../../components/ds/Button';
import { DSSkeletonList } from '../../components/ds/Loading';
import { DSScreen } from '../../components/ds/Screen';
import { IconBolt, IconBrandWhatsapp, IconCalendarEvent, IconCheck, IconPencil, IconTrash } from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { ordersRepo, billsRepo, paymentsRepo, customersRepo, staffRepo } from '../../lib/data/repository';
import { sendPushNotification } from '../../lib/notify';
import { formatCurrency, formatDate } from '../../lib/format';
import { sendWhatsAppMessage } from '../../lib/whatsapp';
import { haptics } from '../../lib/haptics';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { primary, status, typography } from '../../constants/tokens';
import type { AppScreenProps } from '../../navigation/types';
import type { Customer, Order, Staff } from '../../types';

const f = typography.family;

type OrderDetail = Order & {
  customers: Pick<Customer, 'name' | 'phone'> | null;
  staff: Pick<Staff, 'name'> | null;
};

export default function OrderDetailScreen({ navigation, route }: AppScreenProps<'OrderDetail'>) {
  const { orderId } = route.params;
  const shop = useShop();
  const showToast = useToast();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('orders');
  const { colors, scheme } = useTheme();
  const tones = useBadgeTones();
  const { confirm: confirmDelete, popup: deletePopup } = useConfirmDelete();
  const dark = scheme === 'dark';

  /** Labels garment piece counts by type when the linked measurement says so. */
  function clothPieceLabel(garmentType: string | null | undefined): string {
    const normalized = (garmentType ?? '').trim().toLowerCase();
    if (normalized === 'pant') return t('detail.pantPieces');
    if (normalized === 'shirt') return t('detail.shirtPieces');
    return t('detail.clothPieces');
  }

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  /**
   * Live total/paid for the linked bill. orders.total_amount/paid_amount are
   * only a snapshot taken at order creation — once a payment is recorded on
   * the bill afterwards, those columns go stale, so whenever a bill exists we
   * source the payment figures from it instead.
   */
  const [billAmounts, setBillAmounts] = useState<{ total: number; paid: number } | null>(null);
  const [garmentType, setGarmentType] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Reads from the local-first mirror (same one order create/update/delete
      // write through) rather than Supabase directly — querying Supabase here
      // raced the background sync for freshly-created orders and made the
      // detail page look like it "wouldn't open" right after creating one.
      const order = await ordersRepo.get(orderId);
      if (!order) {
        // Order no longer exists (e.g. deleted elsewhere) — leave, but say
        // why instead of silently bouncing back with no explanation.
        showToast(t('detail.loadOrderFailed'), 'error');
        navigation.goBack();
        return;
      }

      const [customer, staffMember, orderItems] = await Promise.all([
        customersRepo.get(order.customer_id),
        order.assigned_staff_id ? staffRepo.get(order.assigned_staff_id) : Promise.resolve(null),
        ordersRepo.itemsForOrder(orderId),
      ]);
      setOrder({
        ...order,
        customers: customer ? { name: customer.name, phone: customer.phone } : null,
        staff: staffMember ? { name: staffMember.name } : null,
      });
      setGarmentType(orderItems[0]?.garment_type ?? null);

      const [shopBills, shopPayments] = await Promise.all([
        billsRepo.list(shop.id),
        paymentsRepo.listForShop(shop.id),
      ]);
      const bill = shopBills.find((b) => b.order_id === orderId) ?? null;
      setBillAmounts(
        bill
          ? {
              total: Number(bill.total_amount ?? 0),
              paid: shopPayments
                .filter((p) => p.bill_id === bill.id)
                .reduce((s, p) => s + Number(p.amount_paid ?? 0), 0),
            }
          : null
      );
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

  const markComplete = async () => {
    if (!order) return;
    setUpdating(true);
    try {
      await ordersRepo.update(orderId, shop.id, { status: 'delivered' });

      // Records this order against the assigned staff member so their "N
      // orders done" count (StaffListScreen) reflects real completions —
      // staff_orders otherwise has nothing that ever writes to it.
      if (order.assigned_staff_id) {
        try {
          const { data: existing } = await supabase
            .from('staff_orders')
            .select('id')
            .eq('order_id', orderId)
            .eq('staff_id', order.assigned_staff_id)
            .maybeSingle();

          if (existing) {
            await supabase
              .from('staff_orders')
              .update({ completed_at: new Date().toISOString() })
              .eq('id', existing.id);
          } else {
            await supabase.from('staff_orders').insert({
              shop_id: shop.id,
              order_id: orderId,
              staff_id: order.assigned_staff_id,
              completed_at: new Date().toISOString(),
            });
          }
        } catch {
          // Non-critical bookkeeping — the order status change itself
          // already succeeded and shouldn't be reported as a failure.
        }
      }

      void sendPushNotification({
        shopId: shop.id,
        type: 'order_ready',
        customerId: order.customer_id,
        title: t('detail.pushReadyTitle'),
        body: t('detail.pushReadyBody', { number: order.order_number, customerName: order.customers?.name ?? '' }),
      });

      setOrder({ ...order, status: 'delivered' });
      haptics.success();
    } catch (err) {
      haptics.error();
      showToast(err instanceof Error ? err.message : t('detail.updateStatusFailed'), 'error');
    } finally {
      setUpdating(false);
    }
  };

  /** Opens WhatsApp with a prefilled message; both action buttons funnel here. */
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
    confirmDelete({
      title: t('detail.deleteConfirmTitle'),
      description: t('detail.deleteConfirmMessage', { number: order.order_number }),
      confirmLabel: t('detail.delete'),
      cancelLabel: t('detail.cancel'),
      onConfirm: async () => {
        try {
          await ordersRepo.remove(orderId, shop.id);
          showToast(t('detail.deleteSuccess'), 'success');
          navigation.goBack();
        } catch (err) {
          showToast(err instanceof Error ? err.message : t('detail.deleteFailed'), 'error');
        }
      },
    });
  };

  const isDelivered = order?.status === 'delivered';
  const photos = order
    ? order.design_photo_urls?.length
      ? order.design_photo_urls
      : order.design_photo_url
        ? [order.design_photo_url]
        : []
    : [];

  const totalAmount = order ? (billAmounts ? billAmounts.total : Number(order.total_amount ?? 0)) : 0;
  const paidAmount = order ? (billAmounts ? billAmounts.paid : Number(order.paid_amount ?? 0)) : 0;
  const balanceDue = Math.max(totalAmount - paidAmount, 0);
  const hasBilling = order ? order.total_amount != null : false;
  const customerName = order?.customers?.name ?? '';
  const hasPhone = !!order?.customers?.phone;
  const paidRatio = totalAmount > 0 ? Math.min(1, paidAmount / totalAmount) : 0;

  const Row = ({ label, value, last }: { label: string; value: string; last?: boolean }) => (
    <View>
      <View style={[styles.kv, { paddingHorizontal: 16, paddingVertical: 13 }]}>
        <Text style={{ fontFamily: f.regular, fontSize: 14, color: colors.textMuted }}>{label}</Text>
        <Text style={{ fontFamily: f.semibold, fontSize: 14, color: colors.textPrimary }}>{value}</Text>
      </View>
      {last ? null : <View style={{ height: StyleSheet.hairlineWidth, marginLeft: 16, backgroundColor: colors.borderSubtle }} />}
    </View>
  );

  const card = [styles.card, { backgroundColor: colors.bgSurface, borderColor: dark ? '#262626' : colors.borderDefault }];

  return (
    <DSScreen
      title={order ? t('detail.orderNumber', { number: order.order_number }) : ''}
      onBack={() => navigation.goBack()}
      actions={
        order
          ? [
              { icon: IconPencil, label: 'Edit', onPress: () => navigation.navigate('OrderForm', { orderId }) },
              { icon: IconTrash, label: t('detail.delete'), onPress: handleDelete },
            ]
          : []
      }
    >
      {loading || !order ? (
        <View style={{ padding: 20 }}>
          <DSSkeletonList rows={4} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24, gap: 16 }} showsVerticalScrollIndicator={false}>
            {/* who and when — the two things that matter at a glance */}
            <Animated.View entering={FadeInDown.duration(300)} style={card}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: f.bold, fontSize: 22, color: colors.textPrimary }}>{customerName || `#${order.order_number}`}</Text>
                  <Text style={{ fontFamily: f.medium, fontSize: 13, color: colors.textMuted }}>#{order.order_number}</Text>
                </View>
                <DSBadge
                  label={isDelivered ? t('detail.orderDelivered') : t('detail.inProgress')}
                  bg={isDelivered ? tones.success.bg : tones.primary.bg}
                  fg={isDelivered ? tones.success.fg : tones.primary.fg}
                />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 14 }}>
                {order.delivery_date ? (
                  <DSBadge
                    icon={IconCalendarEvent}
                    label={t('detail.deliveryBadge', { date: formatDate(order.delivery_date) })}
                    bg={tones.neutral.bg}
                    fg={tones.neutral.fg}
                  />
                ) : null}
                {order.priority === 'urgent' ? (
                  <DSBadge icon={IconBolt} label={t('detail.urgent')} bg={tones.warning.bg} fg={tones.warning.fg} />
                ) : null}
              </View>
            </Animated.View>

            {/* photos */}
            {photos.length > 0 ? (
              <Animated.View entering={FadeInDown.delay(60).duration(300)} style={{ gap: 10 }}>
                <Text style={{ fontFamily: f.bold, fontSize: 18, color: colors.textPrimary }}>
                  {t('detail.designPhotos')} {photos.length > 1 ? `(${photos.length})` : ''}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                  {photos.map((url, index) => (
                    <Image key={`${url}-${index}`} source={{ uri: url }} style={styles.photo} resizeMode="cover" />
                  ))}
                </ScrollView>
              </Animated.View>
            ) : null}

            {/* details */}
            <Animated.View entering={FadeInDown.delay(120).duration(300)} style={{ gap: 10 }}>
              <Text style={{ fontFamily: f.bold, fontSize: 18, color: colors.textPrimary }}>{t('detail.orderDetails')}</Text>
              <View style={[styles.list, { backgroundColor: colors.bgSurface, borderColor: dark ? '#262626' : colors.borderDefault }]}>
                {order.cloth_count != null ? <Row label={clothPieceLabel(garmentType)} value={String(order.cloth_count)} /> : null}
                {order.bill_book_number ? <Row label={t('detail.billBookNumber')} value={order.bill_book_number} /> : null}
                <Row label={t('detail.orderDate')} value={formatDate(order.order_date)} />
                <Row label={t('detail.deliveryDate')} value={formatDate(order.delivery_date)} last={!order.staff?.name} />
                {order.staff?.name ? <Row label={t('detail.assignedStaff')} value={order.staff.name} last /> : null}
              </View>
            </Animated.View>

            {/* payment */}
            {hasBilling ? (
              <Animated.View entering={FadeInDown.delay(180).duration(300)} style={{ gap: 10 }}>
                <Text style={{ fontFamily: f.bold, fontSize: 18, color: colors.textPrimary }}>{t('detail.payment')}</Text>
                <View style={card}>
                  <View style={styles.kv}>
                    <Text style={{ fontFamily: f.regular, fontSize: 14, color: colors.textMuted }}>{t('detail.totalAmount')}</Text>
                    <Text style={{ fontFamily: f.bold, fontSize: 18, color: colors.textPrimary }}>{formatCurrency(totalAmount)}</Text>
                  </View>
                  <View style={[styles.track, { backgroundColor: dark ? '#262626' : '#E2E8F0' }]}>
                    <View style={[styles.fill, { width: `${paidRatio * 100}%` }]} />
                  </View>
                  <View style={styles.kv}>
                    <Text style={{ fontFamily: f.regular, fontSize: 14, color: colors.textMuted }}>{t('detail.paidAmount')}</Text>
                    <Text style={{ fontFamily: f.semibold, fontSize: 14, color: status.success[600] }}>{formatCurrency(paidAmount)}</Text>
                  </View>
                  <View style={styles.kv}>
                    <Text style={{ fontFamily: f.regular, fontSize: 14, color: colors.textMuted }}>{t('detail.balanceDue')}</Text>
                    <Text style={{ fontFamily: f.bold, fontSize: 14, color: balanceDue > 0 ? status.danger[600] : status.success[600] }}>
                      {formatCurrency(balanceDue)}
                    </Text>
                  </View>
                  {order.payment_mode ? (
                    <View style={styles.kv}>
                      <Text style={{ fontFamily: f.regular, fontSize: 14, color: colors.textMuted }}>{t('detail.paymentMode')}</Text>
                      <Text style={{ fontFamily: f.semibold, fontSize: 14, color: colors.textPrimary }}>{order.payment_mode}</Text>
                    </View>
                  ) : null}

                  {/* chasing money belongs next to the balance it refers to */}
                  {balanceDue > 0 ? (
                    <View style={{ marginTop: 14 }}>
                      <DSButton
                        title={t('detail.whatsapp.sendReminder')}
                        variant="line"
                        size="rg"
                        fullWidth
                        leftIcon={IconBrandWhatsapp}
                        disabled={!hasPhone}
                        onPress={() =>
                          sendMessage(
                            t('detail.whatsapp.reminderPaymentBody', {
                              customerName,
                              amount: formatCurrency(balanceDue),
                              orderNumber: order.order_number,
                              shopName: shop.shop_name,
                            })
                          )
                        }
                      />
                    </View>
                  ) : null}
                </View>
              </Animated.View>
            ) : null}

            {/* customer messaging */}
            <Animated.View entering={FadeInDown.delay(240).duration(300)} style={{ gap: 10 }}>
              <Text style={{ fontFamily: f.bold, fontSize: 18, color: colors.textPrimary }}>{t('detail.whatsapp.sectionTitle')}</Text>
              {!hasPhone ? (
                <Text style={{ fontFamily: f.regular, fontSize: 13, color: colors.textMuted }}>{t('detail.whatsapp.noPhone')}</Text>
              ) : null}
              <DSButton
                title={t('detail.whatsapp.sendCompletion')}
                variant="line"
                size="rg"
                fullWidth
                leftIcon={IconBrandWhatsapp}
                disabled={!hasPhone}
                onPress={() =>
                  sendMessage(
                    t('detail.whatsapp.completionBody', {
                      customerName,
                      orderNumber: order.order_number,
                      shopName: shop.shop_name,
                    })
                  )
                }
              />
            </Animated.View>
          </ScrollView>

          {/* the one status action stays pinned */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: insets.bottom + 12,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.borderDefault,
              backgroundColor: colors.bgPage,
            }}
          >
            {!isDelivered ? (
              <DSButton title={t('detail.markComplete')} size="lg" fullWidth leftIcon={IconCheck} loading={updating} onPress={markComplete} />
            ) : (
              <View style={[styles.done, { backgroundColor: dark ? '#0F2E1C' : status.success[50] }]}>
                <IconCheck size={18} color={status.success[600]} strokeWidth={2.4} />
                <Text style={{ fontFamily: f.semibold, fontSize: 15, color: status.success[600] }}>{t('detail.orderDelivered')}</Text>
              </View>
            )}
          </View>
        </>
      )}
      {deletePopup}
    </DSScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 24, padding: 16, gap: 10 },
  list: { borderWidth: 1, borderRadius: 24, overflow: 'hidden' },
  kv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 0 },
  photo: { width: 150, height: 200, borderRadius: 20 },
  track: { height: 8, borderRadius: 9999, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 9999, backgroundColor: primary[600] },
  done: { height: 56, borderRadius: 9999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
