import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { FontAwesome5 } from '@expo/vector-icons';
import { Button, Card, Header, InputField, LoadingSpinner, useToast } from '../../components/ui';
import { useShop } from '../../context/AuthContext';
import {
  universalTemplatesRepo,
  universalFieldsRepo,
  customerMeasurementsRepo,
} from '../../lib/data/repository';
import type { CustomersScreenProps } from '../../navigation/types';
import type { Tables } from '../../lib/database.types';

type Template = Tables<'universal_measurement_templates'>;
type Field = Tables<'universal_measurement_fields'>;

export default function MeasurementFormScreen({
  navigation,
  route,
}: CustomersScreenProps<'MeasurementForm'>) {
  const { customerId } = route.params;
  const { t } = useTranslation('customers');
  const shop = useShop();
  const showToast = useToast();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const tmplList = await universalTemplatesRepo.list(shop.id);
      setTemplates(tmplList);

      const profile = await customerMeasurementsRepo.getByCustomer(customerId);

      if (profile) {
        setSelectedTemplateId(profile.template_id);
        const parsedVals: Record<string, string> = {};
        const raw = typeof profile.measurements === 'object' && profile.measurements ? (profile.measurements as Record<string, unknown>) : {};
        for (const [k, v] of Object.entries(raw)) {
          parsedVals[k] = v !== null && v !== undefined ? String(v) : '';
        }
        setValues(parsedVals);

        if (profile.template_id) {
          const fList = await universalFieldsRepo.listForTemplate(profile.template_id);
          setFields(fList);
        }
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load measurements', 'error');
    }
  }, [customerId, shop.id, showToast]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadData().finally(() => setLoading(false));
    }, [loadData])
  );

  const handleSelectTemplate = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    try {
      const fList = await universalFieldsRepo.listForTemplate(templateId);
      setFields(fList);
    } catch {
      showToast('Could not load fields for template', 'error');
    }
  };

  const handleValueChange = (fieldName: string, text: string) => {
    // Keep only numeric and decimal
    const numericOnly = text.replace(/[^0-9.]/g, '');
    setValues((prev) => ({
      ...prev,
      [fieldName]: numericOnly,
    }));
  };

  const handleSave = async () => {
    if (!selectedTemplateId) {
      showToast('Please select a measurement template', 'error');
      return;
    }

    setSaving(true);
    try {
      const numericMeasurements: Record<string, number> = {};
      for (const [k, v] of Object.entries(values)) {
        const parsed = parseFloat(v);
        if (!isNaN(parsed)) {
          numericMeasurements[k] = parsed;
        }
      }

      await customerMeasurementsRepo.save(shop.id, {
        customer_id: customerId,
        template_id: selectedTemplateId,
        measurements: numericMeasurements,
      });

      showToast('Measurement profile saved', 'success');
      navigation.goBack();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save measurements', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-950">
        <Header title="Customer Measurements" onBack={() => navigation.goBack()} />
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="bg-gray-50 dark:bg-gray-950"
    >
      <Header title="Customer Measurements" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 224, gap: 20 }}>
        {/* Template Selector */}
        <View className="gap-2">
          <Text className="text-sm font-semibold text-gray-900 dark:text-white">
            Which template?
          </Text>

          <View className="flex-row flex-wrap gap-2">
            {templates.map((tmpl) => {
              const active = tmpl.id === selectedTemplateId;
              return (
                <Pressable
                  key={tmpl.id}
                  onPress={() => handleSelectTemplate(tmpl.id)}
                  className={`rounded-xl border px-4 py-3 ${
                    active
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-950'
                      : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {tmpl.template_name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Fields list */}
        {selectedTemplateId && (
          <View className="gap-3">
            <Text className="text-sm font-semibold text-gray-900 dark:text-white">
              Measurement Values (Numeric)
            </Text>

            {fields.length === 0 ? (
              <Card className="p-4 items-center">
                <Text className="text-sm text-gray-500">
                  No fields defined for this template. Add fields in Settings → Universal Measurements.
                </Text>
              </Card>
            ) : (
              <Card className="p-4 gap-3">
                {fields.map((f) => (
                  <View key={f.id} className="flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 mr-3">
                      {f.field_name}
                    </Text>

                    <View className="w-32">
                      <InputField
                        placeholder="0"
                        keyboardType="decimal-pad"
                        value={values[f.field_name] ?? ''}
                        onChangeText={(text) => handleValueChange(f.field_name, text)}
                      />
                    </View>
                  </View>
                ))}
              </Card>
            )}

            <Button title="Save Measurements" loading={saving} onPress={handleSave} className="mt-4" />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
