import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { FontAwesome5 } from '../../components/ds/legacyIcons';
import { Button, EmptyState, Header, InputField, LoadingSpinner, useToast } from '../../components/ui';
import { useShop } from '../../context/AuthContext';
import { universalTemplatesRepo, universalFieldsRepo } from '../../lib/data/repository';
import { getAutoSuggestedFields } from '../../lib/autoSuggestFields';
import type { SettingsScreenProps } from '../../navigation/types';
import type { Tables } from '../../lib/database.types';

type Template = Tables<'universal_measurement_templates'>;
type Field = Tables<'universal_measurement_fields'>;

export default function UniversalTemplateDetailScreen({
  navigation,
  route,
}: SettingsScreenProps<'UniversalTemplateDetail'>) {
  const { templateId } = route.params;
  const { t } = useTranslation('settings');
  const shop = useShop();
  const showToast = useToast();

  const [template, setTemplate] = useState<Template | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFieldName, setNewFieldName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const tmpl = await universalTemplatesRepo.get(templateId);
      if (!tmpl) {
        showToast('Template not found', 'error');
        navigation.goBack();
        return;
      }
      setTemplate(tmpl);

      const fList = await universalFieldsRepo.listForTemplate(templateId);
      setFields(fList);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('universalMeasurements.loadError'), 'error');
    }
  }, [navigation, shop.id, templateId, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load().finally(() => setLoading(false));
    }, [load])
  );

  const handleAutoSuggest = async () => {
    if (!template) return;
    setSaving(true);
    try {
      const suggested = getAutoSuggestedFields(template.template_name);
      const updated = await universalFieldsRepo.replaceFields(
        template.id,
        shop.id,
        suggested.map((field_name, idx) => ({ field_name, sort_order: idx }))
      );
      setFields(updated);
      showToast('Fields suggested automatically', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to suggest fields', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddField = async () => {
    const name = newFieldName.trim();
    if (!name || !template) return;

    if (fields.some((f) => f.field_name.toLowerCase() === name.toLowerCase())) {
      showToast('Field already exists in template', 'error');
      return;
    }

    setSaving(true);
    try {
      const nextSort = fields.length > 0 ? Math.max(...fields.map((f) => f.sort_order)) + 1 : 0;
      const newFieldsList = [...fields.map((f, i) => ({ id: f.id, field_name: f.field_name, sort_order: i })), { field_name: name, sort_order: nextSort }];
      const saved = await universalFieldsRepo.replaceFields(template.id, shop.id, newFieldsList);
      setFields(saved);
      setNewFieldName('');
      showToast('Field added', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not add field', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (index: number) => {
    if (!template) return;
    setSaving(true);
    try {
      const remaining = fields.filter((_, i) => i !== index).map((f, i) => ({ id: f.id, field_name: f.field_name, sort_order: i }));
      const saved = await universalFieldsRepo.replaceFields(template.id, shop.id, remaining);
      setFields(saved);
      showToast('Field removed', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not remove field', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRenameField = async (index: number, newName: string) => {
    if (!template || !newName.trim()) return;
    const updatedList = fields.map((f, i) => ({
      id: f.id,
      field_name: i === index ? newName.trim() : f.field_name,
      sort_order: i,
    }));
    try {
      const saved = await universalFieldsRepo.replaceFields(template.id, shop.id, updatedList);
      setFields(saved);
    } catch (err) {
      showToast('Could not rename field', 'error');
    }
  };

  const handleDeleteTemplate = () => {
    if (!template) return;
    Alert.alert(
      t('universalMeasurements.deleteTemplate'),
      t('universalMeasurements.deleteTemplateConfirm'),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await universalTemplatesRepo.remove(template.id, shop.id);
              showToast(t('universalMeasurements.deleteSuccess'), 'success');
              navigation.goBack();
            } catch (err) {
              showToast('Could not delete template', 'error');
            }
          },
        },
      ]
    );
  };

  if (loading || !template) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-950">
        <Header title="Template" onBack={() => navigation.goBack()} />
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      <Header
        title={template.template_name}
        onBack={() => navigation.goBack()}
        right={
          <Pressable onPress={handleDeleteTemplate} hitSlop={10} className="p-2 -mr-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800">
            <FontAwesome5 name="trash-alt" size={16} color="#EF4444" />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 224, gap: 12 }}>
        {/* Add custom field */}
        <View className="flex-row items-end gap-2">
          <View className="flex-1">
            <InputField
              placeholder={t('universalMeasurements.fieldNamePlaceholder')}
              value={newFieldName}
              onChangeText={setNewFieldName}
            />
          </View>
          <View className="w-20 mb-4">
            <Button title="Add" size="sm" className="h-[52px]" onPress={handleAddField} disabled={!newFieldName.trim() || saving} />
          </View>
        </View>

        <Pressable
          onPress={handleAutoSuggest}
          disabled={saving}
          className="flex-row items-center gap-1.5 self-start -mt-2 active:opacity-60"
        >
          <FontAwesome5 name="magic" size={11} color="#4F46E5" />
          <Text className="text-xs font-semibold text-primary-600 dark:text-primary-400">
            {t('universalMeasurements.autoSuggest')}
          </Text>
        </Pressable>

        {/* List of fields */}
        {fields.length === 0 ? (
          <EmptyState
            icon="ruler"
            title={t('universalMeasurements.noFieldsTitle')}
            description={t('universalMeasurements.noFieldsDesc')}
            variant="compact"
          />
        ) : (
          <View className="overflow-hidden rounded-md border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            {fields.map((field, idx) => (
              <View
                key={field.id}
                className={`flex-row items-center gap-2 px-3 py-1.5 ${
                  idx > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''
                }`}
              >
                <View className="flex-1 -mb-4">
                  <InputField value={field.field_name} onChangeText={(val) => handleRenameField(idx, val)} />
                </View>

                <Pressable onPress={() => handleDeleteField(idx)} hitSlop={6} className="p-1.5 active:opacity-60">
                  <FontAwesome5 name="times" size={13} color="#EF4444" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
