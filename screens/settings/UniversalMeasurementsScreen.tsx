import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { FontAwesome5 } from '@expo/vector-icons';
import { Button, CenterModal, EmptyState, Header, InputField, LoadingSpinner, useToast } from '../../components/ui';
import { useShop } from '../../context/AuthContext';
import { universalTemplatesRepo, universalFieldsRepo } from '../../lib/data/repository';
import { getAutoSuggestedFields } from '../../lib/autoSuggestFields';
import type { SettingsScreenProps } from '../../navigation/types';
import type { Tables } from '../../lib/database.types';

type Template = Tables<'universal_measurement_templates'>;

const DEFAULT_TEMPLATES = [
  { name: 'Shirt', icon: 'tshirt' },
  { name: 'Pant', icon: 'user-alt' },
  { name: 'Shirt + Pant', icon: 'user-tie' },
];

function iconForTemplate(name: string): React.ComponentProps<typeof FontAwesome5>['name'] {
  const lower = name.toLowerCase();
  if (lower.includes('shirt') && lower.includes('pant')) return 'user-tie';
  if (lower.includes('shirt')) return 'tshirt';
  if (lower.includes('pant')) return 'user-alt';
  return 'cut';
}

export default function UniversalMeasurementsScreen({ navigation }: SettingsScreenProps<'UniversalMeasurements'>) {
  const { t } = useTranslation('settings');
  const shop = useShop();
  const showToast = useToast();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [fieldCounts, setFieldCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      let data = await universalTemplatesRepo.list(shop.id);

      // Initialize default templates if shop has no templates yet
      if (data.length === 0) {
        let order = 0;
        for (const tmpl of DEFAULT_TEMPLATES) {
          const created = await universalTemplatesRepo.create({
            shop_id: shop.id,
            template_name: tmpl.name,
            sort_order: order++,
          });

          // Seed default auto-suggested fields
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
      const nextSortOrder = templates.length > 0 ? Math.max(...templates.map((t) => t.sort_order)) + 1 : 0;
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
      setShowModal(false);
      showToast(t('universalMeasurements.saveSuccess'), 'success');

      // Navigate to detail to customize
      navigation.navigate('UniversalTemplateDetail', { templateId: created.id });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create template', 'error');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-950">
        <Header title={t('universalMeasurements.title')} onBack={() => navigation.goBack()} />
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      <Header title={t('universalMeasurements.title')} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 224, gap: 12 }}>
        {templates.length === 0 ? (
          <EmptyState
            icon="ruler-combined"
            title={t('universalMeasurements.title')}
            description={t('universalMeasurements.templatesSubtitle')}
          />
        ) : (
          <View className="overflow-hidden rounded-md border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            {templates.map((template, idx) => {
              const isStandard = DEFAULT_TEMPLATES.some(
                (d) => d.name.toLowerCase() === template.template_name.toLowerCase()
              );
              const count = fieldCounts[template.id] ?? 0;

              return (
                <Pressable
                  key={template.id}
                  onPress={() => navigation.navigate('UniversalTemplateDetail', { templateId: template.id })}
                  className={`flex-row items-center justify-between px-4 py-3 active:bg-gray-50 dark:active:bg-gray-800 ${
                    idx > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''
                  }`}
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <FontAwesome5 name={iconForTemplate(template.template_name)} size={14} color="#4F46E5" />
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-gray-900 dark:text-white" numberOfLines={1}>
                        {template.template_name}
                      </Text>
                      <Text className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {isStandard ? 'Standard' : 'Custom'} · {count} {count === 1 ? 'field' : 'fields'}
                      </Text>
                    </View>
                  </View>

                  <FontAwesome5 name="chevron-right" size={12} color="#D1D5DB" />
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable
          onPress={() => setShowModal(true)}
          className="flex-row items-center justify-center gap-2 py-3 active:opacity-60"
        >
          <FontAwesome5 name="plus" size={12} color="#4F46E5" />
          <Text className="text-sm font-semibold text-primary-600 dark:text-primary-400">
            {t('universalMeasurements.addTemplate')}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Custom Template Modal */}
      <CenterModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={t('universalMeasurements.createModalTitle')}
      >
        <Text className="text-xs text-gray-500 dark:text-gray-400 -mt-1 mb-4">
          Examples: Blazer, Kurta, Safari Suit, Jacket, Sherwani, Lehenga, etc.
        </Text>

        <InputField
          label={t('universalMeasurements.templateNameLabel')}
          placeholder={t('universalMeasurements.templateNamePlaceholder')}
          value={customName}
          onChangeText={setCustomName}
        />

        <View className="mt-2 flex-row gap-3">
          <View className="flex-1">
            <Button title={t('universalMeasurements.cancel')} variant="secondary" onPress={() => setShowModal(false)} />
          </View>
          <View className="flex-1">
            <Button title={t('universalMeasurements.create')} loading={creating} onPress={handleCreateCustom} />
          </View>
        </View>
      </CenterModal>
    </View>
  );
}
