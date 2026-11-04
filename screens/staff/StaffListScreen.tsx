import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Chip,
  EmptyState,
  Header,
  IconButton,
  ListRow,
  SkeletonList,
  useToast,
} from '../../src/components/ui';
import { useTheme } from '../../context/ThemeContext';
import { staffRepo } from '../../lib/data/repository';
import { useShop } from '../../context/AuthContext';
import type { SettingsScreenProps } from '../../navigation/types';
import type { Staff, WageType } from '../../types';

export default function StaffListScreen({ navigation }: SettingsScreenProps<'Staff'>) {
  const { t } = useTranslation('staff');
  const showToast = useToast();
  const { colors } = useTheme();
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
  const [showFilterModal, setShowFilterModal] = useState(false);

  const load = useCallback(async () => {
    try {
      setStaff(await staffRepo.list(shop.id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('list.loadError'), 'error');
    }
  }, [showToast, t, shop.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load().finally(() => setLoading(false));
    }, [load])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const wageTypeOptions: WageType[] = ['daily', 'monthly', 'per_piece'];

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase();
    return staff.filter((item) => {
      if (wageTypeFilter && item.wage_type !== wageTypeFilter) return false;
      if (!query) return true;
      return [item.name, item.phone].some((field) => field?.toLowerCase().includes(query));
    });
  }, [staff, search, wageTypeFilter]);

  const hasActiveFilters = Boolean(wageTypeFilter);

  const header = (
    <Header
      title={t('list.title')}
      onBack={() => navigation.goBack()}
      right={
        <IconButton
          icon="plus"
          variant="tonal"
          accessibilityLabel={t('list.addStaff')}
          onPress={() => navigation.navigate('StaffForm', {})}
        />
      }
      searchProps={{
        value: search,
        onChangeText: setSearch,
        placeholder: t('list.searchPlaceholder'),
        onFilterPress: () => setShowFilterModal(true),
        hasActiveFilter: hasActiveFilters,
      }}
    />
  );

  if (loading && staff.length === 0) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <SkeletonList count={5} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      {header}

      <BottomSheet
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        title={t('list.filterModalTitle')}
        footer={
          <View className="flex-row gap-2">
            {hasActiveFilters ? (
              <Button title={t('list.reset')} variant="secondary" className="flex-1" onPress={() => setWageTypeFilter(null)} />
            ) : null}
            <Button title={t('list.applyFilters')} className="flex-[1.5]" onPress={() => setShowFilterModal(false)} />
          </View>
        }
      >
        <View className="flex-row flex-wrap gap-2">
          {wageTypeOptions.map((wt) => (
            <Chip key={wt} label={WAGE_LABELS[wt]} selected={wageTypeFilter === wt} onPress={() => setWageTypeFilter(wageTypeFilter === wt ? null : wt)} />
          ))}
        </View>
      </BottomSheet>

      <FlatList
        data={filteredStaff}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filteredStaff.length === 0 ? { flexGrow: 1 } : { paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="users"
            title={hasActiveFilters ? t('list.emptySearchTitle') : t('list.emptyTitle')}
            description={hasActiveFilters ? t('list.emptySearchDescription') : t('list.emptyDescription')}
            actionLabel={hasActiveFilters ? undefined : t('list.addStaff')}
            onAction={hasActiveFilters ? undefined : () => navigation.navigate('StaffForm', {})}
          />
        }
        renderItem={({ item }) => (
          <ListRow
            title={item.name}
            subtitle={item.phone ?? t('list.noPhone')}
            leading={<Avatar name={item.name} size="md" />}
            trailing={<Badge label={WAGE_LABELS[item.wage_type]} />}
            onPress={() => navigation.navigate('StaffDetail', { staffId: item.id })}
          />
        )}
      />
    </View>
  );
}
