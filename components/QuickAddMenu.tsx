import { useEffect, useState } from 'react';
import { Animated, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Icon, type TablerIconName } from '../src/components/ui/Icon';
import { IconButton } from '../src/components/ui/IconButton';
import { Text } from '../src/components/ui/Text';
import { usePalette } from '../src/theme/usePalette';
import { useReducedMotion } from '../src/theme/useReducedMotion';
import { transitions } from '../src/theme/tokens';
import { useTheme } from '../context/ThemeContext';

/** Row geometry shared with ProductTourSpotlight, which positions its tooltip from it. */
export const MENU_LAYOUT = { H_MARGIN: 12, HEADER_H: 48, ROW_H: 64, FOOT_H: 34 } as const;

export type QuickAction = {
  key: string;
  label: string;
  tablerIcon?: TablerIconName;
  subtext?: string;
  onPress: () => void;
};

export type QuickAddMenuProps = {
  visible: boolean;
  onClose: () => void;
  actions: QuickAction[];
  highlightedKey?: string;
};

// `sub` is a common-namespace translation key.
const ACTION_METADATA: Record<string, { icon: TablerIconName; sub: string }> = {
  order: { icon: 'plus', sub: 'quickAdd.orderSub' },
  client: { icon: 'userPlus', sub: 'quickAdd.clientSub' },
  measurement: { icon: 'ruler', sub: 'quickAdd.measurementSub' },
  staff: { icon: 'scissors', sub: 'quickAdd.staffSub' },
};

/** "Create" sheet opened by the tab bar's + button: one row per action, 64dp each. */
export function QuickAddMenu({ visible, onClose, actions, highlightedKey }: QuickAddMenuProps) {
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const palette = usePalette();
  const reduced = useReducedMotion();
  const [slideAnim] = useState(() => new Animated.Value(300));
  const [fadeAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const open = visible;
    if (reduced) {
      fadeAnim.setValue(open ? 1 : 0);
      slideAnim.setValue(open ? 0 : 300);
      return;
    }
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: open ? 1 : 0, duration: transitions.fast, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: open ? 0 : 300, duration: transitions.normal, useNativeDriver: true }),
    ]).start();
  }, [visible, reduced, fadeAnim, slideAnim]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        accessible={false}
        className="flex-1 justify-end"
        style={{ backgroundColor: palette.scrim }}
        onPress={onClose}
      >
        {/* NativeWind does not apply className to Animated.View, so the sheet surface is the inner Pressable. */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Pressable
            accessible={false}
            accessibilityViewIsModal
            onPress={() => {}}
            style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            className="rounded-t border-t border-line bg-surface px-4 pt-3"
          >
            <View className="mb-1 items-center">
              <View className="h-1 w-9 rounded-sm bg-line" />
            </View>

            <View className="flex-row items-center justify-between border-b border-line-2" style={{ height: MENU_LAYOUT.HEADER_H }}>
              <Text variant="title" accessibilityRole="header">
                {t('actions.create', { defaultValue: 'Create' })}
              </Text>
              <IconButton icon="x" onPress={onClose} accessibilityLabel={t('actions.close')} variant="ghost" className="-mr-2" />
            </View>

            <View>
              {actions.map((act) => {
                const meta = ACTION_METADATA[act.key] || { icon: 'plus' as TablerIconName, sub: '' };
                const iconName: TablerIconName = act.tablerIcon || meta.icon;
                const subtext = act.subtext || (meta.sub ? t(meta.sub) : '');
                const isDimmed = highlightedKey && highlightedKey !== act.key;

                return (
                  <Pressable
                    key={act.key}
                    accessibilityRole="button"
                    accessibilityLabel={subtext ? `${act.label}, ${subtext}` : act.label}
                    onPress={() => {
                      onClose();
                      setTimeout(() => act.onPress(), 100);
                    }}
                    style={{ height: MENU_LAYOUT.ROW_H }}
                    className={`flex-row items-center border-b border-line-2 px-1 active:bg-surface-2 ${isDimmed ? 'opacity-30' : ''}`}
                  >
                    <View className="mr-3 h-10 w-10 items-center justify-center rounded bg-primary-50">
                      <Icon name={iconName} size={22} color={colors.primary} />
                    </View>

                    <View className="flex-1">
                      <Text variant="bodyLg" numberOfLines={1}>
                        {act.label}
                      </Text>
                      {subtext ? (
                        <Text variant="caption" tone="muted" weight="regular" numberOfLines={1}>
                          {subtext}
                        </Text>
                      ) : null}
                    </View>

                    <Icon name="chev" size={18} color={colors.textFaint} />
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
