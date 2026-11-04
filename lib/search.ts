import type { OrderListItem } from '../types';
import type { Tables } from './database.types';

type Customer = Tables<'customers'>;

/** Matches customers and orders against one query: name, phone, order no., book no. */
export function searchAll(query: string, customers: Customer[], orders: OrderListItem[]) {
  const q = query.trim().toLowerCase();
  if (!q) return { customers: [] as Customer[], orders: [] as OrderListItem[] };
  const numeric = q.replace(/^#/, '');
  const rawDigits = q.replace(/\D/g, '');
  // Short numbers are order or book numbers, not phones: only 4+ digits search phone numbers.
  const digits = rawDigits.length >= 4 ? rawDigits : '';

  const matchedCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      (!!digits && (c.phone ?? '').includes(digits)) ||
      (c.book_number ?? '').toLowerCase().includes(numeric)
  );

  const matchedOrders = orders.filter(
    (o) =>
      o.order_number.toLowerCase().includes(numeric) ||
      (o.bill_book_number ?? '').toLowerCase().includes(numeric) ||
      (o.customers?.name ?? '').toLowerCase().includes(q) ||
      (!!digits && (o.customers?.phone ?? '').includes(digits))
  );

  return { customers: matchedCustomers, orders: matchedOrders };
}
