import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { DSDropdown, DSInput, DSPhoneInput, type DSInputKind } from '../components/ds/Input';
import { DSOtpInput } from '../components/ds/OtpInput';
import { IconCalendarEvent, IconBriefcase, IconClipboardPlus, IconInbox, IconPlus, IconSearchOff, IconUserPlus, IconWifiOff } from '../components/ds/icons';
import { DSToastProvider, useDSToast } from '../components/ds/Toast';
import { DSEmptyState } from '../components/ds/EmptyState';
import { DSDots, DSLoadingOverlay, DSSkeleton, DSSkeletonCard, DSSkeletonList, DSSpinner } from '../components/ds/Loading';
import { DSQuickAdd } from '../components/ds/QuickAdd';
import { DSRevenueChart } from '../components/ds/RevenueChart';
import { DSCalendar, type DSDateRange } from '../components/ds/Calendar';
import { DSBottomNav } from '../components/ds/BottomNav';
import { DSAiAssistant } from '../components/ds/AiAssistant';
import { DSTabs } from '../components/ds/Tabs';
import { DSClientList, DSOrderList } from '../components/ds/Lists';
import { DSCheckbox, DSRadio, DSRadioGroup, DSToggle } from '../components/ds/Selection';
import { DSPopup, type DSPopupTone } from '../components/ds/Popup';
import { DSBottomSheet } from '../components/ds/BottomSheet';
import { DSButton, type DSButtonSize, type DSButtonVariant } from '../components/ds/Button';
import { neutral, primary, radii, spacingScale, status, typography } from '../constants/tokens';

const f = typography.family;

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.sectionSub, { color: colors.textMuted }]}>{subtitle}</Text> : null}
      <View style={{ marginTop: 16 }}>{children}</View>
    </View>
  );
}

/** Black or white label, whichever reads better on the swatch. */
function onColor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#0A0A0A' : '#FFFFFF';
}

function Palette({ name, scale }: { name: string; scale: Record<string | number, string> }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{name}</Text>
      <View style={[styles.paletteRow, { borderColor: colors.borderDefault }]}>
        {Object.entries(scale).map(([step, hex]) => (
          <View key={step} style={[styles.swatch, { backgroundColor: hex }]}>
            <Text style={[styles.swatchStep, { color: onColor(hex) }]}>{step}</Text>
            <Text style={[styles.swatchHex, { color: onColor(hex) }]}>{hex.toUpperCase()}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const BUTTON_VARIANTS: { key: DSButtonVariant; label: string }[] = [
  { key: 'primary', label: 'Primary' },
  { key: 'black', label: 'Black' },
  { key: 'line', label: 'Line' },
  { key: 'link', label: 'Link' },
  { key: 'destructive', label: 'Destructive' },
];
const BUTTON_SIZES: DSButtonSize[] = ['sm', 'rg', 'md', 'lg'];

function ButtonsSection() {
  const { colors } = useTheme();
  const meta = [styles.typeMeta, { color: colors.textMuted, marginTop: 12, marginBottom: 8 }];
  return (
    <Section
      title="Buttons"
      subtitle="5 types x 4 sizes (sm 32, rg 40, md 48, lg 56). Press any button to feel the spring feedback."
    >
      {BUTTON_VARIANTS.map((v) => (
        <View key={v.key} style={{ marginBottom: 24 }}>
          <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{v.label}</Text>
          <View style={styles.btnWrap}>
            {BUTTON_SIZES.map((sz) => (
              <DSButton key={sz} variant={v.key} size={sz} title={`${v.label} ${sz}`} />
            ))}
          </View>
          <Text style={meta}>Left / right icon</Text>
          <View style={styles.btnWrap}>
            <DSButton variant={v.key} title="Left icon" leftIcon />
            <DSButton variant={v.key} title="Right icon" rightIcon />
            <DSButton variant={v.key} title="Both" leftIcon rightIcon />
          </View>
          <Text style={meta}>States</Text>
          <View style={styles.btnWrap}>
            <DSButton variant={v.key} title="Default" />
            <DSButton variant={v.key} title="Disabled" disabled />
            <DSButton variant={v.key} title="Loading" loading />
          </View>
        </View>
      ))}
      <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>Icon only</Text>
      <View style={styles.btnWrap}>
        {BUTTON_VARIANTS.filter((v) => v.key !== 'link').map((v) =>
          BUTTON_SIZES.map((sz) => <DSButton key={v.key + sz} variant={v.key} size={sz} icon={IconPlus} />),
        )}
      </View>
      <Text style={meta}>Full width</Text>
      <DSButton title="Get Instant Access" size="lg" fullWidth />
    </Section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={[styles.typeMeta, { color: colors.textMuted, marginBottom: 14 }]}>{label}</Text>
      <View style={{ gap: 22 }}>{children}</View>
    </View>
  );
}

const TEXT_KINDS: { kind: DSInputKind; title: string; label: string; filled: string }[] = [
  { kind: 'text', title: 'Normal', label: 'Full name', filled: 'Harsh Vaghela' },
  { kind: 'textarea', title: 'Text area (radius 16)', label: 'Notes', filled: 'Needs a slim fit, delivery by Friday.' },
  { kind: 'password', title: 'Password', label: 'Password', filled: 'secret123' },
  { kind: 'search', title: 'Search', label: 'Search clients', filled: 'Patel' },
];

const SIZE_OPTIONS = [
  { value: 'shirt', label: 'Shirt' },
  { value: 'pant', label: 'Pant' },
  { value: 'suit', label: 'Suit' },
];

function InputsSection() {
  const { colors } = useTheme();
  const [country, setCountry] = useState('IN');
  const [drop, setDrop] = useState<string | null>('shirt');
  const [phone, setPhone] = useState('9876543210');
  const [otp4, setOtp4] = useState('12');
  const noop = () => {};
  return (
    <Section title="Input fields" subtitle="Floating label on the border, fully rounded (textarea 16). Tap any field to try it.">
      {TEXT_KINDS.map((k) => (
        <View key={k.kind} style={{ marginBottom: 12 }}>
          <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{k.title}</Text>
          <Row label="Default / Focused / Filled / Error / Disabled">
            <DSInput kind={k.kind} label={k.label} value="" onChangeText={noop} />
            <DSInput kind={k.kind} label={k.label} value="" onChangeText={noop} forceFocus />
            <DSInput kind={k.kind} label={k.label} value={k.filled} onChangeText={noop} />
            <DSInput kind={k.kind} label={k.label} value={k.filled} onChangeText={noop} error="This field has an error" />
            <DSInput kind={k.kind} label={k.label} value={k.filled} onChangeText={noop} disabled />
          </Row>
        </View>
      ))}
      <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>Dropdown</Text>
      <Row label="Interactive (opens as overlay) / Error / Disabled">
        <DSDropdown label="Garment" options={SIZE_OPTIONS} value={drop} onChange={setDrop} />
        <DSDropdown label="Garment" options={SIZE_OPTIONS} value={null} onChange={noop} error="Select a garment" />
        <DSDropdown label="Garment" options={SIZE_OPTIONS} value="pant" onChange={noop} disabled />
      </Row>
      <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>Phone number with code</Text>
      <Row label="Interactive / Focused / Error / Disabled">
        <DSPhoneInput country={country} onCountryChange={setCountry} value={phone} onChangeText={setPhone} />
        <DSPhoneInput country="IN" onCountryChange={noop} value="" onChangeText={noop} forceFocus />
        <DSPhoneInput country="US" onCountryChange={noop} value="55501" onChangeText={noop} error="Enter a valid number" />
        <DSPhoneInput country="GB" onCountryChange={noop} value="7700900123" onChangeText={noop} disabled />
      </Row>
      <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>OTP</Text>
      <Row label="Interactive / Focused / Filled / Error / Disabled">
        <DSOtpInput length={4} value={otp4} onChange={setOtp4} />
        <DSOtpInput length={4} value="" onChange={noop} forceFocus />
        <DSOtpInput length={4} value="1234" onChange={noop} />
        <DSOtpInput length={4} value="1234" onChange={noop} error="Incorrect code" />
        <DSOtpInput length={4} value="12" onChange={noop} disabled />
      </Row>
    </Section>
  );
}

function BottomSheetSection() {
  const { colors } = useTheme();
  const [form, setForm] = useState(false);
  const [list, setList] = useState(false);
  const [name, setName] = useState('');
  const [pick, setPick] = useState('shirt');
  return (
    <Section title="Bottom sheet" subtitle="32px top corners, notch with drag handle, dim scrim. Drag down, tap the scrim or press close to dismiss.">
      <View style={styles.btnWrap}>
        <DSButton title="Form sheet" onPress={() => setForm(true)} />
        <DSButton title="List sheet" variant="line" onPress={() => setList(true)} />
      </View>

      <DSBottomSheet visible={form} onClose={() => setForm(false)} title="Add client" actionLabel="Save client" onAction={() => setForm(false)}>
        <View style={{ gap: 22, paddingTop: 12 }}>
          <DSInput label="Full name" value={name} onChangeText={setName} labelBg={colors.bgSurface} />
          <DSInput kind="textarea" label="Notes" value="" onChangeText={() => {}} labelBg={colors.bgSurface} />
        </View>
      </DSBottomSheet>

      <DSBottomSheet visible={list} onClose={() => setList(false)} title="Select garment" actionLabel="Confirm" onAction={() => setList(false)}>
        {SIZE_OPTIONS.map((o) => {
          const active = o.value === pick;
          return (
            <Pressable
              key={o.value}
              onPress={() => setPick(o.value)}
              style={[
                styles.listRow,
                { backgroundColor: active ? colors.primaryTint : 'transparent', borderColor: active ? primary[600] : colors.borderDefault },
              ]}
            >
              <Text style={{ fontFamily: active ? f.semibold : f.medium, fontSize: 15, color: active ? primary[600] : colors.textPrimary }}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </DSBottomSheet>
    </Section>
  );
}

const POPUPS: { tone: DSPopupTone; button: string; title: string; description: string; primary: string; secondary?: string }[] = [
  { tone: 'info', button: 'Confirm', title: 'Mark order as ready?', description: 'The client will be notified that their order is ready for pickup.', primary: 'Mark ready', secondary: 'Cancel' },
  { tone: 'success', button: 'Success', title: 'Payment recorded', description: 'Rs 2,500 was added to this order. The balance is now zero.', primary: 'Done' },
  { tone: 'warning', button: 'Warning', title: 'Unsaved changes', description: 'You have changes that are not saved yet. Leave without saving?', primary: 'Keep editing', secondary: 'Discard' },
  { tone: 'danger', button: 'Destructive', title: 'Delete this client?', description: 'This also removes their orders and measurements. This cannot be undone.', primary: 'Delete', secondary: 'Cancel' },
];

function PopupSection() {
  // Keep the last tone while the popup animates out so its text doesn't blank.
  const [tone, setTone] = useState<DSPopupTone>('info');
  const [show, setShow] = useState(false);
  const active = POPUPS.find((p) => p.tone === tone)!;
  return (
    <Section title="Popup" subtitle="Centered dialog with a tone icon, 24px radius and a spring-in animation. Tap the scrim to dismiss.">
      <View style={styles.btnWrap}>
        {POPUPS.map((p) => (
          <DSButton
            key={p.tone}
            title={p.button}
            variant={p.tone === 'danger' ? 'destructive' : p.tone === 'info' ? 'primary' : 'line'}
            onPress={() => {
              setTone(p.tone);
              setShow(true);
            }}
          />
        ))}
      </View>
      <DSPopup
        visible={show}
        onClose={() => setShow(false)}
        tone={active.tone}
        title={active.title}
        description={active.description}
        primaryLabel={active.primary}
        secondaryLabel={active.secondary}
      />
    </Section>
  );
}

function SelectionSection() {
  const { colors } = useTheme();
  const [t1, setT1] = useState(true);
  const [t2, setT2] = useState(false);
  const [c1, setC1] = useState(true);
  const [c2, setC2] = useState(false);
  const [c3, setC3] = useState(false);
  const [radio, setRadio] = useState('cash');
  const noop = () => {};
  const group = (t: string) => <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{t}</Text>;
  return (
    <Section title="Toggle, checkbox and radio" subtitle="Tap to try. All animate with a spring; selected state uses primary #2563EB.">
      {group('Toggle')}
      <View style={{ gap: 14, marginBottom: 24 }}>
        <DSToggle value={t1} onValueChange={setT1} label="Order notifications" description="Get an alert when an order is due." />
        <DSToggle value={t2} onValueChange={setT2} label="Dark mode" />
        <DSToggle value onValueChange={noop} label="Disabled on" disabled />
        <DSToggle value={false} onValueChange={noop} label="Disabled off" disabled />
      </View>
      {group('Checkbox')}
      <View style={{ gap: 14, marginBottom: 24 }}>
        <DSCheckbox value={c1} onValueChange={setC1} label="Send WhatsApp reminder" description="Client receives a message on delivery day." />
        <DSCheckbox value={c2} onValueChange={setC2} label="Unchecked" />
        <DSCheckbox value={c3} onValueChange={setC3} indeterminate label="Indeterminate (select all)" />
        <DSCheckbox value onValueChange={noop} label="Disabled checked" disabled />
        <DSCheckbox value={false} onValueChange={noop} label="Disabled unchecked" disabled />
      </View>
      {group('Radio')}
      <DSRadioGroup
        value={radio}
        onChange={setRadio}
        options={[
          { value: 'cash', label: 'Cash', description: 'Pay at the counter.' },
          { value: 'upi', label: 'UPI' },
          { value: 'card', label: 'Card' },
          { value: 'cheque', label: 'Cheque (disabled)', disabled: true },
        ]}
      />
      <View style={{ marginTop: 14 }}>
        <DSRadio selected onSelect={noop} label="Disabled selected" disabled />
      </View>
    </Section>
  );
}

function CardsSection() {
  const { colors } = useTheme();
  const label = (t: string) => <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{t}</Text>;
  return (
    <Section title="Client and order lists" subtitle="Minimal rows in one list, separated by hairlines. Press a row for feedback.">
      {label('Client list')}
      <View style={{ marginBottom: 28 }}>
        <DSClientList
          items={[
            { id: '1', number: '011', name: 'Rajesh Patel', phone: '+91 98765 43210' },
            { id: '2', number: '012', name: 'Anita Shah', phone: '+91 98250 11223' },
            { id: '3', number: '013', name: 'Mohammed Ali Khan', phone: '+91 90000 12345' },
            { id: '4', number: '014', name: 'Sunita Desai', phone: '+91 97120 55667' },
            { id: '5', number: '015', name: 'Vikram Joshi', phone: '+91 99090 88776' },
          ]}
        />
      </View>
      {label('Order list')}
      <DSOrderList
        items={[
          { id: '1', number: 'O-101', clientName: 'Rajesh Patel', garment: 'Pant', pieces: 3, total: 2700, paid: 1000, payment: 'partial', date: '12 Nov' },
          { id: '2', number: 'O-102', clientName: 'Anita Shah', garment: 'Blouse', pieces: 1, total: 900, paid: 900, payment: 'paid', date: '08 Nov' },
          { id: '3', number: 'O-103', clientName: 'Mohammed Ali Khan', garment: 'Suit', pieces: 1, total: 8500, paid: 0, payment: 'unpaid', date: '25 Nov' },
          { id: '4', number: 'O-104', clientName: 'Sunita Desai', garment: 'Kurta', pieces: 2, total: 2400, paid: 2400, payment: 'paid', date: '14 Nov' },
          { id: '5', number: 'O-105', clientName: 'Vikram Joshi', garment: 'Shirt', pieces: 4, total: 3200, paid: 1200, payment: 'partial', date: '16 Nov' },
        ]}
      />
    </Section>
  );
}

function TabsSection() {
  const { colors } = useTheme();
  const [pill, setPill] = useState('orders');
  const [line, setLine] = useState('all');
  const [chip, setChip] = useState('all');
  const label = (t: string) => <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{t}</Text>;
  const hint: Record<string, string> = {
    orders: 'Showing orders',
    clients: 'Showing clients',
    bills: 'Showing bills',
  };
  return (
    <Section title="Tabs" subtitle="Three styles. The indicator slides between tabs with a spring.">
      {label('Pill (segmented)')}
      <DSTabs
        variant="pill"
        value={pill}
        onChange={setPill}
        items={[
          { key: 'orders', label: 'Orders' },
          { key: 'clients', label: 'Clients' },
          { key: 'bills', label: 'Bills' },
        ]}
      />
      <Text style={{ fontFamily: typography.family.regular, fontSize: 13, color: colors.textMuted, marginTop: 12, marginBottom: 28 }}>
        {hint[pill]}
      </Text>

      {label('Underline (with counts)')}
      <View style={{ marginBottom: 28 }}>
        <DSTabs
          variant="underline"
          value={line}
          onChange={setLine}
          items={[
            { key: 'all', label: 'All', count: 24 },
            { key: 'pending', label: 'Pending', count: 8 },
            { key: 'ready', label: 'Ready', count: 5 },
            { key: 'delivered', label: 'Delivered', count: 11 },
          ]}
        />
      </View>

      {label('Chips (scrollable filters)')}
      <DSTabs
        variant="chip"
        value={chip}
        onChange={setChip}
        items={[
          { key: 'all', label: 'All' },
          { key: 'urgent', label: 'Urgent', count: 3 },
          { key: 'today', label: 'Due today', count: 2 },
          { key: 'unpaid', label: 'Unpaid' },
          { key: 'week', label: 'This week' },
        ]}
      />
    </Section>
  );
}

function AiSection() {
  const { colors } = useTheme();
  const [last, setLast] = useState<string | null>(null);
  return (
    <Section title="AI assistant" subtitle="Dark assistant card with an animated orb. Type and press send.">
      <DSAiAssistant onSend={setLast} />
      <Text style={{ fontFamily: typography.family.regular, fontSize: 13, color: colors.textMuted, marginTop: 10 }}>
        {last ? `Sent: "${last}"` : 'Nothing sent yet.'}
      </Text>
    </Section>
  );
}

function NavSection() {
  const { colors, scheme } = useTheme();
  const [tab, setTab] = useState('home');
  const [adds, setAdds] = useState(0);
  return (
    <Section title="Bottom nav bar" subtitle="Floating pill with a sliding active tab, plus a round quick-add button.">
      {/* Colourful backdrop so the glass blur is visible */}
      <View style={{ borderRadius: 28, overflow: 'hidden', padding: 14, paddingTop: 46, backgroundColor: scheme === 'dark' ? '#0A0A0A' : '#EEF2FF' }}>
        <View style={[styles.blob, { backgroundColor: '#2563EB', left: -20, top: -30 }]} />
        <View style={[styles.blob, { backgroundColor: '#EC4899', left: 150, top: -10, width: 90, height: 90 }]} />
        <View style={[styles.blob, { backgroundColor: '#F59E0B', right: -20, top: 10, width: 70, height: 70 }]} />
        <Text style={{ position: 'absolute', top: 14, left: 18, fontFamily: typography.family.bold, fontSize: 15, color: colors.textPrimary }}>
          Content scrolls under the bar
        </Text>
        <DSBottomNav value={tab} onChange={setTab} onFabPress={() => setAdds((n) => n + 1)} />
      </View>
      <Text style={{ fontFamily: typography.family.regular, fontSize: 13, color: colors.textMuted, marginTop: 12 }}>
        Tab: {tab} · Quick add pressed {adds}x
      </Text>
    </Section>
  );
}

const fmt = (d: Date | null) =>
  d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function CalendarSection() {
  const { colors } = useTheme();
  const today = new Date();
  const [single, setSingle] = useState<Date | null>(new Date(today.getFullYear(), today.getMonth(), 12));
  const [range, setRange] = useState<DSDateRange>({
    start: new Date(today.getFullYear(), today.getMonth(), 12),
    end: new Date(today.getFullYear(), today.getMonth(), 20),
  });
  const [sheet, setSheet] = useState(false);
  const [picked, setPicked] = useState<Date | null>(null);
  const [draft, setDraft] = useState<Date | null>(null);
  const label = (t: string) => <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{t}</Text>;
  const note = (t: string) => (
    <Text style={{ fontFamily: typography.family.regular, fontSize: 13, color: colors.textMuted, marginTop: 10 }}>{t}</Text>
  );
  const marks = [3, 8, 15, 27].map((d) => new Date(today.getFullYear(), today.getMonth(), d));
  return (
    <Section title="Calendar" subtitle="Month and year pickers, Monday-first grid, today dot, marked days and range selection.">
      {label('Single date (dots = deliveries due)')}
      <DSCalendar value={single} onChange={setSingle} markedDates={marks} />
      {note(`Selected: ${fmt(single)}`)}

      <View style={{ height: 28 }} />
      {label('Date range')}
      <DSCalendar mode="range" value={range} onChange={setRange} />
      {note(`${fmt(range.start)} → ${fmt(range.end)}`)}

      <View style={{ height: 28 }} />
      {label('In a bottom sheet')}
      <DSButton
        title={picked ? fmt(picked) : 'Select a date'}
        variant="line"
        leftIcon={IconCalendarEvent}
        onPress={() => {
          setDraft(picked);
          setSheet(true);
        }}
      />
      <DSBottomSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        title="Select a date"
        actionLabel="Confirm"
        onAction={() => {
          setPicked(draft);
          setSheet(false);
        }}
      >
        <View style={{ paddingTop: 8, paddingBottom: 4 }}>
          <DSCalendar value={draft} onChange={setDraft} />
        </View>
      </DSBottomSheet>
    </Section>
  );
}

function ToastSection() {
  const toast = useDSToast();
  return (
    <Section title="Toast" subtitle="A short one-line message in a rounded pill. Slides in from the top, stacks up to three and dismisses itself. Tap to dismiss.">
      <View style={styles.btnWrap}>
        <DSButton title="Success" variant="line" onPress={() => toast.success('Order saved')} />
        <DSButton title="Error" variant="destructive" onPress={() => toast.error('Could not save. Try again')} />
        <DSButton title="Warning" variant="line" onPress={() => toast.warning('Delivery is tomorrow')} />
        <DSButton title="Info" variant="line" onPress={() => toast.info('Synced just now')} />
        <DSButton
          title="With action"
          variant="black"
          onPress={() => toast.show({ title: 'Client deleted', tone: 'info', duration: 6000, actionLabel: 'Undo', onAction: () => toast.success('Restored') })}
        />
      </View>
    </Section>
  );
}

function FeedbackSection() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const label = (t: string) => <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{t}</Text>;
  return (
    <Section title="Empty states and loading" subtitle="Simple empty screens, shimmer skeletons that mirror the lists, and loaders.">
      {label('Empty state (full)')}
      <View style={{ marginBottom: 24 }}>
        <DSEmptyState icon={IconClipboardPlus} title="No orders yet" description="Create your first order and it will show up here." actionLabel="New order" secondaryLabel="Learn how orders work" />
      </View>
      {label('Empty state (compact)')}
      <View style={{ gap: 12, marginBottom: 28 }}>
        <DSEmptyState variant="compact" icon={IconSearchOff} title="No results" description="Try a different name or phone number." />
        <DSEmptyState variant="compact" icon={IconWifiOff} title="You are offline" description="Changes are saved and will sync when you reconnect." actionLabel="Retry" />
      </View>

      {label('Skeleton')}
      <View style={{ gap: 12, marginBottom: 28 }}>
        <DSSkeletonList rows={3} />
        <DSSkeletonCard />
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <DSSkeleton width={40} height={40} />
          <View style={{ flex: 1, gap: 8 }}>
            <DSSkeleton width="70%" height={12} />
            <DSSkeleton width="45%" height={10} />
          </View>
        </View>
      </View>

      {label('Loader')}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 28, marginBottom: 16 }}>
        <DSSpinner size="sm" />
        <DSSpinner size="md" />
        <DSSpinner size="lg" />
        <DSDots />
      </View>
      <View style={{ height: 150, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderDefault, marginBottom: 12 }}>
        {loading ? <DSLoadingOverlay label="Loading orders…" /> : <DSEmptyState variant="compact" icon={IconInbox} title="Tap to preview the overlay" />}
      </View>
      <DSButton
        title={loading ? 'Loading…' : 'Show loading overlay'}
        variant="line"
        size="rg"
        disabled={loading}
        onPress={() => {
          setLoading(true);
          setTimeout(() => setLoading(false), 2200);
        }}
      />
    </Section>
  );
}

function QuickAddSection() {
  const toast = useDSToast();
  const [open, setOpen] = useState(false);
  return (
    <Section title="Quick-add menu" subtitle="Opens from the nav bar's plus button. The screen blurs and the actions fan up.">
      <DSButton title="Open quick-add" leftIcon onPress={() => setOpen(true)} />
      <DSQuickAdd
        visible={open}
        onClose={() => setOpen(false)}
        actions={[
          { key: 'order', label: 'New order', description: 'Cloth, measurements, delivery', icon: IconClipboardPlus, tone: 'primary', onPress: () => toast.info('New order') },
          { key: 'client', label: 'New client', description: 'Name and phone number', icon: IconUserPlus, tone: 'success', onPress: () => toast.info('New client') },
          { key: 'work', label: 'Add work', description: 'Assign work to staff', icon: IconBriefcase, tone: 'warning', onPress: () => toast.info('Add work') },
        ]}
      />
    </Section>
  );
}

const WEEK = [
  { label: 'Mon', value: 4200 },
  { label: 'Tue', value: 6800 },
  { label: 'Wed', value: 3100 },
  { label: 'Thu', value: 9400 },
  { label: 'Fri', value: 7600 },
  { label: 'Sat', value: 12800 },
  { label: 'Sun', value: 5200 },
];
const YEAR_VALUES = [42000, 51000, 38000, 66000, 72000, 59000, 81000, 77000, 90000, 98000, 64000];
const YEAR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'].map((label, i) => ({
  label,
  value: YEAR_VALUES[i]!,
}));

function ChartSection() {
  const [period, setPeriod] = useState<'week' | 'year'>('week');
  const [variant, setVariant] = useState<'bar' | 'line'>('bar');
  const data = period === 'week' ? WEEK : YEAR;
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <Section title="Revenue chart" subtitle="Bars or smooth line. Tap a point to see its value.">
      <View style={{ gap: 12 }}>
        <DSTabs
          variant="pill"
          value={period}
          onChange={(k) => setPeriod(k as 'week' | 'year')}
          items={[
            { key: 'week', label: 'This week' },
            { key: 'year', label: 'This year' },
          ]}
        />
        <DSRevenueChart
          data={data}
          variant={variant}
          total={total}
          deltaPct={period === 'week' ? 12.4 : -3.2}
          subtitle={period === 'week' ? 'vs last week' : 'vs last year'}
        />
        <DSTabs
          variant="chip"
          value={variant}
          onChange={(k) => setVariant(k as 'bar' | 'line')}
          items={[
            { key: 'bar', label: 'Bar chart' },
            { key: 'line', label: 'Line chart' },
          ]}
        />
      </View>
    </Section>
  );
}

function DesignSystemContent() {
  const { colors, scheme, setMode } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPage }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48, paddingHorizontal: 20 }}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Design System</Text>
            <Text style={[styles.sectionSub, { color: colors.textMuted }]}>MeasuresOne · Foundations</Text>
          </View>
          <Pressable
            onPress={() => setMode(scheme === 'dark' ? 'light' : 'dark')}
            style={[styles.themeToggle, { borderColor: colors.borderDefault, backgroundColor: colors.bgSurface }]}
          >
            <Text style={[styles.themeToggleText, { color: colors.textPrimary }]}>
              {scheme === 'dark' ? 'Dark' : 'Light'}
            </Text>
          </Pressable>
        </View>

        <Section title="Colors" subtitle="Primary #2563EB is identical in light and dark.">
          <Palette name="Primary" scale={primary} />
          <Palette name="Neutral" scale={neutral} />
          <Palette name="Success" scale={status.success} />
          <Palette name="Warning" scale={status.warning} />
          <Palette name="Danger" scale={status.danger} />
          <Palette name="Info" scale={status.info} />
        </Section>

        <ButtonsSection />

        <InputsSection />

        <BottomSheetSection />

        <PopupSection />

        <SelectionSection />

        <CardsSection />

        <TabsSection />

        <CalendarSection />

        <ToastSection />

        <FeedbackSection />

        <QuickAddSection />

        <ChartSection />

        <AiSection />

        <NavSection />

        <Section title="Typography" subtitle="Plus Jakarta Sans">
          {Object.entries(typography.scale).map(([name, s]) => (
            <View key={name} style={[styles.typeRow, { borderColor: colors.borderSubtle }]}>
              <Text style={[styles.typeMeta, { color: colors.textMuted }]}>
                {name} · {s.size}/{s.line}
              </Text>
              <Text
                style={{ fontFamily: f[s.weight], fontSize: s.size, lineHeight: s.line, color: colors.textPrimary }}
              >
                Tailoring made simple
              </Text>
            </View>
          ))}
        </Section>

        <Section title="Radius" subtitle="Fully rounded. Textareas use 16px.">
          <View style={styles.radiusRow}>
            {[
              ['full', radii.full],
              ['card 24', radii.card],
              ['textarea 16', radii.textarea],
              ['sheet 32', radii.sheet],
            ].map(([label, r]) => (
              <View key={label as string} style={{ alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 72,
                    height: 44,
                    borderRadius: r as number,
                    borderWidth: 1,
                    borderColor: primary[600],
                    backgroundColor: colors.primaryTint,
                  }}
                />
                <Text style={[styles.typeMeta, { color: colors.textMuted }]}>{label as string}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Spacing">
          {spacingScale.map((s) => (
            <View key={s} style={styles.spaceRow}>
              <Text style={[styles.typeMeta, { color: colors.textMuted, width: 36 }]}>{s}</Text>
              <View style={{ height: 12, width: s * 4, borderRadius: 9999, backgroundColor: primary[600] }} />
            </View>
          ))}
        </Section>
      </ScrollView>
    </View>
  );
}

export default function DesignSystemScreen() {
  return (
    <DSToastProvider>
      <DesignSystemContent />
    </DSToastProvider>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  title: { fontFamily: f.bold, fontSize: 28, lineHeight: 36 },
  themeToggle: { borderWidth: 1, borderRadius: 9999, paddingHorizontal: 16, height: 40, justifyContent: 'center' },
  themeToggleText: { fontFamily: f.semibold, fontSize: 13 },
  section: { marginBottom: 36 },
  sectionTitle: { fontFamily: f.bold, fontSize: 20, lineHeight: 28 },
  sectionSub: { fontFamily: f.regular, fontSize: 13, lineHeight: 18, marginTop: 2 },
  groupLabel: { fontFamily: f.semibold, fontSize: 13, marginBottom: 8 },
  paletteRow: { borderRadius: 24, overflow: 'hidden', borderWidth: 1 },
  swatch: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  swatchStep: { fontFamily: f.semibold, fontSize: 12 },
  swatchHex: { fontFamily: f.medium, fontSize: 12 },
  typeRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 4 },
  typeMeta: { fontFamily: f.medium, fontSize: 11 },
  blob: { position: 'absolute', width: 110, height: 110, borderRadius: 9999, opacity: 0.9 },
  btnWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  listRow: { height: 48, borderRadius: 9999, borderWidth: 1, paddingHorizontal: 20, justifyContent: 'center', marginBottom: 10 },
  radiusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  spaceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
});
