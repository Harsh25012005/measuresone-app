import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CustomTabBar } from './CustomTabBar';
import { DashboardNavigator } from './DashboardNavigator';
import { OrdersNavigator } from './OrdersNavigator';
import { CustomersNavigator } from './CustomersNavigator';
import { SettingsNavigator } from './SettingsNavigator';
import { ProductTourWelcome } from '../components/ProductTourWelcome';
import { useReducedMotion } from '../src/theme/useReducedMotion';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainNavigator() {
  const reduced = useReducedMotion();
  return (
    <>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false, animation: reduced ? 'none' : 'fade' }}
      >
        <Tab.Screen name="DashboardTab" component={DashboardNavigator} />
        <Tab.Screen name="OrdersTab" component={OrdersNavigator} />
        <Tab.Screen name="CustomersTab" component={CustomersNavigator} />
        <Tab.Screen name="SettingsTab" component={SettingsNavigator} />
      </Tab.Navigator>
      <ProductTourWelcome />
    </>
  );
}
