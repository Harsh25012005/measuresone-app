import { StyleSheet, Text, View } from 'react-native';
import { typography } from '../../constants/tokens';

const f = typography.family;
const TONES = ['#2563EB', '#7C3AED', '#0891B2', '#D97706', '#DB2777', '#16A34A'];

const SIZES = { sm: 32, md: 44, lg: 56, xl: 80 } as const;

export function avatarTone(name: string) {
  return TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length]!;
}

export function initials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?'
  );
}

/** Round initials avatar; the colour is picked from the name so it stays stable. */
export function DSAvatar({ name, size = 'md' }: { name: string; size?: keyof typeof SIZES }) {
  const px = SIZES[size];
  return (
    <View style={[styles.circle, { width: px, height: px, backgroundColor: avatarTone(name) }]}>
      <Text style={{ fontFamily: f.bold, fontSize: px * 0.36, color: '#FFFFFF' }}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
});
