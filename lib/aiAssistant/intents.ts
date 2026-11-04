/**
 * Works out what the owner is asking the assistant to do. There is no LLM behind
 * the assistant, so this is keyword matching in English, Gujarati and Hindi
 * (including the Roman-script spellings people actually say/type).
 */

export type Lang = 'gu' | 'en' | 'hi';

export function detectLang(text: string, fallback: Lang = 'en'): Lang {
  if (/[઀-૿]/.test(text)) return 'gu';
  if (/[ऀ-ॿ]/.test(text)) return 'hi';
  return /[a-z]/i.test(text) ? 'en' : fallback;
}

export type QueryTopic =
  | 'todayRevenue'
  | 'monthRevenue'
  | 'totalRevenue'
  | 'todayOrders'
  | 'pendingOrders'
  | 'dueToday'
  | 'outstanding'
  | 'clientBalance'
  | 'clientCount'
  | 'staff'
  | 'netEarnings'
  | 'recentPayments'
  | 'summary';

export type Intent =
  | { kind: 'order' }
  | { kind: 'addClient' }
  | { kind: 'payment' }
  | { kind: 'measurement' }
  | { kind: 'query'; topic: QueryTopic }
  | { kind: 'unknown' };

const has = (t: string, words: string[]) => words.some((w) => t.includes(w));

// words that mean "do it", as opposed to "tell me about it"
const DO_WORDS = [
  'add', 'create', 'new', 'make', 'record', 'enter', 'take', 'save', 'book', 'start',
  'બનાવ', 'ઉમેર', 'નોંધ', 'નવો', 'નવી', 'નવું', 'સેવ', 'શરૂ',
  'नया', 'नई', 'जोड़', 'बना', 'दर्ज', 'लिख', 'शुरू',
  'banao', 'navo', 'navi', 'umero', 'jodo', 'naya',
];
const ORDER_WORDS = ['order', 'ઓર્ડર', 'ऑर्डर', 'ordar', 'orders'];
const CLIENT_WORDS = ['client', 'customer', 'ગ્રાહક', 'ग्राहक', 'grahak', 'gruhak', 'party'];
const PAYMENT_WORDS = ['payment', 'paid', 'received', 'collect', 'પેમેન્ટ', 'ચૂકવણી', 'ચુકવણી', 'જમા', 'પૈસા મળ્યા', 'पेमेंट', 'भुगतान', 'जमा', 'पैसे मिले', 'paisa mila', 'jama'];
const MEASURE_WORDS = ['measurement', 'measure', 'માપ', 'माप', 'maap', 'naap'];

const REVENUE_WORDS = ['revenue', 'income', 'earning', 'earnings', 'collection', 'sales', 'turnover', 'કમાણી', 'આવક', 'વકરો', 'કલેક્શન', 'कमाई', 'आमदनी', 'आय', 'कलेक्शन', 'kamai', 'aavak', 'avak'];
const TODAY_WORDS = ['today', 'aaj', 'આજ', 'आज', 'aje'];
const MONTH_WORDS = ['month', 'monthly', 'મહિન', 'महीन', 'mahina', 'mahine'];
const DUE_WORDS = ['due', 'pending', 'outstanding', 'balance', 'owe', 'owes', 'remaining', 'baki', 'baaki', 'બાકી', 'બાકી', 'ઉધાર', 'उधार', 'बकाया', 'बाकी', 'बैलेंस'];
const WHO_WORDS = ['who', 'which', 'kon', 'કોણ', 'કયા', 'कौन', 'किस', 'list', 'top'];
const DELIVERY_WORDS = ['deliver', 'delivery', 'ડિલિવરી', 'डिलीवरी', 'dilivari', 'due date'];
const STAFF_WORDS = ['staff', 'worker', 'tailor', 'employee', 'karigar', 'સ્ટાફ', 'કારીગર', 'કર્મચારી', 'स्टाफ', 'कारीगर', 'कर्मचारी', 'salary', 'wage', 'પગાર', 'वेतन', 'तनख्वाह'];
const COUNT_WORDS = ['how many', 'count', 'total', 'number of', 'કેટલા', 'કેટલી', 'कितने', 'कितनी', 'ketla', 'ketli', 'kitne'];
const PROFIT_WORDS = ['profit', 'net', 'નફો', 'मुनाफा', 'नफा', 'nafo', 'munafa'];
const SUMMARY_WORDS = ['summary', 'overview', 'status', 'report', 'update', 'how is', 'how are', 'સારાંશ', 'રિપોર્ટ', 'हाल', 'रिपोर्ट', 'सारांश', 'dashboard'];
const RECENT_PAY_WORDS = ['recent payment', 'last payment', 'latest payment', 'payments', 'છેલ્લા પેમેન્ટ', 'છેલ્લી ચુકવણી', 'हाल के भुगतान'];

export function detectIntent(raw: string): Intent {
  const t = raw.trim().toLowerCase();
  if (!t) return { kind: 'unknown' };

  const doing = has(t, DO_WORDS);
  const asksQuestion = /\?|\b(how|what|which|who|when|show|tell|give|list)\b/.test(t) || has(t, [...COUNT_WORDS, ...WHO_WORDS, 'કેટલું', 'શું', 'बताओ', 'कितना', 'क्या', 'બતાવો', 'કહો']);

  // commands first, unless the sentence is clearly a question
  if (doing && !asksQuestion) {
    if (has(t, MEASURE_WORDS)) return { kind: 'measurement' };
    if (has(t, PAYMENT_WORDS)) return { kind: 'payment' };
    if (has(t, ORDER_WORDS)) return { kind: 'order' };
    if (has(t, CLIENT_WORDS)) return { kind: 'addClient' };
  }
  // "record a payment" / "payment aayi" style without a doing word
  if (has(t, PAYMENT_WORDS) && !asksQuestion && !has(t, REVENUE_WORDS)) return { kind: 'payment' };

  // ── questions about the shop
  if (has(t, PROFIT_WORDS)) return { kind: 'query', topic: 'netEarnings' };
  if (has(t, STAFF_WORDS)) return { kind: 'query', topic: 'staff' };
  if (has(t, REVENUE_WORDS)) {
    if (has(t, TODAY_WORDS)) return { kind: 'query', topic: 'todayRevenue' };
    if (has(t, MONTH_WORDS)) return { kind: 'query', topic: 'monthRevenue' };
    return { kind: 'query', topic: 'totalRevenue' };
  }
  if (has(t, RECENT_PAY_WORDS)) return { kind: 'query', topic: 'recentPayments' };
  if (has(t, DUE_WORDS)) {
    // "<name> balance" vs "who owes money" — the screen checks for a client name
    return { kind: 'query', topic: has(t, WHO_WORDS) ? 'outstanding' : 'clientBalance' };
  }
  if (has(t, DELIVERY_WORDS)) return { kind: 'query', topic: 'dueToday' };
  if (has(t, ORDER_WORDS)) {
    if (has(t, ['pending', 'open', 'incomplete', 'બાકી', 'चल रहे', 'अधूरे'])) return { kind: 'query', topic: 'pendingOrders' };
    return { kind: 'query', topic: 'todayOrders' };
  }
  if (has(t, CLIENT_WORDS) && has(t, COUNT_WORDS)) return { kind: 'query', topic: 'clientCount' };
  if (has(t, SUMMARY_WORDS)) return { kind: 'query', topic: 'summary' };

  // bare commands ("new order", "નવો ઓર્ડર") are caught above; bare nouns fall through
  if (has(t, MEASURE_WORDS)) return { kind: 'measurement' };
  if (has(t, CLIENT_WORDS) && doing) return { kind: 'addClient' };
  if (has(t, ORDER_WORDS)) return { kind: 'order' };
  if (has(t, PAYMENT_WORDS)) return { kind: 'payment' };
  return { kind: 'unknown' };
}
