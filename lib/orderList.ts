import type { OrderListItem } from '../types';

export type OrderFilterType = 'Active' | 'Due today' | 'Overdue' | 'Unpaid' | 'Received' | 'Ready' | 'Delivered' | 'All';
export type SortOption = 'due' | 'new' | 'old' | 'amount' | 'balance';

export type DueGroup = { key: 'late' | 'today' | 'tomorrow' | 'thisWeek' | 'later' | 'delivered'; titleKey: string; orders: OrderListItem[] };

/** Local-time date as YYYY-MM-DD. */
export function localDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Remaining balance for an order. */
export function getOrderBalance(order: OrderListItem): number {
  return Math.max(Number(order.total_amount ?? 0) - Number(order.paid_amount ?? 0), 0);
}

/** Whether an order belongs under a status/payment filter chip. */
export function matchFilter(order: OrderListItem, filter: OrderFilterType, today: string): boolean {
  const isActive = order.status !== 'delivered';
  switch (filter) {
    case 'Active':
      return isActive;
    case 'Due today':
      return isActive && order.delivery_date === today;
    case 'Overdue':
      return isActive && Boolean(order.delivery_date && order.delivery_date < today);
    case 'Unpaid':
      return getOrderBalance(order) > 0;
    case 'Received':
      return order.status === 'order_taken' || order.status === 'cutting' || order.status === 'stitching';
    case 'Ready':
      return order.status === 'ready';
    case 'Delivered':
      return order.status === 'delivered';
    case 'All':
    default:
      return true;
  }
}

/** How many orders each filter matches, in a single pass (for the chip counts). */
export function countByFilter(orders: OrderListItem[], filters: OrderFilterType[], today: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of filters) counts[f] = 0;
  for (const o of orders) for (const f of filters) if (matchFilter(o, f, today)) counts[f] += 1;
  return counts;
}

export function filterOrders(
  orders: OrderListItem[],
  opts: { filter: OrderFilterType; staffId: string | null; search: string; today: string }
): OrderListItem[] {
  const q = opts.search.trim().toLowerCase();
  const qClean = q.replace(/^#/, '');
  return orders.filter((o) => {
    if (!matchFilter(o, opts.filter, opts.today)) return false;
    if (opts.staffId && o.assigned_staff_id !== opts.staffId) return false;
    if (!q) return true;
    return (
      o.order_number.toLowerCase().includes(qClean) ||
      (o.customers?.name ?? '').toLowerCase().includes(q) ||
      (o.customers?.phone ?? '').includes(q) ||
      (o.bill_book_number ?? '').toLowerCase().includes(q) ||
      (o.cloth_type ?? '').toLowerCase().includes(q)
    );
  });
}

// Plain comparison: dates are ISO strings and order numbers like "ORD-12", so this
// avoids the much slower locale-aware compare when sorting thousands of rows.
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function sortOrders(list: OrderListItem[], sortBy: SortOption): OrderListItem[] {
  return [...list].sort((a, b) => {
    if (sortBy === 'due') {
      const actA = a.status !== 'delivered';
      const actB = b.status !== 'delivered';
      if (actA !== actB) return actA ? -1 : 1;
      const d = cmp(a.delivery_date ?? '9999-99-99', b.delivery_date ?? '9999-99-99');
      if (d) return d;
      if (a.is_rush !== b.is_rush) return a.is_rush ? -1 : 1;
      return cmp(a.order_number, b.order_number);
    }
    if (sortBy === 'new') return cmp(b.order_date ?? '', a.order_date ?? '') || cmp(b.order_number, a.order_number);
    if (sortBy === 'old') return cmp(a.order_date ?? '', b.order_date ?? '') || cmp(a.order_number, b.order_number);
    if (sortBy === 'amount') return Number(b.total_amount ?? 0) - Number(a.total_amount ?? 0);
    return getOrderBalance(b) - getOrderBalance(a);
  });
}

/** Splits an already due-date-sorted list into Late / Today / Tomorrow / This week / Later / Delivered. */
export function groupByDue(sorted: OrderListItem[], today: string): DueGroup[] {
  const addDays = (n: number) => {
    const d = new Date(today + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return localDateString(d);
  };
  const tomorrow = addDays(1);
  const weekEnd = addDays(7);

  const buckets: DueGroup[] = [
    { key: 'late', titleKey: 'groupLate', orders: [] },
    { key: 'today', titleKey: 'groupToday', orders: [] },
    { key: 'tomorrow', titleKey: 'groupTomorrow', orders: [] },
    { key: 'thisWeek', titleKey: 'groupThisWeek', orders: [] },
    { key: 'later', titleKey: 'groupLater', orders: [] },
    { key: 'delivered', titleKey: 'delivered', orders: [] },
  ];

  for (const o of sorted) {
    if (o.status === 'delivered') buckets[5].orders.push(o);
    else if (o.delivery_date && o.delivery_date < today) buckets[0].orders.push(o);
    else if (o.delivery_date === today) buckets[1].orders.push(o);
    else if (o.delivery_date === tomorrow) buckets[2].orders.push(o);
    else if (o.delivery_date && o.delivery_date <= weekEnd) buckets[3].orders.push(o);
    else buckets[4].orders.push(o);
  }
  return buckets.filter((b) => b.orders.length > 0);
}
