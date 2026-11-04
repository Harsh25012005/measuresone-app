import { useMemo, useState } from 'react';
import { Pressable, TextInput, View, FlatList, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useTheme } from '../../../context/ThemeContext';
import { usePalette } from '../../theme/usePalette';
import { focusRing, useFocus } from '../../theme/useFocus';
import { fontFamilyFor, typeScale } from '../../theme/tokens';
import { useToast } from './Toast';
import { VoiceListeningOverlay } from '../../../components/ui/VoiceListeningOverlay';
import { BottomSheet } from './Modal';
import { Icon } from './Icon';
import { Text } from './Text';

export type DropdownOption<T extends string = string> = { label: string; value: T; subtext?: string };

export type DropdownProps<T extends string = string> = {
  label?: string;
  value: T | '';
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  placeholder?: string;
  error?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  onAddNew?: () => void;
  addNewLabel?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  testID?: string;
};

/** 48dp trigger (radius 3) that opens a searchable bottom sheet. */
export function Dropdown<T extends string = string>({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  searchable = false,
  searchPlaceholder,
  onAddNew,
  addNewLabel,
  required = false,
  optional = false,
  className = '',
  testID,
}: DropdownProps<T>) {
  const { t, i18n } = useTranslation('common');
  const { colors } = useTheme();
  const palette = usePalette();
  const { focused, handlers } = useFocus();
  const showToast = useToast();
  const { height } = useWindowDimensions();
  const placeholderText = placeholder ?? t('fields.select', { defaultValue: 'Select...' });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dictating, setDictating] = useState(false);
  const selected = options.find((o) => o.value === value);

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) setQuery(transcript);
  });
  useSpeechRecognitionEvent('end', () => setDictating(false));
  useSpeechRecognitionEvent('error', () => {
    setDictating(false);
    showToast(t('fields.dictationFailed', { defaultValue: 'Voice recognition failed' }), 'error');
  });

  const handleVoiceSearch = async () => {
    try {
      const perms = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perms.granted) {
        showToast(t('fields.microphonePermissionRequired', { defaultValue: 'Microphone permission required' }), 'error');
        return;
      }
      setDictating(true);
      ExpoSpeechRecognitionModule.start({ lang: 'gu-IN' });
    } catch {
      setDictating(false);
      showToast(t('fields.dictationStartFailed', { defaultValue: 'Could not start voice search' }), 'error');
    }
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q) || (o.subtext && o.subtext.toLowerCase().includes(q)));
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const emphasised = !!error || focused;

  return (
    <View className={`mb-4 w-full ${className}`}>
      {label ? (
        <Text variant="label" className="mb-1.5">
          {label}
          {required ? <Text variant="label" tone="danger"> *</Text> : null}
          {optional ? (
            <Text variant="label" tone="muted" weight="regular">
              {' '}({t('fields.optional')})
            </Text>
          ) : null}
        </Text>
      ) : null}

      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}, ${selected ? selected.label : placeholderText}` : selected?.label ?? placeholderText}
        accessibilityHint={error}
        testID={testID}
        {...handlers}
        style={[
          { borderWidth: emphasised ? 2 : 1, paddingHorizontal: emphasised ? 11 : 12 },
          focused ? focusRing(colors.primary) : null,
        ]}
        className={`h-12 flex-row items-center justify-between rounded-md bg-surface ${error ? 'border-danger' : focused ? 'border-primary' : 'border-line'}`}
      >
        <Text variant="body" tone={selected ? 'default' : 'faint'} numberOfLines={1} className="flex-1">
          {selected ? selected.label : placeholderText}
        </Text>
        <Icon name="chevD" size={18} color={colors.textMuted} />
      </Pressable>

      {error ? (
        <View className="mt-1.5 flex-row items-center">
          <Icon name="alert" size={14} color={palette.danger} />
          <Text variant="caption" tone="danger" className="ml-1 flex-1" accessibilityLiveRegion="polite">
            {error}
          </Text>
        </View>
      ) : null}

      <BottomSheet visible={open} onClose={close} title={label ?? placeholderText} scroll={false}>
        {searchable ? (
          <View className="mb-2 h-12 flex-row items-center rounded-md border border-line bg-bg px-3">
            <Icon name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder ?? t('fields.search', { defaultValue: 'Search...' })}
              placeholderTextColor={colors.textFaint}
              autoFocus
              autoCorrect={false}
              accessibilityLabel={searchPlaceholder ?? t('fields.search', { defaultValue: 'Search...' })}
              className="ml-2 flex-1 p-0 text-ink"
              style={{ fontFamily: fontFamilyFor(i18n?.language ?? 'en', 'regular'), fontSize: typeScale.base }}
            />
            {query.length > 0 ? (
              <Pressable
                onPress={() => setQuery('')}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.clear')}
                className="h-11 w-11 items-center justify-center"
              >
                <Icon name="x" size={18} color={colors.textMuted} />
              </Pressable>
            ) : (
              <Pressable
                onPress={handleVoiceSearch}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.voiceSearch')}
                className="h-11 w-11 items-center justify-center"
              >
                <Icon name="mic" size={20} color={colors.primary} />
              </Pressable>
            )}
          </View>
        ) : null}

        <FlatList
          data={filtered}
          style={{ maxHeight: height * 0.55 }}
          keyExtractor={(item) => item.value}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const isSelected = item.value === value;
            return (
              <Pressable
                onPress={() => {
                  onChange(item.value);
                  close();
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={item.subtext ? `${item.label}, ${item.subtext}` : item.label}
                className={`min-h-[56px] flex-row items-center justify-between border-b border-line-2 px-2 py-2 ${
                  isSelected ? 'bg-primary-50' : 'active:bg-surface-2'
                }`}
              >
                <View className="mr-2 flex-1">
                  <Text variant="body" tone={isSelected ? 'primary' : 'default'} weight={isSelected ? 'bold' : 'regular'}>
                    {item.label}
                  </Text>
                  {item.subtext ? (
                    <Text variant="caption" tone="muted" weight="regular">
                      {item.subtext}
                    </Text>
                  ) : null}
                </View>
                {isSelected ? <Icon name="check" size={20} color={colors.primary} strokeWidth={2.5} /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View className="items-center py-6">
              <Text variant="body" tone="muted">
                {t('fields.noOptions', { defaultValue: 'No options found' })}
              </Text>
            </View>
          }
          ListFooterComponent={
            onAddNew ? (
              <Pressable
                onPress={() => {
                  close();
                  onAddNew();
                }}
                accessibilityRole="button"
                className="mt-2 min-h-touch flex-row items-center justify-center rounded border border-dashed border-primary bg-primary-50"
              >
                <Icon name="plus" size={18} color={colors.primary} />
                <Text variant="label" tone="primary" className="ml-2">
                  {addNewLabel ?? t('fields.addNew', { defaultValue: 'Add new' })}
                </Text>
              </Pressable>
            ) : null
          }
        />
      </BottomSheet>

      <VoiceListeningOverlay
        visible={dictating}
        label={t('fields.listening', { defaultValue: 'Listening…' })}
        hint={t('fields.speakToSearch', { defaultValue: 'Say the name to search' })}
        onStop={() => {
          ExpoSpeechRecognitionModule.stop();
          setDictating(false);
        }}
      />
    </View>
  );
}
