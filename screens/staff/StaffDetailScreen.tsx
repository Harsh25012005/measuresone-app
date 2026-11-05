import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { DSAvatar } from '../../components/ds/Avatar';
import { DSButton } from '../../components/ds/Button';
import { useConfirmDelete } from '../../components/ds/ConfirmDelete';
import { DSSkeletonList } from '../../components/ds/Loading';
import { DSScreen } from '../../components/ds/Screen';
import { IconPencil, IconPhone, IconPlus, IconShirt, IconTrash } from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { staffRepo } from '../../lib/data/repository';
import { formatCurrency, formatDate } from '../../lib/format';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { primary, status, typography } from '../../constants/tokens';
import type { SettingsScreenProps } from '../../navigation/types';
import type { Tables } from '../../lib/database.types';
import type { Staff } from '../../types';

type WorkEntry = Tables<'staff_work_entries'>;

const f = typography.family;

/** Sums up a work entry's earnings — quantity × the rate applied when it was logged. */
function entryEarning(entry: WorkEntry): number {
  return Number(entry.quantity) * Number(entry.rate_applied);
}

function isInMonth(dateStr: string, monthsAgo: number): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth();
}

export default function StaffDetailScreen({ navigation, route }: SettingsScreenProps<'StaffDetail'>) {
  const { t } = useTranslation('staff');
  const { staffId } = route.params;
  const showToast = useToast();
  const shop = useShop();
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const border = dark ? '#262626' : colors.borderDefault;
  const { confirm, popup } = useConfirmDelete();

  const WAGE_LABELS: Record<Staff['wage_type'], string> = {
    daily: t('wageUnit.daily'),
    monthly: t('wageUnit.monthly'),
    per_piece: t('wageUnit.per_piece'),
  };

  const WORK_TYPE_LABELS: Record<WorkEntry['work_type'], string> = {
    pant: t('workEntry.types.pant'),
    shirt: t('workEntry.types.shirt'),
    pant_shirt: t('workEntry.types.pant_shirt'),
  };

  const [staff, setStaff] = useState<Staff | null>(null);
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staffData, workRes] = await Promise.all([
        staffRepo.get(staffId),
        supabase
          .from('staff_work_entries')
          .select('*')
          .eq('staff_id', staffId)
          .order('work_date', { ascending: false })
          .order('created_at', { ascending: false }),
      ]);

      if (!staffData) {
        // Staff member no longer exists (e.g. deleted elsewhere) — leave, but
        // say why instead of silently bouncing back with no explanation.
        showToast(t('detail.loadError'), 'error');
        navigation.goBack();
        return;
      }

      setStaff(staffData);
      setWorkEntries(workRes.data ?? []);
    } catch {
      showToast(t('detail.loadError'), 'error');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [staffId, navigation, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const thisMonthEarnings = useMemo(
    () => workEntries.filter((w) => isInMonth(w.work_date, 0)).reduce((s, w) => s + entryEarning(w), 0),
    [workEntries]
  );
  const lastMonthEarnings = useMemo(
    () => workEntries.filter((w) => isInMonth(w.work_date, 1)).reduce((s, w) => s + entryEarning(w), 0),
    [workEntries]
  );
  const totalEarnings = useMemo(() => workEntries.reduce((s, w) => s + entryEarning(w), 0), [workEntries]);

  const handleDelete = () => {
    if (!staff) return;
    confirm({
      title: t('detail.deleteConfirmTitle'),
      description: t('detail.deleteConfirmMessage', { name: staff.name }),
      confirmLabel: t('detail.delete'),
      cancelLabel: t('detail.cancel'),
      onConfirm: async () => {
        try {
          await staffRepo.remove(staff.id, shop.id);
          showToast(t('detail.deleteSuccess'), 'success');
          navigation.goBack();
        } catch (err) {
          showToast(err instanceof Error ? err.message : t('detail.deleteFailed'), 'error');
        }
      },
    });
  };

  const card = [styles.card, { backgroundColor: colors.bgSurface, borderColor: border }];

  const Line = ({ label, value, last, strong }: { label: string; value: string; last?: boolean; strong?: boolean }) => (
    <View>
      <View style={styles.line}>
        <Text style={{ fontFamily: f.regular, fontSize: 14, color: colors.textMuted }}>{label}</Text>
        <Text style={{ fontFamily: strong ? f.bold : f.semibold, fontSize: 14, color: colors.textPrimary }}>{value}</Text>
      </View>
      {last ? null : <View style={{ height: StyleSheet.hairlineWidth, marginLeft: 16, backgroundColor: colors.borderSubtle }} />}
    </View>
  );

  return (
    <DSScreen
      title={staff?.name ?? ''}
      onBack={() => navigation.goBack()}
      actions={
        staff
          ? [
              { icon: IconPencil, label: t('detail.editStaff'), onPress: () => navigation.navigate('StaffForm', { staffId: staff.id }) },
              { icon: IconTrash, label: t('detail.delete'), onPress: handleDelete },
            ]
          : []
      }
    >
      {loading || !staff ? (
        <View style={{ padding: 20 }}>
          <DSSkeletonList rows={4} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 20 }} showsVerticalScrollIndicator={false}>
          {/* who this is */}
          <Animated.View entering={FadeInDown.duration(300)} style={{ alignItems: 'center', gap: 10, paddingTop: 4 }}>
            <DSAvatar name={staff.name} size="xl" />
            <Text style={{ fontFamily: f.bold, fontSize: 24, lineHeight: 30, color: colors.textPrimary, textAlign: 'center' }} numberOfLines={2}>
              {staff.name}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              <View style={[styles.chip, { backgroundColor: colors.primaryTint }]}>
                <Text style={{ fontFamily: f.bold, fontSize: 12, color: primary[600] }}>{staff.role ?? t('detail.defaultRole')}</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: colors.bgSubtle }]}>
                <IconPhone size={14} color={colors.textMuted} />
                <Text style={{ fontFamily: f.medium, fontSize: 13, color: colors.textSecondary }}>{staff.phone ?? t('detail.noPhone')}</Text>
              </View>
            </View>
          </Animated.View>

          {/* pay — per-piece staff have a rate per garment, not one flat wage */}
          <Animated.View entering={FadeInDown.delay(60).duration(300)} style={[styles.list, { backgroundColor: colors.bgSurface, borderColor: border }]}>
            {staff.wage_type === 'per_piece' ? (
              <>
                <Line label={t('detail.amountPerPant')} value={formatCurrency(staff.wage_amount_pant ?? 0)} />
                <Line label={t('detail.amountPerShirt')} value={formatCurrency(staff.wage_amount_shirt ?? 0)} />
                <Line
                  label={t('detail.amountPerPair')}
                  value={formatCurrency(Number(staff.wage_amount_pant ?? 0) + Number(staff.wage_amount_shirt ?? 0))}
                  last
                />
              </>
            ) : (
              <Line label={t('detail.wageAmount')} value={`${formatCurrency(staff.wage_amount)}/${WAGE_LABELS[staff.wage_type]}`} last />
            )}
          </Animated.View>

          {/* earnings */}
          <Animated.View entering={FadeInDown.delay(120).duration(300)} style={{ gap: 10 }}>
            <Text style={{ fontFamily: f.bold, fontSize: 18, color: colors.textPrimary }}>{t('detail.performanceReport')}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[card, { flex: 1, gap: 4, backgroundColor: dark ? '#0F2E1C' : status.success[50], borderColor: 'transparent' }]}>
                <Text style={{ fontFamily: f.medium, fontSize: 12, color: colors.textSecondary }}>{t('detail.thisMonth')}</Text>
                <Text style={{ fontFamily: f.bold, fontSize: 20, color: status.success[600] }}>{formatCurrency(thisMonthEarnings)}</Text>
              </View>
              <View style={[card, { flex: 1, gap: 4 }]}>
                <Text style={{ fontFamily: f.medium, fontSize: 12, color: colors.textMuted }}>{t('detail.lastMonth')}</Text>
                <Text style={{ fontFamily: f.bold, fontSize: 20, color: colors.textPrimary }}>{formatCurrency(lastMonthEarnings)}</Text>
              </View>
            </View>
            <View style={[styles.list, { backgroundColor: colors.bgSurface, borderColor: border }]}>
              <Line label={t('detail.allTimeEarnings')} value={formatCurrency(totalEarnings)} strong last />
            </View>
          </Animated.View>

          {/* Work entries only make sense for per-piece staff — monthly/daily
              staff are paid a fixed wage regardless of how much they stitch,
              so there's nothing to log. */}
          {staff.wage_type === 'per_piece' ? (
            <Animated.View entering={FadeInDown.delay(180).duration(300)} style={{ gap: 10 }}>
              <View style={styles.between}>
                <Text style={{ fontFamily: f.bold, fontSize: 18, color: colors.textPrimary }}>{t('detail.workEntries')}</Text>
                {workEntries.length > 0 ? (
                  <DSButton title={t('detail.addWorkEntry')} variant="link" size="sm" onPress={() => navigation.navigate('StaffWorkEntryForm', { staffId: staff.id })} />
                ) : null}
              </View>

              {workEntries.length > 0 ? (
                <View style={[styles.list, { backgroundColor: colors.bgSurface, borderColor: border }]}>
                  <View style={[styles.line, { backgroundColor: dark ? '#0F2E1C' : status.success[50] }]}>
                    <Text style={{ fontFamily: f.medium, fontSize: 14, color: colors.textSecondary }}>{t('detail.workTotal')}</Text>
                    <Text style={{ fontFamily: f.bold, fontSize: 15, color: status.success[600] }}>{formatCurrency(totalEarnings)}</Text>
                  </View>
                  {workEntries.map((w, i) => (
                    <View key={w.id}>
                      <View style={[styles.line, { gap: 12 }]}>
                        <View style={[styles.dot, { backgroundColor: colors.primaryTint }]}>
                          <IconShirt size={18} color={primary[600]} strokeWidth={2} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: f.semibold, fontSize: 15, color: colors.textPrimary }}>
                            {WORK_TYPE_LABELS[w.work_type]} × {w.quantity}
                          </Text>
                          <Text style={{ fontFamily: f.regular, fontSize: 12, color: colors.textMuted }}>
                            {formatDate(w.work_date)} · {formatCurrency(w.rate_applied)}
                            {t('detail.perPieceSuffix')}
                          </Text>
                        </View>
                        <Text style={{ fontFamily: f.bold, fontSize: 15, color: colors.textPrimary }}>{formatCurrency(entryEarning(w))}</Text>
                      </View>
                      {i === workEntries.length - 1 ? null : (
                        <View style={{ height: StyleSheet.hairlineWidth, marginLeft: 16, backgroundColor: colors.borderSubtle }} />
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <DSButton
                  title={t('detail.addWorkEntry')}
                  variant="line"
                  size="rg"
                  fullWidth
                  leftIcon={IconPlus}
                  onPress={() => navigation.navigate('StaffWorkEntryForm', { staffId: staff.id })}
                />
              )}
            </Animated.View>
          ) : null}
        </ScrollView>
      )}
      {popup}
    </DSScreen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 24, padding: 16 },
  list: { borderWidth: 1, borderRadius: 24, overflow: 'hidden' },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 9999 },
  dot: { width: 38, height: 38, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
});
