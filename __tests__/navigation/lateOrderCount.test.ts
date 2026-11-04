import { renderHook, waitFor } from '@testing-library/react-native';

jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ shop: { id: 'shop-1' } }) }));

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const mockList = jest.fn();
jest.mock('../../lib/data/repository', () => ({ ordersRepo: { list: (...a: unknown[]) => mockList(...a) } }));

import { useLateOrderCount } from '../../navigation/useLateOrderCount';

describe('useLateOrderCount', () => {
  it('counts only undelivered orders whose delivery date has passed', async () => {
    mockList.mockResolvedValue([
      { status: 'order_taken', delivery_date: day(-2) },
      { status: 'ready', delivery_date: day(-1) },
      { status: 'delivered', delivery_date: day(-5) },
      { status: 'stitching', delivery_date: day(0) },
      { status: 'stitching', delivery_date: day(3) },
      { status: 'order_taken', delivery_date: null },
    ]);
    const { result } = renderHook(() => useLateOrderCount('k'));
    await waitFor(() => expect(result.current).toBe(2));
    expect(mockList).toHaveBeenCalledWith('shop-1');
  });

  it('stays at 0 when the read fails', async () => {
    mockList.mockRejectedValue(new Error('db'));
    const { result } = renderHook(() => useLateOrderCount('k2'));
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current).toBe(0);
  });
});
