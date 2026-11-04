import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { DSButton } from '../../components/ds/Button';
import { DSEmptyState } from '../../components/ds/EmptyState';
import { DSInput } from '../../components/ds/Input';
import { DSSkeletonList } from '../../components/ds/Loading';
import { DSFormScreen } from '../../components/ds/Screen';
import { DSTabs } from '../../components/ds/Tabs';
import { IconRuler2 } from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { typography } from '../../constants/tokens';
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
  const { colors } = useTheme();

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
      showToast(err instanceof Error ? err.message : t('measurementForm.loadError'), 'error');
    }
  }, [customerId, shop.id, showToast, t]);

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
      showToast(t('measurementForm.fieldsError'), 'error');
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
      showToast(t('measurementForm.selectTemplate'), 'error');
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

      showToast(t('measurementForm.saved'), 'success');
      navigation.goBack();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('measurementForm.saveError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const label = (text: string) => (
    <Text style={{ fontFamily: typography.family.semibold, fontSize: 13, color: colors.textSecondary, marginBottom: -8 }}>{text}</Text>
  );

  return (
    <DSFormScreen title={t('measurementForm.title')} onBack={() => navigation.goBack()}>
      {loading ? (
        <DSSkeletonList rows={4} />
      ) : (
        <>
          {/* Template selector */}
          <View style={{ gap: 12 }}>
            {label(t('measurementForm.whichTemplate'))}
            <DSTabs
              variant="chip"
              value={selectedTemplateId ?? ''}
              onChange={handleSelectTemplate}
              items={templates.map((tmpl) => ({ key: tmpl.id, label: tmpl.template_name }))}
            />
          </View>

          {/* Fields */}
          {selectedTemplateId ? (
            <>
              {label(t('measurementForm.values'))}
              {fields.length === 0 ? (
                <DSEmptyState variant="compact" icon={IconRuler2} title={t('measurementForm.noFields')} />
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 22 }}>
                  {fields.map((f) => (
                    <View key={f.id} style={{ width: '47.5%' }}>
                      <DSInput
                        label={f.field_name}
                        keyboardType="decimal-pad"
                        value={values[f.field_name] ?? ''}
                        onChangeText={(text) => handleValueChange(f.field_name, text)}
                      />
                    </View>
                  ))}
                </View>
              )}
              <DSButton title={t('measurementForm.save')} size="lg" fullWidth loading={saving} onPress={handleSave} />
            </>
          ) : null}
        </>
      )}
    </DSFormScreen>
  );
}
