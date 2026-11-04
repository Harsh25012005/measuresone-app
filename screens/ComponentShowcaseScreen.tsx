import { useRef, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import {
  Avatar,
  Badge,
  BottomSheet,
  Button,
  Card,
  CenterModal,
  Checkbox,
  Chip,
  DatePickerField,
  Dropdown,
  EmptyState,
  FilterNotice,
  Header,
  IconButton,
  Icon,
  InputField,
  ListRow,
  LoadingSpinner,
  NumberStepper,
  RadioGroup,
  SegmentedControl,
  Skeleton,
  SkeletonList,
  SwipeRow,
  SyncChip,
  Text,
  ToastProvider,
  Toggle,
  useToast,
} from '../components/ui';
import { useTheme } from '../context/ThemeContext';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6 rounded border border-line bg-surface p-4">
      <Text variant="bodyLg" className="mb-3 border-b border-line-2 pb-2">
        {title}
      </Text>
      <View className="gap-3">{children}</View>
    </View>
  );
}

function Swatch({ cls, name }: { cls: string; name: string }) {
  return (
    <View className="mr-2 mb-2 items-center">
      <View className={`h-10 w-14 rounded-sm border border-line ${cls}`} />
      <Text variant="caption" tone="muted" weight="regular">
        {name}
      </Text>
    </View>
  );
}

function ShowcaseBody() {
  const showToast = useToast();
  const { scheme, setMode } = useTheme();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('98');
  const [pass, setPass] = useState('password123');
  const [checked, setChecked] = useState(true);
  const [toggle, setToggle] = useState(true);
  const [pay, setPay] = useState<'upi' | 'cash' | 'card'>('upi');
  const [seg, setSeg] = useState<'active' | 'late' | 'ready'>('active');
  const [garment, setGarment] = useState<string>('shirt');
  const [date, setDate] = useState<Date | null>(new Date());
  const [chest, setChest] = useState<number | null>(38);
  const [qty, setQty] = useState<number | null>(2);
  const [chipOn, setChipOn] = useState(true);
  const [sheet, setSheet] = useState(false);
  const [dialog, setDialog] = useState(false);
  const waist = useRef<TextInput>(null);

  return (
    <View className="flex-1 bg-bg">
      <Header
        title="Component showcase"
        showBack
        right={
          <IconButton
            icon={scheme === 'dark' ? 'sun' : 'moon'}
            accessibilityLabel="Toggle theme"
            variant="ghost"
            onPress={() => setMode(scheme === 'dark' ? 'light' : 'dark')}
          />
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 224 }} keyboardShouldPersistTaps="handled">
        <Section title="Colour">
          <View className="flex-row flex-wrap">
            <Swatch cls="bg-primary" name="primary" />
            <Swatch cls="bg-primary-50" name="tint" />
            <Swatch cls="bg-bg" name="bg" />
            <Swatch cls="bg-surface" name="surface" />
            <Swatch cls="bg-surface-2" name="surface-2" />
            <Swatch cls="bg-success" name="success" />
            <Swatch cls="bg-accent" name="warning" />
            <Swatch cls="bg-danger" name="danger" />
          </View>
        </Section>

        <Section title="Type scale">
          <Text variant="display">Display ₹12,450</Text>
          <Text variant="headline">Headline 24</Text>
          <Text variant="title">Title 20</Text>
          <Text variant="bodyLg">Body large 18</Text>
          <Text variant="body">Body 16: the quick brown fox</Text>
          <Text variant="label" tone="muted">Label 14 muted</Text>
          <Text variant="caption" tone="faint">Caption 12 faint</Text>
          <Text variant="body">ગુજરાતી ટેક્સ્ટ: ઓર્ડર તૈયાર છે</Text>
          <Text variant="body">हिन्दी पाठ: ऑर्डर तैयार है</Text>
        </Section>

        <Section title="Buttons">
          <Button title="Primary" onPress={() => showToast('Saved', 'success')} />
          <Button title="Secondary" variant="secondary" onPress={() => {}} />
          <Button title="Tonal" variant="tonal" onPress={() => {}} />
          <Button title="Outline" variant="outline" onPress={() => {}} />
          <Button title="Ghost" variant="ghost" onPress={() => {}} />
          <Button title="Danger" variant="danger" onPress={() => {}} />
          <Button title="Loading" loading onPress={() => {}} />
          <Button title="Disabled" disabled onPress={() => {}} />
          <Button title="Small" size="sm" fullWidth={false} onPress={() => {}} />
          <Button title="Large" size="lg" onPress={() => {}} />
          <View className="flex-row gap-2">
            <IconButton icon="phone" accessibilityLabel="Call" onPress={() => {}} />
            <IconButton icon="chat" accessibilityLabel="WhatsApp" variant="tonal" onPress={() => {}} />
            <IconButton icon="sliders" accessibilityLabel="Filter" selected onPress={() => {}} />
            <IconButton icon="trash" accessibilityLabel="Delete" disabled onPress={() => {}} />
          </View>
        </Section>

        <Section title="Badges, chips, sync">
          <View className="flex-row flex-wrap gap-2">
            <Badge type="order_status" value="order_taken" />
            <Badge type="order_status" value="stitching" />
            <Badge type="order_status" value="ready" />
            <Badge type="order_status" value="delivered" />
            <Badge label="2 days late" tone="danger" icon="alert" />
            <Badge label="Due today" tone="warning" icon="clock" />
            <Badge type="payment_status" value="paid" />
            <Badge type="payment_status" value="partial" />
            <Badge type="payment_status" value="unpaid" />
          </View>
          <View className="flex-row flex-wrap gap-2">
            <Chip label="Late" count={3} selected={chipOn} onPress={() => setChipOn((v) => !v)} />
            <Chip label="Due today" count={5} onPress={() => {}} />
            <Chip label="Disabled" disabled />
          </View>
          <View className="flex-row flex-wrap gap-2">
            <SyncChip status="synced" />
            <SyncChip status="syncing" pending={2} />
            <SyncChip status="offline" pending={4} />
            <SyncChip status="error" pending={1} />
          </View>
          <SegmentedControl
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Late', value: 'late', count: 3 },
              { label: 'Ready', value: 'ready' },
            ]}
            value={seg}
            onChange={setSeg}
          />
        </Section>

        <Section title="Inputs">
          <InputField label="Customer name" value={name} onChangeText={setName} placeholder="e.g. Ramesh Patel" required returnKeyType="next" onSubmitEditing={() => waist.current?.focus()} />
          <InputField label="Phone" value={phone} onChangeText={setPhone} prefix="+91" keyboardType="phone-pad" error="Enter a 10 digit number" />
          <InputField label="Password" value={pass} onChangeText={setPass} secureTextEntry leftIcon="lock" helperText="At least 8 characters" />
          <InputField label="Notes" value="" onChangeText={() => {}} multiline optional placeholder="Optional notes" />
          <InputField label="Disabled" value="Locked" onChangeText={() => {}} editable={false} />
          <NumberStepper label="Quantity" value={qty} onChange={setQty} min={1} max={50} />
          <NumberStepper label="Chest" value={chest} onChange={setChest} step={0.5} unit="in" previousValue={37.5} returnKeyType="next" />
          <Dropdown
            label="Garment"
            value={garment}
            onChange={setGarment}
            searchable
            options={[
              { label: 'Shirt', value: 'shirt', subtext: 'Last used' },
              { label: 'Pant', value: 'pant' },
              { label: 'Kurta', value: 'kurta' },
            ]}
            onAddNew={() => {}}
          />
          <DatePickerField label="Delivery date" value={date} onChange={setDate} quickChips={[{ label: '+3 days', daysFromNow: 3 }, { label: '+7 days', daysFromNow: 7 }, { label: '+10 days', daysFromNow: 10 }]} />
        </Section>

        <Section title="Selection">
          <Checkbox label="Rush order" checked={checked} onChange={setChecked} />
          <Toggle label="WhatsApp reminders" description="Send when an order is ready" value={toggle} onChange={setToggle} />
          <RadioGroup value={pay} onChange={setPay} options={[{ label: 'UPI', value: 'upi' }, { label: 'Cash', value: 'cash' }, { label: 'Card', value: 'card' }]} />
          <RadioGroup variant="cards" value={pay} onChange={setPay} options={[{ label: 'UPI', value: 'upi', subtext: 'Instant' }, { label: 'Cash', value: 'cash' }]} />
        </Section>

        <Section title="Rows and cards">
          <Card>
            <Text variant="bodyLg">Plain card</Text>
            <Text variant="label" tone="muted" weight="regular">Surface, 1px border, radius 4</Text>
          </Card>
          <Card variant="selected" onPress={() => {}}>
            <Text variant="bodyLg" tone="primary">Selected pressable card</Text>
          </Card>
          <View className="overflow-hidden rounded border border-line">
            <SwipeRow
              commitAction={{ key: 'ready', label: 'Ready', icon: 'circleCheck', onPress: () => showToast('Marked ready', { type: 'success', undoAction: () => {} }) }}
              revealActions={[
                { key: 'call', label: 'Call', icon: 'phone', onPress: () => {} },
                { key: 'wa', label: 'WhatsApp', icon: 'chat', onPress: () => {} },
              ]}
            >
              <ListRow
                title="Ramesh Patel"
                subtitle="#1042 · Shirt × 2"
                meta={<Badge label="2 days late" tone="danger" icon="alert" size="sm" />}
                leading={<Avatar name="Ramesh Patel" />}
                trailing={<Text variant="bodyLg" tone="danger" tabular>₹850</Text>}
                onPress={() => {}}
              />
            </SwipeRow>
            <ListRow title="Sunita Shah" subtitle="#1041 · Kurta × 1" leading={<Avatar name="Sunita Shah" />} onPress={() => {}} divider={false} />
          </View>
          <FilterNotice visible label="Showing late orders only" onClear={() => {}} />
        </Section>

        <Section title="Feedback">
          <Button title="Toast with Undo" variant="secondary" onPress={() => showToast('Order marked ready', { type: 'success', undoAction: () => showToast('Undone', 'info') })} />
          <Button title="Error toast" variant="secondary" onPress={() => showToast('Could not save', 'error')} />
          <Button title="Open bottom sheet" variant="secondary" onPress={() => setSheet(true)} />
          <Button title="Open dialog" variant="secondary" onPress={() => setDialog(true)} />
          <LoadingSpinner text="Loading…" />
          <Skeleton height={20} width="60%" />
          <SkeletonList count={2} />
          <EmptyState variant="compact" icon="orders" title="No orders yet" description="Create your first order to see it here." actionLabel="New order" onAction={() => {}} />
          <View className="flex-row items-center">
            <Icon name="ruler" size={20} />
            <Text variant="label" tone="muted" className="ml-2">Tabler icon, stroke 2</Text>
          </View>
        </Section>
      </ScrollView>

      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="Filter orders" footer={<Button title="Apply" onPress={() => setSheet(false)} />}>
        <RadioGroup variant="cards" value={pay} onChange={setPay} options={[{ label: 'Due date', value: 'upi' }, { label: 'Newest', value: 'cash' }]} />
      </BottomSheet>

      <CenterModal
        visible={dialog}
        onClose={() => setDialog(false)}
        title="Delete order?"
        footer={
          <View className="gap-2">
            <Button title="Delete" variant="danger" onPress={() => setDialog(false)} />
            <Button title="Cancel" variant="secondary" onPress={() => setDialog(false)} />
          </View>
        }
      >
        <Text variant="body" tone="muted">This cannot be undone.</Text>
      </CenterModal>
    </View>
  );
}

export default function ComponentShowcaseScreen() {
  return (
    <ToastProvider>
      <ShowcaseBody />
    </ToastProvider>
  );
}
