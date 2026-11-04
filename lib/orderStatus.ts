import i18n from './i18n';
import { ordersRepo } from './data/repository';
import { sendPushNotification } from './notify';
import { supabase } from './supabase';
import type { OrderStatus } from '../types';
import type { Tables } from './database.types';

type StatusOrder = Pick<Tables<'orders'>, 'id' | 'customer_id' | 'assigned_staff_id' | 'order_number'>;

/**
 * Changes an order's status with the same side effects everywhere it can be
 * done (order detail, Home quick actions, TrueFit AI): delivering also closes
 * the karigar's staff_orders row and notifies the customer.
 */
export async function applyOrderStatus(
  shopId: string,
  order: StatusOrder,
  target: OrderStatus,
  customerName: string
): Promise<void> {
  await ordersRepo.update(order.id, shopId, { status: target });
  if (target !== 'delivered') return;

  if (order.assigned_staff_id) {
    try {
      const { data: existing } = await supabase
        .from('staff_orders')
        .select('id')
        .eq('order_id', order.id)
        .eq('staff_id', order.assigned_staff_id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('staff_orders')
          .update({ completed_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase.from('staff_orders').insert({
          shop_id: shopId,
          order_id: order.id,
          staff_id: order.assigned_staff_id,
          completed_at: new Date().toISOString(),
        });
      }
    } catch {
      // Non-critical bookkeeping
    }
  }

  void sendPushNotification({
    shopId,
    type: 'order_ready',
    customerId: order.customer_id,
    title: i18n.t('orders:detail.pushReadyTitle'),
    body: i18n.t('orders:detail.pushReadyBody', { number: order.order_number, customerName }),
  });
}
