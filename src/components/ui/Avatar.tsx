import { Image, View } from 'react-native';
import { radius } from '../../theme/tokens';
import { Text } from './Text';

export type AvatarSize = 'sm' | 'md' | 'lg';

const SIZES: Record<AvatarSize, number> = { sm: 32, md: 40, lg: 56 };

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return Array.from(parts[0]).slice(0, 2).join('').toUpperCase();
  return (Array.from(parts[0])[0] + Array.from(parts[parts.length - 1])[0]).toUpperCase();
}

export type AvatarProps = {
  name?: string | null;
  uri?: string | null;
  size?: AvatarSize;
};

/** Initials on a primary tint, radius 3. Decorative: the name is always shown next to it. */
export function Avatar({ name, uri, size = 'md' }: AvatarProps) {
  const dimension = SIZES[size];

  if (uri) {
    return (
      <Image
        source={{ uri }}
        accessibilityIgnoresInvertColors
        style={{ width: dimension, height: dimension, borderRadius: radius.md }}
      />
    );
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="items-center justify-center bg-primary-50"
      style={{ width: dimension, height: dimension, borderRadius: radius.md }}
    >
      <Text weight="bold" tone="primary" style={{ fontSize: Math.round(dimension * 0.36), lineHeight: Math.round(dimension * 0.5) }}>
        {getInitials(name ?? '')}
      </Text>
    </View>
  );
}
