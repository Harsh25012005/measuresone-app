import { countByFilter, filterOrders, groupByDue, localDateString, sortOrders, matchFilter } from '../lib/orderList';
import type { OrderListItem } from '../types';

const TODAY = '2026-11-04';

function make(n: number): OrderListItem[] {
  const statuses = ['order_taken', 'cutting', 'stitching', 'ready', 'delivered'] as const;
  return Array.from({ length: n }, (_, i) => {
    const day = new Date(2026, 10, 4 + ((i * 7) % 40) - 15);
    return {
      id: `o${i}`,
      order_number: `ORD-${i + 1}`,
      customer_id: `c${i % 300}`,
      status: statuses[i % 5],
      delivery_date: i % 50 === 0 ? null : localDateString(day),
      order_date: localDateString(new Date(2026, 9, 1 + (i % 30))),
      is_rush: i % 11 === 0,
      total_amount: 500 + (i % 20) * 100,
      paid_amount: i % 3 === 0 ? 500 : 0,
      cloth_type: i % 2 ? 'Shirt' : 'Pant',
      bill_book_number: i % 4 === 0 ? `B-${i}` : null,
      assigned_staff_id: i % 6 === 0 ? 's1' : null,
      customers: { name: `Customer ${i % 300}`, phone: `98${String(10000000 + (i % 300)).slice(0, 8)}` },
    } as unknown as OrderListItem;
  });
}

describe('order list pipeline', () => {
  const orders = make(5000);

  it('filters, sorts, groups and counts 5,000 orders well inside a frame budget', () => {
    const start = Date.now();
    const filtered = filterOrders(orders, { filter: 'Active', staffId: null, search: '', today: TODAY });
    const sorted = sortOrders(filtered, 'due');
    const groups = groupByDue(sorted, TODAY);
    const counts = countByFilter(orders, ['Active', 'Due today', 'Overdue', 'Unpaid', 'Received', 'Ready', 'Delivered', 'All'], TODAY);
    const elapsed = Date.now() - start;

    expect(groups.reduce((n, g) => n + g.orders.length, 0)).toBe(sorted.length);
    expect(counts.All).toBe(5000);
    expect(elapsed).toBeLessThan(250);
  });

  it('searches across order no., customer, phone, book no. and cloth', () => {
    const run = (search: string) => filterOrders(orders, { filter: 'All', staffId: null, search, today: TODAY });
    expect(run('#ORD-12').every((o) => o.order_number.toLowerCase().includes('ord-12'))).toBe(true);
    expect(run('customer 7').length).toBeGreaterThan(0);
    expect(run('b-4').every((o) => (o.bill_book_number ?? '').toLowerCase().includes('b-4'))).toBe(true);
  });

  it('puts active orders first, earliest due date first, rush before normal on the same day', () => {
    const sorted = sortOrders(orders, 'due');
    const firstDelivered = sorted.findIndex((o) => o.status === 'delivered');
    expect(sorted.slice(0, firstDelivered).every((o) => o.status !== 'delivered')).toBe(true);
    const dated = sorted.slice(0, firstDelivered).filter((o) => o.delivery_date);
    for (let i = 1; i < dated.length; i++) {
      expect((dated[i - 1].delivery_date as string) <= (dated[i].delivery_date as string)).toBe(true);
    }
  });

  it('groups by due date with the right boundaries', () => {
    const mk = (id: string, delivery: string | null, status = 'order_taken') => ({ id, status, delivery_date: delivery, order_date: '2026-11-01', order_number: id }) as unknown as OrderListItem;
    const groups = groupByDue(
      [mk('late', '2026-11-03'), mk('today', TODAY), mk('tom', '2026-11-05'), mk('week', '2026-11-11'), mk('later', '2026-11-12'), mk('none', null), mk('done', '2026-10-01', 'delivered')],
      TODAY
    );
    const by = Object.fromEntries(groups.map((g) => [g.key, g.orders.map((o) => o.id)]));
    expect(by).toEqual({ late: ['late'], today: ['today'], tomorrow: ['tom'], thisWeek: ['week'], later: ['later', 'none'], delivered: ['done'] });
  });

  it('matches filters by status, due date and balance', () => {
    const o = { status: 'ready', delivery_date: '2026-11-01', total_amount: 100, paid_amount: 40 } as unknown as OrderListItem;
    expect(matchFilter(o, 'Overdue', TODAY)).toBe(true);
    expect(matchFilter(o, 'Ready', TODAY)).toBe(true);
    expect(matchFilter(o, 'Unpaid', TODAY)).toBe(true);
    expect(matchFilter(o, 'Delivered', TODAY)).toBe(false);
    expect(matchFilter(o, 'Due today', TODAY)).toBe(false);
  });
});
