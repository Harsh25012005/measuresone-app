import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { DSBadge, useBadgeTones } from '../../components/ds/Badge';
import { DSCalendar } from '../../components/ds/Calendar';
import { DSEmptyState } from '../../components/ds/EmptyState';
import { DSSkeletonCard } from '../../components/ds/Loading';
import { DSScreen } from '../../components/ds/Screen';
import { IconCalendarEvent, IconChevronRight, IconCircleCheck, IconShirt, IconTruckDelivery } from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { ordersRepo } from '../../lib/data/repository';
import { loadOrderBillAmounts } from '../../lib/orderPayments';
import { formatCurrency } from '../../lib/format';
import { colors as legacyColors, darkColors } from '../../constants/theme';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { primary, status, typography } from '../../constants/tokens';
import type { DashboardScreenProps } from '../../navigation/types';

const f = typography.family;

type AgendaItem = {
  id: string;
  kind: 'delivery' | 'trial';
  orderId: string;
  number: string;
  client: string;
  garment: string;
  pieces: number;
  total: number;
  paid: number;
  delivered: boolean;
};

/** Local YYYY-MM-DD — order dates are plain dates, so avoid UTC shifting. */
const keyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
};

/**
 * Unified view of delivery and trial dates for the shop. Staff leave used to
 * be plotted here too, but nothing in the app can ever *create* a leave
 * record — the read was a dead path that could only ever render nothing.
 */
export default function CalendarScreen({ navigation }: DashboardScreenProps<'Calendar'>) {
  const shop = useShop();
  const showToast = useToast();
  const { t } = useTranslation('dashboard');
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';

  const [selected, setSelected] = useState<Date>(() => new Date());
  const [byDate, setByDate] = useState<Record<string, AgendaItem[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orders, amounts] = await Promise.all([ordersRepo.listWithCustomer(shop.id), loadOrderBillAmounts(shop.id)]);

      const map: Record<string, AgendaItem[]> = {};
      for (const o of orders) {
        const bill = amounts[o.id];
        const base = {
          orderId: o.id,
          number: String(o.order_number).replace(/^ORD-/i, 'O-'),
          client: o.customers?.name ?? '—',
          garment: o.cloth_type || t('calendar.garment', { defaultValue: 'Garment' }),
          pieces: o.cloth_count ?? 1,
          total: bill ? bill.total : Number(o.total_amount ?? 0),
          paid: bill ? bill.paid : Number(o.paid_amount ?? 0),
          delivered: o.status === 'delivered',
        };
        if (o.delivery_date) (map[o.delivery_date] ??= []).push({ ...base, id: `${o.id}-delivery`, kind: 'delivery' });
        if (o.trial_date) (map[o.trial_date] ??= []).push({ ...base, id: `${o.id}-trial`, kind: 'trial' });
      }
      setByDate(map);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('calendar.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  }, [shop.id, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const marked = useMemo(() => Object.keys(byDate).map(fromKey), [byDate]);
  const dayItems = byDate[keyOf(selected)] ?? [];

  return (
    <DSScreen title={t('calendar.title')} onBack={() => navigation.goBack()}>
      {loading ? (
        <View style={{ padding: 20 }}>
          <DSSkeletonCard />
        </View>
      ) : (
        <FlatList
          data={dayItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 10 }}
          ListHeaderComponent={
            <View style={{ marginBottom: 10 }}>
              <DSCalendar value={selected} onChange={setSelected} markedDates={marked} />
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 14, marginBottom: 6 }}>
                <Legend color={primary[600]} label={t('calendar.legendDelivery', { defaultValue: 'Delivery' })} />
                <Legend color={status.warning[600]} label={t('calendar.legendTrial', { defaultValue: 'Trial' })} />
              </View>
            </View>
          }
          ListEmptyComponent={
            <DSEmptyState variant="compact" icon={IconCalendarEvent} title={t('calendar.emptyTitle')} description={t('calendar.emptyDescription')} />
          }
          renderItem={({ item, index }) => <AgendaCard item={item} index={index} onPress={() => navigation.navigate('OrderDetail', { orderId: item.orderId })} />}
        />
      )}
    </DSScreen>
  );
}

/** One order on the selected day: who, what, when it is for, and where the money stands. */
function AgendaCard({ item, index, onPress }: { item: AgendaItem; index: number; onPress: () => void }) {
  const { colors, scheme } = useTheme();
  const tones = useBadgeTones();
  const { t } = useTranslation('dashboard');
  const dark = scheme === 'dark';
  const palette = dark ? darkColors : legacyColors;

  const delivery = item.kind === 'delivery';
  const Icon = delivery ? IconTruckDelivery : IconShirt;
  const fg = delivery ? primary[600] : status.warning[600];
  const tint = delivery ? (dark ? primary[950] : primary[100]) : dark ? '#33240A' : status.warning[100];

  const left = Math.max(0, item.total - item.paid);
  const pay = item.total > 0 && item.paid >= item.total ? 'paid' : item.paid > 0 ? 'partial' : 'unpaid';
  const payTone = palette.payment[pay];
  const payLabel = { paid: t('calendar.paid', { defaultValue: 'Paid' }), partial: t('calendar.partial', { defaultValue: 'Partial' }), unpaid: t('calendar.unpaid', { defaultValue: 'Unpaid' }) }[pay];

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(260)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: pressed ? colors.bgSubtle : colors.bgSurface, borderColor: dark ? '#262626' : colors.borderDefault },
        ]}
      >
        <View style={[styles.icon, { backgroundColor: tint }]}>
          <Icon size={22} color={fg} strokeWidth={2} />
        </View>

        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <Text style={{ flex: 1, fontFamily: f.bold, fontSize: 16, color: colors.textPrimary }} numberOfLines={1}>
              {item.client}
            </Text>
            <Text style={{ fontFamily: f.bold, fontSize: 14, color: left > 0 ? tones.danger.fg : colors.textMuted }}>
              {left > 0 ? t('calendar.left', { amount: formatCurrency(left), defaultValue: '{{amount}} left' }) : formatCurrency(item.total)}
            </Text>
          </View>

          <Text style={{ fontFamily: f.regular, fontSize: 13, color: colors.textMuted }} numberOfLines={1}>
            {item.number} · {item.garment} ×{item.pieces}
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {delivery && item.delivered ? (
              <DSBadge size="sm" icon={IconCircleCheck} label={t('calendar.delivered', { defaultValue: 'Delivered' })} bg={tones.success.bg} fg={tones.success.fg} />
            ) : (
              <>
                <DSBadge
                  size="sm"
                  icon={Icon}
                  label={delivery ? t('calendar.legendDelivery', { defaultValue: 'Delivery' }) : t('calendar.legendTrial', { defaultValue: 'Trial' })}
                  bg={tint}
                  fg={fg}
                />
                {item.delivered ? <DSBadge size="sm" label={t('calendar.delivered', { defaultValue: 'Delivered' })} bg={tones.success.bg} fg={tones.success.fg} /> : null}
              </>
            )}
            <DSBadge size="sm" label={payLabel} bg={payTone.bg} fg={payTone.text} />
          </View>
        </View>

        <IconChevronRight size={16} color={colors.textFaint} />
      </Pressable>
    </Animated.View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: color }} />
      <Text style={{ fontFamily: f.medium, fontSize: 12, color: colors.textMuted }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 24, borderWidth: 1 },
  icon: { width: 48, height: 48, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
});
