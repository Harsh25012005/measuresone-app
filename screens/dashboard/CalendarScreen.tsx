import { useCallback, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Calendar, type DateData } from 'react-native-calendars';
import { Card, EmptyState, Header, Skeleton, Text, useToast } from '../../src/components/ui';
import { usePalette } from '../../src/theme/usePalette';
import { fonts, radius } from '../../src/theme/tokens';
import { ordersRepo } from '../../lib/data/repository';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { DashboardScreenProps } from '../../navigation/types';

type AgendaItem = { id: string; kind: 'delivery' | 'trial'; title: string; subtitle?: string };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

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
  const palette = usePalette();

  const calendarTheme = useMemo(
    () => ({
      backgroundColor: colors.bgPage,
      calendarBackground: colors.bgPage,
      textSectionTitleColor: colors.textMuted,
      dayTextColor: colors.textPrimary,
      todayTextColor: colors.primary,
      monthTextColor: colors.textPrimary,
      textDisabledColor: colors.textFaint,
      arrowColor: colors.primary,
      selectedDayBackgroundColor: colors.primary,
      selectedDayTextColor: colors.onPrimary,
      indicatorColor: colors.primary,
      textDayFontFamily: fonts.regular,
      textMonthFontFamily: fonts.bold,
      textDayHeaderFontFamily: fonts.semibold,
      // The selected day is a 4px square, not the default circle.
      'stylesheet.day.basic': {
        base: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg },
        selected: { backgroundColor: colors.primary, borderRadius: radius.lg },
        today: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.primary },
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors, scheme]
  );

  const [selectedDate, setSelectedDate] = useState(todayIso());
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

  const markedDates = useMemo(() => {
    const dotColors: Record<AgendaItem['kind'], string> = {
      delivery: colors.primary,
      trial: palette.warning,
    };
    const marks: Record<string, any> = {};
    for (const [date, items] of Object.entries(byDate)) {
      marks[date] = {
        dots: Array.from(new Set(items.map((i) => i.kind))).map((kind) => ({ color: dotColors[kind] })),
      };
    }
    marks[selectedDate] = { ...(marks[selectedDate] ?? {}), selected: true, selectedColor: colors.primary, selectedTextColor: colors.onPrimary };
    return marks;
  }, [byDate, selectedDate, colors, palette]);

  const dayItems = byDate[selectedDate] ?? [];

  if (loading && Object.keys(byDate).length === 0) {
    return (
      <View className="flex-1 bg-bg">
        <Header title={t('calendar.title')} onBack={() => navigation.goBack()} />
        <View className="gap-3 p-4">
          <Skeleton height={280} />
          <Skeleton height={56} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <Header title={t('calendar.title')} onBack={() => navigation.goBack()} />
      <Calendar
        key={scheme}
        style={{ backgroundColor: colors.bgPage }}
        theme={calendarTheme}
        markingType="multi-dot"
        markedDates={markedDates}
        onDayPress={(d: DateData) => setSelectedDate(d.dateString)}
      />
      <FlatList
        data={dayItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={dayItems.length === 0 ? { flexGrow: 1, paddingTop: 12 } : { padding: 16, paddingBottom: 140, gap: 8 }}
        ListEmptyComponent={<EmptyState icon="calendar" title={t('calendar.emptyTitle')} description={t('calendar.emptyDescription')} />}
        renderItem={({ item }) => (
          <Card>
            <Text variant="bodyLg">{item.title}</Text>
            {item.subtitle ? (
              <Text variant="body" tone="muted" className="mt-1">
                {item.subtitle}
              </Text>
            ) : null}
          </Card>
        )}
      />
    </View>
  );
}
