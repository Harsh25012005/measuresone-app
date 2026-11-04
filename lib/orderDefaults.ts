import type { Tables } from './database.types';

type Order = Tables<'orders'>;

export type OrderDefaults = {
  /** Cloth type of the customer's last order, else the shop's last order. */
  clothType: string | null;
  /** Days between order date and delivery date on that same reference order (1-60). */
  lastDays: number | null;
  /** Price per piece on this customer's last priced order. Only ever a suggestion. */
  lastRate: number | null;
  /** Up to 5 most recently ordered-for customers, newest first. */
  recentCustomerIds: string[];
};

const DAY_MS = 86_400_000;

/**
 * Smart defaults for a new order, derived from past orders (newest first by
 * created_at). Pure and read-only: callers decide what to pre-fill.
 */
export function deriveOrderDefaults(orders: Order[], customerId: string | null): OrderDefaults {
  const history = [...orders].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const lastForCustomer = customerId ? history.find((o) => o.customer_id === customerId) ?? null : null;
  const reference = lastForCustomer ?? history[0] ?? null;

  let lastDays: number | null = null;
  if (reference?.delivery_date && reference.order_date) {
    const diff = Math.round(
      (new Date(reference.delivery_date.slice(0, 10) + 'T00:00:00').getTime() -
        new Date(reference.order_date.slice(0, 10) + 'T00:00:00').getTime()) /
        DAY_MS
    );
    lastDays = diff > 0 && diff <= 60 ? diff : null;
  }

  const priced = customerId
    ? history.find((o) => o.customer_id === customerId && Number(o.total_amount) > 0 && Number(o.cloth_count) > 0)
    : undefined;
  const lastRate = priced ? Number(priced.total_amount) / Number(priced.cloth_count) : null;

  const recentCustomerIds: string[] = [];
  for (const o of history) {
    if (o.customer_id && !recentCustomerIds.includes(o.customer_id)) recentCustomerIds.push(o.customer_id);
    if (recentCustomerIds.length === 5) break;
  }

  return { clothType: reference?.cloth_type ?? null, lastDays, lastRate, recentCustomerIds };
}
