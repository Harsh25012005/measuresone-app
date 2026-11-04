import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import {
  Avatar,
  Button,
  Card,
  Header,
  Icon,
  IconButton,
  ListRow,
  Section,
  Skeleton,
  Text,
  useToast,
} from '../../src/components/ui';
import { usePalette } from '../../src/theme/usePalette';
import { supabase } from '../../lib/supabase';
import { staffRepo } from '../../lib/data/repository';
import { formatCurrency, formatDate } from '../../lib/format';
import { sendWhatsAppMessage } from '../../lib/whatsapp';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { SettingsScreenProps } from '../../navigation/types';
import type { Tables } from '../../lib/database.types';
import type { Staff } from '../../types';

type WorkEntry = Tables<'staff_work_entries'>;

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

function AmountRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View className="min-h-[48px] flex-row items-center justify-between rounded-md bg-surface-2 px-3 py-2">
      <Text variant="label" tone="muted" weight="regular" className="mr-2 flex-1">
        {label}
      </Text>
      <Text variant="bodyLg" tabular>
        {value}
      </Text>
    </View>
  );
}

export default function StaffDetailScreen({ navigation, route }: SettingsScreenProps<'StaffDetail'>) {
  const { t } = useTranslation('staff');
  const { staffId } = route.params;
  const showToast = useToast();
  const shop = useShop();
  const { colors } = useTheme();
  const palette = usePalette();

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
  const [sendingReport, setSendingReport] = useState(false);

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
    Alert.alert(t('detail.deleteConfirmTitle'), t('detail.deleteConfirmMessage', { name: staff.name }), [
      { text: t('detail.cancel'), style: 'cancel' },
      {
        text: t('detail.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await staffRepo.remove(staff.id, shop.id);
            showToast(t('detail.deleteSuccess'), 'success');
            navigation.goBack();
          } catch (err) {
            showToast(err instanceof Error ? err.message : t('detail.deleteFailed'), 'error');
          }
        },
      },
    ]);
  };

  const handleSendReport = async () => {
    if (!staff) return;
    setSendingReport(true);
    try {
      await sendWhatsAppMessage(
        staff.phone,
        t('detail.reportMessage', {
          staffName: staff.name,
          shopName: shop.shop_name,
          amount: formatCurrency(thisMonthEarnings),
        })
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('detail.reportSendFailed'), 'error');
    } finally {
      setSendingReport(false);
    }
  };

  if (loading || !staff) {
    return (
      <View className="flex-1 bg-bg">
        <Header title={t('detail.loading')} onBack={() => navigation.goBack()} />
        <View className="gap-4 p-4">
          <Skeleton height={200} />
          <Skeleton height={180} />
        </View>
      </View>
    );
  }

  const workTotal = workEntries.reduce((s, w) => s + entryEarning(w), 0);

  return (
    <View className="flex-1 bg-bg">
      <Header
        title={staff.name}
        onBack={() => navigation.goBack()}
        right={
          <>
            <IconButton
              icon="edit"
              variant="ghost"
              accessibilityLabel={t('form.titleEdit')}
              onPress={() => navigation.navigate('StaffForm', { staffId: staff.id })}
            />
            <IconButton icon="trash" variant="ghost" color={palette.danger} accessibilityLabel={t('detail.delete')} onPress={handleDelete} />
          </>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 16 }}>
        <Card>
          <View className="flex-row items-center">
            <Avatar name={staff.name} size="lg" />
            <View className="ml-4 flex-1">
              <Text variant="headline" numberOfLines={1}>
                {staff.name}
              </Text>
              <Text variant="label" tone="muted" weight="regular">
                {staff.role ?? t('detail.defaultRole')}
              </Text>
              {staff.phone ? (
                <View className="mt-1 flex-row items-center">
                  <Icon name="phone" size={14} color={colors.textMuted} />
                  <Text variant="label" tone="muted" weight="regular" tabular className="ml-1.5">
                    {staff.phone}
                  </Text>
                </View>
              ) : (
                <Text variant="label" tone="faint" weight="regular" className="mt-1">
                  {t('detail.noPhone')}
                </Text>
              )}
            </View>
          </View>

          {/* Per-piece staff have a rate per garment, not one flat wage. */}
          <View className="mt-4 gap-2">
            {staff.wage_type === 'per_piece' ? (
              <>
                <AmountRow label={t('detail.amountPerPant')} value={formatCurrency(staff.wage_amount_pant ?? 0)} />
                <AmountRow label={t('detail.amountPerShirt')} value={formatCurrency(staff.wage_amount_shirt ?? 0)} />
                <AmountRow
                  label={t('detail.amountPerPair')}
                  value={formatCurrency(Number(staff.wage_amount_pant ?? 0) + Number(staff.wage_amount_shirt ?? 0))}
                />
              </>
            ) : (
              <AmountRow label={t('detail.wageAmount')} value={`${formatCurrency(staff.wage_amount)} / ${WAGE_LABELS[staff.wage_type]}`} />
            )}
          </View>
        </Card>

        <Section title={t('detail.performanceReport')}>
          <View className="flex-row gap-3">
            <View className="min-w-0 flex-1 rounded-md bg-primary-50 p-3">
              <Text variant="caption" tone="primary">
                {t('detail.thisMonth')}
              </Text>
              <Text variant="bodyLg" tone="primary" tabular numberOfLines={1}>
                {formatCurrency(thisMonthEarnings)}
              </Text>
            </View>
            <View className="min-w-0 flex-1 rounded-md bg-surface-2 p-3">
              <Text variant="caption" tone="muted">
                {t('detail.lastMonth')}
              </Text>
              <Text variant="bodyLg" tabular numberOfLines={1}>
                {formatCurrency(lastMonthEarnings)}
              </Text>
            </View>
          </View>
          <View className="mt-2">
            <AmountRow label={t('detail.allTimeEarnings')} value={formatCurrency(totalEarnings)} />
          </View>

          <Button
            title={t('detail.sendReport')}
            onPress={handleSendReport}
            loading={sendingReport}
            disabled={!staff.phone}
            variant="secondary"
            icon={<Icon name="chat" size={18} color={colors.textPrimary} />}
            className="mt-4"
          />
        </Section>

        {/* Work entries only make sense for per-piece staff — monthly/daily
            staff are paid a fixed wage regardless of how much they stitch,
            so there's nothing to log. */}
        {staff.wage_type === 'per_piece' ? (
          workEntries.length > 0 ? (
            <Section
              title={t('detail.workEntries')}
              padded={false}
              action={
                <Button
                  title={t('detail.addWorkEntry')}
                  variant="ghost"
                  size="sm"
                  fullWidth={false}
                  onPress={() => navigation.navigate('StaffWorkEntryForm', { staffId: staff.id })}
                />
              }
            >
              <View className="flex-row items-center justify-between bg-primary-50 px-4 py-3">
                <Text variant="label" tone="primary">
                  {t('detail.workTotal')}
                </Text>
                <Text variant="bodyLg" tone="primary" tabular>
                  {formatCurrency(workTotal)}
                </Text>
              </View>
              {workEntries.map((w, index) => (
                <ListRow
                  key={w.id}
                  title={`${WORK_TYPE_LABELS[w.work_type]} × ${w.quantity}`}
                  subtitle={`${formatDate(w.work_date)} · ${formatCurrency(w.rate_applied)}${t('detail.perPieceSuffix')}`}
                  leading={
                    <View className="h-10 w-10 items-center justify-center rounded bg-primary-50">
                      <Icon name="scissors" size={20} color={colors.primary} />
                    </View>
                  }
                  trailing={
                    <Text variant="bodyLg" tabular>
                      {formatCurrency(entryEarning(w))}
                    </Text>
                  }
                  divider={index < workEntries.length - 1}
                />
              ))}
            </Section>
          ) : (
            <Button
              title={t('detail.addWorkEntry')}
              onPress={() => navigation.navigate('StaffWorkEntryForm', { staffId: staff.id })}
              variant="secondary"
            />
          )
        ) : null}
      </ScrollView>
    </View>
  );
}
