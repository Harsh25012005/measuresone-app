import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CustomerListScreen from '../screens/customers/CustomerListScreen';
import CustomerDetailScreen from '../screens/customers/CustomerDetailScreen';
import CustomerFormScreen from '../screens/customers/CustomerFormScreen';
import { useFormScreenOptions, useStackScreenOptions } from './screenOptions';
import { useSharedScreens } from './sharedScreens';
import type { CustomersStackParamList } from './types';

const Stack = createNativeStackNavigator<CustomersStackParamList>();

export function CustomersNavigator() {
  const screenOptions = useStackScreenOptions();
  const form = useFormScreenOptions();
  const shared = useSharedScreens(Stack);
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="CustomerList" component={CustomerListScreen} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
      <Stack.Screen name="CustomerForm" component={CustomerFormScreen} options={form} />
      {shared}
    </Stack.Navigator>
  );
}
