import type { ComponentType } from 'react';
import OrderFormScreen from '../screens/orders/OrderFormScreen';
import OrderDetailScreen from '../screens/orders/OrderDetailScreen';
import MeasurementFormScreen from '../screens/customers/MeasurementFormScreen';
import SearchScreen from '../screens/dashboard/SearchScreen';
import { useFormScreenOptions } from './screenOptions';

// Each tab owns a stack, but these screens are reachable from several tabs
// (an order opened from Home, Orders, a customer or search must keep the tab
// bar and back-stack of the tab it came from). Registering them from one list
// keeps every stack identical.
type StackLike = { Screen: ComponentType<any> };

/** Screens every tab stack can open. Render inside a stack navigator. */
export function useSharedScreens(Stack: StackLike) {
  const form = useFormScreenOptions();
  return (
    <>
      <Stack.Screen name="OrderForm" component={OrderFormScreen} options={form} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="MeasurementForm" component={MeasurementFormScreen} options={form} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'fade', animationDuration: 150 }} />
    </>
  );
}
