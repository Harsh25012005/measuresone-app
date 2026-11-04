import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { usePalette } from '../../theme/usePalette';
import { Icon } from './Icon';
import { Text } from './Text';
import type { OrderStatus } from '../../../types';

export type OrderProgressStepperProps = {
  status: OrderStatus;
  variant?: 'compact' | 'full' | 'bar';
};

const STEPS: OrderStatus[] = ['order_taken', 'ready', 'delivered'];

/** Maps the five stored statuses onto the three visible steps. */
function stepIndexOf(status: OrderStatus) {
  return status === 'delivered' ? 2 : status === 'ready' ? 1 : 0;
}

export function OrderProgressStepper({ status, variant = 'compact' }: OrderProgressStepperProps) {
  const { t } = useTranslation('common');
  const palette = usePalette();
  const stepIndex = stepIndexOf(status);
  const label = t(`status.order.${status}`);

  if (variant === 'bar') {
    const pct = status === 'delivered' ? 100 : status === 'ready' ? 66 : 33;
    return (
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: pct }}
        className="h-1.5 w-full overflow-hidden rounded-sm bg-line"
      >
        <View className="h-full rounded-sm bg-primary" style={{ width: `${pct}%` }} />
      </View>
    );
  }

  return (
    <View accessible accessibilityLabel={label} className="w-full">
      <View className="flex-row items-center justify-between">
        {STEPS.map((step, i) => {
          const done = i < stepIndex;
          const current = i === stepIndex;
          return (
            <View key={step} className="flex-1 flex-row items-center">
              <View
                className="items-center justify-center rounded-sm border"
                style={{
                  width: 28,
                  height: 28,
                  backgroundColor: current ? palette.primary : done ? palette.primaryLight : 'transparent',
                  borderColor: current || done ? palette.primary : palette.border,
                }}
              >
                {done ? (
                  <Icon name="check" size={16} color={palette.primary} strokeWidth={2.5} />
                ) : (
                  <Text variant="caption" tabular style={{ color: current ? palette.onPrimary : palette.textMuted }}>
                    {i + 1}
                  </Text>
                )}
              </View>
              {i < STEPS.length - 1 ? (
                <View className="mx-2 h-0.5 flex-1 rounded-sm" style={{ backgroundColor: done ? palette.primary : palette.border }} />
              ) : null}
            </View>
          );
        })}
      </View>

      {variant === 'full' ? (
        <View className="mt-2 flex-row justify-between">
          {STEPS.map((step, i) => (
            <Text key={step} variant="caption" tone={i === stepIndex ? 'primary' : i < stepIndex ? 'default' : 'muted'}>
              {t(`status.order.${step}`)}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
