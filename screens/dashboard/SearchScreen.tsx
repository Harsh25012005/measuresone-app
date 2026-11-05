import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '../../components/ds/Pressable';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { QuickAddCustomerSheet, useToast, VoiceListeningOverlay } from '../../components/ui';
import { DSBottomSheet } from '../../components/ds/BottomSheet';
import { DSButton } from '../../components/ds/Button';
import { DSEmptyState } from '../../components/ds/EmptyState';
import { DSScreen, GlassSearch } from '../../components/ds/Screen';
import { IconChevronRight, IconMicrophone, IconSearch, IconUserPlus } from '../../components/ds/icons';
import { customersRepo } from '../../lib/data/repository';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { status, typography } from '../../constants/tokens';
import type { DashboardScreenProps } from '../../navigation/types';
import type { Tables } from '../../lib/database.types';

const f = typography.family;
const AVATAR_COLORS = ['#2563EB', '#7C3AED', '#0891B2', '#D97706', '#DB2777', '#16A34A'];

type Customer = Tables<'customers'>;

export default function SearchScreen({ navigation }: DashboardScreenProps<'Search'>) {
  const { t } = useTranslation('dashboard');
  const shop = useShop();
  const showToast = useToast();
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [dictating, setDictating] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [quickAddVisible, setQuickAddVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void customersRepo.list(shop.id).then(setCustomers);
    }, [shop.id])
  );

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) setQuery(transcript);
  });
  useSpeechRecognitionEvent('end', () => setDictating(false));
  useSpeechRecognitionEvent('error', () => {
    setDictating(false);
    showToast(t('search.dictationFailed'), 'error');
  });

  const startDictation = async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      showToast(t('search.microphonePermissionDenied'), 'error');
      return;
    }
    setDictating(true);
    ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: false, continuous: false });
  };
  const stopDictation = () => ExpoSpeechRecognitionModule.stop();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return customers.filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q));
  }, [customers, query]);

  const handleCreated = (customer: Customer) => {
    setQuickAddVisible(false);
    setCustomers((prev) => [...prev, customer]);
    setActiveCustomer(customer);
  };

  return (
    <DSScreen
      title={t('search.title')}
      onBack={() => navigation.goBack()}
      headerExtra={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <GlassSearch value={query} onChangeText={setQuery} placeholder={t('search.placeholder')} autoFocus />
          <Pressable
            onPress={() => (dictating ? stopDictation() : startDictation())}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Voice search"
            style={[styles.mic, dictating && { backgroundColor: status.danger[600], borderColor: status.danger[600] }]}
          >
            <IconMicrophone size={20} color="#FFFFFF" strokeWidth={1.9} />
          </Pressable>
        </View>
      }
    >
      {query.trim() === '' ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <DSEmptyState icon={IconSearch} title={t('search.emptyPromptTitle')} description={t('search.emptyPromptDescription')} />
        </View>
      ) : results.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <DSEmptyState
            icon={IconUserPlus}
            title={t('search.noResultsTitle')}
            description={t('search.noResultsDescription')}
            actionLabel={t('search.addClient')}
            onAction={() => setQuickAddVisible(true)}
          />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(c) => c.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 10 }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(260)}>
              <Pressable
                onPress={() => setActiveCustomer(item)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: pressed ? colors.bgSubtle : colors.bgSurface,
                    borderColor: dark ? '#262626' : colors.borderDefault,
                  },
                ]}
              >
                <View style={[styles.avatar, { backgroundColor: AVATAR_COLORS[item.name.length % AVATAR_COLORS.length] }]}>
                  <Text style={{ fontFamily: f.bold, fontSize: 16, color: '#FFFFFF' }}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: f.semibold, fontSize: 15, color: colors.textPrimary }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={{ fontFamily: f.regular, fontSize: 13, color: colors.textMuted }} numberOfLines={1}>
                    {item.phone || t('search.noPhone')}
                  </Text>
                </View>
                <IconChevronRight size={16} color={colors.textFaint} />
              </Pressable>
            </Animated.View>
          )}
        />
      )}

      <DSBottomSheet visible={!!activeCustomer} onClose={() => setActiveCustomer(null)} title={activeCustomer?.name ?? ''}>
        <View style={{ gap: 12, paddingBottom: 12 }}>
          <DSButton
            title={t('search.createOrder')}
            size="lg"
            fullWidth
            onPress={() => {
              const customer = activeCustomer;
              setActiveCustomer(null);
              if (customer) navigation.navigate('OrderForm', { customerId: customer.id });
            }}
          />
          <DSButton
            title={t('search.viewProfile')}
            variant="line"
            size="lg"
            fullWidth
            onPress={() => {
              const customer = activeCustomer;
              setActiveCustomer(null);
              if (customer) {
                (navigation as any).navigate('CustomersTab', {
                  screen: 'CustomerDetail',
                  params: { customerId: customer.id },
                });
              }
            }}
          />
        </View>
      </DSBottomSheet>

      <QuickAddCustomerSheet visible={quickAddVisible} onClose={() => setQuickAddVisible(false)} onCreated={handleCreated} />

      <VoiceListeningOverlay visible={dictating} onStop={stopDictation} label={t('search.listening')} hint={t('search.listeningHint')} />
    </DSScreen>
  );
}

const styles = StyleSheet.create({
  mic: {
    width: 48,
    height: 48,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 9999, borderWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
});
