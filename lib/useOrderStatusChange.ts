import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useToast } from '../src/components/ui/Toast';
import { ordersRepo } from './data/repository';
import { formatCurrency } from './format';
import { haptics } from './haptics';
import { applyOrderStatus } from './orderStatus';
import type { OrderListItem } from '../types';

type Options = {
  shopId: string;
  /** Balance still owed on an order (used for the "deliver with balance" warning). */
  getBalance: (order: OrderListItem) => number;
  /** Called after any successful change or undo so the screen can reload. */
  onChanged: () => void | Promise<void>;
};

/**
 * Shared "mark ready / mark delivered" action for Home and the Orders list:
 * haptics, success toast with Undo (ready only, because delivering notifies
 * the customer), and the existing warning when delivering with a balance due.
 */
export function useOrderStatusChange({ shopId, getBalance, onChanged }: Options) {
  const { t } = useTranslation(['dashboard', 'orders', 'common']);
  const showToast = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const run = useCallback(
    async (order: OrderListItem, target: 'ready' | 'delivered') => {
      const previous = order.status;
      setUpdatingId(order.id);
      try {
        await applyOrderStatus(shopId, order, target, order.customers?.name ?? '');
        haptics.success();
        showToast(
          target === 'ready'
            ? t('dashboard:orderMarkedReady', { number: order.order_number })
            : t('dashboard:orderMarkedDelivered', { number: order.order_number }),
          target === 'ready'
            ? {
                type: 'success',
                undoAction: () => void ordersRepo.update(order.id, shopId, { status: previous }).then(() => onChanged()),
              }
            : 'success',
        );
        await onChanged();
      } catch (err) {
        haptics.error();
        showToast(err instanceof Error ? err.message : t('dashboard:errorLoad'), 'error');
      } finally {
        setUpdatingId(null);
      }
    },
    [shopId, onChanged, showToast, t],
  );

  const change = useCallback(
    (order: OrderListItem, target: 'ready' | 'delivered') => {
      const balance = getBalance(order);
      if (target === 'delivered' && balance > 0) {
        Alert.alert(
          t('orders:detail.balancePendingTitle'),
          t('orders:detail.balancePendingDesc', { amount: formatCurrency(balance), number: order.order_number }),
          [
            { text: t('common:actions.cancel'), style: 'cancel' },
            {
              text: t('orders:detail.deliverWithoutPayment'),
              style: 'destructive',
              onPress: () => void run(order, target),
            },
          ],
        );
        return;
      }
      void run(order, target);
    },
    [getBalance, run, t],
  );

  return { change, updatingId };
}
