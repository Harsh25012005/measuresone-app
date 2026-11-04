import { useCallback, useMemo, useState } from 'react';
import { FlatList, Linking, RefreshControl, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import {
  Avatar,
  Button,
  Chip,
  EmptyState,
  Header,
  IconButton,
  ListRow,
  SkeletonList,
  SwipeRow,
  Text,
  useToast,
  VoiceListeningOverlay,
} from '../../src/components/ui';
import { customersRepo, billsRepo } from '../../lib/data/repository';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrency } from '../../lib/format';
import { haptics } from '../../lib/haptics';
import { SyncNotice } from '../../components/SyncNotice';
import { sendWhatsAppMessage } from '../../lib/whatsapp';
import type { CustomersScreenProps } from '../../navigation/types';
import type { CustomerWithBalance } from '../../types';

// One shared collator: far faster than String.localeCompare when sorting thousands of names.
const nameCollator = new Intl.Collator(undefined, { sensitivity: 'base' });

async function fetchCustomersWithBalance(shopId: string): Promise<CustomerWithBalance[]> {
  const [customers, balanceByCustomer] = await Promise.all([
    customersRepo.list(shopId),
    billsRepo.pendingBalanceByCustomer(shopId),
  ]);
  return customers.map((c) => ({ ...c, balance: balanceByCustomer[c.id] ?? 0 }));
}

export default function CustomerListScreen({ navigation }: CustomersScreenProps<'CustomerList'>) {
  const { t } = useTranslation('customers');
  const { t: tc } = useTranslation('common');
  const showToast = useToast();
  const shop = useShop();
  const { colors } = useTheme();

  const [customers, setCustomers] = useState<CustomerWithBalance[]>([]);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'All' | 'Has dues'>('All');
  const [dictating, setDictating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setCustomers(await fetchCustomersWithBalance(shop.id));
      setLoadFailed(false);
    } catch (err) {
      setLoadFailed(true);
      showToast(err instanceof Error ? err.message : t('list.loadError'), 'error');
    }
  }, [showToast, shop.id, t]);

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

  // Voice dictation events
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) setSearch(transcript);
  });
  useSpeechRecognitionEvent('end', () => setDictating(false));
  useSpeechRecognitionEvent('error', () => {
    setDictating(false);
    showToast(t('list.dictationFailed', { defaultValue: 'Could not hear that' }), 'error');
  });

  const startDictation = async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      showToast(t('list.micPermissionDenied', { defaultValue: 'Microphone permission needed' }), 'error');
      return;
    }
    setDictating(true);
    ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: false, continuous: false });
  };

  const q = search.trim().toLowerCase();
  const qClean = q.replace(/^#/, '');

  const filtered = useMemo(
    () =>
      customers
        .filter((c) => {
          if (filterMode === 'Has dues' && c.balance <= 0) return false;
          if (!q) return true;
          return (
            c.name.toLowerCase().includes(q) ||
            (c.phone ?? '').includes(qClean) ||
            (c.book_number ?? '').toLowerCase().includes(q)
          );
        })
        .sort((a, b) => nameCollator.compare(a.name, b.name)),
    [customers, filterMode, q, qClean]
  );

  const allCount = customers.length;
  const hasDuesCount = useMemo(() => customers.filter((c) => c.balance > 0).length, [customers]);
  const resetAll = () => {
    setSearch('');
    setFilterMode('All');
  };

  const header = (
    <Header
      showBack={false}
      title={t('list.title')}
      right={
        <IconButton
          icon="plus"
          variant="tonal"
          accessibilityLabel={tc('a11y.addCustomer')}
          onPress={() => {
            haptics.tap();
            navigation.navigate('CustomerForm');
          }}
        />
      }
      searchProps={{
        value: search,
        onChangeText: setSearch,
        placeholder: t('list.searchPlaceholderDetailed'),
        onMicPress: startDictation,
      }}
    />
  );

  if (loading && customers.length === 0) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <SkeletonList count={8} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      {header}

      <View className="border-b border-line-2 bg-surface py-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}>
          <Chip
            label={t('list.allCustomers')}
            count={allCount}
            selected={filterMode === 'All'}
            onPress={() => {
              haptics.tap();
              setFilterMode('All');
            }}
          />
          <Chip
            label={t('list.hasDues')}
            count={hasDuesCount}
            selected={filterMode === 'Has dues'}
            onPress={() => {
              haptics.tap();
              setFilterMode('Has dues');
            }}
          />
        </ScrollView>
      </View>

      <View className="min-h-[40px] flex-row items-center justify-between px-4">
        <Text variant="caption" tone="muted" weight="regular" className="py-2">
          {t('list.customersCount', { count: filtered.length })}
        </Text>
        <SyncNotice />
        {search.length > 0 || filterMode !== 'All' ? (
          <Button title={t('list.reset')} variant="ghost" size="sm" fullWidth={false} onPress={resetAll} />
        ) : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        initialNumToRender={15}
        maxToRenderPerBatch={15}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={filtered.length === 0 ? { flexGrow: 1 } : { paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          loadFailed ? (
            <EmptyState
              variant="full"
              icon="alert"
              title={tc('errors.loadTitle')}
              description={tc('errors.loadDescription')}
              actionLabel={tc('actions.retry')}
              onAction={() => {
                setLoading(true);
                void load().finally(() => setLoading(false));
              }}
            />
          ) : (
          <EmptyState
            variant="full"
            icon="users"
            title={search ? t('list.emptySearchTitle') : t('list.emptyTitle')}
            description={search ? t('list.emptySearchDescription') : t('list.emptyDescription')}
            actionLabel={t('list.addCustomer')}
            onAction={() => navigation.navigate('CustomerForm')}
          />
          )
        }
        renderItem={({ item }) => {
          const phone = item.phone;
          const subtitle = [item.book_number ? t('list.book', { number: item.book_number }) : null, phone || t('list.noPhone')]
            .filter(Boolean)
            .join(' · ');
          const reveal = phone
            ? [
                {
                  key: 'call',
                  label: tc('actions.call'),
                  icon: 'phone',
                  onPress: () => void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`).catch(() => showToast(tc('call.failed'), 'error')),
                },
                {
                  key: 'whatsapp',
                  label: 'WhatsApp',
                  icon: 'chat',
                  onPress: () => void sendWhatsAppMessage(phone, '').catch((e) => showToast(e instanceof Error ? e.message : tc('whatsapp.failed'), 'error')),
                },
              ]
            : [];

          return (
            <SwipeRow revealActions={reveal}>
              <ListRow
                title={item.name}
                subtitle={subtitle}
                leading={<Avatar name={item.name} size="md" />}
                trailing={
                  item.balance > 0 ? (
                    <>
                      <Text variant="bodyLg" tone="danger" tabular>
                        {formatCurrency(item.balance)}
                      </Text>
                      <Text variant="caption" tone="muted" weight="regular">
                        {t('list.dueText')}
                      </Text>
                    </>
                  ) : undefined
                }
                onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id })}
                accessibilityLabel={`${item.name}, ${subtitle}${item.balance > 0 ? `, ${formatCurrency(item.balance)} ${t('list.dueText')}` : ''}`}
              />
            </SwipeRow>
          );
        }}
      />

      <VoiceListeningOverlay
        visible={dictating}
        onStop={() => {
          ExpoSpeechRecognitionModule.stop();
          setDictating(false);
        }}
        label={t('list.listening', { defaultValue: 'Listening…' })}
        hint={t('list.listeningHint', { defaultValue: 'Say customer name, tap anywhere to stop' })}
      />
    </View>
  );
}
