import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { DSEmptyState } from '../../components/ds/EmptyState';
import { DSSkeletonList } from '../../components/ds/Loading';
import { DSRevenueChart } from '../../components/ds/RevenueChart';
import { DSScreen } from '../../components/ds/Screen';
import { IconChartBar } from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { status, typography } from '../../constants/tokens';
import { supabase } from '../../lib/supabase';
import { billsRepo, paymentsRepo } from '../../lib/data/repository';
import { formatCurrency } from '../../lib/format';
import { useShop } from '../../context/AuthContext';
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
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

function localDayString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

const f = typography.family;

export default function RevenueScreen({ navigation }: SettingsScreenProps<'Revenue'>) {
  const { t } = useTranslation('revenue');
  const showToast = useToast();
  const shop = useShop();
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';

  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      // Payments and bills come from the local-first mirror (same one every
      // create/record-payment flow writes through), so this reflects the
      // real, current data instead of racing the background sync.
      const [payments, pendingByCustomer, workRes] = await Promise.all([
        paymentsRepo.listForShop(shop.id),
        billsRepo.pendingBalanceByCustomer(shop.id),
        supabase.from('staff_work_entries').select('quantity, rate_applied'),
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

      // Always the last 6 calendar months, in order, even ones with zero
      // payments — filling gaps with 0 (instead of only listing months that
      // happened to have a payment) keeps bar spacing an honest timeline.
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

  const net = data ? data.total - data.staffCost : 0;
  const border = dark ? '#262626' : colors.borderDefault;
  const card = [styles.card, { backgroundColor: colors.bgSurface, borderColor: border }];

  const Stat = ({ label, value }: { label: string; value: string }) => (
    <View style={[card, { flex: 1, padding: 14, gap: 4 }]}>
      <Text style={{ fontFamily: f.medium, fontSize: 12, color: colors.textMuted }}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: f.bold, fontSize: 16, color: colors.textPrimary }}>
        {value}
      </Text>
    </View>
  );

  const Line = ({ label, value, color, last, bold }: { label: string; value: string; color?: string; last?: boolean; bold?: boolean }) => (
    <View>
      <View style={styles.line}>
        <Text style={{ fontFamily: f.regular, fontSize: 14, color: colors.textMuted }}>{label}</Text>
        <Text style={{ fontFamily: bold ? f.bold : f.semibold, fontSize: 14, color: color ?? colors.textPrimary }}>{value}</Text>
      </View>
      {last ? null : <View style={{ height: StyleSheet.hairlineWidth, marginLeft: 16, backgroundColor: colors.borderSubtle }} />}
    </View>
  );

  return (
    <DSScreen title={t('title')} onBack={() => navigation.goBack()}>
      {loading || !data ? (
        <View style={{ padding: 20 }}>
          <DSSkeletonList rows={4} />
        </View>
      ) : data.total === 0 ? (
        <DSEmptyState icon={IconChartBar} title={t('emptyTitle')} description={t('emptyDescription')} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 16 }} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(300)}>
            <DSRevenueChart
              title={t('totalRevenue')}
              subtitle={t('revenueNote')}
              total={data.total}
              data={[...data.months].reverse().map((m) => ({ label: m.label.split(' ')[0], value: m.amount }))}
            />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(60).duration(300)} style={{ flexDirection: 'row', gap: 10 }}>
            <Stat label={t('thisMonth')} value={formatCurrency(data.thisMonth)} />
            <Stat label={t('today')} value={formatCurrency(data.today)} />
            <Stat label={t('net')} value={formatCurrency(net)} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(300)} style={{ gap: 10 }}>
            <Text style={{ fontFamily: f.bold, fontSize: 18, color: colors.textPrimary }}>{t('summary')}</Text>
            <View style={[styles.list, { backgroundColor: colors.bgSurface, borderColor: border }]}>
              <Line label={t('received')} value={formatCurrency(data.total)} color={status.success[600]} />
              <Line label={t('staffCost')} value={`- ${formatCurrency(data.staffCost)}`} color={status.danger[600]} />
              <Line label={t('net')} value={formatCurrency(net)} bold />
              <Line label={t('outstanding')} value={formatCurrency(data.outstanding)} color={status.warning[600]} last />
            </View>
          </Animated.View>
        </ScrollView>
      )}
    </DSScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 24 },
  list: { borderWidth: 1, borderRadius: 24, overflow: 'hidden' },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
});
