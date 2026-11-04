import { deriveOrderDefaults } from '../lib/orderDefaults';
import type { Tables } from '../lib/database.types';

const order = (o: Partial<Tables<'orders'>>) => ({ cloth_count: 1, total_amount: 0, ...o }) as Tables<'orders'>;

const orders = [
  order({ id: '1', customer_id: 'a', created_at: '2026-10-01', order_date: '2026-10-01', delivery_date: '2026-10-08', cloth_type: 'Pant', cloth_count: 2, total_amount: 800 }),
  order({ id: '2', customer_id: 'b', created_at: '2026-10-05', order_date: '2026-10-05', delivery_date: '2026-10-08', cloth_type: 'Shirt', cloth_count: 1, total_amount: 0 }),
  order({ id: '3', customer_id: 'a', created_at: '2026-10-09', order_date: '2026-10-09', delivery_date: '2026-10-19', cloth_type: 'Shirt', cloth_count: 3, total_amount: 1500 }),
];

describe('deriveOrderDefaults', () => {
  it('uses the customer\'s last order for cloth, delivery days and rate', () => {
    const d = deriveOrderDefaults(orders, 'a');
    expect(d.clothType).toBe('Shirt');
    expect(d.lastDays).toBe(10);
    expect(d.lastRate).toBe(500);
  });

  it('falls back to the shop\'s last order when no customer is chosen, and never suggests a rate', () => {
    const d = deriveOrderDefaults(orders, null);
    expect(d.clothType).toBe('Shirt');
    expect(d.lastDays).toBe(10);
    expect(d.lastRate).toBeNull();
  });

  it('has no rate for a customer whose orders were never priced', () => {
    expect(deriveOrderDefaults(orders, 'b').lastRate).toBeNull();
  });

  it('lists recent customers newest first without duplicates', () => {
    expect(deriveOrderDefaults(orders, null).recentCustomerIds).toEqual(['a', 'b']);
  });

  it('returns empty defaults with no history', () => {
    expect(deriveOrderDefaults([], 'a')).toEqual({ clothType: null, lastDays: null, lastRate: null, recentCustomerIds: [] });
  });
});
