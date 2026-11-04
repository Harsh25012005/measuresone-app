import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { primary, typography } from '../../constants/tokens';
import { IconChevronDown, IconChevronLeft, IconChevronRight } from './icons';

const f = typography.family;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ───────────────────────────────── date helpers (local time, Monday-first)

const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date | null, b: Date | null) =>
  !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const before = (a: Date, b: Date) => day(a).getTime() < day(b).getTime();
const after = (a: Date, b: Date) => day(a).getTime() > day(b).getTime();

type Cell = { date: Date; inMonth: boolean };

function buildMonth(year: number, month: number): Cell[] {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // Monday = 0
  const cells: Cell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(year, month, 1 - lead + i);
    cells.push({ date, inMonth: date.getMonth() === month });
  }
  // Drop a trailing week that is entirely next month.
  return cells[35]!.inMonth ? cells : cells.slice(0, 35);
}

// ───────────────────────────────── props

export type DSDateRange = { start: Date | null; end: Date | null };

type Common = {
  minDate?: Date;
  maxDate?: Date;
  /** Days that get a small dot (e.g. deliveries due). */
  markedDates?: Date[];
  /** Month to show first. Defaults to the selected date, else today. */
  initialMonth?: Date;
};

export type DSCalendarProps =
  | (Common & { mode?: 'single'; value: Date | null; onChange: (d: Date) => void })
  | (Common & { mode: 'range'; value: DSDateRange; onChange: (r: DSDateRange) => void });

// ───────────────────────────────── small pieces

function PillSelect({ label, onPress, open }: { label: string; onPress: () => void; open: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.select,
        { borderColor: open ? primary[600] : colors.borderDefault, backgroundColor: colors.bgSurface },
      ]}
      accessibilityRole="button"
    >
      <Text style={{ fontFamily: f.medium, fontSize: 15, color: colors.textPrimary }}>{label}</Text>
      <IconChevronDown size={16} color={open ? primary[600] : colors.textMuted} />
    </Pressable>
  );
}

function ArrowButton({ dir, onPress }: { dir: 'prev' | 'next'; onPress: () => void }) {
  const { colors } = useTheme();
  const Icon = dir === 'prev' ? IconChevronLeft : IconChevronRight;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityLabel={dir === 'prev' ? 'Previous month' : 'Next month'}
      style={({ pressed }) => [styles.arrow, { backgroundColor: pressed ? colors.primaryTint : colors.bgSubtle }]}
    >
      <Icon size={18} color={colors.textPrimary} />
    </Pressable>
  );
}

function DayCell({
  cell,
  selected,
  isStart,
  isEnd,
  inRange,
  today,
  disabled,
  marked,
  colIndex,
  onPress,
}: {
  cell: Cell;
  selected: boolean;
  isStart: boolean;
  isEnd: boolean;
  inRange: boolean;
  today: boolean;
  disabled: boolean;
  marked: boolean;
  colIndex: number;
  onPress: () => void;
}) {
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  const pop = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  const band = colors.primaryTint;
  const base = dark ? '#1C1C1C' : '#F8FAFC';

  let textColor = colors.textPrimary;
  if (!cell.inMonth) textColor = dark ? '#4B4B4B' : '#9AA3B2';
  if (inRange) textColor = primary[600];
  if (selected) textColor = '#E3F3FE';
  if (disabled) textColor = dark ? '#3A3A3A' : '#CBD5E1';

  // The band behind range days runs edge-to-edge through the 3px gaps.
  const bandLeftRound = inRange && colIndex === 0;
  const bandRightRound = inRange && colIndex === 6;

  return (
    <View style={styles.cellWrap}>
      {inRange ? (
        <View
          style={[
            styles.band,
            { backgroundColor: band },
            bandLeftRound && { borderTopLeftRadius: 14, borderBottomLeftRadius: 14 },
            bandRightRound && { borderTopRightRadius: 14, borderBottomRightRadius: 14 },
          ]}
        />
      ) : null}
      {isStart && !isEnd ? <View style={[styles.band, { backgroundColor: band, left: '50%' }]} /> : null}
      {isEnd && !isStart ? <View style={[styles.band, { backgroundColor: band, right: '50%' }]} /> : null}

      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => (pop.value = withSpring(0.92, { damping: 14, stiffness: 400 }))}
        onPressOut={() => (pop.value = withSpring(1, { damping: 10, stiffness: 300 }))}
        accessibilityRole="button"
        accessibilityState={{ selected, disabled }}
        accessibilityLabel={cell.date.toDateString()}
        style={styles.cellPress}
      >
        <Animated.View
          style={[
            styles.cell,
            { backgroundColor: selected ? primary[600] : inRange ? 'transparent' : base },
            popStyle,
          ]}
        >
          <Text style={{ fontFamily: selected ? f.semibold : f.regular, fontSize: 15, color: textColor }}>
            {cell.date.getDate()}
          </Text>
          {today || marked ? (
            <View
              style={[
                styles.dot,
                { backgroundColor: selected ? '#FFFFFF' : today ? primary[600] : colors.textFaint },
              ]}
            />
          ) : null}
        </Animated.View>
      </Pressable>
    </View>
  );
}

// ───────────────────────────────── calendar

export function DSCalendar(props: DSCalendarProps) {
  const { colors, scheme } = useTheme();
  const { minDate, maxDate, markedDates = [] } = props;
  const dark = scheme === 'dark';
  const today = useMemo(() => day(new Date()), []);

  const anchor =
    props.initialMonth ??
    (props.mode === 'range' ? props.value.start ?? props.value.end : props.value) ??
    today;

  const [year, setYear] = useState(anchor.getFullYear());
  const [month, setMonth] = useState(anchor.getMonth());
  const [dir, setDir] = useState<'next' | 'prev'>('next');
  const [picker, setPicker] = useState<null | 'month' | 'year'>(null);

  const cells = useMemo(() => buildMonth(year, month), [year, month]);
  const years = useMemo(() => Array.from({ length: 11 }, (_, i) => today.getFullYear() - 5 + i), [today]);

  const go = (delta: number) => {
    setDir(delta > 0 ? 'next' : 'prev');
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const range = props.mode === 'range' ? props.value : null;
  const single = props.mode === 'range' ? null : props.value;

  const pick = (date: Date) => {
    if (props.mode === 'range') {
      const { start, end } = props.value;
      if (!start || (start && end)) props.onChange({ start: date, end: null });
      else if (before(date, start)) props.onChange({ start: date, end: null });
      else props.onChange({ start, end: date });
    } else {
      props.onChange(date);
    }
    // Tapping a greyed day from a neighbouring month jumps there.
    if (date.getMonth() !== month) {
      setDir(date > new Date(year, month, 1) ? 'next' : 'prev');
      setYear(date.getFullYear());
      setMonth(date.getMonth());
    }
  };

  const rows: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const Entering = dir === 'next' ? FadeInRight : FadeInLeft;
  const base = dark ? '#1C1C1C' : '#F8FAFC';

  return (
    <View style={{ zIndex: 1 }}>
      {/* header: ‹  Month ⌄  Year ⌄  › */}
      <View style={[styles.header, { zIndex: 20 }]}>
        <ArrowButton dir="prev" onPress={() => go(-1)} />
        <View style={styles.headerSelects}>
          <View style={{ flex: 1.4 }}>
            <PillSelect label={MONTHS[month]!} open={picker === 'month'} onPress={() => setPicker((p) => (p === 'month' ? null : 'month'))} />
          </View>
          <View style={{ flex: 1 }}>
            <PillSelect label={String(year)} open={picker === 'year'} onPress={() => setPicker((p) => (p === 'year' ? null : 'year'))} />
          </View>
        </View>
        <ArrowButton dir="next" onPress={() => go(1)} />

        {picker ? (
          <Animated.View
            entering={FadeInDown.duration(160)}
            exiting={FadeOutUp.duration(120)}
            style={[
              styles.menu,
              picker === 'month' ? { left: 44, width: '46%' } : { right: 44, width: '32%' },
              { backgroundColor: colors.bgSurface, borderColor: colors.borderDefault },
            ]}
          >
            <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
              {(picker === 'month' ? MONTHS : years).map((v, i) => {
                const val = picker === 'month' ? i : (v as number);
                const active = picker === 'month' ? month === i : year === val;
                return (
                  <Pressable
                    key={String(v)}
                    onPress={() => {
                      if (picker === 'month') setMonth(val);
                      else setYear(val);
                      setPicker(null);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      { backgroundColor: active || pressed ? colors.primaryTint : 'transparent' },
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: active ? f.semibold : f.regular,
                        fontSize: 15,
                        color: active ? primary[600] : colors.textPrimary,
                      }}
                    >
                      {String(v)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        ) : null}
      </View>

      {/* weekday pills */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <View key={w} style={[styles.weekPill, { backgroundColor: base }]}>
            <Text style={{ fontFamily: f.medium, fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase' }}>
              {w}
            </Text>
          </View>
        ))}
      </View>

      {/* grid — slides in from the side of travel when the month changes */}
      <Animated.View key={`${year}-${month}`} entering={Entering.duration(220)} style={{ gap: 3 }}>
        {rows.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((cell, c) => {
              const d = cell.date;
              const isStart = range ? sameDay(d, range.start) : false;
              const isEnd = range ? sameDay(d, range.end) : false;
              const inRange =
                !!range && !!range.start && !!range.end && after(d, range.start) && before(d, range.end);
              const selected = range ? isStart || isEnd : sameDay(d, single);
              const disabled = (!!minDate && before(d, minDate)) || (!!maxDate && after(d, maxDate));
              return (
                <DayCell
                  key={d.toISOString()}
                  cell={cell}
                  colIndex={c}
                  selected={selected}
                  isStart={isStart && !!range?.end}
                  isEnd={isEnd}
                  inRange={inRange}
                  today={sameDay(d, today)}
                  disabled={disabled}
                  marked={markedDates.some((m) => sameDay(m, d))}
                  onPress={() => pick(d)}
                />
              );
            })}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  headerSelects: { flex: 1, flexDirection: 'row', gap: 8 },
  select: {
    height: 40,
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrow: { width: 36, height: 36, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  menu: {
    position: 'absolute',
    top: 44,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 30,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  option: { paddingHorizontal: 16, paddingVertical: 11 },
  weekRow: { flexDirection: 'row', gap: 3, marginBottom: 8 },
  weekPill: { flex: 1, height: 28, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row' },
  cellWrap: { flex: 1, height: 46, justifyContent: 'center' },
  band: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 },
  cellPress: { flex: 1, padding: 1.5 },
  cell: { flex: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', bottom: 6, width: 5, height: 5, borderRadius: 9999 },
});
