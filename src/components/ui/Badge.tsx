import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePalette } from '../../theme/usePalette';
import { Icon } from './Icon';
import { Text } from './Text';
import type { OrderStatus, PaymentStatus } from '../../../types';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';

type Common = { border?: string; size?: 'sm' | 'md'; testID?: string };

export type BadgeProps =
  | (Common & { type: 'order_status'; value: OrderStatus; label?: never; tone?: never; bg?: never; color?: never; icon?: never })
  | (Common & { type: 'payment_status'; value: PaymentStatus; label?: never; tone?: never; bg?: never; color?: never; icon?: never })
  | (Common & { type?: never; value?: never; label: string; tone?: BadgeTone; bg?: string; color?: string; icon?: string });

const ORDER_ICON: Record<OrderStatus, string> = {
  order_taken: 'clock',
  cutting: 'scissors',
  stitching: 'scissors',
  ready: 'circleCheck',
  delivered: 'truck',
};
const PAYMENT_ICON: Record<PaymentStatus, string> = { paid: 'check', partial: 'coin', unpaid: 'alert' };

/** Status/payment/tone badge: radius 2, always icon + text, never colour alone. */
export function Badge(props: BadgeProps) {
  const { t } = useTranslation('common');
  const palette = usePalette();

  let text: string;
  let bg: string;
  let fg: string;
  let border: string | undefined = props.border;
  let iconName: string | undefined;

  if (props.type === 'order_status') {
    text = t(`status.order.${props.value}`);
    const c = palette.status[props.value];
    bg = c.bg;
    fg = c.text;
    border = c.border === c.bg ? undefined : c.border;
    iconName = ORDER_ICON[props.value];
  } else if (props.type === 'payment_status') {
    text = t(`status.payment.${props.value}`);
    const c = palette.payment[props.value];
    bg = c.bg;
    fg = c.text;
    iconName = PAYMENT_ICON[props.value];
  } else {
    text = props.label;
    const tones: Record<BadgeTone, { bg: string; fg: string; border?: string }> = {
      neutral: { bg: palette.surfaceSubtle, fg: palette.text, border: palette.border },
      primary: { bg: palette.primaryLight, fg: palette.primaryDark },
      success: { bg: palette.successLight, fg: palette.success },
      warning: { bg: palette.warningLight, fg: palette.warning },
      danger: { bg: palette.dangerLight, fg: palette.danger },
    };
    const tone = tones[props.tone ?? 'neutral'];
    bg = props.bg ?? tone.bg;
    fg = props.color ?? tone.fg;
    border = border ?? (props.bg ? undefined : tone.border);
    iconName = props.icon;
  }

  const small = props.size === 'sm';

  return (
    <View
      testID={props.testID}
      accessible
      accessibilityLabel={text}
      className={`flex-row items-center self-start rounded-sm ${small ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}
      style={{ backgroundColor: bg, borderWidth: border ? 1 : 0, borderColor: border ?? 'transparent' }}
    >
      {iconName ? (
        <View className="mr-1">
          <Icon name={iconName} size={small ? 12 : 14} color={fg} strokeWidth={2.25} />
        </View>
      ) : null}
      <Text variant="caption" style={{ color: fg }}>
        {text}
      </Text>
    </View>
  );
}

export const Pill = Badge;
