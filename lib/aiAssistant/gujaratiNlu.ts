/**
 * Small rule-based parsers for the Gujarati voice order assistant. There's no
 * LLM behind this bot — every "understood" answer here is a keyword/pattern
 * match against what the speech recognizer transcribes, so it only covers the
 * phrasings a shop owner is realistically going to use for each question.
 */

const YES_WORDS = ['હા', 'હ', 'ha', 'haa', 'han', 'yes', 'ok', 'okay', 'બરાબર', 'हाँ', 'हां', 'जी', 'ठीक', 'सही', 'बिल्कुल'];
const NO_WORDS = ['ના', 'નહિ', 'નહીં', 'na', 'nahi', 'nahin', 'no', 'નકો', 'नहीं', 'नही', 'ना'];

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function containsAny(text: string, words: string[]): boolean {
  const n = normalize(text);
  return words.some((w) => n.includes(w.toLowerCase()));
}

export function parseYesNo(text: string): boolean | null {
  if (containsAny(text, NO_WORDS)) return false;
  if (containsAny(text, YES_WORDS)) return true;
  return null;
}

export type ClientType = 'new' | 'existing' | 'unknown';

const NEW_CLIENT_WORDS = ['નવો', 'નવો ગ્રાહક', 'navo', 'new', 'नया', 'नई'];
const EXISTING_CLIENT_WORDS = ['જૂનો', 'જુનો', 'juno', 'old', 'existing', 'पुराना', 'पुराने', 'पुरानी'];
const UNKNOWN_CLIENT_WORDS = ['ખબર નથી', 'khabar nathi', 'nathi khabar', "don't know", 'khabar nathi', 'पता नहीं', 'not sure', 'unsure'];

export function parseClientType(text: string): ClientType | null {
  if (containsAny(text, UNKNOWN_CLIENT_WORDS)) return 'unknown';
  if (containsAny(text, NEW_CLIENT_WORDS)) return 'new';
  if (containsAny(text, EXISTING_CLIENT_WORDS)) return 'existing';
  return null;
}

export type GarmentChoice = 'Shirt' | 'Pant' | 'Shirt+Pant';

const SHIRT_WORDS = ['શર્ટ', 'shirt', 'khamis', 'शर्ट', 'कमीज'];
const PANT_WORDS = ['પેન્ટ', 'pant', 'trouser', 'पैंट', 'पेंट', 'पतलून'];

export function parseGarmentChoice(text: string): GarmentChoice | null {
  const hasShirt = containsAny(text, SHIRT_WORDS);
  const hasPant = containsAny(text, PANT_WORDS);
  if (hasShirt && hasPant) return 'Shirt+Pant';
  if (hasShirt) return 'Shirt';
  if (hasPant) return 'Pant';
  return null;
}

/** A small Gujarati number-word fallback for when the recognizer transcribes
 * spoken digits as words instead of numerals (most recognizers give numerals,
 * so this only needs to cover common small numbers). */
const GUJARATI_NUMBER_WORDS: Record<string, number> = {
  એક: 1,
  બે: 2,
  ત્રણ: 3,
  ચાર: 4,
  પાંચ: 5,
  છ: 6,
  સાત: 7,
  આઠ: 8,
  નવ: 9,
  દસ: 10,
  // Hindi
  एक: 1,
  दो: 2,
  तीन: 3,
  चार: 4,
  पांच: 5,
  पाँच: 5,
  छह: 6,
  छः: 6,
  सात: 7,
  आठ: 8,
  नौ: 9,
  दस: 10,
};

/** First number found in free-form speech — digits first, then Gujarati number words. */
export function extractFirstNumber(text: string): number | null {
  const digitMatch = text.match(/\d+(\.\d+)?/);
  if (digitMatch) return Number(digitMatch[0]);

  const n = normalize(text);
  for (const [word, value] of Object.entries(GUJARATI_NUMBER_WORDS)) {
    if (n.includes(word)) return value;
  }
  return null;
}

/** A 10-digit Indian mobile number anywhere in the utterance. */
/**
 * The 10-digit mobile number in a sentence. Digits may be spoken in groups
 * ("90000 00003", "9000-000-003"), and a digit stuck to the name ("Bot2") must not
 * leak into the number, so this takes the LAST 10 digits of the digit run.
 */
export function extractPhoneNumber(text: string): string | null {
  const runs = text.match(/\d(?:[\s-]?\d)*/g) ?? [];
  for (let i = runs.length - 1; i >= 0; i--) {
    const digits = runs[i].replace(/\D/g, '');
    if (digits.length >= 10) return digits.slice(-10);
  }
  return null;
}

/** Strips the phone number and filler words out of "name + phone" speech, leaving just the name (digits in the name are kept). */
export function extractNameAroundPhone(text: string, phone: string | null): string {
  let cleaned = text;
  if (phone) {
    // remove those 10 digits wherever they are, even when spoken in groups
    const pattern = new RegExp(phone.split('').join('[\\s-]?'));
    cleaned = cleaned.replace(pattern, ' ');
  }
  const fillers = ['naam', 'name', 'નામ', 'mobile', 'number', 'નંબર', 'મોબાઈલ', 'છે', 'ane', 'અને', 'नाम', 'मोबाइल', 'नंबर', 'और', 'है'];
  for (const f of fillers) {
    cleaned = cleaned.replace(new RegExp(f, 'gi'), ' ');
  }
  cleaned = cleaned.replace(/\+\s*91/g, ' ');
  return cleaned.replace(/\s+/g, ' ').trim();
}

const NAME_FILLER_WORDS = [
  'ગ્રાહકનું નામ',
  'ગ્રાહકનુ નામ',
  'ગ્રાહકનું',
  'નામ',
  'naam',
  'name',
  'graahak',
  'ग्राहक',
  'नाम',
  'है',
  'છે',
  'chhe',
  'che',
  'is',
  'નો',
  'ની',
  'નું',
];

/** Strips "customer's name is ___" filler down to just the spoken name. */
export function cleanSpokenName(text: string): string {
  let cleaned = text.replace(/\d+/g, ' ');
  for (const f of NAME_FILLER_WORDS) {
    cleaned = cleaned.replace(new RegExp(f, 'gi'), ' ');
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Whether a saved customer name plausibly matches a spoken search query.
 * Speech recognition rarely transcribes a name back exactly the way it's
 * stored, so this checks substrings in both directions plus any shared word,
 * rather than requiring the whole utterance to literally contain the name.
 */
export function customerNameMatches(query: string, customerName: string): boolean {
  const q = normalize(cleanSpokenName(query));
  const name = normalize(customerName);
  if (!q) return false;
  if (name.includes(q) || q.includes(name)) return true;

  const qWords = q.split(/\s+/).filter((w) => w.length >= 2);
  const nameWords = name.split(/\s+/).filter((w) => w.length >= 2);
  return qWords.some((w) => nameWords.some((nw) => nw.includes(w) || w.includes(nw)));
}

export type ClothOrderSummary = { shirtCount: number; pantCount: number };

const PAIR_WORDS = ['જોડ', 'jod', 'pair', 'जोड़ी', 'जोड़'];

/**
 * Parses free-form speech about how many pieces of clothing, e.g. "બે જોડ
 * કપડાં અને એક વધારે શર્ટ" (two pairs of clothes and one extra shirt) into
 * shirt/pant counts. A "pair" counts as one shirt + one pant.
 */
export function parseClothCounts(text: string): ClothOrderSummary {
  const n = normalize(text);
  let shirtCount = 0;
  let pantCount = 0;

  const pairMatch = PAIR_WORDS.map((w) => {
    const idx = n.indexOf(w);
    if (idx === -1) return null;
    const before = n.slice(0, idx);
    const num = extractFirstNumber(before) ?? 1;
    return num;
  }).find((v) => v !== null);
  if (pairMatch) {
    shirtCount += pairMatch;
    pantCount += pairMatch;
  }

  const shirtIdx = SHIRT_WORDS.map((w) => n.indexOf(w)).find((i) => i !== -1);
  if (shirtIdx !== undefined && shirtIdx !== -1) {
    const before = n.slice(0, shirtIdx);
    shirtCount += extractFirstNumber(before) ?? 1;
  }

  const pantIdx = PANT_WORDS.map((w) => n.indexOf(w)).find((i) => i !== -1);
  if (pantIdx !== undefined && pantIdx !== -1) {
    const before = n.slice(0, pantIdx);
    pantCount += extractFirstNumber(before) ?? 1;
  }

  // Nothing recognizable — fall back to treating the first spoken number as a
  // plain piece count of one shirt-equivalent item.
  if (shirtCount === 0 && pantCount === 0) {
    const fallback = extractFirstNumber(text) ?? 1;
    shirtCount = fallback;
  }

  return { shirtCount, pantCount };
}

/**
 * Customers a spoken name refers to. A full-name match ("test manual" → Test Manual)
 * wins over a single shared word ("test" also appears in Test Bot), so the owner is
 * only asked to choose when the name really is ambiguous.
 */
export function findCustomerMatches<T extends { name: string }>(query: string, customers: T[]): T[] {
  const loose = customers.filter((c) => customerNameMatches(query, c.name));
  const q = normalize(cleanSpokenName(query));
  const strong = loose.filter((c) => {
    const name = normalize(c.name);
    return name === q || name.includes(q) || q.includes(name);
  });
  return strong.length > 0 ? strong : loose;
}

/** Cash or UPI from free speech; null when neither was said. */
export function parsePaymentMode(text: string): 'Cash' | 'UPI' | null {
  const n = normalize(text);
  if (/upi|gpay|google pay|phonepe|paytm|online|યુપીઆઈ|यूपीआई|ઓનલાઇન|ऑनलाइन/.test(n)) return 'UPI';
  if (/cash|રોકડ|કેશ|નગદ|नकद|कैश|रोकड़/.test(n)) return 'Cash';
  return null;
}
