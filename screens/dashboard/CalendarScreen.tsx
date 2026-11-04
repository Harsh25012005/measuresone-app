import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { DSCalendar } from '../../components/ds/Calendar';
import { DSEmptyState } from '../../components/ds/EmptyState';
import { DSSkeletonCard } from '../../components/ds/Loading';
import { DSScreen } from '../../components/ds/Screen';
import { IconCalendarEvent, IconShirt, IconTruckDelivery } from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { ordersRepo } from '../../lib/data/repository';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { primary, status, typography } from '../../constants/tokens';
import type { DashboardScreenProps } from '../../navigation/types';

const f = typography.family;

type AgendaItem = { id: string; kind: 'delivery' | 'trial'; title: string; subtitle?: string };

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
      const orders = await ordersRepo.list(shop.id);

      const map: Record<string, AgendaItem[]> = {};
      const push = (date: string | null | undefined, item: AgendaItem) => {
        if (!date) return;
        (map[date] ??= []).push(item);
      };

      for (const o of orders) {
        push(o.delivery_date, {
          id: `${o.id}-delivery`,
          kind: 'delivery',
          title: t('calendar.deliveryLabel', { number: o.order_number }),
        });
        push(o.trial_date, {
          id: `${o.id}-trial`,
          kind: 'trial',
          title: t('calendar.trialLabel', { number: o.order_number }),
        });
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
          renderItem={({ item, index }) => {
            const delivery = item.kind === 'delivery';
            const Icon = delivery ? IconTruckDelivery : IconShirt;
            const fg = delivery ? primary[600] : status.warning[600];
            const tint = delivery ? (dark ? primary[950] : primary[100]) : dark ? '#33240A' : status.warning[100];
            return (
              <Animated.View
                entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(260)}
                style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: dark ? '#262626' : colors.borderDefault }]}
              >
                <View style={[styles.icon, { backgroundColor: tint }]}>
                  <Icon size={20} color={fg} strokeWidth={2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: f.semibold, fontSize: 15, color: colors.textPrimary }} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text style={{ fontFamily: f.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 }}>{item.subtitle}</Text>
                  ) : null}
                </View>
              </Animated.View>
            );
          }}
        />
      )}
    </DSScreen>
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
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 24, borderWidth: 1 },
  icon: { width: 44, height: 44, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
});
