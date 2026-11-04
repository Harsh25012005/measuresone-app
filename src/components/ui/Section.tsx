import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from './Text';

export type SectionProps = {
  title?: string;
  /** Right-aligned element in the title row (a small button or a count). */
  action?: ReactNode;
  children: ReactNode;
  /** Adds 16dp padding. Leave off when the children are ListRows. */
  padded?: boolean;
  className?: string;
  testID?: string;
};

/** Titled block: a muted label above a surface with a 1px border (radius 4). */
export function Section({ title, action, children, padded = true, className = '', testID }: SectionProps) {
  return (
    <View className={className} testID={testID}>
      {title || action ? (
        <View className="mb-2 min-h-[32px] flex-row items-center justify-between">
          {title ? (
            <Text variant="label" tone="muted" accessibilityRole="header">
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action}
        </View>
      ) : null}
      <View className={`overflow-hidden rounded border border-line bg-surface ${padded ? 'p-4' : ''}`}>{children}</View>
    </View>
  );
}
