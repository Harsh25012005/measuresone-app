import { fireEvent, render, screen } from '@testing-library/react-native';

jest.mock('../../context/ProductTourContext', () => ({
  TOUR_STEPS: ['customers', 'orders', 'staff'],
  useProductTour: () => ({ step: null, next: jest.fn(), back: jest.fn(), finish: jest.fn() }),
}));

const mockLate = jest.fn(() => 3);
jest.mock('../../navigation/useLateOrderCount', () => ({ useLateOrderCount: () => mockLate() }));

import { CustomTabBar } from '../../navigation/CustomTabBar';

type Route = { key: string; name: string; state?: unknown };

function setup(activeIndex = 0, deepest?: string) {
  const routes: Route[] = [
    { key: 'h', name: 'DashboardTab' },
    { key: 'o', name: 'OrdersTab' },
    { key: 'c', name: 'CustomersTab' },
    { key: 's', name: 'SettingsTab' },
  ];
  if (deepest) routes[activeIndex] = { ...routes[activeIndex], state: { index: 0, routes: [{ name: deepest }] } };
  const navigation = {
    emit: jest.fn(() => ({ defaultPrevented: false })),
    navigate: jest.fn(),
  };
  const descriptors = Object.fromEntries(routes.map((r) => [r.key, { options: {} }]));
  const props = { state: { index: activeIndex, routes }, navigation, descriptors } as unknown as React.ComponentProps<typeof CustomTabBar>;
  return { navigation, ...render(<CustomTabBar {...props} />) };
}

describe('CustomTabBar', () => {
  beforeEach(() => mockLate.mockReturnValue(3));

  it('shows four labelled tabs and the create button, with the active tab selected', () => {
    setup(0);
    expect(screen.getByRole('tab', { name: 'Home' })).toBeSelected();
    expect(screen.getByRole('tab', { name: /Orders/ })).not.toBeSelected();
    expect(screen.getByRole('tab', { name: 'Clients' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'More' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Quick actions' })).toBeTruthy();
  });

  it('announces the late-order count on the Orders tab', () => {
    setup(0);
    expect(screen.getByRole('tab', { name: 'Orders, 3 late' })).toBeTruthy();
  });

  it('has no badge when nothing is late', () => {
    mockLate.mockReturnValue(0);
    setup(0);
    expect(screen.getByRole('tab', { name: 'Orders' })).toBeTruthy();
  });

  it('navigates when another tab is pressed', () => {
    const { navigation } = setup(0);
    fireEvent.press(screen.getByRole('tab', { name: 'Clients' }));
    expect(navigation.navigate).toHaveBeenCalledWith('CustomersTab');
  });

  it('returns to the tab root when the active tab is pressed again', () => {
    const { navigation } = setup(1);
    fireEvent.press(screen.getByRole('tab', { name: /Orders/ }));
    expect(navigation.navigate).toHaveBeenCalledWith('OrdersTab', { screen: 'OrderList' });
  });

  it('opens the create sheet with every quick action', () => {
    setup(0);
    fireEvent.press(screen.getByRole('button', { name: 'Quick actions' }));
    expect(screen.getByRole('header', { name: 'Create' })).toBeTruthy();
    for (const name of [/order/i, /client|customer/i, /measurement/i, /staff/i]) {
      expect(screen.getAllByRole('button', { name }).length).toBeGreaterThan(0);
    }
  });

  it('hides itself on full-screen forms and details', () => {
    setup(1, 'OrderForm');
    expect(screen.queryByRole('tab')).toBeNull();
  });
});
