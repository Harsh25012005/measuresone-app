import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { DSButton } from '../../components/ds/Button';
import { useConfirmDelete } from '../../components/ds/ConfirmDelete';
import { DSEmptyState } from '../../components/ds/EmptyState';
import { DSInput } from '../../components/ds/Input';
import { DSSkeletonList } from '../../components/ds/Loading';
import { DSScreen } from '../../components/ds/Screen';
import { IconRuler2, IconTrash, IconWand, IconX } from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { status, typography } from '../../constants/tokens';
import { universalTemplatesRepo, universalFieldsRepo } from '../../lib/data/repository';
import { getAutoSuggestedFields } from '../../lib/autoSuggestFields';
import type { SettingsScreenProps } from '../../navigation/types';
import type { Tables } from '../../lib/database.types';

type Template = Tables<'universal_measurement_templates'>;
type Field = Tables<'universal_measurement_fields'>;

const f = typography.family;

export default function UniversalTemplateDetailScreen({
  navigation,
  route,
}: SettingsScreenProps<'UniversalTemplateDetail'>) {
  const { templateId } = route.params;
  const { t } = useTranslation('settings');
  const shop = useShop();
  const showToast = useToast();
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const { confirm, popup } = useConfirmDelete();

  const [template, setTemplate] = useState<Template | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFieldName, setNewFieldName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const tmpl = await universalTemplatesRepo.get(templateId);
      if (!tmpl) {
        showToast(t('universalMeasurements.notFound'), 'error');
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
      const suggested = getAutoSuggestedFields(template.template_name);
      const updated = await universalFieldsRepo.replaceFields(
        template.id,
        shop.id,
        suggested.map((field_name, idx) => ({ field_name, sort_order: idx }))
      );
      setFields(updated);
      showToast(t('universalMeasurements.suggested'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('universalMeasurements.suggestError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddField = async () => {
    const name = newFieldName.trim();
    if (!name || !template) return;

    if (fields.some((fl) => fl.field_name.toLowerCase() === name.toLowerCase())) {
      showToast(t('universalMeasurements.fieldExists'), 'error');
      return;
    }

    setSaving(true);
    try {
      const nextSort = fields.length > 0 ? Math.max(...fields.map((fl) => fl.sort_order)) + 1 : 0;
      const newFieldsList = [
        ...fields.map((fl, i) => ({ id: fl.id, field_name: fl.field_name, sort_order: i })),
        { field_name: name, sort_order: nextSort },
      ];
      const saved = await universalFieldsRepo.replaceFields(template.id, shop.id, newFieldsList);
      setFields(saved);
      setNewFieldName('');
      showToast(t('universalMeasurements.fieldAdded'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('universalMeasurements.fieldAddError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteField = async (index: number) => {
    if (!template) return;
    setSaving(true);
    try {
      const remaining = fields.filter((_, i) => i !== index).map((fl, i) => ({ id: fl.id, field_name: fl.field_name, sort_order: i }));
      const saved = await universalFieldsRepo.replaceFields(template.id, shop.id, remaining);
      setFields(saved);
      showToast(t('universalMeasurements.fieldRemoved'), 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('universalMeasurements.fieldRemoveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  /** Many clients may already have a value saved under this field, so ask before removing it. */
  const requestDeleteField = (index: number) => {
    const field = fields[index];
    if (!field) return;
    confirm({
      title: t('universalMeasurements.removeFieldTitle'),
      description: t('universalMeasurements.removeFieldMessage', { name: field.field_name }),
      confirmLabel: t('universalMeasurements.remove'),
      cancelLabel: t('universalMeasurements.cancel'),
      onConfirm: () => handleDeleteField(index),
    });
  };

  const handleRenameField = async (index: number, newName: string) => {
    if (!template || !newName.trim()) return;
    const updatedList = fields.map((fl, i) => ({
      id: fl.id,
      field_name: i === index ? newName.trim() : fl.field_name,
      sort_order: i,
    }));
    try {
      const saved = await universalFieldsRepo.replaceFields(template.id, shop.id, updatedList);
      setFields(saved);
    } catch {
      showToast(t('universalMeasurements.renameError'), 'error');
    }
  };

  const handleDeleteTemplate = () => {
    if (!template) return;
    confirm({
      title: t('universalMeasurements.deleteTemplate'),
      description: t('universalMeasurements.deleteTemplateConfirm'),
      confirmLabel: t('universalMeasurements.delete'),
      cancelLabel: t('universalMeasurements.cancel'),
      onConfirm: async () => {
        try {
          await universalTemplatesRepo.remove(template.id, shop.id);
          showToast(t('universalMeasurements.deleteSuccess'), 'success');
          navigation.goBack();
        } catch {
          showToast(t('universalMeasurements.deleteError'), 'error');
        }
      },
    });
  };

  return (
    <DSScreen
      title={template?.template_name ?? ''}
      onBack={() => navigation.goBack()}
      actions={template ? [{ icon: IconTrash, label: t('universalMeasurements.deleteTemplate'), onPress: handleDeleteTemplate }] : []}
    >
      {loading || !template ? (
        <View style={{ padding: 20 }}>
          <DSSkeletonList rows={4} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140, gap: 18 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* add a field */}
          <View style={{ gap: 10 }}>
            <DSInput
              label={t('universalMeasurements.addField')}
              placeholder={t('universalMeasurements.fieldNamePlaceholder')}
              value={newFieldName}
              onChangeText={setNewFieldName}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <DSButton title={t('universalMeasurements.autoSuggest')} variant="link" size="sm" leftIcon={IconWand} onPress={handleAutoSuggest} disabled={saving} />
              <DSButton title={t('universalMeasurements.addFieldButton')} size="sm" onPress={handleAddField} disabled={!newFieldName.trim() || saving} />
            </View>
          </View>

          <Text style={{ fontFamily: f.bold, fontSize: 18, color: colors.textPrimary }}>{t('universalMeasurements.fieldsHeader')}</Text>

          {fields.length === 0 ? (
            <DSEmptyState variant="compact" icon={IconRuler2} title={t('universalMeasurements.noFieldsTitle')} description={t('universalMeasurements.noFieldsDesc')} />
          ) : (
            <View style={{ gap: 14 }}>
              {fields.map((field, idx) => (
                <View key={field.id} style={styles.fieldRow}>
                  <View style={{ flex: 1 }}>
                    <DSInput label={String(idx + 1)} value={field.field_name} onChangeText={(val) => void handleRenameField(idx, val)} />
                  </View>
                  <Pressable
                    onPress={() => requestDeleteField(idx)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t('universalMeasurements.delete')}
                    style={[styles.remove, { backgroundColor: dark ? '#3A1414' : status.danger[50] }]}
                  >
                    <IconX size={16} color={status.danger[600]} strokeWidth={2.4} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
      {popup}
    </DSScreen>
  );
}

const styles = StyleSheet.create({
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  remove: { width: 40, height: 40, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
});
