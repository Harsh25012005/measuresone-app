import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { DSBadge } from '../../components/ds/Badge';
import { useConfirmDelete } from '../../components/ds/ConfirmDelete';
import { DSButton } from '../../components/ds/Button';
import { DSEmptyState } from '../../components/ds/EmptyState';
import { DSSkeletonList } from '../../components/ds/Loading';
import { DSScreen } from '../../components/ds/Screen';
import { IconBrandWhatsapp, IconCash, IconReceipt, IconTrash } from '../../components/ds/icons';
import { RecordPaymentSheet, useToast } from '../../components/ui';
import { billsRepo, customersRepo, paymentsRepo } from '../../lib/data/repository';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { sendWhatsAppMessage, buildBillMessage } from '../../lib/whatsapp';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { colors as legacyColors, darkColors } from '../../constants/theme';
import { primary, status, typography } from '../../constants/tokens';
import type { BillingScreenProps } from '../../navigation/types';
import type { BillWithRelations } from '../../types';

const f = typography.family;

export default function BillDetailScreen({ navigation, route }: BillingScreenProps<'BillDetail'>) {
  const { billId } = route.params;
  const shop = useShop();
  const showToast = useToast();
  const { t } = useTranslation('billing');
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const { confirm: confirmDelete, popup: deletePopup } = useConfirmDelete();

  const [bill, setBill] = useState<BillWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Reads from the local-first mirror (same one bill create/delete write
      // through) rather than Supabase directly — querying Supabase here raced
      // the background sync for a freshly-created bill and made this page
      // look like it "wouldn't open" right after creating one.
      const bill = await billsRepo.get(billId);
      if (!bill) {
        // Bill no longer exists (e.g. deleted elsewhere) — leave, but say why
        // instead of silently bouncing back with no explanation.
        showToast(t('detail.errorLoad'), 'error');
        navigation.goBack();
        return;
      }

      const [customer, shopPayments] = await Promise.all([
        customersRepo.get(bill.customer_id),
        paymentsRepo.listForShop(shop.id),
      ]);

      setBill({
        ...bill,
        customers: customer ? { name: customer.name, phone: customer.phone } : null,
        payments: shopPayments.filter((p) => p.bill_id === bill.id),
      });
    } catch {
      showToast(t('detail.errorLoad'), 'error');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [billId, navigation, shop.id, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const paidTotal = (bill?.payments ?? []).reduce((s, p) => s + Number(p.amount_paid), 0);
  const pending = bill ? Math.max(Number(bill.total_amount ?? 0) - paidTotal, 0) : 0;

  const handleDelete = () => {
    if (!bill) return;
    confirmDelete({
      title: t('detail.deleteConfirmTitle'),
      description: t('detail.deleteConfirmMessage'),
      confirmLabel: t('detail.delete'),
      cancelLabel: t('detail.cancel'),
      onConfirm: async () => {
        try {
          await billsRepo.remove(bill.id, shop.id);
          showToast(t('detail.deleteSuccess'), 'success');
          navigation.goBack();
        } catch (err) {
          showToast(err instanceof Error ? err.message : t('detail.deleteFailed'), 'error');
        }
      },
    });
  };

  const handleShare = async () => {
    if (!bill?.customers) return;
    try {
      await sendWhatsAppMessage(
        bill.customers.phone,
        buildBillMessage({
          shopName: shop.shop_name,
          customerName: bill.customers.name,
          total: Number(bill.total_amount ?? 0),
          paid: paidTotal,
          pending,
        })
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('detail.errorWhatsapp'), 'error');
    }
  };

  const pay = (dark ? darkColors : legacyColors).payment[(bill?.payment_status ?? 'unpaid') as 'paid' | 'partial' | 'unpaid'];
  const total = Number(bill?.total_amount ?? 0);
  const ratio = total > 0 ? Math.min(1, paidTotal / total) : 0;
  const border = dark ? '#262626' : colors.borderDefault;

  const KV = ({ label, value, last, bold }: { label: string; value: string; last?: boolean; bold?: boolean }) => (
    <View>
      <View style={styles.kvRow}>
        <Text style={{ fontFamily: f.regular, fontSize: 14, color: colors.textMuted }}>{label}</Text>
        <Text style={{ fontFamily: bold ? f.bold : f.semibold, fontSize: 14, color: colors.textPrimary }}>{value}</Text>
      </View>
      {last ? null : <View style={{ height: StyleSheet.hairlineWidth, marginLeft: 16, backgroundColor: colors.borderSubtle }} />}
    </View>
  );

  return (
    <DSScreen
      title={bill ? t('detail.billTitle', { name: bill.customers?.name }) : ''}
      onBack={() => navigation.goBack()}
      actions={bill ? [{ icon: IconTrash, label: t('detail.delete'), onPress: handleDelete }] : []}
    >
      {loading || !bill ? (
        <View style={{ padding: 20 }}>
          <DSSkeletonList rows={4} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24, gap: 16 }} showsVerticalScrollIndicator={false}>
            {/* total, paid and what's left — the whole story in one card */}
            <Animated.View entering={FadeInDown.duration(300)} style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: border }]}>
              <View style={styles.between}>
                <Text style={{ fontFamily: f.medium, fontSize: 13, color: colors.textMuted }}>{t('detail.totalAmount')}</Text>
                <DSBadge label={t(`list.filters.${bill.payment_status}`)} bg={pay.bg} fg={pay.text} />
              </View>
              <Text style={{ fontFamily: f.bold, fontSize: 32, color: colors.textPrimary }}>{formatCurrency(bill.total_amount)}</Text>
              <View style={[styles.track, { backgroundColor: dark ? '#262626' : '#E2E8F0' }]}>
                <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
              </View>
              <View style={styles.between}>
                <Text style={{ fontFamily: f.regular, fontSize: 14, color: colors.textMuted }}>{t('detail.paid')}</Text>
                <Text style={{ fontFamily: f.semibold, fontSize: 14, color: status.success[600] }}>{formatCurrency(paidTotal)}</Text>
              </View>
              <View style={styles.between}>
                <Text style={{ fontFamily: f.regular, fontSize: 14, color: colors.textMuted }}>{t('detail.balanceDue')}</Text>
                <Text style={{ fontFamily: f.bold, fontSize: 14, color: pending > 0 ? status.danger[600] : status.success[600] }}>
                  {formatCurrency(pending)}
                </Text>
              </View>
              {bill.customers?.phone ? (
                <View style={{ marginTop: 6 }}>
                  <DSButton title={t('detail.shareWhatsapp')} variant="line" size="rg" fullWidth leftIcon={IconBrandWhatsapp} onPress={handleShare} />
                </View>
              ) : null}
            </Animated.View>

            {/* customer */}
            <Animated.View entering={FadeInDown.delay(60).duration(300)} style={{ gap: 10 }}>
              <Text style={[styles.h, { color: colors.textPrimary }]}>{t('detail.customer')}</Text>
              <View style={[styles.list, { backgroundColor: colors.bgSurface, borderColor: border }]}>
                <KV label={t('detail.name')} value={bill.customers?.name ?? '—'} last={!bill.customers?.phone} />
                {bill.customers?.phone ? <KV label={t('detail.phone')} value={bill.customers.phone} last /> : null}
              </View>
              {bill.order_id ? (
                <Text style={{ fontFamily: f.regular, fontSize: 13, color: colors.textMuted }}>{t('detail.linkedOrderDesc')}</Text>
              ) : null}
            </Animated.View>

            {/* breakdown */}
            <Animated.View entering={FadeInDown.delay(120).duration(300)} style={{ gap: 10 }}>
              <Text style={[styles.h, { color: colors.textPrimary }]}>{t('detail.breakdown')}</Text>
              <View style={[styles.list, { backgroundColor: colors.bgSurface, borderColor: border }]}>
                <KV label={t('detail.fabricCost')} value={formatCurrency(bill.fabric_cost)} />
                <KV label={t('detail.stitchingCharge')} value={formatCurrency(bill.stitching_charge)} />
                <KV label={t('detail.tax')} value={formatCurrency(bill.tax)} />
                <KV label={t('detail.discount')} value={`- ${formatCurrency(bill.discount)}`} />
                <KV label={t('detail.totalAmount')} value={formatCurrency(bill.total_amount)} bold last />
              </View>
            </Animated.View>

            {/* payments */}
            <Animated.View entering={FadeInDown.delay(180).duration(300)} style={{ gap: 10 }}>
              <Text style={[styles.h, { color: colors.textPrimary }]}>{t('detail.paymentHistory')}</Text>
              {bill.payments.length === 0 ? (
                <DSEmptyState variant="compact" icon={IconReceipt} title={t('detail.noPayments')} description={pending > 0 ? t('detail.recordPaymentHint') : undefined} />
              ) : (
                <View style={[styles.list, { backgroundColor: colors.bgSurface, borderColor: border }]}>
                  {bill.payments.map((p, i) => (
                    <View key={p.id}>
                      <View style={[styles.kvRow, { gap: 12 }]}>
                        <View style={[styles.dot, { backgroundColor: colors.primaryTint }]}>
                          <IconCash size={18} color={primary[600]} strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: f.semibold, fontSize: 15, color: colors.textPrimary }}>{formatCurrency(p.amount_paid)}</Text>
                          <Text style={{ fontFamily: f.regular, fontSize: 12, color: colors.textMuted }}>{formatDateTime(p.payment_date)}</Text>
                        </View>
                        <Text style={{ fontFamily: f.medium, fontSize: 13, color: colors.textMuted }}>{p.payment_mode}</Text>
                      </View>
                      {i === bill.payments.length - 1 ? null : (
                        <View style={{ height: StyleSheet.hairlineWidth, marginLeft: 16, backgroundColor: colors.borderSubtle }} />
                      )}
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>
          </ScrollView>

          {pending > 0 ? (
            <View style={[styles.footer, { borderTopColor: colors.borderDefault, backgroundColor: colors.bgPage }]}>
              <DSButton title={t('detail.recordPayment')} size="lg" fullWidth onPress={() => setSheetOpen(true)} />
            </View>
          ) : null}
        </>
      )}

      {/* Same sheet the dashboard's "Collect" button opens, so recording a
          payment behaves identically wherever it's started from. */}
      <RecordPaymentSheet
        bill={
          sheetOpen && bill
            ? { id: bill.id, customerId: bill.customer_id, customerName: bill.customers?.name ?? '', pending }
            : null
        }
        onClose={() => setSheetOpen(false)}
        onSaved={() => void load()}
      />
      {deletePopup}
    </DSScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 24, padding: 16, gap: 10 },
  list: { borderWidth: 1, borderRadius: 24, overflow: 'hidden' },
  kvRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  h: { fontFamily: f.bold, fontSize: 18 },
  track: { height: 8, borderRadius: 9999, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 9999, backgroundColor: primary[600] },
  dot: { width: 38, height: 38, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, borderTopWidth: StyleSheet.hairlineWidth },
});
