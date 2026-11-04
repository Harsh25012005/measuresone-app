import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OrderListScreen from '../screens/orders/OrderListScreen';
import { useStackScreenOptions } from './screenOptions';
import { useSharedScreens } from './sharedScreens';
import type { OrdersStackParamList } from './types';

const Stack = createNativeStackNavigator<OrdersStackParamList>();

export function OrdersNavigator() {
  const screenOptions = useStackScreenOptions();
  const shared = useSharedScreens(Stack);
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="OrderList" component={OrderListScreen} />
      {shared}
    </Stack.Navigator>
  );
}
