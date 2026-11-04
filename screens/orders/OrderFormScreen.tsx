import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import {
  Badge,
  Button,
  Card,
  CenterModal,
  Chip,
  DatePickerField,
  Dropdown,
  EmptyState,
  Header,
  Icon,
  ImagePickerField,
  InputField,
  NumberStepper,
  QuickAddCustomerSheet,
  SegmentedControl,
  Section,
  Skeleton,
  Text,
  Toggle,
  useToast,
} from '../../src/components/ui';
import { uploadImage } from '../../lib/storage';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { loadMeasurementView, loadMeasurementViewForCloth, type MeasurementView } from '../../lib/measurementLayout';
import { measurementFieldLabel } from '../../lib/measurementNames';
import { GARMENT_STORAGE_LABELS, GARMENT_TYPES, parseGarmentType, type GarmentType } from '../../lib/garments';
import { customersRepo, ordersRepo, billsRepo, paymentsRepo, customerMeasurementsRepo } from '../../lib/data/repository';
import { formatCurrency } from '../../lib/format';
import { suggestDeliveryDate } from '../../lib/orderScheduling';
import { deriveOrderDefaults } from '../../lib/orderDefaults';
import type { AppScreenProps } from '../../navigation/types';
import type { OrderPriority } from '../../types';
import type { Tables } from '../../lib/database.types';

type Option = { label: string; value: string; phone?: string | null };

const PAYMENT_MODES = ['Cash', 'UPI'] as const;

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
  const prefill = route.params?.prefill;
  const prefillPieces = (() => {
    let shirt = 0;
    let pant = 0;
    for (const g of prefill?.garments ?? []) {
      const n = Math.max(0, Math.floor(g.count || 0));
      if (g.garment !== 'pant') shirt += n;
      if (g.garment !== 'shirt') pant += n;
    }
    return { shirt, pant };
  })();
  const prefillType: GarmentType | '' =
    prefillPieces.shirt && prefillPieces.pant ? 'both' : prefillPieces.pant ? 'pant' : prefillPieces.shirt ? 'shirt' : '';
  const isEditing = !!orderId;
  const shop = useShop();
  const showToast = useToast();
  const { t } = useTranslation('orders');
  const { colors } = useTheme();

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
  const [garmentType, setGarmentType] = useState<GarmentType | ''>(isEditing ? '' : prefillType || 'shirt');
  const [clothCount, setClothCount] = useState(
    isEditing ? '' : prefillType && prefillType !== 'both' ? String(prefillPieces.shirt || prefillPieces.pant) : '1'
  );
  const [shirtCount, setShirtCount] = useState(prefillType === 'both' ? String(prefillPieces.shirt) : '');
  const [pantCount, setPantCount] = useState(prefillType === 'both' ? String(prefillPieces.pant) : '');
  const [notes, setNotes] = useState('');
  const [shirtPhotoUris, setShirtPhotoUris] = useState<(string | null)[]>([null]);
  const [pantPhotoUris, setPantPhotoUris] = useState<(string | null)[]>([null]);
  const prefillDate = prefill?.deliveryDate && /^d{4}-d{2}-d{2}$/.test(prefill.deliveryDate)
    ? new Date(`${prefill.deliveryDate}T00:00:00`)
    : null;
  const [deliveryDate, setDeliveryDate] = useState<Date | null>(prefillDate);
  // A date given to TrueFit AI counts as the tailor's choice, so auto-suggest leaves it alone.
  const [deliveryDateTouched, setDeliveryDateTouched] = useState(!!prefillDate);
  const [priority, setPriority] = useState<OrderPriority>('normal');
  const [billBookNumber, setBillBookNumber] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<string>('Cash');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [upiConfirmVisible, setUpiConfirmVisible] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(isEditing);

  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [quickAddVisible, setQuickAddVisible] = useState(false);

  const shirtCountNum = Math.max(0, Math.floor(Number(shirtCount) || 0));
  const pantCountNum = Math.max(0, Math.floor(Number(pantCount) || 0));
  const plainCountNum = Math.max(0, Math.floor(Number(clothCount) || 0));
  // Shirt + Pant orders carry separate shirt/pant quantities. Older orders
  // saved only a combined total, so editing one keeps that total until the
  // split is filled in.
  const clothCountNum =
    garmentType === 'both' ? shirtCountNum + pantCountNum || plainCountNum : plainCountNum;
  const totalAmountNum = Math.max(0, Number(totalAmount) || 0);
  const selectedCustomerName = customers.find((c) => c.value === customerId)?.label ?? '';

  const GARMENT_TYPE_LABELS: Record<GarmentType, string> = {
    shirt: t('form.garmentTypes.shirt'),
    pant: t('form.garmentTypes.pant'),
    both: t('form.garmentTypes.both'),
  };

  // Smart defaults come from the shop's own history (read-only): the last cloth,
  // the last delivery interval and the last rate. They only pre-fill things the
  // user has not touched, and the rate is shown as a suggestion, never filled in.
  const [history, setHistory] = useState<Tables<'orders'>[]>([]);
  const [garmentTouched, setGarmentTouched] = useState(false);
  const [showMore, setShowMore] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isEditing) return;
      void ordersRepo.list(shop.id).then((rows) =>
        setHistory([...rows].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)))
      );
    }, [isEditing, shop.id])
  );

  const { clothType: lastClothType, lastDays, lastRate, recentCustomerIds } = deriveOrderDefaults(history, customerId || null);

  // Pre-select the cloth last used (for this customer, else in the shop) until the user picks one.
  useEffect(() => {
    if (isEditing || garmentTouched || !lastClothType) return;
    const parsed = parseGarmentType(lastClothType);
    if (parsed) setGarmentType(parsed);
  }, [isEditing, garmentTouched, lastClothType]);

  // Auto-suggests a delivery date from garment count. Only runs for new
  // orders and stops once the user has manually picked a date, so it never
  // fights their choice.
  useEffect(() => {
    if (isEditing || deliveryDateTouched || clothCountNum === 0) return;
    if (lastDays != null) {
      const d = new Date();
      d.setDate(d.getDate() + lastDays);
      setDeliveryDate(d);
      return;
    }
    void suggestDeliveryDate(shop.id, clothCountNum, null).then(setDeliveryDate);
  }, [isEditing, deliveryDateTouched, clothCountNum, shop.id, lastDays]);

  // Keeps the number of photo slots in sync with the entered cloth count,
  // preserving already-picked images when the count grows or shrinks. In the
  // new-order wizard with both garments selected, shirt and pant each get
  // their own slot count from their own quantity field.
  useEffect(() => {
    // Older Shirt + Pant orders have no split yet: keep their combined slot
    // count (and photos) until shirt/pant quantities are entered.
    if (garmentType === 'both' && shirtCountNum + pantCountNum > 0) {
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
          const shirtItem = orderItems.find((i) => parseGarmentType(i.garment_type) === 'shirt');
          const pantItem = orderItems.find((i) => parseGarmentType(i.garment_type) === 'pant');
          // Shirt + Pant is saved as one Shirt item and one Pant item; older
          // orders used a single combined item (parsed as 'both' directly).
          // The stored label may be in any app language, hence parseGarmentType.
          const loadedGarmentType: GarmentType | '' =
            shirtItem && pantItem ? 'both' : parseGarmentType(firstItem?.garment_type);
          const loadedClothCount = orderItems.length
            ? orderItems.reduce((sum, i) => sum + (Number(i.cloth_count) || 0), 0)
            : data.cloth_count ?? 1;
          setCustomerId(data.customer_id ?? '');
          setGarmentType(loadedGarmentType);
          setClothCount(String(loadedClothCount));
          setNotes(firstItem?.notes ?? '');
          if (shirtItem && pantItem) {
            // Photos are stored shirt slots first, then pant slots.
            const shirtSlots = Math.max(1, shirtItem.cloth_count);
            setShirtCount(String(shirtItem.cloth_count));
            setPantCount(String(pantItem.cloth_count));
            setShirtPhotoUris(resizePhotoSlots(urls.slice(0, shirtSlots), shirtSlots));
            setPantPhotoUris(resizePhotoSlots(urls.slice(shirtSlots), Math.max(1, pantItem.cloth_count)));
          } else {
            const slots = Math.max(1, loadedClothCount);
            const half = Math.ceil(urls.length / 2);
            setShirtPhotoUris(
              loadedGarmentType === 'pant' ? Array(slots).fill(null) : resizePhotoSlots(urls.slice(0, half), slots)
            );
            setPantPhotoUris(
              loadedGarmentType === 'shirt' ? Array(slots).fill(null) : resizePhotoSlots(urls.slice(half), slots)
            );
          }
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
    setCustomers(customerRows.map((c) => ({ label: c.name, value: c.id, phone: c.phone })));
    setCustomersLoaded(true);
  }, [shop.id]);

  useFocusEffect(
    useCallback(() => {
      void loadCustomers();
    }, [loadCustomers])
  );

  const [customerMeasurementProfile, setCustomerMeasurementProfile] = useState<Tables<'customer_measurements'> | null>(null);
  const [measurementView, setMeasurementView] = useState<MeasurementView[]>([]);

  // Re-read on focus too, so edits made in MeasurementForm show up on return.
  useFocusEffect(
    useCallback(() => {
      if (!customerId) {
        setCustomerMeasurementProfile(null);
        setMeasurementView([]);
        return;
      }
      let active = true;
      void customerMeasurementsRepo.getByCustomer(customerId).then(async (profile) => {
        const view = await loadMeasurementViewForCloth(shop.id, profile, garmentType || null);
        if (!active) return;
        setCustomerMeasurementProfile(profile);
        setMeasurementView(view);
      });
      return () => {
        active = false;
      };
    }, [customerId, shop.id])
  );

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

  /**
   * Shirt + Pant becomes one Shirt item and one Pant item so the order keeps
   * the split (2 shirts + 2 pants rather than just 4 pieces). The order total
   * sits on the first item, as it always has for single-item orders.
   */
  const buildItem = () => {
    const note = notes.trim() || null;
    if (garmentType === 'both' && shirtCountNum + pantCountNum > 0) {
      return [
        { garment_type: GARMENT_STORAGE_LABELS.shirt, cloth_count: shirtCountNum },
        { garment_type: GARMENT_STORAGE_LABELS.pant, cloth_count: pantCountNum },
      ]
        .filter((i) => i.cloth_count > 0)
        .map((i, index) => ({ ...i, unit_price: index === 0 ? totalAmountNum : 0, notes: note }));
    }
    return [
      {
        garment_type: garmentType ? GARMENT_STORAGE_LABELS[garmentType] : t('form.defaultGarmentType'),
        cloth_count: clothCountNum || 1,
        unit_price: totalAmountNum,
        notes: note,
      },
    ];
  };

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
    setError('');

    // In-app dialog rather than Alert.alert: the system alert is a no-op on
    // web and was easy to miss, so the order silently never got created.
    if (paymentMode === 'UPI' && Number(paidAmount) > 0) {
      setUpiConfirmVisible(true);
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
      <View className="flex-1 bg-bg">
        <Header title={t('form.editTitle')} onBack={() => navigation.goBack()} />
        <View className="gap-4 p-4">
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </View>
      </View>
    );
  }

  const toCount = (text: string): number | null => (text === '' ? null : Number(text) || 0);
  const fromCount = (n: number | null) => (n == null ? '' : String(n));

  const garmentOptions = GARMENT_TYPES.map((g) => ({ label: GARMENT_TYPE_LABELS[g], value: g }));

  // Recent clients first (tagged), then the rest alphabetically.
  const customerOptions = [
    ...recentCustomerIds.map((id) => customers.find((c) => c.value === id)).filter((c): c is Option => !!c).map((c) => ({ ...c, subtext: t('form.recent') })),
    ...customers.filter((c) => !recentCustomerIds.includes(c.value)),
  ];

  const customerField = (
    <Dropdown
      label={t('form.customer')}
      value={customerId}
      onChange={setCustomerId}
      options={customerOptions}
      placeholder={t('form.selectCustomer')}
      error={error}
      required
      searchable
      searchPlaceholder={t('form.searchClientPlaceholder')}
      onAddNew={() => setQuickAddVisible(true)}
      addNewLabel={t('form.addClient')}
    />
  );

  const garmentFields = (
    <>
      <Text variant="label" className="mb-1.5">
        {t('form.garmentType')}
        <Text variant="label" tone="danger"> *</Text>
      </Text>
      <SegmentedControl
        options={garmentOptions}
        value={(garmentType || '') as GarmentType}
        onChange={(v) => {
          setGarmentTouched(true);
          setGarmentType(v as GarmentType);
        }}
        className="mb-4"
      />

      {garmentType === 'both' ? (
        <View className="flex-row gap-3">
          <NumberStepper
            className="flex-1"
            label={t('form.shirtQuantity')}
            value={toCount(shirtCount)}
            onChange={(n) => setShirtCount(fromCount(n))}
            min={0}
            placeholder={t('form.clothCountPlaceholder')}
          />
          <NumberStepper
            className="flex-1"
            label={t('form.pantQuantity')}
            value={toCount(pantCount)}
            onChange={(n) => setPantCount(fromCount(n))}
            min={0}
            placeholder={t('form.clothCountPlaceholder')}
          />
        </View>
      ) : (
        <NumberStepper
          label={t('form.clothCount')}
          value={toCount(clothCount)}
          onChange={(n) => setClothCount(fromCount(n))}
          min={0}
          placeholder={t('form.clothCountPlaceholder')}
        />
      )}
    </>
  );

  const notesField = (
    <InputField label={t('form.itemNotes')} value={notes} onChangeText={setNotes} placeholder={t('form.itemNotesPlaceholder')} optional />
  );

  const photoColumn = (kind: 'shirt' | 'pant') => {
    const uris = kind === 'shirt' ? shirtPhotoUris : pantPhotoUris;
    const setUris = kind === 'shirt' ? setShirtPhotoUris : setPantPhotoUris;
    return (
      <View className={garmentType === 'both' && !isEditing ? 'mb-4 flex-1' : 'mb-4 w-full'}>
        <Text variant="label" className="mb-1.5">
          {t(kind === 'shirt' ? 'form.shirtPhotosCount' : 'form.pantPhotosCount', { count: uris.length })}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-3">
            {uris.map((uri, index) => (
              <ImagePickerField
                key={index}
                label={t('form.piece', { number: index + 1 })}
                uri={uri}
                onChange={(newUri) =>
                  setUris((prev) => {
                    const next = [...prev];
                    next[index] = newUri;
                    return next;
                  })
                }
                aspect={[3, 4]}
                source="camera"
                size={photoSlotSize}
                onPermissionDenied={() => showToast(t('form.cameraPermissionDenied'), 'error')}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const photoFields = (
    <View className={garmentType === 'both' && !isEditing ? 'flex-row gap-3' : ''}>
      {garmentType === 'shirt' || garmentType === 'both' ? photoColumn('shirt') : null}
      {garmentType === 'pant' || garmentType === 'both' ? photoColumn('pant') : null}
    </View>
  );

  const deliveryFields = (
    <>
      <DatePickerField
        label={t('form.deliveryDate')}
        value={deliveryDate}
        onChange={(d) => {
          setDeliveryDate(d);
          setDeliveryDateTouched(true);
        }}
        minimumDate={new Date()}
        quickChips={[
          ...(lastDays != null && ![3, 7, 10].includes(lastDays) ? [{ label: t('form.sameAsLast', { count: lastDays }), daysFromNow: lastDays }] : []),
          ...[3, 7, 10].map((days) => ({ label: t(lastDays === days ? 'form.sameAsLast' : 'form.inDays', { count: days }), daysFromNow: days })),
        ]}
      />
      {!isEditing && !deliveryDateTouched && clothCountNum > 0 ? (
        <Text variant="caption" tone="muted" weight="regular" className="-mt-2 mb-4">
          {t('form.deliverySuggested')}
        </Text>
      ) : null}

      <Toggle
        label={isEditing ? t('form.priority') + ': ' + t('form.priorityUrgent') : t('form.urgentQuestion')}
        value={priority === 'urgent'}
        onChange={(on) => setPriority(on ? 'urgent' : 'normal')}
        className="mb-2"
      />

      <InputField
        label={t('form.billBookNumber')}
        value={billBookNumber}
        onChangeText={setBillBookNumber}
        placeholder={t('form.billBookPlaceholder')}
        optional
      />
    </>
  );

  const quickAddSheet = (
    <QuickAddCustomerSheet
      visible={quickAddVisible}
      onClose={() => setQuickAddVisible(false)}
      onCreated={(customer) => {
        setQuickAddVisible(false);
        setCustomers((prev) =>
          [...prev, { label: customer.name, value: customer.id, phone: customer.phone }].sort((a, b) => a.label.localeCompare(b.label)),
        );
        setCustomerId(customer.id);
      }}
    />
  );

  const hasPaid = paidAmount.trim() !== '' && Number(paidAmount) > 0;

  const garmentSection = (
    <>
      {customerField}
      {garmentFields}
    </>
  );

  const rateSuggestion =
    !isEditing && lastRate != null && clothCountNum > 0 && totalAmountNum === 0 ? (
      <View className="-mt-2 mb-4 flex-row items-center">
        <Text variant="caption" tone="muted" weight="regular" className="mr-2 flex-1">
          {t('form.lastRateHint', { rate: formatCurrency(lastRate) })}
        </Text>
        <Chip
          label={t('form.useLastRate', { total: formatCurrency(lastRate * clothCountNum) })}
          onPress={() => setTotalAmount(String(Math.round(lastRate * clothCountNum)))}
        />
      </View>
    ) : null;

  const moneySection = (
    <>
      <InputField
        label={t('form.totalAmount')}
        value={totalAmount}
        onChangeText={setTotalAmount}
        placeholder={t('form.totalAmountPlaceholder')}
        keyboardType="number-pad"
        prefix="₹"
        returnKeyType="next"
      />
      {rateSuggestion}
      <InputField
        label={t('form.paidAmount')}
        value={paidAmount}
        onChangeText={setPaidAmount}
        placeholder={t('form.paidAmountPlaceholder')}
        keyboardType="number-pad"
        prefix="₹"
        returnKeyType="done"
      />
      {hasPaid ? (
        <>
          <Text variant="label" className="mb-1.5">
            {t('form.paymentMode')}
          </Text>
          <SegmentedControl
            options={PAYMENT_MODES.map((m) => ({ label: PAYMENT_MODE_LABELS[m], value: m }))}
            value={paymentMode as (typeof PAYMENT_MODES)[number]}
            onChange={setPaymentMode}
            className="mb-2"
          />
        </>
      ) : null}
    </>
  );

  const measurementCard =
    customerId && customerMeasurementProfile ? (
      <Section
        title={t('form.measurementCard.onFile')}
        action={<Badge tone="primary" label={t('form.measurementCard.universalProfile')} icon="ruler" size="sm" />}
        className="mb-4"
      >
        {measurementView.map((group) => (
          <View key={group.title ?? 'all'} className="mb-3">
            {group.title ? (
              <Text variant="caption" tone="muted" className="mb-1.5">
                {group.title}
              </Text>
            ) : null}
            <View className="flex-row flex-wrap gap-2">
              {group.entries.map(([fieldLabel, val]) => (
                <View key={fieldLabel} className="min-w-[88px] flex-1 rounded-md bg-surface-2 px-3 py-2">
                  <Text variant="caption" tone="muted" weight="regular">
                    {measurementFieldLabel(fieldLabel)}
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
          title={t('form.measurementCard.viewEdit')}
          variant="secondary"
          onPress={() => navigation.navigate('MeasurementForm', { customerId: customerId!, clothType: garmentType || undefined })}
        />
      </Section>
    ) : customerId ? (
      <Card variant="subtle" className="mb-4">
        <Text variant="bodyLg">{t('form.measurementCard.notAddedTitle')}</Text>
        <Text variant="label" tone="muted" weight="regular" className="mb-3">
          {t('form.measurementCard.notAddedDesc')}
        </Text>
        <Button
          title={t('form.measurementCard.add')}
          variant="secondary"
          fullWidth={false}
          icon={<Icon name="ruler" size={18} color={colors.textPrimary} />}
          onPress={() => navigation.navigate('MeasurementForm', { customerId: customerId!, clothType: garmentType || undefined })}
        />
      </Card>
    ) : null;

  const moreDetails = (
    <>
      {measurementCard}
      {notesField}
      {photoFields}
      <InputField
        label={t('form.billBookNumber')}
        value={billBookNumber}
        onChangeText={setBillBookNumber}
        placeholder={t('form.billBookPlaceholder')}
        optional
      />
    </>
  );

  // One screen for new and edited orders: customer + garment, delivery, money, then
  // everything optional (photos, notes, measurements, book no.) behind "More details".
  const expanded = isEditing || showMore;

  return (
    <View className="flex-1 bg-bg">
      <Header title={isEditing ? t('form.editTitle') : t('form.title')} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          {!isEditing && customersLoaded && customers.length === 0 ? (
            <EmptyState
              icon="userPlus"
              title={t('form.noClientsTitle')}
              description={t('form.noClientsDescription')}
              actionLabel={t('form.addClient')}
              onAction={() => setQuickAddVisible(true)}
            />
          ) : (
            <>
              {garmentSection}
              {deliveryFields}
              {!isEditing ? moneySection : null}

              {isEditing ? (
                <Text variant="label" tone="muted" weight="regular" className="mb-4">
                  {t('form.billingNotice')}
                </Text>
              ) : null}

              {expanded ? (
                moreDetails
              ) : (
                <Button
                  title={t('form.moreDetails')}
                  variant="ghost"
                  fullWidth={false}
                  className="self-start"
                  icon={<Icon name="chevD" size={18} color={colors.primary} />}
                  onPress={() => setShowMore(true)}
                />
              )}
            </>
          )}
        </ScrollView>

        <View className="border-t border-line bg-surface px-4 py-3">
          {!isEditing && totalAmountNum > 0 ? (
            <View className="mb-2 flex-row items-center justify-between">
              <Text variant="label" tone="muted" weight="regular">
                {t('form.totalAmount')}
              </Text>
              <Text variant="bodyLg" tabular>
                {formatCurrency(totalAmountNum)}
                {hasPaid ? ` · ${t('form.balanceShort', { amount: formatCurrency(Math.max(totalAmountNum - Number(paidAmount), 0)) })}` : ''}
              </Text>
            </View>
          ) : null}
          <Button
            title={isEditing ? t('form.updateOrder') : t('form.createOrderFinal')}
            size="lg"
            onPress={handleSave}
            loading={loading}
          />
        </View>
      </KeyboardAvoidingView>

      <CenterModal
        visible={upiConfirmVisible}
        onClose={() => setUpiConfirmVisible(false)}
        title={t('form.upiConfirmTitle')}
        footer={
          <View className="flex-row gap-3">
            <Button title={t('form.upiConfirmNo')} variant="secondary" fullWidth={false} className="flex-1" onPress={() => setUpiConfirmVisible(false)} />
            <Button
              title={t('form.upiConfirmYes')}
              fullWidth={false}
              className="flex-1"
              onPress={() => {
                setUpiConfirmVisible(false);
                void submitOrder();
              }}
            />
          </View>
        }
      >
        <Text variant="body" tone="muted">
          {t('form.upiConfirmMessage')}
        </Text>
      </CenterModal>

      {quickAddSheet}
    </View>
  );
}
