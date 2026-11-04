import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import NotificationsScreen from '../screens/dashboard/NotificationsScreen';
import CalendarScreen from '../screens/dashboard/CalendarScreen';
import TransactionsScreen from '../screens/dashboard/TransactionsScreen';
import { useStackScreenOptions } from './screenOptions';
import { useSharedScreens } from './sharedScreens';
import type { DashboardStackParamList } from './types';

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export function DashboardNavigator() {
  const screenOptions = useStackScreenOptions();
  const shared = useSharedScreens(Stack);
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      {shared}
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="Transactions" component={TransactionsScreen} />
    </Stack.Navigator>
  );
}
