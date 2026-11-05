import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { DSBottomSheet } from '../../components/ds/BottomSheet';
import { DSButton } from '../../components/ds/Button';
import { DSEmptyState } from '../../components/ds/EmptyState';
import { DSStaffList } from '../../components/ds/Lists';
import { DSSkeletonList } from '../../components/ds/Loading';
import { DSScreen, GlassSearch } from '../../components/ds/Screen';
import { DSRadioGroup } from '../../components/ds/Selection';
import { IconAdjustmentsHorizontal, IconPlus, IconSearchOff, IconUsers } from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { staffRepo } from '../../lib/data/repository';
import { useShop } from '../../context/AuthContext';
import type { SettingsScreenProps } from '../../navigation/types';
import type { Staff, WageType } from '../../types';

export default function StaffListScreen({ navigation }: SettingsScreenProps<'Staff'>) {
  const { t } = useTranslation('staff');
  const showToast = useToast();
  const shop = useShop();
  const WAGE_LABELS: Record<WageType, string> = {
    daily: t('wageUnit.daily'),
    monthly: t('wageUnit.monthly'),
    per_piece: t('wageUnit.per_piece'),
  };
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [wageTypeFilter, setWageTypeFilter] = useState<WageType | null>(null);
  const [showFilter, setShowFilter] = useState(false);

  const load = useCallback(async () => {
    try {
      setStaff(await staffRepo.list(shop.id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('list.loadError'), 'error');
    }
  }, [showToast, t, shop.id]);

  useFocusEffect(
    useCallback(() => {
      void load().finally(() => setLoading(false));
    }, [load])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase();
    return staff.filter((item) => {
      if (wageTypeFilter && item.wage_type !== wageTypeFilter) return false;
      if (!query) return true;
      return [item.name, item.phone].some((field) => field?.toLowerCase().includes(query));
    });
  }, [staff, search, wageTypeFilter]);

  const hasActiveFilters = Boolean(wageTypeFilter);
  const narrowed = hasActiveFilters || search.trim().length > 0;

  return (
    <DSScreen
      title={t('list.title')}
      onBack={() => navigation.goBack()}
      actions={[
        { icon: IconAdjustmentsHorizontal, label: t('list.filterModalTitle'), badge: hasActiveFilters, onPress: () => setShowFilter(true) },
        { icon: IconPlus, label: t('list.addStaff'), onPress: () => navigation.navigate('StaffForm', {}) },
      ]}
      headerExtra={<GlassSearch value={search} onChangeText={setSearch} placeholder={t('list.searchPlaceholder')} />}
    >
      {loading ? (
        <View style={{ padding: 20 }}>
          <DSSkeletonList rows={6} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={filteredStaff.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : { paddingTop: 8, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2563EB" />}
        >
          {filteredStaff.length === 0 ? (
            narrowed ? (
              <DSEmptyState icon={IconSearchOff} title={t('list.emptySearchTitle')} description={t('list.emptySearchDescription')} />
            ) : (
              <DSEmptyState
                icon={IconUsers}
                title={t('list.emptyTitle')}
                description={t('list.emptyDescription')}
                actionLabel={t('list.addStaff')}
                onAction={() => navigation.navigate('StaffForm', {})}
              />
            )
          ) : (
            <DSStaffList
              edge
              items={filteredStaff.map((s) => ({
                id: s.id,
                name: s.name,
                phone: s.phone ?? t('list.noPhone'),
                wageLabel: WAGE_LABELS[s.wage_type],
              }))}
              onPressItem={(item) => navigation.navigate('StaffDetail', { staffId: item.id })}
            />
          )}
        </ScrollView>
      )}

      <DSBottomSheet visible={showFilter} onClose={() => setShowFilter(false)} title={t('list.filterModalTitle')}>
        <View style={{ paddingTop: 12, paddingBottom: 16, gap: 16 }}>
          <DSRadioGroup
            value={wageTypeFilter ?? 'all'}
            onChange={(v) => {
              setWageTypeFilter(v === 'all' ? null : (v as WageType));
              setShowFilter(false);
            }}
            options={[
              { value: 'all', label: t('list.filterAll') },
              { value: 'daily', label: WAGE_LABELS.daily },
              { value: 'monthly', label: WAGE_LABELS.monthly },
              { value: 'per_piece', label: WAGE_LABELS.per_piece },
            ]}
          />
          {hasActiveFilters ? (
            <View style={{ alignItems: 'flex-start' }}>
              <DSButton title={t('list.reset')} variant="link" size="sm" onPress={() => setWageTypeFilter(null)} />
            </View>
          ) : null}
        </View>
      </DSBottomSheet>
    </DSScreen>
  );
}
