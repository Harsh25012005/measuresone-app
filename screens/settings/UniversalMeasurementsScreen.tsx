import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  Button,
  CenterModal,
  EmptyState,
  Header,
  Icon,
  IconButton,
  InputField,
  ListRow,
  Section,
  SkeletonList,
  Text,
  useToast,
} from '../../src/components/ui';
import { useShop } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { universalTemplatesRepo, universalFieldsRepo } from '../../lib/data/repository';
import { getAutoSuggestedFields } from '../../lib/autoSuggestFields';
import { haptics } from '../../lib/haptics';
import { garmentNameLabel } from '../../lib/measurementNames';
import type { SettingsScreenProps } from '../../navigation/types';
import type { Tables } from '../../lib/database.types';

type Template = Tables<'universal_measurement_templates'>;

const DEFAULT_TEMPLATES = [
  { name: 'Shirt' },
  { name: 'Pant' },
  { name: 'Shirt + Pant' },
  { name: 'Kurta' },
];

export default function UniversalMeasurementsScreen({
  navigation,
}: SettingsScreenProps<'UniversalMeasurements'>) {
  const { t } = useTranslation('settings');
  const shop = useShop();
  const showToast = useToast();
  const { colors } = useTheme();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [fieldCounts, setFieldCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      let data = await universalTemplatesRepo.list(shop.id);

      if (data.length === 0) {
        let order = 0;
        for (const tmpl of DEFAULT_TEMPLATES) {
          const created = await universalTemplatesRepo.create({
            shop_id: shop.id,
            template_name: tmpl.name,
            sort_order: order++,
          });

          const suggested = getAutoSuggestedFields(tmpl.name);
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
      setLoading(true);
      void load().finally(() => setLoading(false));
    }, [load])
  );

  const handleCreateCustom = async () => {
    const name = customName.trim();
    if (!name) return;

    setCreating(true);
    try {
      haptics.success();
      const nextSortOrder =
        templates.length > 0 ? Math.max(...templates.map((t) => t.sort_order)) + 1 : 0;
      const created = await universalTemplatesRepo.create({
        shop_id: shop.id,
        template_name: name,
        sort_order: nextSortOrder,
      });

      const suggested = getAutoSuggestedFields(name);
      if (suggested.length > 0) {
        await universalFieldsRepo.replaceFields(
          created.id,
          shop.id,
          suggested.map((field_name, idx) => ({ field_name, sort_order: idx }))
        );
      }

      setCustomName('');
      setShowModal(false);
      showToast(t('universalMeasurements.saveSuccess'), 'success');

      navigation.navigate('UniversalTemplateDetail', { templateId: created.id });
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('universalMeasurements.createFailed'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const header = (
    <Header
      title={t('universalMeasurements.title')}
      onBack={() => navigation.goBack()}
      right={
        <IconButton
          icon="plus"
          variant="tonal"
          accessibilityLabel={t('common:a11y.addClothType')}
          onPress={() => setShowModal(true)}
        />
      }
    />
  );

  if (loading && templates.length === 0) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <SkeletonList count={4} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      {header}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 16 }}>
        {templates.length === 0 ? (
          <EmptyState
            variant="full"
            icon="ruler"
            title={t('universalMeasurements.title')}
            description={t('universalMeasurements.templatesSubtitle')}
            actionLabel={t('universalMeasurements.addTemplate')}
            onAction={() => setShowModal(true)}
          />
        ) : (
          <Section padded={false}>
            {templates.map((template, idx) => (
              <ListRow
                key={template.id}
                title={garmentNameLabel(template.template_name)}
                subtitle={t('universalMeasurements.fieldCount', { count: fieldCounts[template.id] ?? 0 })}
                leading={
                  <View className="h-10 w-10 items-center justify-center rounded bg-primary-50">
                    <Icon name="ruler" size={20} color={colors.primary} />
                  </View>
                }
                onPress={() => navigation.navigate('UniversalTemplateDetail', { templateId: template.id })}
                divider={idx < templates.length - 1}
              />
            ))}
          </Section>
        )}

        <Button
          title={t('universalMeasurements.addTemplate')}
          icon={<Icon name="plus" size={20} color={colors.onPrimary} />}
          onPress={() => setShowModal(true)}
        />
      </ScrollView>

      <CenterModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={t('universalMeasurements.createModalTitle')}
        footer={
          <View className="flex-row gap-2">
            <Button title={t('universalMeasurements.cancel')} variant="secondary" className="flex-1" onPress={() => setShowModal(false)} />
            <Button title={t('universalMeasurements.create')} loading={creating} className="flex-1" onPress={handleCreateCustom} />
          </View>
        }
      >
        <Text variant="label" tone="muted" weight="regular" className="mb-4">
          {t('universalMeasurements.examples')}
        </Text>

        <InputField
          label={t('universalMeasurements.templateNameLabel')}
          placeholder={t('universalMeasurements.templateNamePlaceholder')}
          value={customName}
          onChangeText={setCustomName}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={handleCreateCustom}
          compact
        />
      </CenterModal>
    </View>
  );
}
