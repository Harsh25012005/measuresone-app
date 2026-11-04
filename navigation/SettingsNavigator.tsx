import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ShopEditScreen from '../screens/settings/ShopEditScreen';
import StaffListScreen from '../screens/staff/StaffListScreen';
import StaffFormScreen from '../screens/staff/StaffFormScreen';
import StaffDetailScreen from '../screens/staff/StaffDetailScreen';
import StaffWorkEntryFormScreen from '../screens/staff/StaffWorkEntryFormScreen';
import RevenueScreen from '../screens/revenue/RevenueScreen';
import CustomMeasurementFieldsScreen from '../screens/settings/CustomMeasurementFieldsScreen';
import UniversalMeasurementsScreen from '../screens/settings/UniversalMeasurementsScreen';
import UniversalTemplateDetailScreen from '../screens/settings/UniversalTemplateDetailScreen';
import CalendarScreen from '../screens/dashboard/CalendarScreen';
import { useStackScreenOptions } from './screenOptions';
import type { SettingsStackParamList } from './types';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsNavigator() {
  const screenOptions = useStackScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="SettingsHome" component={SettingsScreen} />
      <Stack.Screen name="ShopEdit" component={ShopEditScreen} />
      <Stack.Screen name="Staff" component={StaffListScreen} />
      <Stack.Screen name="StaffForm" component={StaffFormScreen} />
      <Stack.Screen name="StaffDetail" component={StaffDetailScreen} />
      <Stack.Screen name="StaffWorkEntryForm" component={StaffWorkEntryFormScreen} />
      <Stack.Screen name="Revenue" component={RevenueScreen} />
      <Stack.Screen name="CustomMeasurementFields" component={CustomMeasurementFieldsScreen} />
      <Stack.Screen name="UniversalMeasurements" component={UniversalMeasurementsScreen} />
      <Stack.Screen name="UniversalTemplateDetail" component={UniversalTemplateDetailScreen} />
      {/* Settings links to Calendar too; without this route the tap was a no-op. */}
      <Stack.Screen name="Calendar" component={CalendarScreen as React.ComponentType<any>} />
    </Stack.Navigator>
  );
}
