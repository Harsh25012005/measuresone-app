import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Pressable } from '../../components/ds/Pressable';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { DSBottomSheet } from '../../components/ds/BottomSheet';
import { DSEmptyState } from '../../components/ds/EmptyState';
import { DSInput } from '../../components/ds/Input';
import { DSSkeletonList } from '../../components/ds/Loading';
import { DSScreen } from '../../components/ds/Screen';
import { IconChevronRight, IconPlus, IconRuler2, IconShirt } from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { primary, typography } from '../../constants/tokens';
import { universalTemplatesRepo, universalFieldsRepo } from '../../lib/data/repository';
import { getAutoSuggestedFields } from '../../lib/autoSuggestFields';
import type { SettingsScreenProps } from '../../navigation/types';
import type { Tables } from '../../lib/database.types';

type Template = Tables<'universal_measurement_templates'>;

const f = typography.family;

const DEFAULT_TEMPLATES = ['Shirt', 'Pant', 'Shirt + Pant'];

export default function UniversalMeasurementsScreen({ navigation }: SettingsScreenProps<'UniversalMeasurements'>) {
  const { t } = useTranslation('settings');
  const shop = useShop();
  const showToast = useToast();
  const { colors } = useTheme();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [fieldCounts, setFieldCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [customName, setCustomName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      let data = await universalTemplatesRepo.list(shop.id);

      // Initialize default templates if shop has no templates yet
      if (data.length === 0) {
        let order = 0;
        for (const name of DEFAULT_TEMPLATES) {
          const created = await universalTemplatesRepo.create({
            shop_id: shop.id,
            template_name: name,
            sort_order: order++,
          });

          // Seed default auto-suggested fields
          const suggested = getAutoSuggestedFields(name);
          await universalFieldsRepo.replaceFields(
            created.id,
            shop.id,
            suggested.map((field_name, idx) => ({ field_name, sort_order: idx }))
          );
        }
        data = await universalTemplatesRepo.list(shop.id);
      }

      setTemplates(data);

      const counts: Record<string, number> = {};
      await Promise.all(
        data.map(async (tmpl) => {
          const fields = await universalFieldsRepo.listForTemplate(tmpl.id);
          counts[tmpl.id] = fields.length;
        })
      );
      setFieldCounts(counts);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('universalMeasurements.loadError'), 'error');
    }
  }, [shop.id, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      void load().finally(() => setLoading(false));
    }, [load])
  );

  const handleCreateCustom = async () => {
    const name = customName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const nextSortOrder = templates.length > 0 ? Math.max(...templates.map((tm) => tm.sort_order)) + 1 : 0;
      const created = await universalTemplatesRepo.create({
        shop_id: shop.id,
        template_name: name,
        sort_order: nextSortOrder,
      });

      // Auto populate suggested fields based on custom name
      const suggested = getAutoSuggestedFields(name);
      if (suggested.length > 0) {
        await universalFieldsRepo.replaceFields(
          created.id,
          shop.id,
          suggested.map((field_name, idx) => ({ field_name, sort_order: idx }))
        );
      }

      setCustomName('');
      setShowSheet(false);
      showToast(t('universalMeasurements.saveSuccess'), 'success');

      // Navigate to detail to customize
      navigation.navigate('UniversalTemplateDetail', { templateId: created.id });
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('universalMeasurements.createError'), 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <DSScreen
      title={t('universalMeasurements.title')}
      onBack={() => navigation.goBack()}
      actions={[{ icon: IconPlus, label: t('universalMeasurements.addTemplate'), onPress: () => setShowSheet(true) }]}
    >
      {loading ? (
        <View style={{ padding: 20 }}>
          <DSSkeletonList rows={4} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          {templates.length === 0 ? (
            <DSEmptyState icon={IconRuler2} title={t('universalMeasurements.title')} description={t('universalMeasurements.templatesSubtitle')} />
          ) : (
            templates.map((template, idx) => {
              const isStandard = DEFAULT_TEMPLATES.some((d) => d.toLowerCase() === template.template_name.toLowerCase());
              const count = fieldCounts[template.id] ?? 0;
              return (
                <Animated.View key={template.id} entering={FadeInDown.delay(Math.min(idx, 8) * 45).duration(260)}>
                  <Pressable
                    onPress={() => navigation.navigate('UniversalTemplateDetail', { templateId: template.id })}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.bgSubtle : 'transparent' }]}
                  >
                    <View style={[styles.icon, { backgroundColor: colors.primaryTint }]}>
                      {template.template_name.toLowerCase().includes('shirt') ? (
                        <IconShirt size={20} color={primary[600]} strokeWidth={2} />
                      ) : (
                        <IconRuler2 size={20} color={primary[600]} strokeWidth={2} />
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={{ fontFamily: f.semibold, fontSize: 15, color: colors.textPrimary }} numberOfLines={1}>
                        {template.template_name}
                      </Text>
                      <Text style={{ fontFamily: f.regular, fontSize: 12, color: colors.textMuted }}>
                        {isStandard ? t('universalMeasurements.standard') : t('universalMeasurements.custom')} · {count}{' '}
                        {count === 1 ? t('universalMeasurements.field') : t('universalMeasurements.fields')}
                      </Text>
                    </View>
                    <IconChevronRight size={16} color={colors.textFaint} />
                  </Pressable>
                  {idx === templates.length - 1 ? null : (
                    <View style={{ height: StyleSheet.hairlineWidth, marginLeft: 20, backgroundColor: colors.borderSubtle }} />
                  )}
                </Animated.View>
              );
            })
          )}
        </ScrollView>
      )}

      <DSBottomSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        title={t('universalMeasurements.createModalTitle')}
        actionLabel={t('universalMeasurements.create')}
        onAction={handleCreateCustom}
      >
        <View style={{ gap: 14, paddingTop: 12, paddingBottom: 12 }}>
          <Text style={{ fontFamily: f.regular, fontSize: 13, color: colors.textMuted }}>{t('universalMeasurements.examples')}</Text>
          <DSInput
            label={t('universalMeasurements.templateNameLabel')}
            placeholder={t('universalMeasurements.templateNamePlaceholder')}
            value={customName}
            onChangeText={setCustomName}
          />
        </View>
      </DSBottomSheet>
    </DSScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 14 },
  icon: { width: 44, height: 44, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
});
