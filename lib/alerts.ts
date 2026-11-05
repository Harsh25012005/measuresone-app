import { billsRepo, ordersRepo } from './data/repository';

/**
 * Reminders the app works out from its own data (no server push involved): deliveries that are
 * late, due today or coming up, and money still owed. Rebuilt every time it is asked for, so it
 * always reflects the current orders and payments.
 */
export type AlertKind = 'overdue' | 'today' | 'tomorrow' | 'soon' | 'payment';

export type AppAlert = {
  id: string;
  kind: AlertKind;
  orderId: string;
  orderNumber: string;
  customerName: string;
  /** Delivery date as YYYY-MM-DD, when the order has one. */
  deliveryDate: string | null;
  /** overdue: days late · soon: days until delivery. */
  days: number;
  /** payment: amount still owed. */
  amount: number;
  garment: string;
  pieces: number;
};

/** How far ahead "coming up" deliveries are surfaced. */
const SOON_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from today (local) to a YYYY-MM-DD date; negative when it is in the past. */
function daysUntil(dateStr: string): number {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return Number.NaN;
  const target = new Date(y, m - 1, d).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target - today) / DAY_MS);
}

const ORDER: Record<AlertKind, number> = { overdue: 0, today: 1, payment: 2, tomorrow: 3, soon: 4 };

export async function buildAlerts(shopId: string): Promise<AppAlert[]> {
  const [orders, bills] = await Promise.all([ordersRepo.listWithCustomer(shopId), billsRepo.listWithPayments(shopId)]);

  const owedByOrder = new Map<string, number>();
  for (const b of bills) {
    if (!b.order_id) continue;
    const owed = Math.max(Number(b.total_amount ?? 0) - Number(b.paid ?? 0), 0);
    if (owed > 0) owedByOrder.set(b.order_id, (owedByOrder.get(b.order_id) ?? 0) + owed);
  }

  const out: AppAlert[] = [];
  for (const o of orders) {
    const delivered = o.status === 'delivered';
    const base = {
      orderId: o.id,
      orderNumber: o.order_number,
      customerName: o.customers?.name ?? '',
      deliveryDate: o.delivery_date,
      garment: o.cloth_type ?? '',
      pieces: Number(o.cloth_count ?? 0),
    };
    const diff = o.delivery_date ? daysUntil(o.delivery_date) : Number.NaN;

    if (!delivered && !Number.isNaN(diff)) {
      if (diff < 0) out.push({ ...base, id: `overdue:${o.id}`, kind: 'overdue', days: -diff, amount: 0 });
      else if (diff === 0) out.push({ ...base, id: `today:${o.id}`, kind: 'today', days: 0, amount: 0 });
      else if (diff === 1) out.push({ ...base, id: `tomorrow:${o.id}`, kind: 'tomorrow', days: 1, amount: 0 });
      else if (diff <= SOON_DAYS) out.push({ ...base, id: `soon:${o.id}`, kind: 'soon', days: diff, amount: 0 });
    }

    // Money is chased once the work is handed over or its delivery date has arrived.
    const owed = owedByOrder.get(o.id) ?? 0;
    if (owed > 0 && (delivered || (!Number.isNaN(diff) && diff <= 0))) {
      out.push({ ...base, id: `payment:${o.id}`, kind: 'payment', days: 0, amount: owed });
    }
  }

  return out.sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || b.days - a.days);
}
