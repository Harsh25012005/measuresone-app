import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Header,
  Icon,
  IconButton,
  InputField,
  ListRow,
  SegmentedControl,
  Section,
  SkeletonList,
  Text,
  useToast,
} from '../../src/components/ui';
import { usePalette } from '../../src/theme/usePalette';
import { supabase } from '../../lib/supabase';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { DEFAULT_SHIRT_FIELDS, DEFAULT_PANT_FIELDS, DEFAULT_ALL_FIELDS } from '../../lib/defaultMeasurementFields';
import type { SettingsScreenProps } from '../../navigation/types';
import type { Tables } from '../../lib/database.types';

type FieldDefinition = Tables<'measurement_field_definitions'>;
type GarmentScope = 'Shirt' | 'Pant' | 'Both';
const GARMENT_SCOPES: GarmentScope[] = ['Shirt', 'Pant', 'Both'];

/** Turns a free-typed label into a stable, unique-per-shop storage key. */
function toFieldKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export default function CustomMeasurementFieldsScreen({ navigation }: SettingsScreenProps<'CustomMeasurementFields'>) {
  const { t } = useTranslation('settings');
  const shop = useShop();
  const showToast = useToast();
  const { colors } = useTheme();
  const palette = usePalette();

  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLabel, setNewLabel] = useState('');
  const [newGarmentScope, setNewGarmentScope] = useState<GarmentScope>('Both');
  const [saving, setSaving] = useState(false);
  const [addingDefaults, setAddingDefaults] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('measurement_field_definitions')
        .select('*')
        .eq('shop_id', shop.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      setFields(data ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('customMeasurementFields.loadError'), 'error');
    }
  }, [shop.id, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load().finally(() => setLoading(false));
    }, [load])
  );

  const handleAdd = async () => {
    const label = newLabel.trim();
    if (!label) return;
    const fieldKey = toFieldKey(label);
    if (!fieldKey) return;
    if (fields.some((f) => f.field_key === fieldKey)) {
      showToast(t('customMeasurementFields.duplicateError'), 'error');
      return;
    }

    setSaving(true);
    try {
      const nextSortOrder = fields.length > 0 ? Math.max(...fields.map((f) => f.sort_order)) + 1 : 0;
      const { data, error } = await supabase
        .from('measurement_field_definitions')
        .insert({ shop_id: shop.id, label, field_key: fieldKey, sort_order: nextSortOrder, garment_type: newGarmentScope })
        .select('*')
        .single();
      if (error) throw error;
      setFields((prev) => [...prev, data]);
      setNewLabel('');
      setNewGarmentScope('Both');
      showToast(t('customMeasurementFields.saveSuccess'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('customMeasurementFields.saveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  /** Bulk-inserts the standard tailoring fields, skipping any already added. */
  const handleAddDefaults = async () => {
    const existingKeys = new Set(fields.map((f) => f.field_key));
    const toAdd = DEFAULT_ALL_FIELDS.filter((label) => !existingKeys.has(toFieldKey(label)));
    if (toAdd.length === 0) return;

    setAddingDefaults(true);
    try {
      let nextSortOrder = fields.length > 0 ? Math.max(...fields.map((f) => f.sort_order)) + 1 : 0;
      const rows = toAdd.map((label) => ({
        shop_id: shop.id,
        label,
        field_key: toFieldKey(label),
        sort_order: nextSortOrder++,
        garment_type: (DEFAULT_SHIRT_FIELDS as string[]).includes(label)
          ? 'Shirt'
          : (DEFAULT_PANT_FIELDS as string[]).includes(label)
            ? 'Pant'
            : 'Both',
      }));
      const { data, error } = await supabase.from('measurement_field_definitions').insert(rows).select('*');
      if (error) throw error;
      setFields((prev) => [...prev, ...(data ?? [])]);
      showToast(t('customMeasurementFields.saveSuccess'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('customMeasurementFields.saveError'), 'error');
    } finally {
      setAddingDefaults(false);
    }
  };

  const handleRemove = async (id: string) => {
    const prev = fields;
    setFields((current) => current.filter((f) => f.id !== id));
    try {
      const { error } = await supabase.from('measurement_field_definitions').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      setFields(prev);
      showToast(err instanceof Error ? err.message : t('customMeasurementFields.deleteError'), 'error');
    }
  };

  if (loading && fields.length === 0) {
    return (
      <View className="flex-1 bg-bg">
        <Header title={t('customMeasurementFields.title')} onBack={() => navigation.goBack()} />
        <SkeletonList count={5} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <Header title={t('customMeasurementFields.title')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 16 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Text variant="bodyLg" className="mb-3">
            {t('customMeasurementFields.addFieldTitle')}
          </Text>
          <InputField
            label={t('customMeasurementFields.fieldNameLabel')}
            value={newLabel}
            onChangeText={setNewLabel}
            placeholder={t('customMeasurementFields.fieldNamePlaceholder')}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />

          <Text variant="label" className="mb-1.5">
            {t('customMeasurementFields.garmentScopeLabel')}
          </Text>
          <SegmentedControl
            value={newGarmentScope}
            onChange={setNewGarmentScope}
            options={GARMENT_SCOPES.map((scope) => ({ value: scope, label: t(`customMeasurementFields.garmentScope.${scope}`) }))}
          />

          <Button
            title={t('customMeasurementFields.save')}
            onPress={handleAdd}
            loading={saving}
            disabled={!newLabel.trim()}
            className="mt-3"
          />
          <Button
            title={t('customMeasurementFields.addDefaultFields')}
            variant="tonal"
            onPress={handleAddDefaults}
            loading={addingDefaults}
            icon={<Icon name="sparkle" size={18} color={colors.primary} />}
            className="mt-3"
          />
        </Card>

        <Section title={t('customMeasurementFields.listTitle')} padded={fields.length === 0}>
          {fields.length === 0 ? (
            <EmptyState
              variant="compact"
              icon="ruler"
              title={t('customMeasurementFields.emptyTitle')}
              description={t('customMeasurementFields.emptyDescription')}
            />
          ) : (
            fields.map((field, index) => (
              <ListRow
                key={field.id}
                title={field.label}
                meta={<Badge size="sm" label={t(`customMeasurementFields.garmentScope.${(field.garment_type as GarmentScope) || 'Both'}`)} />}
                trailing={
                  <IconButton
                    icon="trash"
                    variant="ghost"
                    size="sm"
                    color={palette.danger}
                    accessibilityLabel={`${t('common:actions.delete')} ${field.label}`}
                    onPress={() => handleRemove(field.id)}
                  />
                }
                divider={index < fields.length - 1}
              />
            ))
          )}
        </Section>
      </ScrollView>
    </View>
  );
}
