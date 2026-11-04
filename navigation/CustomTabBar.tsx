import { useEffect, useState } from 'react';
import { Animated, BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useProductTour, TOUR_STEPS, type TourStep } from '../context/ProductTourContext';
import { QuickAddMenu } from '../components/QuickAddMenu';
import { ProductTourSpotlight } from '../components/ProductTourSpotlight';
import { Icon, type TablerIconName } from '../src/components/ui/Icon';
import { Text } from '../src/components/ui/Text';
import { useReducedMotion } from '../src/theme/useReducedMotion';
import { focusRing, useFocus } from '../src/theme/useFocus';
import { transitions } from '../src/theme/tokens';
import { useLateOrderCount } from './useLateOrderCount';
import { haptics } from '../lib/haptics';
import type { MainTabParamList } from './types';

/** Maps a tour step to the quick-add action it should spotlight. */
const TOUR_STEP_TO_ACTION_KEY: Record<TourStep, string> = {
  customers: 'client',
  orders: 'order',
  staff: 'staff',
};

type TabItemConfig = {
  type: 'tab' | 'add';
  routeName?: keyof MainTabParamList;
  labelKey: string;
  tablerIcon?: TablerIconName;
};

/**
 * Tab order matching truefit.html:
 * 1. Home (DashboardTab)
 * 2. Orders (OrdersTab)
 * 3. Add (+ Create)
 * 4. Customers (CustomersTab)
 * 5. More (SettingsTab)
 */
const TAB_CONFIG: TabItemConfig[] = [
  {
    type: 'tab',
    routeName: 'DashboardTab',
    labelKey: 'nav.dashboard',
    tablerIcon: 'home',
  },
  {
    type: 'tab',
    routeName: 'OrdersTab',
    labelKey: 'nav.orders',
    tablerIcon: 'orders',
  },
  { type: 'add', labelKey: 'nav.add' },
  {
    type: 'tab',
    routeName: 'CustomersTab',
    labelKey: 'nav.customers',
    tablerIcon: 'users',
  },
  {
    type: 'tab',
    routeName: 'SettingsTab',
    labelKey: 'nav.settings',
    tablerIcon: 'grid',
  },
];

export const QUICK_ACTIONS: Array<{
  key: string;
  labelKey: string;
  tablerIcon: TablerIconName;
  tab: keyof MainTabParamList;
  screen: string;
}> = [
  {
    key: 'order',
    labelKey: 'quickAdd.addOrder',
    tablerIcon: 'plus',
    tab: 'OrdersTab',
    screen: 'OrderForm',
  },
  {
    key: 'client',
    labelKey: 'quickAdd.newClient',
    tablerIcon: 'userPlus',
    tab: 'CustomersTab',
    screen: 'CustomerForm',
  },
  {
    key: 'measurement',
    labelKey: 'quickAdd.addMeasurement',
    tablerIcon: 'ruler',
    tab: 'CustomersTab',
    screen: 'CustomerList',
  },
  {
    key: 'staff',
    labelKey: 'quickAdd.addStaff',
    tablerIcon: 'scissors',
    tab: 'SettingsTab',
    screen: 'StaffForm',
  },
];

const TAB_ROOT_SCREENS: Record<string, string> = {
  DashboardTab: 'Dashboard',
  CustomersTab: 'CustomerList',
  OrdersTab: 'OrderList',
  SettingsTab: 'SettingsHome',
};

const LOCAL_SCREEN_AVAILABILITY: Partial<Record<keyof MainTabParamList, string[]>> = {
  DashboardTab: ['OrderForm'],
  CustomersTab: ['OrderForm', 'CustomerForm', 'MeasurementForm'],
  OrdersTab: ['OrderForm'],
  SettingsTab: ['StaffForm'],
};

const TAB_BAR_HIDDEN_SCREENS = [
  'OrderForm',
  'CustomerForm',
  'MeasurementForm',
  'StaffForm',
  'StaffWorkEntryForm',
  'ShopEdit',
  'OrderDetail',
  'CustomerDetail',
  'StaffDetail',
  'Revenue',
  'Staff',
  'Search',
];

function getDeepestRouteName(route: {
  name: string;
  state?: { index?: number; routes: { name: string; state?: unknown }[] };
}): string {
  if (!route.state) return route.name;
  const nested = route.state;
  const activeRoute = nested.routes[nested.index ?? nested.routes.length - 1];
  return getDeepestRouteName(activeRoute as typeof route);
}

function TabButton({
  label,
  icon,
  selected,
  badge,
  badgeLabel,
  onPress,
}: {
  label: string;
  icon: TablerIconName;
  selected: boolean;
  badge?: number;
  badgeLabel?: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { focused, handlers } = useFocus();
  const color = selected ? colors.primary : colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={badge ? `${label}, ${badgeLabel}` : label}
      accessibilityState={{ selected }}
      {...handlers}
      style={focused ? focusRing(colors.primary) : undefined}
      className="min-h-touch flex-1 items-center justify-center pt-1.5 active:bg-surface-2"
    >
      {/* 3px indicator on the active tab (radius 2). */}
      <View className={`absolute left-4 right-4 top-0 h-[3px] rounded-sm ${selected ? 'bg-primary' : 'bg-transparent'}`} />
      <View className="h-7 items-center justify-center">
        <Icon name={icon} size={24} color={color} strokeWidth={selected ? 2.25 : 1.75} />
        {badge ? (
          <View className="absolute -right-3 -top-1 h-[18px] min-w-[18px] items-center justify-center rounded-sm bg-danger px-1">
            <Text variant="caption" tabular maxFontSizeMultiplier={1.3} style={{ color: colors.onPrimary, fontSize: 11, lineHeight: 14 }}>
              {badge > 99 ? '99+' : badge}
            </Text>
          </View>
        ) : null}
      </View>
      {/* Labels are capped at 150% so five tabs always fit on a phone; all other text scales fully. */}
      <Text variant="caption" tone={selected ? 'primary' : 'muted'} numberOfLines={1} maxFontSizeMultiplier={1.5}>
        {label}
      </Text>
    </Pressable>
  );
}

export function CustomTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const focusedOptions = descriptors[state.routes[state.index].key]?.options;
  const hiddenByOptions =
    !!focusedOptions?.tabBarStyle &&
    (focusedOptions.tabBarStyle as { display?: string }).display === 'none';
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const tour = useProductTour();
  const addFocus = useFocus();
  const tourStep = TOUR_STEPS.includes(tour.step as TourStep) ? (tour.step as TourStep) : null;
  const menuOpen = isAddMenuOpen || tourStep !== null;

  const barHeight = 56;
  const bottomPadding = insets.bottom || 8;
  const totalBarHeight = barHeight + bottomPadding;

  const activeDeepest = getDeepestRouteName(state.routes[state.index] as never);
  const hidden = hiddenByOptions || (!tourStep && TAB_BAR_HIDDEN_SCREENS.includes(activeDeepest));
  const lateCount = useLateOrderCount(`${state.index}:${activeDeepest}`);

  const [fabT] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const to = menuOpen ? 1 : 0;
    if (hidden || reduced) {
      fabT.setValue(to);
      return;
    }
    Animated.timing(fabT, { toValue: to, duration: transitions.normal, useNativeDriver: true }).start();
  }, [menuOpen, hidden, reduced, fabT]);

  useEffect(() => {
    if (hidden) setIsAddMenuOpen(false);
  }, [hidden]);

  useEffect(() => {
    if (!isAddMenuOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setIsAddMenuOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [isAddMenuOpen]);

  const toggleAddMenu = () => {
    if (tourStep) return;
    haptics.tap();
    setIsAddMenuOpen((prev) => !prev);
  };

  const jumpTo = (tab: keyof MainTabParamList, screen: string) =>
    (navigation as unknown as { navigate: (t: string, p?: object) => void }).navigate(tab, {
      screen,
      initial: false,
    });

  const openQuickAction = (tab: keyof MainTabParamList, screen: string) => {
    const currentTab = state.routes[state.index]?.name as keyof MainTabParamList | undefined;
    if (currentTab && LOCAL_SCREEN_AVAILABILITY[currentTab]?.includes(screen)) {
      jumpTo(currentTab, screen);
      return;
    }
    jumpTo(tab, screen);
  };

  if (hidden) return null;

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <QuickAddMenu
        visible={menuOpen}
        onClose={() => {
          if (tourStep) return;
          setIsAddMenuOpen(false);
        }}
        highlightedKey={tourStep ? TOUR_STEP_TO_ACTION_KEY[tourStep] : undefined}
        actions={QUICK_ACTIONS.map((a) => ({
          ...a,
          label: t(a.labelKey),
          onPress: () => {
            if (tourStep) return;
            setIsAddMenuOpen(false);
            haptics.tap();
            openQuickAction(a.tab, a.screen);
          },
        }))}
      />

      {tourStep ? (
        <ProductTourSpotlight
          step={tourStep}
          actionCount={QUICK_ACTIONS.length}
          bottomOffset={totalBarHeight + 16}
          onBack={tour.back}
          onNext={tour.next}
          onSkip={tour.finish}
          onTryItNow={() => {
            const action = QUICK_ACTIONS.find((a) => a.key === TOUR_STEP_TO_ACTION_KEY[tourStep]);
            tour.finish();
            if (action) {
              haptics.tap();
              jumpTo(action.tab, action.screen);
            }
          }}
        />
      ) : null}

      {/* Flat dock: surface fill and a 1px top border. No shadow. */}
      <View
        accessibilityRole="tablist"
        style={{ height: totalBarHeight, paddingBottom: bottomPadding }}
        className="flex-row items-stretch border-t border-line bg-surface px-1"
      >
        {TAB_CONFIG.map((item) => {
          if (item.type === 'add') {
            return (
              <View key="add-slot" className="w-20 items-center justify-center">
                <Pressable
                  onPress={toggleAddMenu}
                  accessibilityRole="button"
                  accessibilityLabel={t('quickAdd.accessibilityLabel', { defaultValue: 'Create' })}
                  accessibilityState={{ expanded: menuOpen }}
                  {...addFocus.handlers}
                  style={addFocus.focused ? focusRing(colors.primary) : undefined}
                  className="h-12 w-12 items-center justify-center rounded bg-primary active:bg-primary-dark"
                >
                  <Animated.View
                    style={{
                      transform: [{ rotate: fabT.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }],
                    }}
                  >
                    <Icon name="plus" size={24} color={colors.onPrimary} strokeWidth={2.5} />
                  </Animated.View>
                </Pressable>
              </View>
            );
          }

          const routeIndex = state.routes.findIndex((r) => r.name === item.routeName);
          const route = state.routes[routeIndex];
          if (!route) return null;

          const isFocused = state.index === routeIndex && !menuOpen;

          const onPress = () => {
            if (tourStep) return;
            if (isAddMenuOpen) setIsAddMenuOpen(false);

            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (event.defaultPrevented) return;

            if (isFocused) {
              const rootScreen = TAB_ROOT_SCREENS[route.name];
              if (rootScreen) {
                (navigation as unknown as { navigate: (t: string, p?: object) => void }).navigate(route.name, {
                  screen: rootScreen,
                });
              }
              return;
            }

            haptics.tap();
            navigation.navigate(route.name);
          };

          return (
            <TabButton
              key={item.routeName}
              label={t(item.labelKey)}
              icon={item.tablerIcon || 'home'}
              selected={isFocused}
              badge={item.routeName === 'OrdersTab' ? lateCount : undefined}
              badgeLabel={t('nav.lateCount', { count: lateCount })}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
});
