import { searchAll } from '../lib/search';
import type { OrderListItem } from '../types';
import type { Tables } from '../lib/database.types';

const customers = [
  { id: 'c1', name: 'Ramesh Patel', phone: '9876543210', book_number: '12' },
  { id: 'c2', name: 'Sunita Shah', phone: '9123456780', book_number: '47' },
] as unknown as Tables<'customers'>[];

const orders = [
  { id: 'o1', order_number: 'ORD-101', bill_book_number: 'B-5', customers: { name: 'Ramesh Patel', phone: '9876543210' } },
  { id: 'o2', order_number: 'ORD-202', bill_book_number: null, customers: { name: 'Sunita Shah', phone: '9123456780' } },
] as unknown as OrderListItem[];

describe('searchAll', () => {
  it('returns nothing for an empty query', () => {
    expect(searchAll('  ', customers, orders)).toEqual({ customers: [], orders: [] });
  });

  it('finds a customer by name, phone digits and book number', () => {
    expect(searchAll('ramesh', customers, orders).customers.map((c) => c.id)).toEqual(['c1']);
    expect(searchAll('98765', customers, orders).customers.map((c) => c.id)).toEqual(['c1']);
    expect(searchAll('47', customers, orders).customers.map((c) => c.id)).toEqual(['c2']);
  });

  it('finds an order by order number (with or without #) and by book number', () => {
    expect(searchAll('#202', customers, orders).orders.map((o) => o.id)).toEqual(['o2']);
    expect(searchAll('ord-101', customers, orders).orders.map((o) => o.id)).toEqual(['o1']);
    expect(searchAll('b-5', customers, orders).orders.map((o) => o.id)).toEqual(['o1']);
  });

  it('matches orders through the customer name or phone', () => {
    expect(searchAll('sunita', customers, orders).orders.map((o) => o.id)).toEqual(['o2']);
    expect(searchAll('91234', customers, orders).orders.map((o) => o.id)).toEqual(['o2']);
  });
});
