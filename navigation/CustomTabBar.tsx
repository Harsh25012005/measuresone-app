import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { DSBottomNav, type DSNavItem } from '../components/ds/BottomNav';
import { DSQuickAdd, type DSQuickAction } from '../components/ds/QuickAdd';
import { DSBottomSheet } from '../components/ds/BottomSheet';
import { DSEmptyState } from '../components/ds/EmptyState';
import { DSSpinner } from '../components/ds/Loading';
import {
  IconBriefcase,
  IconChevronRight,
  IconClipboardList,
  IconClipboardPlus,
  IconHome,
  IconLayoutGrid,
  IconUserPlus,
  IconUsers,
} from '../components/ds/icons';
import { ProductTourSpotlight } from '../components/ProductTourSpotlight';
import { useProductTour, TOUR_STEPS, type TourStep } from '../context/ProductTourContext';
import { useShop } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { primary, typography } from '../constants/tokens';
import { staffRepo } from '../lib/data/repository';
import { haptics } from '../lib/haptics';
import type { Staff } from '../types';
import type { MainTabParamList } from './types';

/** Maps a tour step to the quick-add action it should spotlight. */
const TOUR_STEP_TO_ACTION_KEY: Record<TourStep, string> = {
  orders: 'order',
  customers: 'client',
  work: 'work',
};

/** Left-to-right order of the bar (Figma): Home, Orders, Clients, More. */
const TAB_CONFIG: Array<{ routeName: keyof MainTabParamList; labelKey: string; icon: DSNavItem['icon'] }> = [
  { routeName: 'DashboardTab', labelKey: 'nav.dashboard', icon: IconHome },
  { routeName: 'OrdersTab', labelKey: 'nav.orders', icon: IconClipboardList },
  { routeName: 'CustomersTab', labelKey: 'nav.customers', icon: IconUsers },
  { routeName: 'SettingsTab', labelKey: 'nav.more', icon: IconLayoutGrid },
];

/**
 * The Add-button actions, nearest-to-button first. `tab`/`screen` describe where
 * each one lives: these forms sit inside a tab's inner stack, not on the tab
 * navigator, so they're reached with a nested navigate (see `jumpTo`).
 * "work" is special: the staff-work form needs a staff member, so it opens a
 * picker first.
 */
export const QUICK_ACTIONS: Array<{
  key: string;
  labelKey: string;
  hintKey: string;
  icon: DSQuickAction['icon'];
  tone: NonNullable<DSQuickAction['tone']>;
  tab: keyof MainTabParamList;
  screen: string;
}> = [
  {
    key: 'order',
    labelKey: 'quickAdd.addOrder',
    hintKey: 'quickAdd.addOrderHint',
    icon: IconClipboardPlus,
    tone: 'primary',
    tab: 'OrdersTab',
    screen: 'OrderForm',
  },
  {
    key: 'client',
    labelKey: 'quickAdd.newClient',
    hintKey: 'quickAdd.newClientHint',
    icon: IconUserPlus,
    tone: 'success',
    tab: 'CustomersTab',
    screen: 'CustomerForm',
  },
  {
    key: 'work',
    labelKey: 'quickAdd.addWork',
    hintKey: 'quickAdd.addWorkHint',
    icon: IconBriefcase,
    tone: 'warning',
    tab: 'SettingsTab',
    screen: 'StaffWorkEntryForm',
  },
];

const TAB_ROOT_SCREENS: Record<string, string> = {
  DashboardTab: 'Dashboard',
  CustomersTab: 'CustomerList',
  OrdersTab: 'OrderList',
  SettingsTab: 'SettingsHome',
};

/**
 * Which quick-add screens are registered inside which tab's own stack (see
 * SharedOrderRoutes in navigation/types.ts). When the screen the user wants
 * already lives in the tab they're currently on, we push it onto that same
 * stack instead of switching tabs — so "Update"/"Save"/back returns them to
 * exactly the screen they tapped Add from.
 */
const LOCAL_SCREEN_AVAILABILITY: Partial<Record<keyof MainTabParamList, string[]>> = {
  DashboardTab: ['OrderForm', 'BillForm'],
  CustomersTab: ['OrderForm', 'BillForm', 'CustomerForm'],
  OrdersTab: ['OrderForm', 'BillForm'],
  SettingsTab: ['StaffForm'],
};

/**
 * Screens that hide the bottom bar — every add/edit form and every detail
 * page, which are focused single-task screens with their own back button.
 *
 * Deliberately a blacklist, not a whitelist: a tab's `route.state` is
 * undefined until its nested navigator has rendered at least once, so a
 * whitelist made the bar vanish on a tab's first visit. Defaulting to
 * *visible* means an unrecognised or not-yet-rendered screen keeps the bar.
 */
const TAB_BAR_HIDDEN_SCREENS = [
  // Add / edit forms
  'OrderForm',
  'CustomerForm',
  'MeasurementForm',
  'BillForm',
  'StaffForm',
  'StaffWorkEntryForm',
  'ShopEdit',
  // Detail pages
  'OrderDetail',
  'CustomerDetail',
  'BillDetail',
  'StaffDetail',
  'Revenue',
  // Staff list is reached from Business rather than being a tab of its own,
  // so it behaves like a nested page and hides the bar too.
  'Staff',
  // Full-screen focused tasks
  'Search',
];

/**
 * Drills into nested navigator state to find the name of the screen
 * actually on top, since `route.name` alone only ever gives the name of the
 * top-level tab/stack entry (e.g. "Billing"), not the real screen nested
 * inside it (e.g. "BillingList" vs "BillDetail").
 */
function getDeepestRouteName(route: { name: string; state?: { index?: number; routes: { name: string; state?: unknown }[] } }): string {
  if (!route.state) return route.name;
  const nested = route.state;
  const activeRoute = nested.routes[nested.index ?? nested.routes.length - 1];
  return getDeepestRouteName(activeRoute as typeof route);
}

/** Gap between the floating bar and the screen's bottom edge (plus the safe-area inset). */
const BAR_BOTTOM_GAP = 8;
const BAR_SIDE_GAP = 16;

export function CustomTabBar({ state, navigation, descriptors }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('common');
  const { colors, scheme } = useTheme();
  const shop = useShop();
  const tour = useProductTour();

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [staffPickerOpen, setStaffPickerOpen] = useState(false);
  const [pieceStaff, setPieceStaff] = useState<Staff[] | null>(null);

  const tourStep = TOUR_STEPS.includes(tour.step as TourStep) ? (tour.step as TourStep) : null;
  const menuOpen = isAddMenuOpen || tourStep !== null;

  // Close the Add menu whenever the user actually navigates to a different
  // screen. We only watch `state.index` (which tab) and the innermost screen
  // name. Importantly we do NOT fire on the first render: React Navigation sets
  // `route.state` to undefined until the nested navigator renders once.
  const activeDeepest = getDeepestRouteName(state.routes[state.index] as never);
  const activeRouteKey = `${state.index}:${activeDeepest}`;
  const prevRouteKey = useRef(activeRouteKey);
  useEffect(() => {
    if (prevRouteKey.current !== activeRouteKey) {
      prevRouteKey.current = activeRouteKey;
      setIsAddMenuOpen(false);
    }
  });

  // Load the staff who are paid per piece whenever the picker opens.
  useEffect(() => {
    if (!staffPickerOpen) return;
    let cancelled = false;
    setPieceStaff(null);
    staffRepo
      .list(shop.id, { activeOnly: true })
      .then((rows) => {
        if (!cancelled) setPieceStaff(rows.filter((s) => s.wage_type === 'per_piece'));
      })
      .catch(() => {
        if (!cancelled) setPieceStaff([]);
      });
    return () => {
      cancelled = true;
    };
  }, [staffPickerOpen, shop.id]);

  /**
   * The tab navigator's own param list only knows about the tab routes, so it
   * can't type a nested `{ screen, params }` jump into a tab's inner stack.
   */
  const jumpTo = useCallback(
    (tab: keyof MainTabParamList, screen: string, params?: object) =>
      (navigation as unknown as { navigate: (t: string, p?: object) => void }).navigate(tab, { screen, params }),
    [navigation],
  );

  /**
   * Prefers pushing the requested form onto the CURRENT tab's own stack
   * (preserving whatever screen the user was already on underneath) and only
   * falls back to switching tabs when that screen genuinely isn't reachable
   * from where the user is right now.
   */
  const openQuickAction = (action: (typeof QUICK_ACTIONS)[number]) => {
    if (action.key === 'work') {
      setStaffPickerOpen(true);
      return;
    }
    const currentTab = state.routes[state.index]?.name as keyof MainTabParamList | undefined;
    if (currentTab && LOCAL_SCREEN_AVAILABILITY[currentTab]?.includes(action.screen)) {
      jumpTo(currentTab, action.screen);
      return;
    }
    jumpTo(action.tab, action.screen);
  };

  const onTabPress = (routeName: string) => {
    if (tourStep) return;
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) return;
    setIsAddMenuOpen(false);
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (event.defaultPrevented) return;
    haptics.tap();
    // Every tab press (re-tapping the current tab or switching to a new one)
    // goes to that tab's root screen, so after opening a form via Quick Add and
    // going back, tapping the tab always shows the list, not the last form.
    const rootScreen = TAB_ROOT_SCREENS[route.name];
    if (rootScreen) {
      (navigation as any).navigate(route.name, { screen: rootScreen });
    } else {
      navigation.navigate(route.name);
    }
  };

  // A nested screen (e.g. the AI assistant) can hide this bar entirely by
  // calling navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } }).
  const focusedOptions = descriptors[state.routes[state.index].key]?.options;
  const hiddenByOptions =
    !!focusedOptions?.tabBarStyle && (focusedOptions.tabBarStyle as { display?: string }).display === 'none';
  // Tour stays visible regardless of screen (it drives its own navigation).
  const hiddenByScreen = !tourStep && TAB_BAR_HIDDEN_SCREENS.includes(activeDeepest);
  if (hiddenByOptions || hiddenByScreen) return null;

  const items: DSNavItem[] = TAB_CONFIG.map((c) => ({ key: c.routeName, label: t(c.labelKey), icon: c.icon }));
  const focusedRoute = state.routes[state.index]?.name ?? 'DashboardTab';
  const fabBottom = BAR_BOTTOM_GAP;
  const dark = scheme === 'dark';

  const actions: DSQuickAction[] = QUICK_ACTIONS.map((a) => ({
    key: a.key,
    label: t(a.labelKey),
    description: t(a.hintKey),
    icon: a.icon,
    tone: a.tone,
    onPress: () => {
      if (tourStep) return;
      haptics.tap();
      openQuickAction(a);
    },
  }));

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.wrapper, { paddingBottom: insets.bottom + BAR_BOTTOM_GAP, paddingHorizontal: BAR_SIDE_GAP }]}
      >
        <DSBottomNav
          items={items}
          value={focusedRoute}
          onChange={onTabPress}
          onFabPress={() => {
            if (tourStep) return;
            haptics.tap();
            setIsAddMenuOpen((o) => !o);
          }}
        />
      </View>

      <DSQuickAdd
        visible={menuOpen}
        onClose={() => {
          if (tourStep) return;
          setIsAddMenuOpen(false);
        }}
        actions={actions}
        fabBottom={fabBottom}
        fabRight={BAR_SIDE_GAP}
        highlightedKey={tourStep ? TOUR_STEP_TO_ACTION_KEY[tourStep] : undefined}
        overlay={
          tourStep ? (
            <ProductTourSpotlight
              step={tourStep}
              actionCount={QUICK_ACTIONS.length}
              bottomOffset={insets.bottom + fabBottom}
              onBack={tour.back}
              onNext={tour.next}
              onSkip={tour.finish}
              onTryItNow={() => {
                const action = QUICK_ACTIONS.find((a) => a.key === TOUR_STEP_TO_ACTION_KEY[tourStep]);
                tour.finish();
                if (action) {
                  haptics.tap();
                  openQuickAction(action);
                }
              }}
            />
          ) : null
        }
      />

      {/* "Add work" needs a staff member first — only piece-rate staff have work entries. */}
      <DSBottomSheet
        visible={staffPickerOpen}
        onClose={() => setStaffPickerOpen(false)}
        title={t('quickAdd.pickStaffTitle')}
      >
        {pieceStaff === null ? (
          <View style={{ paddingVertical: 28, alignItems: 'center' }}>
            <DSSpinner />
          </View>
        ) : pieceStaff.length === 0 ? (
          <View style={{ paddingTop: 4, paddingBottom: 8 }}>
            <DSEmptyState
              variant="compact"
              icon={IconBriefcase}
              title={t('quickAdd.pickStaffEmpty')}
              description={t('quickAdd.pickStaffEmptyHint')}
              actionLabel={t('quickAdd.pickStaffAdd')}
              onAction={() => {
                setStaffPickerOpen(false);
                jumpTo('SettingsTab', 'StaffForm');
              }}
            />
          </View>
        ) : (
          <View style={{ gap: 8, paddingBottom: 4 }}>
            {pieceStaff.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => {
                  setStaffPickerOpen(false);
                  haptics.tap();
                  jumpTo('SettingsTab', 'StaffWorkEntryForm', { staffId: s.id });
                }}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.staffRow,
                  {
                    backgroundColor: pressed ? colors.primaryTint : colors.bgSubtle,
                    borderColor: dark ? '#262626' : colors.borderSubtle,
                  },
                ]}
              >
                <View style={[styles.staffAvatar, { backgroundColor: colors.primaryTint }]}>
                  <Text style={{ fontFamily: typography.family.bold, fontSize: 14, color: primary[600] }}>
                    {s.name
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((w) => w[0]!.toUpperCase())
                      .join('')}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: typography.family.semibold, fontSize: 15, color: colors.textPrimary }} numberOfLines={1}>
                    {s.name}
                  </Text>
                  {s.phone ? (
                    <Text style={{ fontFamily: typography.family.regular, fontSize: 13, color: colors.textMuted }} numberOfLines={1}>
                      {s.phone}
                    </Text>
                  ) : null}
                </View>
                <IconChevronRight size={16} color={colors.textFaint} />
              </Pressable>
            ))}
          </View>
        )}
      </DSBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 100,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 9999,
    borderWidth: 1,
  },
  staffAvatar: { width: 42, height: 42, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
});
