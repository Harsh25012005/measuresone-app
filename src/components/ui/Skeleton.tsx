import { useEffect, useState } from 'react';
import { Animated, View, type DimensionValue } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius } from '../../theme/tokens';
import { useReducedMotion } from '../../theme/useReducedMotion';

export type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  className?: string;
  testID?: string;
};

/** Placeholder block: surface-2 fill, radius 3, gentle opacity pulse (static with reduce-motion). */
export function Skeleton({ width = '100%', height = 16, className = '', testID }: SkeletonProps) {
  const reduced = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, opacity]);

  return (
    <Animated.View
      importantForAccessibility="no"
      testID={testID}
      className={`bg-surface-2 ${className}`}
      style={{ width, height, borderRadius: radius.md, opacity }}
    />
  );
}

/** A list-row shaped skeleton (avatar, two lines, trailing amount). */
export function SkeletonRow() {
  return (
    <View className="min-h-[72px] flex-row items-center border-b border-line-2 px-4 py-3">
      <Skeleton width={40} height={40} />
      <View className="ml-3 flex-1 gap-2">
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={12} />
      </View>
      <Skeleton width={48} height={14} />
    </View>
  );
}

/** Announces "loading" once and renders `count` skeleton rows. */
export function SkeletonList({ count = 6 }: { count?: number }) {
  const { t } = useTranslation('common');
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={t('a11y.loading')}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}
