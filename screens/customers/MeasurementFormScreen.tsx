import { useCallback, useEffect, useMemo, useState } from 'react';
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
  // field names of each single-garment template, so a combined one can be split into sections
  const [partFields, setPartFields] = useState<Record<string, string[]>>({});

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
  const parts = useMemo(() => templateName.split('+').map((x) => x.trim()).filter(Boolean), [templateName]);

  // "Shirt + Pant" is two garments: load each one's own fields so the combined list can be split.
  useEffect(() => {
    if (parts.length < 2) return;
    let active = true;
    void (async () => {
      const found: Record<string, string[]> = {};
      for (const part of parts) {
        const tmpl = templates.find((tm) => tm.template_name.toLowerCase() === part.toLowerCase());
        if (!tmpl) continue;
        found[part] = (await universalFieldsRepo.listForTemplate(tmpl.id)).map((fl) => fl.field_name);
      }
      if (active) setPartFields(found);
    })();
    return () => {
      active = false;
    };
  }, [parts, templates]);

  /**
   * A combined template ("Shirt + Pant") lists some measurements twice (Length).
   * Each field is assigned to the garment that owns it, which gives every input
   * its own key (so changing the pant length can't touch the shirt length) and
   * lets the form show Shirt and Pant as separate sections.
   */
  const keyedFields = useMemo(() => {
    const remaining: Record<string, Record<string, number>> = {};
    for (const part of parts) {
      remaining[part] = {};
      for (const n of partFields[part] ?? []) remaining[part][n] = (remaining[part][n] ?? 0) + 1;
    }
    const total: Record<string, number> = {};
    for (const f of fields) total[f.field_name] = (total[f.field_name] ?? 0) + 1;
    const seen: Record<string, number> = {};
    return fields.map((f) => {
      const n = (seen[f.field_name] = (seen[f.field_name] ?? 0) + 1);
      let group = parts.find((part) => (remaining[part]?.[f.field_name] ?? 0) > 0) ?? '';
      if (group) remaining[group][f.field_name] -= 1;
      // no per-garment templates to go by: fall back to the order a repeated name appears in
      if (!group && total[f.field_name] > 1) group = parts[n - 1] ?? '';
      return { id: f.id, name: f.field_name, group, key: group ? `${group}::${f.field_name}` : f.field_name };
    });
  }, [fields, parts, partFields]);

  const sections = useMemo(() => {
    const order: string[] = [];
    for (const f of keyedFields) if (!order.includes(f.group)) order.push(f.group);
    return order.map((g) => ({ group: g, items: keyedFields.filter((f) => f.group === g) }));
  }, [keyedFields]);

  /** Saved number for a field: its own garment's section, then older flat keys. */
  const storedValue = useCallback(
    (name: string, group: string) => {
      const groups = groupMeasurements(stored);
      const flat = groups.find((g) => g.label === '')?.entries ?? [];
      const inGroup = group ? groups.find((g) => g.label.toLowerCase() === group.toLowerCase()) : undefined;
      const hit =
        inGroup?.entries.find(([k]) => k === name) ??
        (group ? flat.find(([k]) => k === `${group} ${name}`) : undefined) ??
        (!group || group === parts[0] ? flat.find(([k]) => k === name) : undefined) ??
        (group ? undefined : groups.flatMap((g) => g.entries).find(([k]) => k === name));
      return hit ? String(hit[1]) : '';
    },
    [stored, parts]
  );

  const valueOf = (f: { name: string; key: string; group: string }) => edits[f.key] ?? storedValue(f.name, f.group);

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
      // Combined templates are saved per garment ({ Shirt: {...}, Pant: {...} }) so each keeps
      // its own Length; single templates stay flat.
      const numericMeasurements: Record<string, number | Record<string, number>> = {};
      for (const f of keyedFields) {
        const parsed = parseFloat(valueOf(f));
        if (isNaN(parsed)) continue;
        if (f.group) {
          const bucket = (numericMeasurements[f.group] ?? {}) as Record<string, number>;
          bucket[f.name] = parsed;
          numericMeasurements[f.group] = bucket;
        } else {
          numericMeasurements[f.name] = parsed;
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
                <View style={{ gap: 24 }}>
                  {sections.map(({ group, items }) => (
                    <View key={group || 'all'} style={{ gap: 14 }}>
                      {group ? (
                        <Text style={{ fontFamily: typography.family.bold, fontSize: 16, color: colors.textPrimary }}>{group}</Text>
                      ) : null}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 22 }}>
                        {items.map((f) => (
                          <View key={f.id} style={{ width: '47.5%' }}>
                            <DSInput
                              label={f.name}
                              keyboardType="decimal-pad"
                              value={valueOf(f)}
                              onChangeText={(text) => handleValueChange(f.key, text)}
                            />
                          </View>
                        ))}
                      </View>
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
