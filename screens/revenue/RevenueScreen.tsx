import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { BarChart } from 'react-native-gifted-charts';
import { Card, Header, Icon, Section, Skeleton, Text, useToast } from '../../src/components/ui';
import { usePalette } from '../../src/theme/usePalette';
import { fonts, radius, typeScale } from '../../src/theme/tokens';
import { supabase } from '../../lib/supabase';
import { billsRepo, ordersRepo, paymentsRepo } from '../../lib/data/repository';
import { formatCurrency, appLocale } from '../../lib/format';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { SettingsScreenProps } from '../../navigation/types';

type MonthBucket = {
  /** YYYY-MM */
  key: string;
  label: string;
  amount: number;
};

type RevenueData = {
  total: number;
  thisMonth: number;
  today: number;
  months: MonthBucket[];
  outstanding: number;
  staffCost: number;
};

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(appLocale(), { month: 'short', year: 'numeric' });
}

function localDayString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

function MonthlyBarChart({ months }: { months: MonthBucket[] }) {
  const palette = usePalette();
  const ordered = [...months].reverse();
  const max = Math.max(...ordered.map((m) => m.amount), 0);
  const maxValue = max > 0 ? Math.ceil(max * 1.25) : 1000;

  const barData = ordered.map((m, i) => {
    const isLast = i === ordered.length - 1;
    return {
      value: m.amount,
      label: m.label.split(' ')[0],
      frontColor: isLast ? palette.primary : palette.border,
      topLabelComponent: () =>
        m.amount > 0 ? (
          <Text
            variant="caption"
            tone={isLast ? 'primary' : 'muted'}
            tabular
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            className="mb-1 text-center"
          >
            {formatCurrency(m.amount)}
          </Text>
        ) : null,
    };
  });

  return (
    <View
      accessible
      accessibilityLabel={ordered.map((m) => `${m.label}: ${formatCurrency(m.amount)}`).join(', ')}
      className="mt-2 w-full items-center justify-center pt-2"
    >
      <BarChart
        data={barData}
        barWidth={24}
        spacing={20}
        initialSpacing={12}
        endSpacing={12}
        barBorderTopLeftRadius={radius.lg}
        barBorderTopRightRadius={radius.lg}
        hideRules={false}
        rulesColor={palette.borderSubtle}
        rulesType="dashed"
        xAxisColor={palette.border}
        yAxisColor={palette.border}
        yAxisTextStyle={{ color: palette.textMuted, fontSize: typeScale.xs, fontFamily: fonts.regular }}
        xAxisLabelTextStyle={{ color: palette.textMuted, fontSize: typeScale.xs, fontFamily: fonts.regular }}
        noOfSections={4}
        maxValue={maxValue}
        height={160}
        isAnimated={false}
      />
    </View>
  );
}

function Stat({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'primary' | 'danger' }) {
  return (
    <Card className="min-w-0 flex-1 p-3">
      <Text variant="caption" tone="muted" weight="regular" numberOfLines={2}>
        {label}
      </Text>
      <Text variant="bodyLg" tone={tone} tabular numberOfLines={1}>
        {value}
      </Text>
    </Card>
  );
}

export default function RevenueScreen({ navigation }: SettingsScreenProps<'Revenue'>) {
  const { t } = useTranslation('revenue');
  const showToast = useToast();
  const shop = useShop();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const palette = usePalette();

  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [payments, pendingByCustomer, workRes, allOrders] = await Promise.all([
        paymentsRepo.listForShop(shop.id),
        billsRepo.pendingBalanceByCustomer(shop.id),
        supabase.from('staff_work_entries').select('quantity, rate_applied'),
        ordersRepo.list(shop.id),
      ]);

      const now = new Date();
      const todayKey = localDayString(now);
      const monthKey = todayKey.slice(0, 7);

      let total = 0;
      let thisMonth = 0;
      let today = 0;
      const byMonth = new Map<string, number>();

      for (const p of payments) {
        const amount = Number(p.amount_paid) || 0;
        const day = localDayString(new Date(p.payment_date));
        const mKey = day.slice(0, 7);

        total += amount;
        if (day === todayKey) today += amount;
        if (mKey === monthKey) thisMonth += amount;
        byMonth.set(mKey, (byMonth.get(mKey) ?? 0) + amount);
      }

      // If no payments recorded in payments table, also count orders with paid_amount
      if (payments.length === 0) {
        for (const o of allOrders) {
          const amount = Number(o.paid_amount) || 0;
          if (amount > 0) {
            const day = o.order_date || todayKey;
            const mKey = day.slice(0, 7);
            total += amount;
            if (day === todayKey) today += amount;
            if (mKey === monthKey) thisMonth += amount;
            byMonth.set(mKey, (byMonth.get(mKey) ?? 0) + amount);
          }
        }
      }

      const months: MonthBucket[] = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return { key, label: monthLabel(key), amount: byMonth.get(key) ?? 0 };
      });

      const outstanding = Object.values(pendingByCustomer).reduce((s, v) => s + v, 0);

      const staffCost = (workRes.data ?? []).reduce(
        (s, w) => s + Number(w.quantity ?? 0) * Number(w.rate_applied ?? 0),
        0
      );

      setData({ total, thisMonth, today, months, outstanding, staffCost });
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('loadError'), 'error');
    }
  }, [showToast, t, shop.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load().finally(() => setLoading(false));
    }, [load])
  );

  if (loading || !data) {
    return (
      <View className="flex-1 bg-bg">
        <Header title={t('title')} onBack={() => navigation.goBack()} />
        <View className="gap-4 p-4">
          <Skeleton height={120} />
          <Skeleton height={72} />
          <Skeleton height={220} />
        </View>
      </View>
    );
  }

  const net = data.total - data.staffCost;

  return (
    <View className="flex-1 bg-bg">
      <Header title={t('title')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80, gap: 16 }}>
        <Card>
          <View className="flex-row items-start justify-between">
            <View>
              <Text variant="caption" tone="muted">
                {t('totalRevenue')}
              </Text>
              <Text variant="display" tabular>
                {formatCurrency(data.total)}
              </Text>
            </View>
            <View className="h-11 w-11 items-center justify-center rounded bg-success-50">
              <Icon name="rupee" size={22} color={palette.success} />
            </View>
          </View>
          <Text variant="caption" tone="muted" weight="regular" className="mt-2">
            {t('revenueNote')}
          </Text>
        </Card>

        <View className="flex-row gap-3">
          <Stat label={t('thisMonth')} value={formatCurrency(data.thisMonth)} />
          <Stat label={t('today')} value={formatCurrency(data.today)} />
          <Stat label={t('net')} value={formatCurrency(net)} tone="primary" />
        </View>

        <Section
          title={t('byMonth')}
          action={<Icon name="chart" size={18} color={colors.primary} />}
        >
          <MonthlyBarChart months={data.months} />
        </Section>

        <Section title={t('summary')}>
          <View className="gap-2">
            <SummaryRow label={t('received')} value={formatCurrency(data.total)} tone="success" />
            <SummaryRow label={t('staffCost')} value={`- ${formatCurrency(data.staffCost)}`} tone="danger" />
            <SummaryRow label={t('net')} value={formatCurrency(net)} bold />
            <View className="flex-row items-center justify-between rounded-md bg-danger-50 p-3">
              <Text variant="label" tone="danger">
                {t('outstanding')}
              </Text>
              <Text variant="bodyLg" tone="danger" tabular>
                {formatCurrency(data.outstanding)}
              </Text>
            </View>
          </View>
        </Section>
      </ScrollView>
    </View>
  );
}

function SummaryRow({ label, value, tone = 'default', bold = false }: { label: string; value: string; tone?: 'default' | 'success' | 'danger'; bold?: boolean }) {
  return (
    <View className="flex-row items-center justify-between rounded-md bg-surface-2 p-3">
      <Text variant="label" weight={bold ? 'bold' : 'semibold'}>
        {label}
      </Text>
      <Text variant="bodyLg" tone={tone} tabular>
        {value}
      </Text>
    </View>
  );
}
