import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Button, Card, Chip, Header, IconButton, InputField, Section, SkeletonList, Text, useToast } from '../../src/components/ui';
import { haptics } from '../../lib/haptics';
import { useShop } from '../../context/AuthContext';
import { universalTemplatesRepo, customerMeasurementsRepo } from '../../lib/data/repository';
import {
  FLAT_SECTION_KEY,
  buildMeasurementsJson,
  extractClothTypes,
  loadMeasurementSections,
  readSectionValues,
  saveCustomerClothMeasurement,
  sectionTitle,
  type MeasurementSection,
  type SectionValues,
} from '../../lib/measurementLayout';
import { garmentNameLabel, measurementFieldLabel } from '../../lib/measurementNames';
import type { AppScreenProps } from '../../navigation/types';
import type { Tables } from '../../lib/database.types';

type Template = Tables<'universal_measurement_templates'>;

/** Half-inch step for the − / + buttons; keeps 1 decimal at most (10, 10.5, 11). */
function stepValue(current: string, dir: 1 | -1): string {
  const n = Number(current);
  const base = Number.isFinite(n) && current !== '' ? n : 0;
  const next = Math.max(0, Math.round((base + dir * 0.5) * 1000) / 1000);
  return String(next);
}

/** Every entered value keyed by field name, so switching templates keeps them. */
function flattenValues(values: SectionValues<string>): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const section of Object.values(values)) {
    for (const [k, v] of Object.entries(section)) if (v !== '' && !(k in flat)) flat[k] = v;
  }
  return flat;
}

export default function MeasurementFormScreen({
  navigation,
  route,
}: AppScreenProps<'MeasurementForm'>) {
  const { customerId } = route.params;
  const shop = useShop();
  const showToast = useToast();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('customers');

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  // One card per section: a single card for most templates, separate Shirt
  // and Pant cards for "Shirt + Pant" so shared fields (Length) stay apart.
  const [sections, setSections] = useState<MeasurementSection[]>([]);
  const [values, setValues] = useState<SectionValues<string>>({});
  // What was saved last time, shown under each field so the tailor can compare while typing.
  const [previous, setPrevious] = useState<SectionValues<string>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // One ref per field in on-screen order, so "next" on the keypad moves down the list.
  const inputRefs = useRef<Record<string, TextInput | null>>({});

  const applyTemplate = useCallback(
    async (templateId: string, source: unknown) => {
      const layout = await loadMeasurementSections(shop.id, templateId);
      const read = readSectionValues(source, layout);
      setSections(read.sections);
      setValues(read.values);
      return read.values;
    },
    [shop.id]
  );

  const loadData = useCallback(async () => {
    try {
      const tmplList = await universalTemplatesRepo.list(shop.id);
      setTemplates(tmplList);

      const profile = await customerMeasurementsRepo.getByCustomer(customerId);
      const targetTemplateId =
        route.params?.templateId ||
        (route.params?.clothType
          ? tmplList.find((t) => t.template_name.toLowerCase() === route.params?.clothType?.toLowerCase())?.id
          : null) ||
        profile?.template_id ||
        (tmplList.length > 0 ? tmplList[0].id : null);

      if (targetTemplateId) {
        setSelectedTemplateId(targetTemplateId);
        const clothTypes = extractClothTypes(profile, tmplList);
        const tmpl = tmplList.find((t) => t.id === targetTemplateId);
        const match = clothTypes.find(
          (c) =>
            c.templateId === targetTemplateId ||
            (tmpl && c.clothType.toLowerCase() === tmpl.template_name.toLowerCase())
        );
        const sourceData = match ? match.values : profile?.measurements ?? {};
        const loadedVals = await applyTemplate(targetTemplateId, sourceData);
        setPrevious(loadedVals ?? {});
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('measurementProfile.loadFailed'), 'error');
    }
  }, [applyTemplate, customerId, route.params?.clothType, route.params?.templateId, shop.id, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadData().finally(() => setLoading(false));
    }, [loadData])
  );

  const handleSelectTemplate = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    try {
      const profile = await customerMeasurementsRepo.getByCustomer(customerId);
      const clothTypes = extractClothTypes(profile, templates);
      const tmpl = templates.find((t) => t.id === templateId);
      const match = clothTypes.find(
        (c) =>
          c.templateId === templateId ||
          (tmpl && c.clothType.toLowerCase() === tmpl.template_name.toLowerCase())
      );
      if (match && Object.keys(match.values).length > 0) {
        const loadedVals = await applyTemplate(templateId, match.values);
        setPrevious(loadedVals ?? {});
      } else {
        await applyTemplate(templateId, flattenValues(values));
      }
    } catch {
      showToast(t('measurementProfile.templateLoadFailed'), 'error');
    }
  };

  const handleValueChange = (sectionKey: string, fieldName: string, text: string) => {
    // Digits plus a single decimal point, at most 3 decimal places (e.g. 10.000).
    const [whole, ...rest] = text.replace(/[^0-9.]/g, '').split('.');
    const numericOnly = rest.length > 0 ? `${whole}.${rest.join('').slice(0, 3)}` : whole;
    setValues((prev) => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [fieldName]: numericOnly },
    }));
  };

  const handleSave = async () => {
    if (!selectedTemplateId) {
      showToast(t('measurementProfile.selectTemplate'), 'error');
      return;
    }

    const template = templates.find((t) => t.id === selectedTemplateId);
    const templateName = template?.template_name || 'Standard';

    setSaving(true);
    try {
      const numbers = buildMeasurementsJson(sections, values);
      await saveCustomerClothMeasurement(
        shop.id,
        customerId,
        selectedTemplateId,
        templateName,
        numbers
      );

      showToast(t('measurementProfile.saved'), 'success');
      navigation.goBack();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('measurementProfile.saveFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-bg">
        <Header title={t('measurementProfile.title')} onBack={() => navigation.goBack()} />
        <SkeletonList count={6} />
      </View>
    );
  }

  const visibleSections = sections.filter((s) => s.fields.length > 0);
  const hasFields = visibleSections.length > 0;
  // Flat ordered key list, used to chain "next" between fields across sections.
  const orderedKeys = visibleSections.flatMap((s) => s.fields.map((f) => `${s.key ?? FLAT_SECTION_KEY}::${f}`));

  return (
    <View className="flex-1 bg-bg">
      <Header title={t('measurementProfile.title')} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Section title={t('measurementProfile.whichTemplate')}>
            <View className="flex-row flex-wrap gap-2">
              {templates.map((tmpl) => (
                <Chip
                  key={tmpl.id}
                  label={garmentNameLabel(tmpl.template_name)}
                  selected={tmpl.id === selectedTemplateId}
                  onPress={() => handleSelectTemplate(tmpl.id)}
                />
              ))}
            </View>
          </Section>

          {selectedTemplateId ? (
            !hasFields ? (
              <Card className="items-center">
                <Text variant="body" tone="muted">
                  {t('measurementProfile.noFields')}
                </Text>
              </Card>
            ) : (
              visibleSections.map((section) => {
                const sectionKey = section.key ?? FLAT_SECTION_KEY;
                const title = sectionTitle(section.key);
                return (
                  <Section key={sectionKey || 'flat'} title={title ?? t('measurementProfile.valuesHeader')}>
                    {section.fields.map((field) => {
                      const refKey = `${sectionKey}::${field}`;
                      const idx = orderedKeys.indexOf(refKey);
                      const nextKey = orderedKeys[idx + 1];
                      const isLast = idx === orderedKeys.length - 1;
                      const current = values[sectionKey]?.[field] ?? '';
                      const last = previous[sectionKey]?.[field];
                      const label = measurementFieldLabel(field);
                      return (
                        <View key={field} className="min-h-[64px] justify-center py-1">
                          <View className="flex-row items-center">
                            <Text variant="bodyLg" className="mr-2 flex-1" weight="regular">
                              {label}
                            </Text>
                            <IconButton
                              icon="minus"
                              size="sm"
                              accessibilityLabel={`${t('measurementProfile.decrease')}, ${label}`}
                              onPress={() => {
                                haptics.tap();
                                handleValueChange(sectionKey, field, stepValue(current, -1));
                              }}
                            />
                            <View className="mx-1.5 w-24">
                              <InputField
                                ref={(el) => {
                                  inputRefs.current[refKey] = el;
                                }}
                                placeholder="0"
                                keyboardType="decimal-pad"
                                selectTextOnFocus
                                returnKeyType={isLast ? 'done' : 'next'}
                                onSubmitEditing={() => (nextKey ? inputRefs.current[nextKey]?.focus() : handleSave())}
                                value={current}
                                onChangeText={(text) => handleValueChange(sectionKey, field, text)}
                                accessibilityLabel={label}
                                compact
                              />
                            </View>
                            <IconButton
                              icon="plus"
                              size="sm"
                              accessibilityLabel={`${t('measurementProfile.increase')}, ${label}`}
                              onPress={() => {
                                haptics.tap();
                                handleValueChange(sectionKey, field, stepValue(current, 1));
                              }}
                            />
                          </View>
                          {last ? (
                            <Text variant="caption" tone="muted" weight="regular" tabular>
                              {t('measurementProfile.last', { value: last })}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </Section>
                );
              })
            )
          ) : null}
        </ScrollView>

        {selectedTemplateId ? (
          <View style={{ paddingBottom: Math.max(insets.bottom, 12) }} className="border-t border-line bg-surface px-4 pt-3">
            <Button title={t('measurementProfile.save')} size="lg" loading={saving} onPress={handleSave} />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}
