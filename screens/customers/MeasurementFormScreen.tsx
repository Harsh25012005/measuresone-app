import { useCallback, useMemo, useState } from 'react';
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
import { groupMeasurements } from '../../lib/measurementGroups';
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
  // Values the user typed this session, keyed by field key (see keyedFields).
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [stored, setStored] = useState<unknown>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const tmplList = await universalTemplatesRepo.list(shop.id);
      setTemplates(tmplList);

      const profile = await customerMeasurementsRepo.getByCustomer(customerId);

      if (profile) {
        setSelectedTemplateId(profile.template_id);
        setStored(profile.measurements);
        setEdits({});

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

  const templateName = templates.find((tm) => tm.id === selectedTemplateId)?.template_name ?? '';

  /**
   * A combined template ("Shirt + Pant") can list the same measurement twice
   * (Length). Keying values by name alone made both inputs share one value, so
   * duplicates get their own key: the first keeps the plain name (matches what
   * is already stored), the next is prefixed with its garment ("Pant Length").
   */
  const keyedFields = useMemo(() => {
    const parts = templateName.split('+').map((x) => x.trim()).filter(Boolean);
    const total: Record<string, number> = {};
    for (const f of fields) total[f.field_name] = (total[f.field_name] ?? 0) + 1;
    const seen: Record<string, number> = {};
    return fields.map((f) => {
      const n = (seen[f.field_name] = (seen[f.field_name] ?? 0) + 1);
      const dup = total[f.field_name] > 1;
      const group = dup ? parts[n - 1] ?? '' : '';
      const key = n === 1 ? f.field_name : group ? `${group} ${f.field_name}` : `${f.field_name} ${n}`;
      return { id: f.id, name: f.field_name, key, group };
    });
  }, [fields, templateName]);

  /** Saved number for a field: its own group first, then the flat key, then any group. */
  const storedValue = useCallback(
    (name: string, key: string, group: string) => {
      const groups = groupMeasurements(stored);
      const inGroup = group ? groups.find((g) => g.label.toLowerCase() === group.toLowerCase()) : undefined;
      const hit =
        inGroup?.entries.find(([k]) => k === name) ??
        groups.find((g) => g.label === '')?.entries.find(([k]) => k === key) ??
        (group ? undefined : groups.flatMap((g) => g.entries).find(([k]) => k === name));
      return hit ? String(hit[1]) : '';
    },
    [stored]
  );

  const valueOf = (f: { name: string; key: string; group: string }) => edits[f.key] ?? storedValue(f.name, f.key, f.group);

  const handleValueChange = (key: string, text: string) => {
    // Keep only numeric and decimal
    setEdits((prev) => ({ ...prev, [key]: text.replace(/[^0-9.]/g, '') }));
  };

  const handleSave = async () => {
    if (!selectedTemplateId) {
      showToast(t('measurementForm.selectTemplate'), 'error');
      return;
    }

    setSaving(true);
    try {
      const numericMeasurements: Record<string, number> = {};
      for (const f of keyedFields) {
        const parsed = parseFloat(valueOf(f));
        if (!isNaN(parsed)) numericMeasurements[f.key] = parsed;
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
                  {keyedFields.map((f) => (
                    <View key={f.id} style={{ width: '47.5%' }}>
                      <DSInput
                        label={f.group ? `${f.group} ${f.name}` : f.name}
                        keyboardType="decimal-pad"
                        value={valueOf(f)}
                        onChangeText={(text) => handleValueChange(f.key, text)}
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
