import { memo } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, SwipeRow, Text, useToast } from '../src/components/ui';
import { formatCurrency } from '../lib/format';
import { getDueInfo } from '../lib/dueInfo';
import { sendWhatsAppMessage } from '../lib/whatsapp';
import type { OrderListItem } from '../types';

type Props = {
  order: OrderListItem;
  balance: number;
  onOpen: (order: OrderListItem) => void;
  onChangeStatus: (order: OrderListItem, target: 'ready' | 'delivered') => void;
};

/**
 * One order in a list: who, what, when due, status and money owed, plus swipe
 * shortcuts (right = Ready/Deliver, left = Call/WhatsApp). Pure presentation;
 * the screen owns navigation and the status-change logic.
 */
function OrderRowImpl({ order, balance, onOpen, onChangeStatus }: Props) {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const { t: to } = useTranslation('orders');
  const showToast = useToast();

  const customerName = order.customers?.name || to('form.customer', { defaultValue: 'Unknown customer' });
  const phone = order.customers?.phone;
  const delivered = order.status === 'delivered';
  const isReady = order.status === 'ready';
  const due = delivered ? null : getDueInfo(order.delivery_date, order.status, t);
  const garment = order.cloth_type
    ? `${order.cloth_type}${order.cloth_count ? ` × ${order.cloth_count}` : ''}`
    : to('form.defaultGarmentType', { defaultValue: 'Garment' });
  const next: 'ready' | 'delivered' = isReady ? 'delivered' : 'ready';

  const reveal = phone
    ? [
        {
          key: 'call',
          label: tc('actions.call'),
          icon: 'phone',
          onPress: () => void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`).catch(() => showToast(tc('call.failed'), 'error')),
        },
        {
          key: 'whatsapp',
          label: 'WhatsApp',
          icon: 'chat',
          onPress: () =>
            void sendWhatsAppMessage(phone, '').catch((e) => showToast(e instanceof Error ? e.message : tc('whatsapp.failed'), 'error')),
        },
      ]
    : [];

  return (
    <SwipeRow
      commitAction={
        delivered
          ? undefined
          : {
              key: next,
              label: isReady ? t('deliver') : t('ready'),
              icon: isReady ? 'truck' : 'circleCheck',
              tone: isReady ? 'primary' : 'success',
              onPress: () => onChangeStatus(order, next),
            }
      }
      revealActions={reveal}
    >
      <Pressable
        onPress={() => onOpen(order)}
        accessibilityRole="button"
        accessibilityLabel={[customerName, `#${order.order_number}`, garment, due?.text, balance > 0 ? formatCurrency(balance) : to('list.paidText')]
          .filter(Boolean)
          .join(', ')}
        className="min-h-[80px] flex-row items-center border-b border-line-2 bg-surface px-4 py-3 active:bg-surface-2"
      >
        <View className="min-w-0 flex-1 pr-3">
          <Text variant="bodyLg" numberOfLines={1}>
            {customerName}{' '}
            <Text variant="label" tone="faint" tabular>
              #{order.order_number}
            </Text>
          </Text>
          <Text variant="label" tone="muted" weight="regular" numberOfLines={1}>
            {garment}
          </Text>
          <View className="mt-1.5 flex-row flex-wrap gap-1.5">
            {due && due.text ? <Badge size="sm" label={due.text} tone={due.tone} icon={due.late ? 'alert' : 'clock'} /> : null}
            <Badge size="sm" type="order_status" value={order.status} />
            {order.is_rush && !delivered ? <Badge size="sm" tone="danger" label={to('list.urgent')} icon="flame" /> : null}
          </View>
        </View>

        <View className="items-end">
          {balance > 0 ? (
            <>
              <Text variant="bodyLg" tone="danger" tabular numberOfLines={1}>
                {formatCurrency(balance)}
              </Text>
              <Text variant="caption" tone="muted" weight="regular">
                {to('list.dueText')}
              </Text>
            </>
          ) : (
            <Text variant="label" tone="success">
              {to('list.paidText')}
            </Text>
          )}
        </View>
      </Pressable>
    </SwipeRow>
  );
}

export const OrderRow = memo(OrderRowImpl);
