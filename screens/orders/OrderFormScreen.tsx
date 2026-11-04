import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { DSButton } from '../../components/ds/Button';
import { DSDateField } from '../../components/ds/DateField';
import { DSEmptyState } from '../../components/ds/EmptyState';
import { DSImagePicker } from '../../components/ds/ImagePicker';
import { DSInput } from '../../components/ds/Input';
import { DSSkeletonList } from '../../components/ds/Loading';
import { DSQuantity } from '../../components/ds/Quantity';
import { DSFormScreen } from '../../components/ds/Screen';
import { DSSelect } from '../../components/ds/Select';
import { DSStepBar } from '../../components/ds/StepBar';
import { DSTabs } from '../../components/ds/Tabs';
import { IconRuler2, IconUserPlus } from '../../components/ds/icons';
import { QuickAddCustomerSheet, useToast } from '../../components/ui';
import { uploadImage } from '../../lib/storage';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { customersRepo, ordersRepo, billsRepo, paymentsRepo, customerMeasurementsRepo } from '../../lib/data/repository';
import { formatCurrency } from '../../lib/format';
import { suggestDeliveryDate } from '../../lib/orderScheduling';
import { groupMeasurements } from '../../lib/measurementGroups';
import { primary, status, typography } from '../../constants/tokens';
import type { AppScreenProps } from '../../navigation/types';
import type { OrderPriority } from '../../types';
import type { Tables } from '../../lib/database.types';

type Option = { label: string; value: string };

const PAYMENT_MODES = ['Cash', 'UPI'] as const;
const GARMENT_TYPES = ['shirt', 'pant', 'both'] as const;
type GarmentType = (typeof GARMENT_TYPES)[number];

/** Resizes a photo-URI array to `count` slots, keeping already-picked images in place. */
function resizePhotoSlots(prev: (string | null)[], count: number): (string | null)[] {
  const next = prev.slice(0, count);
  while (next.length < count) next.push(null);
  return next;
}

/**
 * Derives the next order number from the highest existing one for this shop.
 * Using the max rather than a row count keeps numbers unique even after
 * orders are deleted (order_number is UNIQUE per shop).
 */
async function nextOrderNumber(shopId: string): Promise<string> {
  const orders = await ordersRepo.list(shopId);

  // created_at can tie for seeded/bulk-inserted rows, so the highest order
  // number must be found numerically across all rows rather than by taking
  // the "most recent" one.
  const highest = orders.reduce((max, row) => {
    const n = Number(row.order_number?.match(/(\d+)$/)?.[1] ?? 0);
    return n > max ? n : max;
  }, 0);
  return `ORD-${highest + 1}`;
}

export default function OrderFormScreen({ navigation, route }: AppScreenProps<'OrderForm'>) {
  const presetCustomerId = route.params?.customerId;
  const orderId = route.params?.orderId;
  const isEditing = !!orderId;
  const shop = useShop();
  const showToast = useToast();
  const { t } = useTranslation('orders');
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';

  const PAYMENT_MODE_LABELS: Record<(typeof PAYMENT_MODES)[number], string> = {
    Cash: t('form.paymentModeCash'),
    UPI: t('form.paymentModeUpi'),
  };

  const { width: windowWidth } = useWindowDimensions();
  /** Sizes each photo slot so exactly 3 fit in the visible width of a horizontally scrolling row. */
  const photoSlotSize = (windowWidth - 40 - 24) / 3;

  const [customers, setCustomers] = useState<Option[]>([]);

  const [customerId, setCustomerId] = useState<string>(presetCustomerId ?? '');
  // Pre-filled for new orders so a routine order needs no typing: a tailor
  // takes mostly the same kind of work all day, and one piece is by far the
  // most common count. Both stay fully editable.
  const [garmentType, setGarmentType] = useState<GarmentType | ''>(isEditing ? '' : 'shirt');
  const [clothCount, setClothCount] = useState(isEditing ? '' : '1');
  const [shirtCount, setShirtCount] = useState('');
  const [pantCount, setPantCount] = useState('');
  const [notes, setNotes] = useState('');
  const [shirtPhotoUris, setShirtPhotoUris] = useState<(string | null)[]>([null]);
  const [pantPhotoUris, setPantPhotoUris] = useState<(string | null)[]>([null]);
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(null);
  const [deliveryDateTouched, setDeliveryDateTouched] = useState(false);
  const [priority, setPriority] = useState<OrderPriority>('normal');
  const [billBookNumber, setBillBookNumber] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(isEditing);

  // Creating an order is chunked into a 4-step wizard so a busy counter
  // doesn't have to scroll through everything (garment, photos, delivery,
  // payment) at once — editing an existing order stays the original single
  // scroll, since that's a more deliberate, lower-frequency action.
  // Only step 1 has required input; a "Save Order Now" shortcut appears
  // from there on so the remaining steps never have to be tapped through.
  const STEP_COUNT = 3;
  const [step, setStep] = useState(0);
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [quickAddVisible, setQuickAddVisible] = useState(false);

  const shirtCountNum = Math.max(0, Math.floor(Number(shirtCount) || 0));
  const pantCountNum = Math.max(0, Math.floor(Number(pantCount) || 0));
  // Editing an existing order only ever has one combined count on record
  // (orders are saved as a single item), so the shirt/pant split only
  // applies to the new-order wizard, where it's entered directly.
  const clothCountNum =
    !isEditing && garmentType === 'both'
      ? shirtCountNum + pantCountNum
      : Math.max(0, Math.floor(Number(clothCount) || 0));
  const totalAmountNum = Math.max(0, Number(totalAmount) || 0);
  const selectedCustomerName = customers.find((c) => c.value === customerId)?.label ?? '';

  const GARMENT_TYPE_LABELS: Record<GarmentType, string> = {
    shirt: t('form.garmentTypes.shirt'),
    pant: t('form.garmentTypes.pant'),
    both: t('form.garmentTypes.both'),
  };

  // Auto-suggests a delivery date from garment count. Only runs for new
  // orders and stops once the user has manually picked a date, so it never
  // fights their choice.
  useEffect(() => {
    if (isEditing || deliveryDateTouched || clothCountNum === 0) return;
    void suggestDeliveryDate(shop.id, clothCountNum, null).then(setDeliveryDate);
  }, [isEditing, deliveryDateTouched, clothCountNum, shop.id]);

  // Keeps the number of photo slots in sync with the entered cloth count,
  // preserving already-picked images when the count grows or shrinks. In the
  // new-order wizard with both garments selected, shirt and pant each get
  // their own slot count from their own quantity field.
  useEffect(() => {
    if (!isEditing && garmentType === 'both') {
      setShirtPhotoUris((prev) => resizePhotoSlots(prev, Math.max(1, shirtCountNum)));
      setPantPhotoUris((prev) => resizePhotoSlots(prev, Math.max(1, pantCountNum)));
      return;
    }
    const slots = Math.max(1, clothCountNum);
    setShirtPhotoUris((prev) => resizePhotoSlots(prev, slots));
    setPantPhotoUris((prev) => resizePhotoSlots(prev, slots));
  }, [clothCountNum, shirtCountNum, pantCountNum, garmentType, isEditing]);

  useFocusEffect(
    useCallback(() => {
      if (!orderId) return;
      let active = true;
      setLoadingOrder(true);
      void (async () => {
        try {
          const [data, orderItems] = await Promise.all([ordersRepo.get(orderId), ordersRepo.itemsForOrder(orderId)]);
          if (!active) return;
          if (!data) {
            // Order no longer exists (e.g. deleted elsewhere) — leave, but
            // say why instead of silently bouncing back with no explanation.
            showToast(t('form.loadError'), 'error');
            navigation.goBack();
            return;
          }

          const firstItem = orderItems[0];
          const urls = data.design_photo_urls ?? [];
          const half = Math.ceil(urls.length / 2);
          const rawGarmentType = (firstItem?.garment_type ?? '').toLowerCase();
          const loadedGarmentType: GarmentType | '' = GARMENT_TYPES.includes(rawGarmentType as GarmentType)
            ? (rawGarmentType as GarmentType)
            : '';
          const loadedClothCount = firstItem ? firstItem.cloth_count : data.cloth_count ?? 1;
          const slots = Math.max(1, loadedClothCount);
          setCustomerId(data.customer_id ?? '');
          setGarmentType(loadedGarmentType);
          setClothCount(String(loadedClothCount));
          setNotes(firstItem?.notes ?? '');
          setShirtPhotoUris(
            loadedGarmentType === 'pant' ? Array(slots).fill(null) : resizePhotoSlots(urls.slice(0, half), slots)
          );
          setPantPhotoUris(
            loadedGarmentType === 'shirt' ? Array(slots).fill(null) : resizePhotoSlots(urls.slice(half), slots)
          );
          setDeliveryDate(data.delivery_date ? new Date(data.delivery_date) : null);
          setDeliveryDateTouched(true);
          setPriority((data.priority as OrderPriority) ?? 'normal');
          setBillBookNumber(data.bill_book_number ?? '');
          setTotalAmount(data.total_amount ? String(data.total_amount) : '');
        } catch {
          showToast(t('form.loadError'), 'error');
          navigation.goBack();
        } finally {
          if (active) setLoadingOrder(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [orderId, navigation, showToast, t])
  );

  const loadCustomers = useCallback(async () => {
    const customerRows = await customersRepo.list(shop.id);
    setCustomers(customerRows.map((c) => ({ label: c.name, value: c.id })));
    setCustomersLoaded(true);
  }, [shop.id]);

  useFocusEffect(
    useCallback(() => {
      void loadCustomers();
    }, [loadCustomers])
  );

  const [customerMeasurementProfile, setCustomerMeasurementProfile] = useState<Tables<'customer_measurements'> | null>(null);

  useEffect(() => {
    if (!customerId) {
      setCustomerMeasurementProfile(null);
      return;
    }
    let active = true;
    void customerMeasurementsRepo.getByCustomer(customerId).then((profile) => {
      if (active) setCustomerMeasurementProfile(profile);
    });
    return () => {
      active = false;
    };
  }, [customerId]);

  const goNext = () => {
    if (step === 0 && !customerId) {
      setError(t('form.customerRequired'));
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  /** Uploads any freshly-picked local photo URIs, leaving already-remote ones (edit mode) untouched. */
  const resolveDesignPhotoUrls = async (fileNamePrefix: string): Promise<string[]> => {
    const combined = [
      ...(garmentType !== 'pant' ? shirtPhotoUris : []),
      ...(garmentType !== 'shirt' ? pantPhotoUris : []),
    ];
    const urls: string[] = [];
    for (let i = 0; i < combined.length; i++) {
      const uri = combined[i];
      if (!uri) continue;
      if (/^https?:\/\//.test(uri)) {
        urls.push(uri);
        continue;
      }
      try {
        const url = await uploadImage({
          bucket: 'design-photos',
          shopId: shop.id,
          localUri: uri,
          fileName: `${fileNamePrefix}-${i + 1}`,
        });
        urls.push(url);
      } catch {
        showToast(t('form.photoUploadFailed'), 'info');
      }
    }
    return urls;
  };

  const buildItem = () => [
    {
      garment_type: garmentType ? GARMENT_TYPE_LABELS[garmentType] : t('form.defaultGarmentType'),
      cloth_count: clothCountNum || 1,
      unit_price: totalAmountNum,
      notes: notes.trim() || null,
    },
  ];

  const handleUpdate = async () => {
    if (!customerId || !orderId) {
      setError(t('form.customerRequired'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const designPhotoUrls = await resolveDesignPhotoUrls(orderId);
      await ordersRepo.update(orderId, shop.id, {
        customer_id: customerId,
        cloth_type: garmentType ? GARMENT_TYPE_LABELS[garmentType] : null,
        cloth_count: clothCountNum || null,
        design_photo_urls: designPhotoUrls,
        delivery_date: deliveryDate ? deliveryDate.toISOString().slice(0, 10) : null,
        priority,
        bill_book_number: billBookNumber.trim() || null,
      });
      await ordersRepo.replaceItems(orderId, shop.id, buildItem());

      showToast(t('form.orderUpdated'), 'success');
      navigation.goBack();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('form.orderUpdateFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (isEditing) return handleUpdate();
    if (!customerId) {
      setError(t('form.customerRequired'));
      return;
    }
    if (clothCountNum < 1) {
      // Without this the button looked dead: zero pieces just saved nothing useful.
      showToast(t('form.piecesRequired'), 'error');
      setStep(0);
      return;
    }
    setError('');

    // Alert.alert has no web implementation, so the UPI confirm would swallow the tap there.
    if (paymentMode === 'UPI' && Platform.OS !== 'web') {
      Alert.alert(t('form.upiConfirmTitle'), t('form.upiConfirmMessage'), [
        { text: t('form.upiConfirmNo'), style: 'cancel' },
        { text: t('form.upiConfirmYes'), onPress: () => void submitOrder() },
      ]);
      return;
    }

    await submitOrder();
  };

  const submitOrder = async () => {
    setLoading(true);
    try {
      const totalAmountValue = totalAmountNum > 0 ? totalAmountNum : null;
      const paidAmountNum = paidAmount.trim() ? Number(paidAmount) : 0;

      const orderNumber = await nextOrderNumber(shop.id);
      const designPhotoUrls = await resolveDesignPhotoUrls(orderNumber);

      const createdOrder = await ordersRepo.create(
        shop.id,
        {
          order_number: orderNumber,
          customer_id: customerId,
          cloth_type: garmentType ? GARMENT_TYPE_LABELS[garmentType] : null,
          cloth_count: clothCountNum || null,
          design_photo_urls: designPhotoUrls,
          delivery_date: deliveryDate ? deliveryDate.toISOString().slice(0, 10) : null,
          priority,
          bill_book_number: billBookNumber.trim() || null,
          total_amount: totalAmountValue,
          paid_amount: paidAmountNum,
          payment_mode: paymentMode || null,
        },
        buildItem()
      );

      // The order itself is already saved at this point — a failure here
      // (e.g. RLS hiccup) shouldn't be reported as an order-creation failure.
      if (totalAmountNum) {
        try {
          const paymentStatus =
            paidAmountNum <= 0 ? 'unpaid' : paidAmountNum >= totalAmountNum ? 'paid' : 'partial';

          const bill = await billsRepo.create({
            shop_id: shop.id,
            order_id: createdOrder.id,
            customer_id: customerId,
            fabric_cost: 0,
            stitching_charge: totalAmountNum,
            tax: 0,
            discount: 0,
            payment_status: paymentStatus,
          });

          if (paidAmountNum > 0) {
            await paymentsRepo.create({
              shop_id: shop.id,
              bill_id: bill.id,
              customer_id: customerId,
              amount_paid: paidAmountNum,
              payment_mode: paymentMode || null,
            });
          }
        } catch {
          showToast(t('form.billCreateFailed'), 'info');
        }
      }

      // Order creation silently also writes a Bill (and a Payment, if any was
      // collected) behind the scenes — say so plainly instead of a generic
      // "order created" toast, so the user isn't left guessing where a bill
      // came from later.
      if (totalAmountNum > 0 && paidAmountNum > 0 && paidAmountNum >= totalAmountNum) {
        showToast(
          t('form.orderCreatedFullyPaid', {
            number: orderNumber,
            customer: selectedCustomerName,
            total: formatCurrency(totalAmountNum),
          }),
          'success'
        );
      } else if (totalAmountNum > 0 && paidAmountNum > 0) {
        showToast(
          t('form.orderCreatedWithPayment', {
            number: orderNumber,
            customer: selectedCustomerName,
            paid: formatCurrency(paidAmountNum),
            total: formatCurrency(totalAmountNum),
            due: formatCurrency(totalAmountNum - paidAmountNum),
          }),
          'success'
        );
      } else {
        showToast(
          t('form.orderCreatedNoPayment', { number: orderNumber, customer: selectedCustomerName }),
          'success'
        );
      }
      navigation.goBack();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('form.orderCreateFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loadingOrder) {
    return (
      <DSFormScreen title={t(isEditing ? 'form.editTitle' : 'form.title')} onBack={() => navigation.goBack()}>
        <DSSkeletonList rows={4} />
      </DSFormScreen>
    );
  }

  const f = typography.family;
  const label = (text: string) => (
    <Text style={{ fontFamily: f.semibold, fontSize: 13, color: colors.textSecondary, marginBottom: -6 }}>{text}</Text>
  );

  const customerField = (
    <DSSelect
      label={`${t('form.customer')} *`}
      value={customerId}
      onChange={(v) => {
        setCustomerId(v);
        setError('');
      }}
      options={customers}
      error={error || undefined}
      searchable
      searchPlaceholder={t('form.searchClientPlaceholder')}
      onAddNew={() => setQuickAddVisible(true)}
      addNewLabel={t('form.addClient')}
      emptyText={t('form.noResults')}
    />
  );

  const garmentField = (
    <View style={{ gap: 10 }}>
      {label(`${t('form.garmentType')} *`)}
      <DSTabs
        variant="pill"
        value={garmentType}
        onChange={(v) => {
          setGarmentType(v as GarmentType);
          if (!isEditing && v === 'both') {
            if (!shirtCountNum) setShirtCount('1');
            if (!pantCountNum) setPantCount('1');
          }
        }}
        items={GARMENT_TYPES.map((g) => ({ key: g, label: GARMENT_TYPE_LABELS[g] }))}
      />
    </View>
  );

  const quantityField =
    !isEditing && garmentType === 'both' ? (
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <DSQuantity label={t('form.shirtQuantity')} value={shirtCountNum} onChange={(n) => setShirtCount(String(n))} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <DSQuantity label={t('form.pantQuantity')} value={pantCountNum} onChange={(n) => setPantCount(String(n))} />
        </View>
      </View>
    ) : (
      <DSQuantity label={t('form.clothCount')} value={Math.max(0, Math.floor(Number(clothCount) || 0))} onChange={(n) => setClothCount(String(n))} />
    );

  const notesField = (
    <DSInput kind="textarea" label={t('form.itemNotes')} placeholder={t('form.itemNotesPlaceholder')} value={notes} onChangeText={setNotes} />
  );

  const photoRow = (title: string, uris: (string | null)[], setUris: (fn: (prev: (string | null)[]) => (string | null)[]) => void) => (
    <View style={{ gap: 10 }}>
      {label(title)}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {uris.map((uri, index) => (
          <DSImagePicker
            key={index}
            shape="rect"
            uri={uri}
            size={photoSlotSize}
            aspect={[3, 4]}
            source="camera"
            onChange={(newUri) =>
              setUris((prev) => {
                const next = [...prev];
                next[index] = newUri;
                return next;
              })
            }
            onPermissionDenied={() => showToast(t('form.cameraPermissionDenied'), 'error')}
          />
        ))}
      </ScrollView>
    </View>
  );

  const shirtPhotos =
    garmentType === 'shirt' || garmentType === 'both' ? photoRow(t('form.shirtPhotosCount', { count: shirtPhotoUris.length }), shirtPhotoUris, setShirtPhotoUris) : null;
  const pantPhotos =
    garmentType === 'pant' || garmentType === 'both' ? photoRow(t('form.pantPhotosCount', { count: pantPhotoUris.length }), pantPhotoUris, setPantPhotoUris) : null;

  const dateField = (
    <DSDateField
      label={t('form.deliveryDate')}
      value={deliveryDate}
      onChange={(d) => {
        setDeliveryDate(d);
        setDeliveryDateTouched(true);
      }}
      minimumDate={new Date()}
      confirmLabel={t('form.confirm')}
    />
  );

  const billBookField = (
    <DSInput label={t('form.billBookNumber')} placeholder={t('form.billBookPlaceholder')} value={billBookNumber} onChangeText={setBillBookNumber} />
  );

  const quickAddSheet = (
    <QuickAddCustomerSheet
      visible={quickAddVisible}
      onClose={() => setQuickAddVisible(false)}
      onCreated={(customer) => {
        setQuickAddVisible(false);
        setCustomers((prev) => [...prev, { label: customer.name, value: customer.id }].sort((a, b) => a.label.localeCompare(b.label)));
        setCustomerId(customer.id);
      }}
    />
  );

  // Editing keeps the original single-scroll layout — a deliberate,
  // lower-frequency action where the current fields are already fine.
  if (isEditing) {
    return (
      <>
        <DSFormScreen
          title={t('form.editTitle')}
          onBack={() => navigation.goBack()}
          footer={<DSButton title={t('form.updateOrder')} size="lg" fullWidth onPress={handleSave} loading={loading} />}
        >
          {customerField}
          {garmentField}
          {quantityField}
          {notesField}
          {shirtPhotos}
          {pantPhotos}
          {dateField}
          {billBookField}
          <Text style={{ fontFamily: f.regular, fontSize: 13, lineHeight: 19, color: colors.textMuted }}>{t('form.billingNotice')}</Text>
        </DSFormScreen>
        {quickAddSheet}
      </>
    );
  }

  // New order: 3-step wizard. Chunks "who/what, photos+measurements, delivery
  // and payment" into separate screens with a visible step count, instead of
  // one long scroll — only step 1 has required input.
  const STEP_TITLE_KEYS = ['whoWhat', 'photos', 'deliveryPayment'] as const;
  const groups = groupMeasurements(customerMeasurementProfile?.measurements);
  const openMeasurements = () =>
    navigation.navigate('CustomersTab' as any, { screen: 'MeasurementForm', params: { customerId } });

  const measurementsCard = customerId ? (
    customerMeasurementProfile ? (
      <View style={{ borderWidth: 1, borderRadius: 24, padding: 16, gap: 12, backgroundColor: colors.bgSurface, borderColor: dark ? '#262626' : colors.borderDefault }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 9999, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' }}>
            <IconRuler2 size={18} color={primary[600]} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: f.semibold, fontSize: 15, color: colors.textPrimary }}>{t('form.measurementsOnFile')}</Text>
            <Text style={{ fontFamily: f.regular, fontSize: 12, color: colors.textMuted }}>{t('form.measurementsProfile')}</Text>
          </View>
        </View>
        {groups.map(({ label: group, entries }) => (
          <View key={group || 'flat'} style={{ gap: 6 }}>
            {group ? <Text style={{ fontFamily: f.semibold, fontSize: 12, color: colors.textSecondary }}>{group.replace(/_/g, ' ')}</Text> : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {entries.map(([k, v]) => (
                <View key={k} style={{ borderRadius: 14, backgroundColor: colors.primaryTint, paddingVertical: 6, paddingHorizontal: 10 }}>
                  <Text style={{ fontFamily: f.medium, fontSize: 10, color: colors.textMuted }}>{k}</Text>
                  <Text style={{ fontFamily: f.bold, fontSize: 15, color: primary[600] }}>{String(v)}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
        <DSButton title={t('form.viewEditMeasurements')} variant="line" size="rg" fullWidth onPress={openMeasurements} />
      </View>
    ) : (
      <View style={{ borderRadius: 24, padding: 16, gap: 12, backgroundColor: dark ? '#33240A' : status.warning[50], borderWidth: 1, borderColor: dark ? '#4A3A0F' : status.warning[100] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 9999, backgroundColor: dark ? '#4A3A0F' : status.warning[100], alignItems: 'center', justifyContent: 'center' }}>
            <IconRuler2 size={18} color={status.warning[600]} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: f.semibold, fontSize: 15, color: colors.textPrimary }}>{t('form.measurementsMissing')}</Text>
            <Text style={{ fontFamily: f.regular, fontSize: 12, color: colors.textMuted }}>{t('form.measurementsMissingHint')}</Text>
          </View>
        </View>
        <DSButton title={t('form.addMeasurements')} variant="line" size="rg" fullWidth onPress={openMeasurements} />
      </View>
    )
  ) : null;

  const noClients = step === 0 && customersLoaded && customers.length === 0;

  return (
    <>
      <DSFormScreen
        title={t('form.title')}
        onBack={() => navigation.goBack()}
        footer={
          noClients ? undefined : (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {step > 0 ? (
                <View style={{ flex: 1 }}>
                  <DSButton title={t('form.back')} variant="line" size="lg" fullWidth onPress={goBack} />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                {step < STEP_COUNT - 1 ? (
                  <DSButton title={t('form.next')} size="lg" fullWidth onPress={goNext} />
                ) : (
                  <DSButton title={t('form.createOrderFinal')} size="lg" fullWidth onPress={handleSave} loading={loading} />
                )}
              </View>
            </View>
          )
        }
      >
        <DSStepBar
          step={step}
          total={STEP_COUNT}
          title={t(`form.stepTitles.${STEP_TITLE_KEYS[step]}`)}
          stepLabel={t('form.stepOf', { current: step + 1, total: STEP_COUNT })}
        />

        {step === 0 ? (
          noClients ? (
            <DSEmptyState
              icon={IconUserPlus}
              title={t('form.noClientsTitle')}
              description={t('form.noClientsDescription')}
              actionLabel={t('form.addClient')}
              onAction={() => setQuickAddVisible(true)}
            />
          ) : (
            <>
              {customerField}
              {garmentField}
              {quantityField}
            </>
          )
        ) : null}

        {step === 1 ? (
          <>
            {measurementsCard}
            {notesField}
            {shirtPhotos}
            {pantPhotos}
          </>
        ) : null}

        {step === 2 ? (
          <>
            {dateField}
            {!deliveryDateTouched && clothCountNum > 0 ? (
              <Text style={{ fontFamily: f.regular, fontSize: 13, color: colors.textMuted, marginTop: -8 }}>{t('form.deliverySuggested')}</Text>
            ) : null}
            {billBookField}

            {/* Payment merged into the delivery step — neither had enough on it to justify its own screen, and both are optional. */}
            <View style={{ height: 1, backgroundColor: colors.borderSubtle }} />
            <View style={{ gap: 10 }}>
              {label(t('form.paymentMode'))}
              <DSTabs
                variant="pill"
                value={paymentMode}
                onChange={setPaymentMode}
                items={PAYMENT_MODES.map((m) => ({ key: m, label: PAYMENT_MODE_LABELS[m] }))}
              />
            </View>
            <DSInput label={t('form.totalAmount')} placeholder={t('form.totalAmountPlaceholder')} keyboardType="number-pad" value={totalAmount} onChangeText={setTotalAmount} />
            <DSInput label={t('form.paidAmount')} placeholder={t('form.paidAmountPlaceholder')} keyboardType="number-pad" value={paidAmount} onChangeText={setPaidAmount} />
          </>
        ) : null}
      </DSFormScreen>
      {quickAddSheet}
    </>
  );
}
