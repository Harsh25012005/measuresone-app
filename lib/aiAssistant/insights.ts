import { supabase } from '../supabase';
import { billsRepo, customersRepo, ordersRepo, paymentsRepo, staffRepo } from '../data/repository';
import { formatCurrency } from '../format';
import { findCustomerMatches } from './gujaratiNlu';
import type { Lang, QueryTopic } from './intents';

/** Everything the assistant can be asked about, loaded fresh for each question. */
export type Snapshot = {
  orders: Awaited<ReturnType<typeof ordersRepo.listWithCustomer>>;
  bills: Awaited<ReturnType<typeof billsRepo.listWithPayments>>;
  payments: Awaited<ReturnType<typeof paymentsRepo.listForShop>>;
  customers: Awaited<ReturnType<typeof customersRepo.list>>;
  staff: Awaited<ReturnType<typeof staffRepo.list>>;
  staffCost: number;
};

export async function loadSnapshot(shopId: string): Promise<Snapshot> {
  const [orders, bills, payments, customers, staff, work] = await Promise.all([
    ordersRepo.listWithCustomer(shopId),
    billsRepo.listWithPayments(shopId),
    paymentsRepo.listForShop(shopId),
    customersRepo.list(shopId),
    staffRepo.list(shopId),
    supabase.from('staff_work_entries').select('quantity, rate_applied'),
  ]);
  const staffCost = (work.data ?? []).reduce((sum, w) => sum + Number(w.quantity ?? 0) * Number(w.rate_applied ?? 0), 0);
  return { orders, bills, payments, customers, staff, staffCost };
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const localDay = (iso: string | null | undefined) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : dayKey(d);
};

const pendingOf = (b: { total_amount: number | null; paid: number }) => Math.max(Number(b.total_amount ?? 0) - Number(b.paid ?? 0), 0);

/** Each client's unpaid total, biggest first. */
export function debtors(snap: Snapshot): { id: string; name: string; due: number }[] {
  const byCustomer = new Map<string, number>();
  for (const b of snap.bills) {
    const due = pendingOf(b);
    if (due > 0) byCustomer.set(b.customer_id, (byCustomer.get(b.customer_id) ?? 0) + due);
  }
  const names = new Map(snap.customers.map((c) => [c.id, c.name]));
  return [...byCustomer.entries()]
    .map(([id, due]) => ({ id, name: names.get(id) ?? '—', due }))
    .sort((a, b) => b.due - a.due);
}

/** A client mentioned in the question, if any. */
export function findClient(snap: Snapshot, text: string) {
  const matches = findCustomerMatches(text, snap.customers);
  return matches.length === 1 ? matches[0] : null;
}

type Strings = {
  todayRevenue: (amount: string, count: number) => string;
  monthRevenue: (amount: string) => string;
  totalRevenue: (amount: string) => string;
  noOrdersToday: string;
  todayOrders: (count: number, names: string) => string;
  pendingOrders: (count: number) => string;
  dueToday: (count: number, names: string) => string;
  noDueToday: string;
  outstanding: (amount: string, list: string) => string;
  noOutstanding: string;
  clientBalance: (name: string, amount: string) => string;
  clientNoDue: (name: string) => string;
  clientCount: (count: number) => string;
  staff: (count: number, cost: string) => string;
  net: (received: string, cost: string, net: string) => string;
  recentPayments: (list: string) => string;
  noPayments: string;
  summary: (orders: number, revenue: string, pending: number, due: string) => string;
  unknown: string;
};

const EN: Strings = {
  todayRevenue: (a, n) => `Today you received ${a} in ${n} payment${n === 1 ? '' : 's'}.`,
  monthRevenue: (a) => `This month you have received ${a}.`,
  totalRevenue: (a) => `In total you have received ${a}.`,
  noOrdersToday: 'No orders have been created today.',
  todayOrders: (n, names) => `${n} order${n === 1 ? '' : 's'} today: ${names}.`,
  pendingOrders: (n) => `${n} order${n === 1 ? ' is' : 's are'} still not delivered.`,
  dueToday: (n, names) => `${n} deliver${n === 1 ? 'y is' : 'ies are'} due today: ${names}.`,
  noDueToday: 'Nothing is due for delivery today.',
  outstanding: (a, l) => `${a} is pending from customers. Most owed: ${l}.`,
  noOutstanding: 'Nobody owes you anything right now.',
  clientBalance: (n, a) => `${n} owes ${a}.`,
  clientNoDue: (n) => `${n} has nothing pending.`,
  clientCount: (n) => `You have ${n} client${n === 1 ? '' : 's'}.`,
  staff: (n, c) => `You have ${n} staff member${n === 1 ? '' : 's'}. Piece-work earned so far: ${c}.`,
  net: (r, c, n) => `Received ${r}, staff piece-work ${c}, so net earnings are ${n}.`,
  recentPayments: (l) => `Latest payments: ${l}.`,
  noPayments: 'No payments have been recorded yet.',
  summary: (o, r, p, d) => `Today: ${o} order${o === 1 ? '' : 's'}, ${r} received. ${p} order${p === 1 ? '' : 's'} not delivered yet and ${d} pending from customers.`,
  unknown: 'I can answer about revenue, orders, deliveries, pending payments, clients and staff — or create an order, add a client, record a payment, or take measurements.',
};

const GU: Strings = {
  todayRevenue: (a, n) => `આજે ${n} પેમેન્ટમાં ${a} મળ્યા.`,
  monthRevenue: (a) => `આ મહિને ${a} મળ્યા છે.`,
  totalRevenue: (a) => `કુલ ${a} મળ્યા છે.`,
  noOrdersToday: 'આજે કોઈ ઓર્ડર બન્યો નથી.',
  todayOrders: (n, names) => `આજે ${n} ઓર્ડર: ${names}.`,
  pendingOrders: (n) => `${n} ઓર્ડર હજી ડિલિવર થયા નથી.`,
  dueToday: (n, names) => `આજે ${n} ડિલિવરી બાકી છે: ${names}.`,
  noDueToday: 'આજે કોઈ ડિલિવરી બાકી નથી.',
  outstanding: (a, l) => `ગ્રાહકો પાસેથી ${a} બાકી છે. સૌથી વધુ: ${l}.`,
  noOutstanding: 'અત્યારે કોઈ પાસેથી કંઈ બાકી નથી.',
  clientBalance: (n, a) => `${n} પાસેથી ${a} બાકી છે.`,
  clientNoDue: (n) => `${n} પાસેથી કંઈ બાકી નથી.`,
  clientCount: (n) => `તમારી પાસે ${n} ગ્રાહક છે.`,
  staff: (n, c) => `તમારી પાસે ${n} સ્ટાફ છે. અત્યાર સુધીનું પીસ-વર્ક ${c}.`,
  net: (r, c, n) => `${r} મળ્યા, સ્ટાફ પીસ-વર્ક ${c}, એટલે ચોખ્ખી કમાણી ${n}.`,
  recentPayments: (l) => `છેલ્લા પેમેન્ટ: ${l}.`,
  noPayments: 'હજી કોઈ પેમેન્ટ નોંધાયું નથી.',
  summary: (o, r, p, d) => `આજે: ${o} ઓર્ડર, ${r} મળ્યા. ${p} ઓર્ડર હજી ડિલિવર થયા નથી અને ગ્રાહકો પાસેથી ${d} બાકી છે.`,
  unknown: 'હું કમાણી, ઓર્ડર, ડિલિવરી, બાકી પેમેન્ટ, ગ્રાહક અને સ્ટાફ વિશે જવાબ આપી શકું — અથવા ઓર્ડર બનાવી, ગ્રાહક ઉમેરી, પેમેન્ટ નોંધી કે માપ લઈ શકું.',
};

const HI: Strings = {
  todayRevenue: (a, n) => `आज ${n} भुगतान में ${a} मिले।`,
  monthRevenue: (a) => `इस महीने ${a} मिले हैं।`,
  totalRevenue: (a) => `कुल ${a} मिले हैं।`,
  noOrdersToday: 'आज कोई ऑर्डर नहीं बना।',
  todayOrders: (n, names) => `आज ${n} ऑर्डर: ${names}।`,
  pendingOrders: (n) => `${n} ऑर्डर अभी डिलीवर नहीं हुए।`,
  dueToday: (n, names) => `आज ${n} डिलीवरी बाकी है: ${names}।`,
  noDueToday: 'आज कोई डिलीवरी बाकी नहीं है।',
  outstanding: (a, l) => `ग्राहकों से ${a} बाकी है। सबसे ज़्यादा: ${l}।`,
  noOutstanding: 'अभी किसी से कुछ बाकी नहीं है।',
  clientBalance: (n, a) => `${n} से ${a} बाकी है।`,
  clientNoDue: (n) => `${n} से कुछ बाकी नहीं है।`,
  clientCount: (n) => `आपके ${n} ग्राहक हैं।`,
  staff: (n, c) => `आपके ${n} स्टाफ हैं। अब तक का पीस-वर्क ${c}।`,
  net: (r, c, n) => `${r} मिले, स्टाफ पीस-वर्क ${c}, यानी शुद्ध कमाई ${n}।`,
  recentPayments: (l) => `हाल के भुगतान: ${l}।`,
  noPayments: 'अभी कोई भुगतान दर्ज नहीं है।',
  summary: (o, r, p, d) => `आज: ${o} ऑर्डर, ${r} मिले। ${p} ऑर्डर अभी डिलीवर नहीं हुए और ग्राहकों से ${d} बाकी है।`,
  unknown: 'मैं कमाई, ऑर्डर, डिलीवरी, बाकी भुगतान, ग्राहक और स्टाफ के बारे में बता सकता हूँ — या ऑर्डर बना, ग्राहक जोड़, भुगतान दर्ज या माप ले सकता हूँ।',
};

const COPY: Record<Lang, Strings> = { en: EN, gu: GU, hi: HI };
export const unknownAnswer = (lang: Lang) => COPY[lang].unknown;

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const nameList = (names: string[], max = 4) => {
  const uniq = [...new Set(names.filter(Boolean))];
  return uniq.slice(0, max).join(', ') + (uniq.length > max ? '…' : '');
};

/** The answer to a shop question, in the asker's language. */
export function answerQuery(topic: QueryTopic, snap: Snapshot, text: string, lang: Lang): string {
  const c = COPY[lang];
  const now = new Date();
  const today = dayKey(now);
  const month = today.slice(0, 7);

  const paymentsToday = snap.payments.filter((p) => localDay(p.payment_date) === today);
  const todaysOrders = snap.orders.filter((o) => o.order_date === today || localDay(o.created_at) === today);
  const pending = snap.orders.filter((o) => o.status !== 'delivered');
  const received = sum(snap.payments.map((p) => Number(p.amount_paid ?? 0)));
  const due = sum(snap.bills.map(pendingOf));

  switch (topic) {
    case 'todayRevenue':
      return c.todayRevenue(formatCurrency(sum(paymentsToday.map((p) => Number(p.amount_paid ?? 0)))), paymentsToday.length);
    case 'monthRevenue':
      return c.monthRevenue(formatCurrency(sum(snap.payments.filter((p) => localDay(p.payment_date).startsWith(month)).map((p) => Number(p.amount_paid ?? 0)))));
    case 'totalRevenue':
      return c.totalRevenue(formatCurrency(received));
    case 'todayOrders':
      return todaysOrders.length === 0 ? c.noOrdersToday : c.todayOrders(todaysOrders.length, nameList(todaysOrders.map((o) => o.customers?.name ?? '')));
    case 'pendingOrders':
      return c.pendingOrders(pending.length);
    case 'dueToday': {
      const list = snap.orders.filter((o) => o.delivery_date === today && o.status !== 'delivered');
      return list.length === 0 ? c.noDueToday : c.dueToday(list.length, nameList(list.map((o) => o.customers?.name ?? '')));
    }
    case 'outstanding': {
      const list = debtors(snap);
      return list.length === 0 ? c.noOutstanding : c.outstanding(formatCurrency(due), list.slice(0, 3).map((d) => `${d.name} ${formatCurrency(d.due)}`).join(', '));
    }
    case 'clientBalance': {
      const client = findClient(snap, text);
      if (!client) return answerQuery('outstanding', snap, text, lang);
      const owed = debtors(snap).find((d) => d.id === client.id)?.due ?? 0;
      return owed > 0 ? c.clientBalance(client.name, formatCurrency(owed)) : c.clientNoDue(client.name);
    }
    case 'clientCount':
      return c.clientCount(snap.customers.length);
    case 'staff':
      return c.staff(snap.staff.length, formatCurrency(snap.staffCost));
    case 'netEarnings':
      return c.net(formatCurrency(received), formatCurrency(snap.staffCost), formatCurrency(received - snap.staffCost));
    case 'recentPayments': {
      const names = new Map(snap.customers.map((x) => [x.id, x.name]));
      const list = [...snap.payments]
        .sort((a, b) => (a.payment_date < b.payment_date ? 1 : -1))
        .slice(0, 3)
        .map((p) => `${names.get(p.customer_id) ?? '—'} ${formatCurrency(Number(p.amount_paid ?? 0))}`);
      return list.length === 0 ? c.noPayments : c.recentPayments(list.join(', '));
    }
    case 'summary':
      return c.summary(todaysOrders.length, formatCurrency(sum(paymentsToday.map((p) => Number(p.amount_paid ?? 0)))), pending.length, formatCurrency(due));
  }
}
