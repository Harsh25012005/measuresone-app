import { useCallback, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  Header,
  IconButton,
  InputField,
  ListRow,
  Section,
  SkeletonList,
  Text,
  useToast,
} from '../../src/components/ui';
import { usePalette } from '../../src/theme/usePalette';
import { useShop } from '../../context/AuthContext';
import { universalTemplatesRepo, universalFieldsRepo } from '../../lib/data/repository';
import { getAutoSuggestedFields } from '../../lib/autoSuggestFields';
import { garmentNameLabel, measurementFieldLabel } from '../../lib/measurementNames';
import { haptics } from '../../lib/haptics';
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
  const palette = usePalette();

  const [template, setTemplate] = useState<Template | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFieldName, setNewFieldName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const tmpl = await universalTemplatesRepo.get(templateId);
      if (!tmpl) {
        showToast(t('universalMeasurements.templateNotFound'), 'error');
        navigation.goBack();
        return;
      }
      setTemplate(tmpl);

      const fList = await universalFieldsRepo.listForTemplate(templateId);
      setFields(fList);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('universalMeasurements.loadError'), 'error');
    }
  }, [navigation, templateId, showToast, t]);

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
      haptics.tap();
      const suggested = getAutoSuggestedFields(template.template_name);
      const updated = await universalFieldsRepo.replaceFields(
        template.id,
        shop.id,
        suggested.map((field_name, idx) => ({ field_name, sort_order: idx }))
      );
      setFields(updated);
      showToast(t('universalMeasurements.suggested'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('universalMeasurements.suggestFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddField = async () => {
    const name = newFieldName.trim();
    if (!name || !template) return;

    if (fields.some((f) => f.field_name.toLowerCase() === name.toLowerCase())) {
      showToast(t('universalMeasurements.fieldExists'), 'error');
      return;
    }

    setSaving(true);
    try {
      haptics.success();
      const nextSort = fields.length > 0 ? Math.max(...fields.map((f) => f.sort_order)) + 1 : 0;
      const newFieldsList = [
        ...fields.map((f, i) => ({ id: f.id, field_name: f.field_name, sort_order: i })),
        { field_name: name, sort_order: nextSort },
      ];
      const saved = await universalFieldsRepo.replaceFields(template.id, shop.id, newFieldsList);
      setFields(saved);
      setNewFieldName('');
      showToast(t('universalMeasurements.fieldAdded'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('universalMeasurements.addFieldFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (index: number) => {
    if (!template) return;
    setSaving(true);
    try {
      haptics.tap();
      const updated = fields.filter((_, i) => i !== index);
      const saved = await universalFieldsRepo.replaceFields(
        template.id,
        shop.id,
        updated.map((f, i) => ({ id: f.id, field_name: f.field_name, sort_order: i }))
      );
      setFields(saved);
      showToast(t('universalMeasurements.fieldRemoved'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('universalMeasurements.removeFieldFailed'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = () => {
    if (!template) return;
    Alert.alert(
      t('universalMeasurements.deleteClothTypeTitle'),
      t('universalMeasurements.deleteClothTypeMessage', { name: garmentNameLabel(template.template_name) }),
      [
        { text: t('common:actions.cancel'), style: 'cancel' },
        {
          text: t('common:actions.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await universalTemplatesRepo.remove(template.id, shop.id);
              showToast(t('universalMeasurements.clothTypeDeleted'), 'success');
              navigation.goBack();
            } catch (err) {
              showToast(err instanceof Error ? err.message : t('universalMeasurements.deleteFailed'), 'error');
            }
          },
        },
      ]
    );
  };

  if (loading || !template) {
    return (
      <View className="flex-1 bg-bg">
        <Header title={t('universalMeasurements.detailTitle')} onBack={() => navigation.goBack()} />
        <SkeletonList count={5} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <Header
        title={garmentNameLabel(template.template_name)}
        onBack={() => navigation.goBack()}
        right={
          <IconButton
            icon="trash"
            variant="ghost"
            color={palette.danger}
            accessibilityLabel={t('common:a11y.deleteClothType')}
            onPress={handleDeleteTemplate}
          />
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Card className="flex-row items-center justify-between">
          <View className="mr-3 flex-1">
            <Text variant="headline" numberOfLines={2}>
              {garmentNameLabel(template.template_name)}
            </Text>
            <Text variant="label" tone="muted" weight="regular">
              {t('universalMeasurements.fieldCount', { count: fields.length })}
            </Text>
          </View>
          <Button
            title={t('universalMeasurements.autoSuggestShort')}
            size="sm"
            fullWidth={false}
            variant="secondary"
            loading={saving}
            onPress={handleAutoSuggest}
          />
        </Card>

        <Section title={t('universalMeasurements.addFieldHeader')}>
          <View className="flex-row items-start gap-2">
            <View className="flex-1">
              <InputField
                compact
                accessibilityLabel={t('universalMeasurements.addFieldHeader')}
                placeholder={t('universalMeasurements.addFieldInputPlaceholder')}
                value={newFieldName}
                onChangeText={setNewFieldName}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleAddField}
              />
            </View>
            <Button
              title={t('common:actions.add')}
              fullWidth={false}
              loading={saving}
              disabled={!newFieldName.trim()}
              onPress={handleAddField}
            />
          </View>
        </Section>

        <Section title={t('universalMeasurements.fieldsCount', { count: fields.length })} padded={fields.length === 0}>
          {fields.length === 0 ? (
            <Text variant="body" tone="muted" className="text-center">
              {t('universalMeasurements.noFieldsYet')}
            </Text>
          ) : (
            fields.map((f, idx) => (
              <ListRow
                key={f.id || idx}
                title={`${idx + 1}. ${measurementFieldLabel(f.field_name)}`}
                trailing={
                  <IconButton
                    icon="x"
                    variant="ghost"
                    size="sm"
                    color={palette.danger}
                    accessibilityLabel={`${t('common:a11y.removeField')}: ${measurementFieldLabel(f.field_name)}`}
                    onPress={() => handleDeleteField(idx)}
                  />
                }
                divider={idx < fields.length - 1}
              />
            ))
          )}
        </Section>
      </ScrollView>
    </View>
  );
}
