import { billsRepo, paymentsRepo, universalFieldsRepo, universalTemplatesRepo } from '../data/repository';

export type PlanItem = { name: string; group: string };
export type MeasurementPlan = { templateId: string; items: PlanItem[] };

/**
 * The fields to ask for, taken from the shop's measurement templates (the same
 * ones the Measurements form uses). A "Shirt + Pant" template is split into
 * Shirt and Pant sections using the single-garment templates, so a repeated
 * field such as Length is asked once for each garment.
 */
export async function buildMeasurementPlan(shopId: string, garment: 'Shirt' | 'Pant' | 'Shirt+Pant'): Promise<MeasurementPlan | null> {
  const templates = await universalTemplatesRepo.list(shopId);
  const wanted = garment === 'Shirt+Pant' ? 'Shirt + Pant' : garment;
  const template = templates.find((t) => t.template_name.toLowerCase() === wanted.toLowerCase());
  if (!template) return null;
  const fields = (await universalFieldsRepo.listForTemplate(template.id)).map((f) => f.field_name);

  if (garment !== 'Shirt+Pant') return { templateId: template.id, items: fields.map((name) => ({ name, group: '' })) };

  const parts = ['Shirt', 'Pant'];
  const remaining: Record<string, Record<string, number>> = {};
  for (const part of parts) {
    remaining[part] = {};
    const own = templates.find((t) => t.template_name.toLowerCase() === part.toLowerCase());
    if (!own) continue;
    for (const f of await universalFieldsRepo.listForTemplate(own.id)) {
      remaining[part][f.field_name] = (remaining[part][f.field_name] ?? 0) + 1;
    }
  }
  const items = fields.map((name) => {
    const group = parts.find((p) => (remaining[p]?.[name] ?? 0) > 0) ?? '';
    if (group) remaining[group][name] -= 1;
    return { name, group };
  });
  return { templateId: template.id, items };
}

/** Collected answers → what the profile stores: flat for one garment, per garment for both. */
export function toMeasurements(items: PlanItem[], values: Record<string, string>): Record<string, number | Record<string, number>> {
  const out: Record<string, number | Record<string, number>> = {};
  items.forEach((item, i) => {
    const n = parseFloat(values[String(i)] ?? '');
    if (isNaN(n)) return;
    if (item.group) {
      const bucket = (out[item.group] ?? {}) as Record<string, number>;
      bucket[item.name] = n;
      out[item.group] = bucket;
    } else {
      out[item.name] = n;
    }
  });
  return out;
}

/** What a client still owes across their bills. */
export async function clientDue(shopId: string, customerId: string): Promise<number> {
  const bills = await billsRepo.listWithPayments(shopId);
  return bills
    .filter((b) => b.customer_id === customerId)
    .reduce((sum, b) => sum + Math.max(Number(b.total_amount ?? 0) - Number(b.paid ?? 0), 0), 0);
}

/** Records a payment against the client's oldest unpaid bills first; never more than they owe. */
export async function applyPayment(shopId: string, customerId: string, amount: number, mode = 'Cash'): Promise<{ applied: number; left: number }> {
  const bills = (await billsRepo.listWithPayments(shopId))
    .filter((b) => b.customer_id === customerId)
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  let remaining = amount;
  let applied = 0;
  for (const bill of bills) {
    if (remaining <= 0) break;
    const due = Math.max(Number(bill.total_amount ?? 0) - Number(bill.paid ?? 0), 0);
    if (due <= 0) continue;
    const pay = Math.min(due, remaining);
    await paymentsRepo.create({ shop_id: shopId, bill_id: bill.id, customer_id: customerId, amount_paid: pay, payment_mode: mode });
    remaining -= pay;
    applied += pay;
  }
  const left = Math.max((await clientDue(shopId, customerId)), 0);
  return { applied, left };
}
