import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { DSAvatar } from '../../components/ds/Avatar';
import { DSBadge } from '../../components/ds/Badge';
import { useConfirmDelete } from '../../components/ds/ConfirmDelete';
import { DSButton } from '../../components/ds/Button';
import { DSEmptyState } from '../../components/ds/EmptyState';
import { DSInput } from '../../components/ds/Input';
import { DSOrderList, type OrderItem } from '../../components/ds/Lists';
import { DSSkeletonList } from '../../components/ds/Loading';
import { DSScreen } from '../../components/ds/Screen';
import { DSTabs } from '../../components/ds/Tabs';
import {
  IconClipboardPlus,
  IconMapPin,
  IconPencil,
  IconPhone,
  IconReceipt,
  IconRuler2,
  IconShirt,
  IconTrash,
  type TablerIcon,
} from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { customersRepo, ordersRepo, billsRepo, customerMeasurementsRepo, universalTemplatesRepo } from '../../lib/data/repository';
import { formatCurrency, formatDate } from '../../lib/format';
import { sendWhatsAppMessage, buildPaymentDueMessage } from '../../lib/whatsapp';
import { groupMeasurements } from '../../lib/measurementGroups';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { colors as legacyColors, darkColors } from '../../constants/theme';
import { primary, status, typography } from '../../constants/tokens';
import type { CustomersScreenProps } from '../../navigation/types';
import type { Bill, Customer, Order } from '../../types';
import type { Tables } from '../../lib/database.types';

const f = typography.family;

const TABS = ['info', 'orders', 'bills'] as const;
type TabKey = (typeof TABS)[number];

const PAYMENT_LABEL = { paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid' } as const;

function ActionTile({ icon: Icon, label, onPress }: { icon: TablerIcon; label: string; onPress: () => void }) {
  const { colors, scheme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: pressed ? colors.bgSubtle : colors.bgSurface, borderColor: scheme === 'dark' ? '#262626' : colors.borderDefault },
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: colors.primaryTint }]}>
        <Icon size={18} color={primary[600]} strokeWidth={2} />
      </View>
      <Text style={{ fontFamily: f.semibold, fontSize: 12, color: colors.textPrimary }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function toOrderItem(o: Order, clientName: string, fallbackGarment: string, bill?: { total_amount: number | null; paid: number }): OrderItem {
  // the bill's payments are the live figure; orders.paid_amount is only a snapshot from creation
  const total = bill ? Number(bill.total_amount ?? 0) : Number(o.total_amount ?? 0);
  const paid = bill ? Number(bill.paid ?? 0) : Number(o.paid_amount ?? 0);
  return {
    id: o.id,
    number: String(o.order_number).replace(/^ORD-/i, 'O-'),
    clientName,
    garment: o.cloth_type || fallbackGarment,
    pieces: o.cloth_count ?? 1,
    total,
    paid,
    payment: total > 0 && paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
    date: o.order_date ? new Date(o.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—',
  };
}

export default function CustomerDetailScreen({
  navigation,
  route,
}: CustomersScreenProps<'CustomerDetail'>) {
  const { t } = useTranslation('customers');
  const { t: tOrders } = useTranslation('orders');
  const { customerId } = route.params;
  const shop = useShop();
  const showToast = useToast();
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const palette = dark ? darkColors : legacyColors;

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

  const { confirm: confirmDelete, popup: deletePopup } = useConfirmDelete();

  const handleDeleteCustomer = () => {
    if (!customer) return;
    confirmDelete({
      title: t('detail.deleteConfirmTitle'),
      description: t('detail.deleteConfirmMessage', { name: customer.name }),
      confirmLabel: t('detail.delete'),
      cancelLabel: t('detail.cancel'),
      onConfirm: async () => {
        try {
          await customersRepo.remove(customerId, shop.id);
          showToast(t('detail.deleteSuccess'), 'success');
          navigation.goBack();
        } catch (err) {
          showToast(err instanceof Error ? err.message : t('detail.deleteFailed'), 'error');
        }
      },
    });
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
  void handleDeleteMeasurement;

  const measurementGroups = groupMeasurements(customerMeasurementProfile?.measurements);

  return (
    <DSScreen
      title={customer?.name ?? ''}
      onBack={() => navigation.goBack()}
      actions={
        customer
          ? [
              { icon: IconPencil, label: t('detail.edit', { defaultValue: 'Edit' }), onPress: () => navigation.navigate('CustomerForm', { customerId }) },
              { icon: IconTrash, label: t('detail.delete'), onPress: handleDeleteCustomer },
            ]
          : []
      }
    >
      {loading || !customer ? (
        <View style={{ padding: 20 }}>
          <DSSkeletonList rows={4} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 18 }} showsVerticalScrollIndicator={false}>
          {/* who this person is stays visible whichever tab is open */}
          <Animated.View entering={FadeInDown.duration(300)} style={styles.profile}>
            <DSAvatar name={customer.name} size="xl" />
            <Text style={{ fontFamily: f.bold, fontSize: 24, lineHeight: 30, color: colors.textPrimary, textAlign: 'center' }} numberOfLines={2}>
              {customer.name}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              <View style={[styles.infoChip, { backgroundColor: colors.bgSubtle }]}>
                <IconPhone size={14} color={colors.textMuted} />
                <Text style={{ fontFamily: f.medium, fontSize: 13, color: colors.textSecondary }}>{customer.phone ?? t('detail.noPhone')}</Text>
              </View>
              {customer.address ? (
                <View style={[styles.infoChip, { backgroundColor: colors.bgSubtle, maxWidth: '100%' }]}>
                  <IconMapPin size={14} color={colors.textMuted} />
                  <Text style={{ fontFamily: f.medium, fontSize: 13, color: colors.textSecondary, flexShrink: 1 }} numberOfLines={1}>
                    {customer.address}
                  </Text>
                </View>
              ) : null}
              {customer.book_number ? (
                <View style={[styles.infoChip, { backgroundColor: colors.primaryTint }]}>
                  <Text style={{ fontFamily: f.bold, fontSize: 12, color: primary[600] }}>
                    {t('detail.clientNumber')} {customer.book_number}
                  </Text>
                </View>
              ) : null}
            </View>
          </Animated.View>

          {/* quick actions */}
          <Animated.View entering={FadeInDown.delay(120).duration(300)} style={{ flexDirection: 'row', gap: 10 }}>
            <ActionTile
              icon={IconPhone}
              label={t('detail.call')}
              onPress={() => {
                if (customer.phone) void Linking.openURL(`tel:${customer.phone}`);
              }}
            />
            <ActionTile icon={IconClipboardPlus} label={t('detail.newOrderAction')} onPress={() => navigation.navigate('OrderForm', { customerId })} />
          </Animated.View>

          <DSTabs
            variant="pill"
            value={tab}
            onChange={(k) => {
              setTab(k as TabKey);
              setSearch('');
            }}
            items={TABS.map((k) => ({ key: k, label: t(`detail.tabs.${k}`) }))}
          />

          {/* ── info: measurements ── */}
          {tab === 'info' ? (
            <View style={{ gap: 12 }}>
              <View style={styles.sectionHead}>
                <Text style={{ fontFamily: f.bold, fontSize: 18, color: colors.textPrimary }}>{t('detail.measurements')}</Text>
                <DSButton
                  title={t(customerMeasurementProfile ? 'detail.editMeasurements' : 'detail.addMeasurements')}
                  variant="link"
                  size="sm"
                  onPress={() => navigation.navigate('MeasurementForm', { customerId })}
                />
              </View>

              {customerMeasurementProfile ? (
                <Pressable
                  onPress={() => navigation.navigate('MeasurementForm', { customerId })}
                  style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: dark ? '#262626' : colors.borderDefault }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <View>
                      <Text style={{ fontFamily: f.semibold, fontSize: 15, color: colors.textPrimary }}>
                        {profileTemplateName ?? t('detail.measurements')}
                      </Text>
                      <Text style={{ fontFamily: f.regular, fontSize: 12, color: colors.textMuted }}>{t('detail.universalProfile')}</Text>
                    </View>
                    <IconRuler2 size={22} color={primary[600]} />
                  </View>
                  {measurementGroups.map(({ label: group, entries }, gi) => (
                    <View key={group || 'flat'} style={{ marginTop: gi > 0 ? 14 : 0, gap: 8 }}>
                      {group ? (
                        <Text style={{ fontFamily: f.semibold, fontSize: 12, color: colors.textSecondary }}>{group.replace(/_/g, ' ')}</Text>
                      ) : null}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {entries.map(([key, val]) => (
                          <View key={key} style={[styles.chip, { backgroundColor: colors.primaryTint }]}>
                            <Text style={{ fontFamily: f.medium, fontSize: 11, color: colors.textMuted }} numberOfLines={1}>
                              {key}
                            </Text>
                            <Text style={{ fontFamily: f.bold, fontSize: 17, color: primary[600] }}>{String(val)}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                  <Text style={{ fontFamily: f.regular, fontSize: 12, color: colors.textFaint, marginTop: 12 }}>
                    {t('detail.updated', { date: formatDate(customerMeasurementProfile.updated_at) })}
                  </Text>
                </Pressable>
              ) : (
                <DSEmptyState
                  variant="compact"
                  icon={IconRuler2}
                  title={t('detail.noMeasurementsTitle')}
                  description={t('detail.noMeasurementsDescription')}
                  actionLabel={t('detail.addMeasurements')}
                  onAction={() => navigation.navigate('MeasurementForm', { customerId })}
                />
              )}
            </View>
          ) : null}

          {/* ── orders ── */}
          {tab === 'orders' ? (
            <View style={{ gap: 14 }}>
              <View style={styles.sectionHead}>
                <Text style={{ fontFamily: f.bold, fontSize: 18, color: colors.textPrimary }}>{t('detail.orderHistory')}</Text>
                <DSButton title={t('detail.newOrderShort')} variant="link" size="sm" onPress={() => navigation.navigate('OrderForm', { customerId })} />
              </View>
              <DSInput kind="search" label={t('detail.searchOrders')} placeholder={t('detail.searchOrders')} value={search} onChangeText={setSearch} />
              {filteredOrders.length > 0 ? (
                <DSOrderList
                  items={filteredOrders.map((o) => toOrderItem(o, customer.name, tOrders('form.defaultGarmentType'), bills.find((b) => b.order_id === o.id)))}
                  onPressItem={(item) => navigation.navigate('OrderDetail', { orderId: item.id })}
                />
              ) : (
                <DSEmptyState variant="compact" icon={IconShirt} title={t('detail.noOrdersTitle')} description={t('detail.noOrdersDescription')} />
              )}
            </View>
          ) : null}

          {/* ── bills ── */}
          {tab === 'bills' ? (
            <View style={{ gap: 14 }}>
              <DSInput kind="search" label={t('detail.searchBills')} placeholder={t('detail.searchBills')} value={search} onChangeText={setSearch} />
              {balance > 0 ? (
                <View style={{ alignItems: 'flex-start' }}>
                  <DSButton title={t('detail.whatsappReminder', { defaultValue: 'Send reminder on WhatsApp' })} variant="line" size="sm" onPress={handleRemind} />
                </View>
              ) : null}
              {filteredBills.length > 0 ? (
                <View style={[styles.list, { backgroundColor: colors.bgSurface, borderColor: dark ? '#262626' : colors.borderDefault }]}>
                  {filteredBills.map((b, i) => {
                    const pending = Math.max(Number(b.total_amount ?? 0) - Number(b.paid ?? 0), 0);
                    const pay = palette.payment[b.payment_status];
                    return (
                      <View key={b.id}>
                        <Pressable
                          onPress={() => navigation.navigate('BillDetail', { billId: b.id })}
                          style={({ pressed }) => [styles.billRow, { backgroundColor: pressed ? colors.bgSubtle : 'transparent' }]}
                        >
                          <View style={[styles.billIcon, { backgroundColor: pay.bg }]}>
                            <IconReceipt size={20} color={pay.text} strokeWidth={2} />
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Text style={{ fontFamily: f.bold, fontSize: 16, color: colors.textPrimary }}>{formatCurrency(b.total_amount)}</Text>
                            <Text style={{ fontFamily: f.regular, fontSize: 13, color: colors.textMuted }}>{formatDate(b.created_at)}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 6 }}>
                            {pending > 0 ? (
                              <Text style={{ fontFamily: f.bold, fontSize: 13, color: status.danger[600] }}>
                                {t('detail.pendingAmount', { amount: formatCurrency(pending) })}
                              </Text>
                            ) : null}
                            <DSBadge size="sm" label={PAYMENT_LABEL[b.payment_status]} bg={pay.bg} fg={pay.text} />
                          </View>
                        </Pressable>
                        {i < filteredBills.length - 1 ? (
                          <View style={{ height: StyleSheet.hairlineWidth, marginLeft: 16, backgroundColor: colors.borderSubtle }} />
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <DSEmptyState variant="compact" icon={IconReceipt} title={t('detail.noBillsTitle')} description={t('detail.noBillsDescription')} />
              )}
            </View>
          ) : null}
        </ScrollView>
      )}
      {deletePopup}
    </DSScreen>
  );
}

const styles = StyleSheet.create({
  profile: { alignItems: 'center', gap: 12, paddingTop: 4 },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 9999 },
  balance: { borderRadius: 24, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  action: { flex: 1, borderWidth: 1, borderRadius: 22, paddingVertical: 14, alignItems: 'center', gap: 8 },
  actionIcon: { width: 40, height: 40, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
  card: { borderWidth: 1, borderRadius: 24, padding: 16 },
  chip: { width: '31%', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, gap: 2 },
  list: { borderWidth: 1, borderRadius: 24, overflow: 'hidden' },
  billRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  billIcon: { width: 44, height: 44, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
});
