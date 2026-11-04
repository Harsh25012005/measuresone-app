import { billsRepo, paymentsRepo } from './data/repository';

export type BillAmounts = Record<string, { total: number; paid: number }>;

/**
 * Live total/paid per order, taken from the order's bill and its payments.
 * orders.total_amount / paid_amount are only a snapshot from creation and go
 * stale as soon as a payment is recorded afterwards, so every list that shows
 * an order's payment state must read this instead.
 */
export async function loadOrderBillAmounts(shopId: string): Promise<BillAmounts> {
  const [bills, payments] = await Promise.all([billsRepo.list(shopId), paymentsRepo.listForShop(shopId)]);
  const paidByBill: Record<string, number> = {};
  for (const p of payments) paidByBill[p.bill_id] = (paidByBill[p.bill_id] ?? 0) + Number(p.amount_paid ?? 0);
  const amounts: BillAmounts = {};
  for (const b of bills) {
    if (b.order_id) amounts[b.order_id] = { total: Number(b.total_amount ?? 0), paid: paidByBill[b.id] ?? 0 };
  }
  return amounts;
}
