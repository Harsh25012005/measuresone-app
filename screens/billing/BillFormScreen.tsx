import { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { DSButton } from '../../components/ds/Button';
import { DSEmptyState } from '../../components/ds/EmptyState';
import { DSInput } from '../../components/ds/Input';
import { DSFormScreen } from '../../components/ds/Screen';
import { DSSelect } from '../../components/ds/Select';
import { DSTabs } from '../../components/ds/Tabs';
import { IconPhone, IconUserPlus } from '../../components/ds/icons';
import { QuickAddCustomerSheet, useToast } from '../../components/ui';
import { customersRepo, billsRepo, paymentsRepo } from '../../lib/data/repository';
import { formatCurrency } from '../../lib/format';
import { sendWhatsAppMessage, buildBillMessage } from '../../lib/whatsapp';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { primary, typography } from '../../constants/tokens';
import type { AppScreenProps } from '../../navigation/types';
import type { Customer } from '../../types';

const f = typography.family;

function toAmount(value: string): number {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export default function BillFormScreen({ navigation, route }: AppScreenProps<'BillForm'>) {
  const orderId = route.params?.orderId;
  const presetCustomerId = route.params?.customerId;
  const shop = useShop();
  const showToast = useToast();
  const { t } = useTranslation('billing');
  const { t: tOrders } = useTranslation('orders');
  const { colors } = useTheme();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [customerId, setCustomerId] = useState<string>(presetCustomerId ?? '');
  // Most shops just want to type one number and move on — the itemized
  // fields are an opt-in expansion, not the default.
  const [itemized, setItemized] = useState(false);
  const [billAmount, setBillAmount] = useState('');
  const [fabricCost, setFabricCost] = useState('');
  const [stitchingCharge, setStitchingCharge] = useState('');
  const [discount, setDiscount] = useState('');
  const [tax, setTax] = useState('');
  const [error, setError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [paidStatus, setPaidStatus] = useState<'unpaid' | 'paid'>('unpaid');

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        const data = await customersRepo.list(shop.id);
        setCustomers(data);
        setCustomersLoaded(true);
      })();
    }, [shop.id])
  );

  const customerOptions = customers.map((c) => ({ label: c.name, value: c.id }));
  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;

  const total = useMemo(
    () =>
      itemized
        ? Math.max(toAmount(fabricCost) + toAmount(stitchingCharge) + toAmount(tax) - toAmount(discount), 0)
        : toAmount(billAmount),
    [itemized, billAmount, fabricCost, stitchingCharge, discount, tax]
  );

  const handleSave = async () => {
    let hasError = false;
    if (!customerId) {
      setError(t('form.customerRequired'));
      hasError = true;
    } else {
      setError('');
    }
    if (!itemized && toAmount(billAmount) <= 0) {
      setAmountError(t('form.amountRequired'));
      hasError = true;
    } else {
      setAmountError('');
    }
    if (hasError) return;

    setLoading(true);
    try {
      const bill = await billsRepo.create({
        shop_id: shop.id,
        order_id: orderId ?? null,
        customer_id: customerId,
        fabric_cost: itemized ? toAmount(fabricCost) : toAmount(billAmount),
        stitching_charge: itemized ? toAmount(stitchingCharge) : 0,
        discount: itemized ? toAmount(discount) : 0,
        tax: itemized ? toAmount(tax) : 0,
      });
      showToast(t('form.successCreated'), 'success');

      // Payment status is chosen up-front in the form instead of an Alert
      // fired after the bill already exists — many bills are settled on the
      // spot, so "create a bill" stays one decision instead of two.
      let paidAmount = 0;
      if (paidStatus === 'paid') {
        try {
          await paymentsRepo.create({
            shop_id: shop.id,
            bill_id: bill.id,
            customer_id: customerId,
            amount_paid: total,
            payment_mode: 'Cash',
          });
          paidAmount = total;
        } catch {
          // Bill is already saved — a failed payment record shouldn't be reported as a save failure.
        }
      }

      const goToBillDetail = () => {
        navigation.replace('BillDetail', { billId: bill.id });
      };

      const pending = Math.max(total - paidAmount, 0);
      // Alert.alert has no web implementation, so skip the prompt there.
      if (selectedCustomer?.phone && Platform.OS !== 'web') {
        Alert.alert(t('form.sendMessageTitle'), t('form.sendMessageMessage'), [
          { text: t('form.doItLater'), style: 'cancel', onPress: goToBillDetail },
          {
            text: t('form.sendMessage'),
            onPress: async () => {
              try {
                await sendWhatsAppMessage(
                  selectedCustomer.phone,
                  buildBillMessage({
                    shopName: shop.shop_name,
                    customerName: selectedCustomer.name,
                    total,
                    paid: paidAmount,
                    pending,
                  })
                );
              } catch {
                // Bill is already saved — a failed WhatsApp open shouldn't be reported as a save failure.
              }
              goToBillDetail();
            },
          },
        ]);
      } else {
        goToBillDetail();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('form.errorCreate'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const noClients = customersLoaded && customers.length === 0;

  return (
    <>
      <DSFormScreen
        title={t('form.title')}
        onBack={() => navigation.goBack()}
        footer={noClients ? undefined : <DSButton title={t('form.createBill')} size="lg" fullWidth onPress={handleSave} loading={loading} />}
      >
        {noClients ? (
          <DSEmptyState
            icon={IconUserPlus}
            title={t('form.noClientsTitle')}
            description={t('form.noClientsDescription')}
            actionLabel={t('form.addClient')}
            onAction={() => setQuickAddVisible(true)}
          />
        ) : (
          <>
            <DSSelect
              label={`${t('form.customer')} *`}
              value={customerId}
              onChange={(v) => {
                setCustomerId(v);
                setError('');
              }}
              options={customerOptions}
              error={error || undefined}
              searchable
              searchPlaceholder={t('form.searchClientPlaceholder')}
              onAddNew={() => setQuickAddVisible(true)}
              addNewLabel={t('form.addClient')}
              emptyText={tOrders('form.noResults')}
            />

            {selectedCustomer ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -6 }}>
                <IconPhone size={14} color={colors.textMuted} />
                <Text style={{ fontFamily: f.regular, fontSize: 13, color: colors.textMuted }}>{selectedCustomer.phone ?? t('form.noPhone')}</Text>
              </View>
            ) : null}

            {itemized ? (
              <>
                <DSInput label={t('form.fabricCost')} placeholder={t('form.fabricCostPlaceholder')} keyboardType="number-pad" value={fabricCost} onChangeText={setFabricCost} />
                <DSInput label={t('form.stitchingCharge')} placeholder={t('form.stitchingChargePlaceholder')} keyboardType="number-pad" value={stitchingCharge} onChangeText={setStitchingCharge} />
                <DSInput label={t('form.discount')} placeholder={t('form.discountPlaceholder')} keyboardType="number-pad" value={discount} onChangeText={setDiscount} />
                <DSInput label={t('form.tax')} placeholder={t('form.taxPlaceholder')} keyboardType="number-pad" value={tax} onChangeText={setTax} />
                <View style={{ alignItems: 'flex-start', marginTop: -8 }}>
                  <DSButton title={t('form.useSimpleTotal')} variant="link" size="sm" onPress={() => setItemized(false)} />
                </View>
              </>
            ) : (
              <>
                <DSInput
                  label={`${t('form.billAmount')} *`}
                  placeholder={t('form.billAmountPlaceholder')}
                  keyboardType="number-pad"
                  value={billAmount}
                  onChangeText={(v) => {
                    setBillAmount(v);
                    setAmountError('');
                  }}
                  error={amountError || undefined}
                />
                <View style={{ alignItems: 'flex-start', marginTop: -8 }}>
                  <DSButton title={t('form.splitIntoItems')} variant="link" size="sm" onPress={() => setItemized(true)} />
                </View>
              </>
            )}

            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: f.semibold, fontSize: 13, color: colors.textSecondary }}>{t('form.paymentStatus')}</Text>
              <DSTabs
                variant="pill"
                value={paidStatus}
                onChange={(k) => setPaidStatus(k as 'unpaid' | 'paid')}
                items={[
                  { key: 'unpaid', label: t('form.markUnpaid') },
                  { key: 'paid', label: t('form.markPaid') },
                ]}
              />
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: 24,
                padding: 16,
                backgroundColor: colors.primaryTint,
              }}
            >
              <Text style={{ fontFamily: f.semibold, fontSize: 14, color: primary[600] }}>{t('form.totalAmount')}</Text>
              <Text style={{ fontFamily: f.bold, fontSize: 24, color: primary[600] }}>{formatCurrency(total)}</Text>
            </View>
          </>
        )}
      </DSFormScreen>

      <QuickAddCustomerSheet
        visible={quickAddVisible}
        onClose={() => setQuickAddVisible(false)}
        onCreated={(customer) => {
          setQuickAddVisible(false);
          setCustomers((prev) => [...prev, customer].sort((a, b) => a.name.localeCompare(b.name)));
          setCustomerId(customer.id);
        }}
      />
    </>
  );
}
