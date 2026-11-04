import { fireEvent, render, screen } from '@testing-library/react-native';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Checkbox } from '../../src/components/ui/Checkbox';
import { Chip } from '../../src/components/ui/Chip';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { IconButton } from '../../src/components/ui/IconButton';
import { InputField } from '../../src/components/ui/InputField';
import { ListRow } from '../../src/components/ui/ListRow';
import { NumberStepper } from '../../src/components/ui/NumberStepper';
import { RadioGroup } from '../../src/components/ui/RadioGroup';
import { Skeleton } from '../../src/components/ui/Skeleton';
import { SwipeRow } from '../../src/components/ui/SwipeRow';
import { SyncChip } from '../../src/components/ui/SyncChip';
import { Text } from '../../src/components/ui/Text';
import { Toggle } from '../../src/components/ui/Toggle';

describe('Button', () => {
  it('fires onPress and exposes a button role with its title', () => {
    const onPress = jest.fn();
    render(<Button title="Save" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled and reports the disabled state', () => {
    const onPress = jest.fn();
    render(<Button title="Save" onPress={onPress} disabled />);
    const btn = screen.getByRole('button', { name: 'Save' });
    fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
    expect(btn).toBeDisabled();
  });

  it('is busy and ignores presses while loading, keeping the label in layout', () => {
    const onPress = jest.fn();
    render(<Button title="Save" onPress={onPress} loading />);
    const btn = screen.getByRole('button', { name: 'Save' });
    fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
    expect(btn).toBeBusy();
    expect(screen.getByText('Save')).toBeTruthy();
  });
});

describe('IconButton', () => {
  it('uses the required accessibility label and reports selection', () => {
    const onPress = jest.fn();
    render(<IconButton icon="search" accessibilityLabel="Search" onPress={onPress} selected />);
    const btn = screen.getByRole('button', { name: 'Search' });
    expect(btn).toBeSelected();
    fireEvent.press(btn);
    expect(onPress).toHaveBeenCalled();
  });
});

describe('Chip', () => {
  it('shows selected state and count in its accessible name', () => {
    render(<Chip label="Late" count={3} selected onPress={() => {}} />);
    const chip = screen.getByRole('button', { name: 'Late, 3' });
    expect(chip).toBeSelected();
  });
});

describe('Badge', () => {
  it('renders translated order and payment status text', () => {
    render(
      <>
        <Badge type="order_status" value="ready" />
        <Badge type="payment_status" value="unpaid" />
      </>,
    );
    expect(screen.getByLabelText('Ready')).toBeTruthy();
    expect(screen.getByLabelText('Unpaid')).toBeTruthy();
  });

  it('renders a tone badge with its label', () => {
    render(<Badge label="2 days late" tone="danger" icon="alert" />);
    expect(screen.getByText('2 days late')).toBeTruthy();
  });
});

describe('InputField', () => {
  it('shows the label, forwards typing and shows the error with an accessible hint', () => {
    const onChangeText = jest.fn();
    render(<InputField label="Phone" value="" onChangeText={onChangeText} error="Enter 10 digits" keyboardType="phone-pad" />);
    const input = screen.getByLabelText('Phone');
    fireEvent.changeText(input, '98');
    expect(onChangeText).toHaveBeenCalledWith('98');
    expect(screen.getByText('Enter 10 digits')).toBeTruthy();
    expect(input.props.accessibilityHint).toBe('Enter 10 digits');
    expect(input.props.keyboardType).toBe('phone-pad');
  });

  it('toggles password visibility with a labelled button', () => {
    render(<InputField label="Password" value="secret" onChangeText={() => {}} secureTextEntry />);
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
    fireEvent.press(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
  });

  it('supports enter-to-next via returnKeyType and onSubmitEditing', () => {
    const onSubmit = jest.fn();
    render(<InputField label="Chest" value="" onChangeText={() => {}} returnKeyType="next" onSubmitEditing={onSubmit} />);
    fireEvent(screen.getByLabelText('Chest'), 'submitEditing');
    expect(onSubmit).toHaveBeenCalled();
    expect(screen.getByLabelText('Chest').props.returnKeyType).toBe('next');
  });

  it('is not editable when disabled', () => {
    render(<InputField label="Name" value="A" onChangeText={() => {}} editable={false} />);
    expect(screen.getByLabelText('Name').props.editable).toBe(false);
  });
});

describe('Checkbox, Toggle, Radio', () => {
  it('Checkbox toggles and exposes checked state', () => {
    const onChange = jest.fn();
    render(<Checkbox label="Rush order" checked={false} onChange={onChange} />);
    const box = screen.getByRole('checkbox', { name: 'Rush order' });
    expect(box).not.toBeChecked();
    fireEvent.press(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('Toggle is a switch with checked state and does nothing when disabled', () => {
    const onChange = jest.fn();
    const { rerender } = render(<Toggle label="Reminders" value onChange={onChange} />);
    const sw = screen.getByRole('switch', { name: 'Reminders' });
    expect(sw).toBeChecked();
    fireEvent.press(sw);
    expect(onChange).toHaveBeenCalledWith(false);
    onChange.mockClear();
    rerender(<Toggle label="Reminders" value onChange={onChange} disabled />);
    fireEvent.press(screen.getByRole('switch', { name: 'Reminders' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('RadioGroup (dots, cards) and SegmentedControl select by value', () => {
    const onChange = jest.fn();
    const options = [
      { label: 'Cash', value: 'cash' },
      { label: 'UPI', value: 'upi' },
    ];
    const { rerender } = render(<RadioGroup options={options} value="cash" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: 'Cash' })).toBeSelected();
    fireEvent.press(screen.getByRole('radio', { name: 'UPI' }));
    expect(onChange).toHaveBeenLastCalledWith('upi');

    rerender(<RadioGroup options={options} value="upi" onChange={onChange} variant="cards" />);
    expect(screen.getByRole('radio', { name: 'UPI' })).toBeSelected();

    rerender(<RadioGroup options={options} value="upi" onChange={onChange} variant="segmented" />);
    expect(screen.getByRole('radio', { name: 'UPI' })).toBeSelected();
    fireEvent.press(screen.getByRole('radio', { name: 'Cash' }));
    expect(onChange).toHaveBeenLastCalledWith('cash');
  });
});

describe('NumberStepper', () => {
  it('moves in half-inch steps and clamps to min/max', () => {
    const onChange = jest.fn();
    const { rerender } = render(<NumberStepper label="Chest" value={38} step={0.5} min={0} max={39} onChange={onChange} />);
    fireEvent.press(screen.getByRole('button', { name: 'Increase, Chest' }));
    expect(onChange).toHaveBeenLastCalledWith(38.5);
    rerender(<NumberStepper label="Chest" value={39} step={0.5} min={0} max={39} onChange={onChange} />);
    fireEvent.press(screen.getByRole('button', { name: 'Increase, Chest' }));
    expect(onChange).toHaveBeenLastCalledWith(39);
    fireEvent.press(screen.getByRole('button', { name: 'Decrease, Chest' }));
    expect(onChange).toHaveBeenLastCalledWith(38.5);
  });

  it('accepts typed values (comma decimal) and shows the previous value', () => {
    const onChange = jest.fn();
    render(<NumberStepper label="Waist" value={null} previousValue={32} onChange={onChange} />);
    const input = screen.getByLabelText('Waist');
    fireEvent.changeText(input, '33,5');
    fireEvent(input, 'blur');
    expect(onChange).toHaveBeenLastCalledWith(33.5);
    expect(screen.getByText('Last: 32')).toBeTruthy();
  });
});

describe('SyncChip', () => {
  it('shows offline with the pending count', () => {
    render(<SyncChip status="offline" pending={4} />);
    expect(screen.getByLabelText('Offline, 4 pending')).toBeTruthy();
  });

  it('hides the pending count once synced', () => {
    render(<SyncChip status="synced" pending={4} />);
    expect(screen.getByLabelText('Synced')).toBeTruthy();
  });
});

describe('Card, ListRow, EmptyState, Skeleton', () => {
  it('Card is a button only when pressable', () => {
    const onPress = jest.fn();
    render(<Card onPress={onPress} accessibilityLabel="Order 12">{<Text>Body</Text>}</Card>);
    fireEvent.press(screen.getByRole('button', { name: 'Order 12' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('ListRow renders title, subtitle and trailing content and is pressable', () => {
    const onPress = jest.fn();
    render(<ListRow title="Ramesh Patel" subtitle="Shirt x2" trailing={<Text>₹1,200</Text>} onPress={onPress} />);
    expect(screen.getByText('Shirt x2')).toBeTruthy();
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });

  it('EmptyState shows its single action', () => {
    const onAction = jest.fn();
    render(<EmptyState title="No orders" description="Create your first order" actionLabel="New order" onAction={onAction} />);
    fireEvent.press(screen.getByRole('button', { name: 'New order' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('Skeleton renders without announcing itself', () => {
    render(<Skeleton testID="sk" />);
    expect(screen.getByTestId('sk')).toBeTruthy();
  });
});

describe('SwipeRow', () => {
  it('exposes every swipe action as an accessibility action', () => {
    const ready = jest.fn();
    const call = jest.fn();
    render(
      <SwipeRow
        testID="row"
        commitAction={{ key: 'ready', label: 'Ready', icon: 'circleCheck', onPress: ready }}
        revealActions={[{ key: 'call', label: 'Call', icon: 'phone', onPress: call }]}
      >
        <Text>Order</Text>
      </SwipeRow>,
    );
    const row = screen.getByTestId('row');
    expect(row.props.accessibilityActions.map((a: { name: string }) => a.name)).toEqual(['ready', 'call']);
    row.props.onAccessibilityAction({ nativeEvent: { actionName: 'ready' } });
    expect(ready).toHaveBeenCalledTimes(1);
    row.props.onAccessibilityAction({ nativeEvent: { actionName: 'call' } });
    expect(call).toHaveBeenCalledTimes(1);
  });
});

describe('Text', () => {
  it('uses Plus Jakarta Sans for English and Noto fonts for Gujarati and Hindi', () => {
    const g = global as { __testLanguage?: string };
    const font = () => (screen.getByText('Hello').props.style as Array<Record<string, unknown> | null>).find((s) => s && 'fontFamily' in s)?.fontFamily;

    g.__testLanguage = 'en';
    const { unmount } = render(<Text weight="bold">Hello</Text>);
    expect(font()).toBe('PlusJakartaSans_700Bold');
    unmount();

    g.__testLanguage = 'gu';
    const gu = render(<Text>Hello</Text>);
    expect(font()).toBe('NotoSansGujarati_400Regular');
    gu.unmount();

    g.__testLanguage = 'hi';
    render(<Text variant="label">Hello</Text>);
    expect(font()).toBe('NotoSansDevanagari_600SemiBold');
    g.__testLanguage = 'en';
  });

  it('gives Indic scripts a taller line height', () => {
    const g = global as { __testLanguage?: string };
    const lh = () => (screen.getByText('Hello').props.style as Array<Record<string, unknown> | null>).find((s) => s && 'lineHeight' in s)?.lineHeight as number;
    g.__testLanguage = 'en';
    const en = render(<Text>Hello</Text>);
    const enLh = lh();
    en.unmount();
    g.__testLanguage = 'gu';
    render(<Text>Hello</Text>);
    expect(lh()).toBeGreaterThan(enLh);
    g.__testLanguage = 'en';
  });
});
