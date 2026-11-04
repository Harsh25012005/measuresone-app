import { StyleSheet, Text, View } from 'react-native';
import { Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { colors as legacyColors, darkColors } from '../../constants/theme';
import { primary, radii, typography } from '../../constants/tokens';
import type { PaymentStatus } from '../../types';
import { DSBadge, useBadgeTones } from './Badge';
import { IconCalendarEvent, IconChevronRight } from './icons';

const f = typography.family;
const money = (n: number) => '₹' + n.toLocaleString('en-IN');

/** One rounded container; rows are separated by hairlines instead of being separate cards. */
function ListShell({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.shell, { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault }]}>
      {children}
    </View>
  );
}

function Row({
  index,
  last,
  onPress,
  children,
}: {
  index: number;
  last: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 45).duration(260)}>
      <Pressable
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.bgSubtle : 'transparent' }]}
      >
        {children}
      </Pressable>
      {last ? null : <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />}
    </Animated.View>
  );
}

/** Round number badge at the start of a row (client no. / order no.). */
function NumberCircle({ value, bg, fg, size = 44 }: { value: string; bg: string; fg: string; size?: number }) {
  return (
    <View style={[styles.circle, { backgroundColor: bg, width: size, height: size }]}>
      <Text style={[styles.circleText, { color: fg }]}>
        {value}
      </Text>
    </View>
  );
}

// ───────────────────────────────── Clients

export type ClientItem = { id: string; number: string; name: string; phone: string };

export function DSClientList({ items, onPressItem }: { items: ClientItem[]; onPressItem?: (c: ClientItem) => void }) {
  const { colors } = useTheme();
  return (
    <ListShell>
      {items.map((c, i) => (
        <Row key={c.id} index={i} last={i === items.length - 1} onPress={() => onPressItem?.(c)}>
          <NumberCircle value={c.number} bg={colors.primaryTint} fg={primary[600]} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {c.name}
            </Text>
            <Text style={[styles.sub, { color: colors.textMuted }]} numberOfLines={1}>
              {c.phone}
            </Text>
          </View>
          <IconChevronRight size={16} color={colors.textFaint} />
        </Row>
      ))}
    </ListShell>
  );
}

// ───────────────────────────────── Orders

export type OrderItem = {
  id: string;
  /** e.g. "O-101" */
  number: string;
  clientName: string;
  garment: string;
  pieces: number;
  total: number;
  paid: number;
  payment: PaymentStatus;
  date: string;
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = { paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid' };

export function DSOrderList({ items, onPressItem }: { items: OrderItem[]; onPressItem?: (o: OrderItem) => void }) {
  const { colors, scheme } = useTheme();
  const tones = useBadgeTones();
  const palette = scheme === 'dark' ? darkColors : legacyColors;
  return (
    <ListShell>
      {items.map((o, i) => {
        const left = Math.max(0, o.total - o.paid);
        const pay = palette.payment[o.payment];
        return (
          <Row key={o.id} index={i} last={i === items.length - 1} onPress={() => onPressItem?.(o)}>
            <NumberCircle value={o.number} bg={pay.bg} fg={pay.text} size={54} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
                {o.clientName}
              </Text>
              <View style={[styles.inline, { gap: 8 }]}>
                <Text style={[styles.subSm, { color: colors.textMuted, flexShrink: 0 }]}>
                  {o.garment} ×{o.pieces}
                </Text>
                <View style={[styles.inline, { gap: 3, flexShrink: 0 }]}>
                  <IconCalendarEvent size={12} color={colors.textMuted} />
                  <Text style={[styles.subSm, { color: colors.textMuted }]}>{o.date}</Text>
                </View>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <Text
                style={{
                  fontFamily: f.bold,
                  fontSize: 14,
                  color: left > 0 ? tones.danger.fg : colors.textMuted,
                }}
              >
                {left > 0 ? `${money(left)} left` : money(o.total)}
              </Text>
              <View style={{ alignSelf: 'flex-end' }}>
                <DSBadge size="sm" label={PAYMENT_LABEL[o.payment]} bg={pay.bg} fg={pay.text} />
              </View>
            </View>
          </Row>
        );
      })}
    </ListShell>
  );
}

const styles = StyleSheet.create({
  shell: { borderWidth: 1, borderRadius: radii.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  circle: { width: 44, height: 44, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  circleText: { fontFamily: f.semibold, fontSize: 12 },
  subSm: { fontFamily: f.regular, fontSize: 12, lineHeight: 16 },
  title: { fontFamily: f.semibold, fontSize: 15, lineHeight: 21 },
  sub: { fontFamily: f.regular, fontSize: 13, lineHeight: 18 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
