import type { Lang } from './intents';

/** Everything the assistant says or shows, in the language chosen in the app. */
type Copy = {
  // screen
  title: string;
  placeholder: string;
  listening: string;
  thinking: string;
  speakOrType: string;
  restart: string;
  transcript: string;
  phases: string[];
  micPermission: string;
  error: string;
  chipClientType: string[];
  chipYesNo: string[];
  chipGarments: string[];
  chipNo: string[];
  chips: string[];
  // general
  greet: (owner: string) => string;
  more: string;
  help: string;
  goodbye: string;
  okShort: string;
  // clients
  askClientType: string;
  clientTypeRetry: string;
  newClientPrompt: string;
  existingNamePrompt: string;
  phoneMissing: string;
  phoneOnlyMissing: string;
  defaultClient: string;
  addedShort: (name: string) => string;
  noClientFound: string;
  foundShort: (name: string) => string;
  pickedShort: (name: string) => string;
  chooseFromList: (list: string) => string;
  createNewNamed: (name: string) => string;
  pickNumberOrNew: string;
  // measurements
  afterClientMeasure: (prefix: string) => string;
  garmentRetry: string;
  measureSaved: string;
  noFields: string;
  // orders
  afterClientOrder: (prefix: string) => string;
  askTotal: string;
  amountRetry: string;
  askDiscount: string;
  orderAsk: (num: string, total: string, paid: string) => string;
  askClientNumber: string;
  askPieces: string;
  changeMeasure: (name: string) => string;
  noMeasureAdd: (name: string) => string;
  askMeasureNow: string;
  askPaid: string;
  askPayMode: string;
  payModeRetry: string;
  chipPayMode: string[];
  whatsappSent: string;
  whatsappFailed: string;
  // payments
  payWhich: string;
  clientNotFound: string;
  pickClient: (list: string) => string;
  pickNumber: string;
  nothingDue: (name: string) => string;
  owes: (name: string, amount: string) => string;
  askAmount: string;
  amountAgain: string;
  confirmPay: (name: string, amount: string) => string;
  recorded: (name: string, amount: string, left: string) => string;
  cancelled: string;
};

const EN: Copy = {
  title: 'AI Assistant',
  placeholder: 'Type here…',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speakOrType: 'Speak or type',
  restart: 'Start a new conversation',
  transcript: 'Conversation',
  phases: ['Client', 'Items', 'Amount', 'Done'],
  micPermission: 'Microphone permission is needed',
  error: 'Sorry, something went wrong. Please try again.',
  chipClientType: ['New', 'Existing'],
  chipYesNo: ['Yes', 'No'],
  chipGarments: ['Shirt', 'Pant', 'Shirt and pant'],
  chipNo: ['No'],
  chips: ["Today's revenue", 'Who owes me?', "Today's orders", 'New order', 'Add client', 'Record payment'],
  greet: (o) => `Hello ${o}! Ask me about your shop, or tell me what to do.`,
  more: 'Anything else?',
  help: 'You can ask about revenue, orders, deliveries, pending payments, clients or staff — or say: new order, add client, record payment, measurements.',
  goodbye: 'Okay. Call me whenever you need.',
  okShort: 'Okay.',
  askClientType: 'Is the client new or existing? Or say you are not sure.',
  clientTypeRetry: 'Sorry — say new, existing, or not sure.',
  newClientPrompt: "Say the client's name and mobile number.",
  existingNamePrompt: "Say the client's name.",
  phoneMissing: 'I did not catch a mobile number. Say the name and the 10-digit number again.',
  phoneOnlyMissing: 'I did not catch a mobile number. Say the 10-digit number again.',
  defaultClient: 'Client',
  addedShort: (n) => `${n} added`,
  noClientFound: 'No client found. Create a new client?',
  foundShort: (n) => `Found ${n}`,
  pickedShort: (n) => `${n} selected`,
  chooseFromList: (l) => `I found these: ${l}. Which number do you want? Or say "new client" if none of them.`,
  createNewNamed: (n) => `Okay, creating a new client named ${n}. Say the mobile number.`,
  pickNumberOrNew: 'Sorry — say a number like 1 or 2, or say "new client".',
  afterClientMeasure: (p) => `${p}. Shirt measurements or pant measurements? Say both if you need both.`,
  garmentRetry: 'Say shirt or pant — which measurements?',
  measureSaved: 'Measurements saved.',
  noFields: 'No measurement fields are set for that. Add them from Settings.',
  afterClientOrder: (p) => `${p}. How many pieces? Say shirts, pants or pairs.`,
  askTotal: 'What is the total amount?',
  amountRetry: 'Sorry, say the amount again.',
  askDiscount: 'Any discount? Say the amount, or say no.',
  whatsappSent: 'WhatsApp sent.',
  whatsappFailed: 'Could not send WhatsApp.',
  payWhich: 'Whose payment? Say the client name.',
  clientNotFound: 'I could not find that client. Say the name again.',
  pickClient: (l) => `I found: ${l}. Say the number.`,
  pickNumber: 'Say a number like 1 or 2.',
  nothingDue: (n) => `${n} has nothing pending.`,
  owes: (n, a) => `${n} owes ${a}.`,
  askAmount: 'How much did they pay?',
  amountAgain: 'Please say the amount again.',
  confirmPay: (n, a) => `Record ${a} received from ${n}?`,
  recorded: (n, a, l) => `Recorded ${a} from ${n}. ${l}`,
  cancelled: 'Okay, nothing recorded.',
  askClientNumber: "What is the client number?",
  askMeasureNow: "Add measurements now?",
  askPaid: "How much did they pay now? Say the amount, or say no.",
  askPayMode: "Cash or UPI?",
  payModeRetry: "Say cash or UPI.",
  chipPayMode: ['Cash','UPI'],
  orderAsk: (num, t, paid) => `Order #${num} created. Total ${t}.${paid ? ` Received ${paid}.` : ''} Send it on WhatsApp?`,
  askPieces: "How many pieces? Say shirts, pants or pairs.",
  changeMeasure: (n) => `Do you want to change ${n}'s measurements?`,
  noMeasureAdd: (n) => `${n} has no measurements saved. Add them now?`,
};

const GU: Copy = {
  title: 'AI સહાયક',
  placeholder: 'અહીં લખો…',
  listening: 'સાંભળી રહ્યા છીએ...',
  thinking: 'વિચારી રહ્યા છીએ...',
  speakOrType: 'બોલો અથવા લખો',
  restart: 'નવી વાતચીત શરૂ કરો',
  transcript: 'વાતચીત',
  phases: ['ગ્રાહક', 'કપડાં', 'રકમ', 'પૂર્ણ'],
  micPermission: 'માઈક્રોફોનની પરવાનગી જરૂરી છે',
  error: 'માફ કરશો, કંઈક ભૂલ થઈ. ફરી પ્રયત્ન કરો.',
  chipClientType: ['નવો', 'જૂનો'],
  chipYesNo: ['હા', 'ના'],
  chipGarments: ['શર્ટ', 'પેન્ટ', 'શર્ટ પેન્ટ'],
  chipNo: ['ના'],
  chips: ['આજની કમાણી', 'કોણ પાસેથી બાકી છે?', 'આજના ઓર્ડર', 'નવો ઓર્ડર', 'ગ્રાહક ઉમેરો', 'પેમેન્ટ નોંધો'],
  greet: (o) => `નમસ્તે ${o}! તમારી દુકાન વિશે પૂછો, અથવા શું કરવું તે કહો.`,
  more: 'બીજું કંઈ?',
  help: 'તમે કમાણી, ઓર્ડર, ડિલિવરી, બાકી પેમેન્ટ, ગ્રાહક કે સ્ટાફ વિશે પૂછી શકો — અથવા કહો: નવો ઓર્ડર, ગ્રાહક ઉમેરો, પેમેન્ટ નોંધો, માપ.',
  goodbye: 'ઠીક છે. જ્યારે જરૂર પડે ત્યારે બોલાવજો.',
  okShort: 'ઠીક છે.',
  askClientType: 'ગ્રાહક નવો છે કે જૂનો? અથવા ખબર નથી એમ કહો.',
  clientTypeRetry: 'માફ કરશો, નવો, જૂનો, કે ખબર નથી — એમાંથી એક બોલો.',
  newClientPrompt: 'ગ્રાહકનું નામ અને મોબાઈલ નંબર બોલો.',
  existingNamePrompt: 'ગ્રાહકનું નામ બોલો.',
  phoneMissing: 'મોબાઈલ નંબર ના મળ્યો. ફરી નામ અને 10 આંકડાનો નંબર બોલો.',
  phoneOnlyMissing: 'મોબાઈલ નંબર ના મળ્યો. ફરી 10 આંકડાનો નંબર બોલો.',
  defaultClient: 'ગ્રાહક',
  addedShort: (n) => `${n} ઉમેરાયા`,
  noClientFound: 'કોઈ ગ્રાહક ના મળ્યો. નવો ગ્રાહક બનાવીએ?',
  foundShort: (n) => `${n} મળ્યા`,
  pickedShort: (n) => `${n} પસંદ થયા`,
  chooseFromList: (l) => `આ નામ મળ્યા: ${l}. કયો નંબર પસંદ કરો છો? અથવા આમાંથી કોઈ ના હોય તો "નવો ગ્રાહક" બોલો.`,
  createNewNamed: (n) => `ઠીક છે, ${n} નામે નવો ગ્રાહક બનાવીએ. મોબાઈલ નંબર બોલો.`,
  pickNumberOrNew: 'માફ કરશો, નંબર બોલો — 1, 2, વગેરે. અથવા "નવો ગ્રાહક" બોલો.',
  afterClientMeasure: (p) => `${p}. શર્ટ નું માપ કે પેન્ટ નું માપ? બંને હોય તો બંને બોલો.`,
  garmentRetry: 'શર્ટ કે પેન્ટ, કયું માપ બોલો.',
  measureSaved: 'માપ સેવ થઈ ગયું.',
  noFields: 'એના માટે કોઈ માપ ફીલ્ડ સેટ નથી. સેટિંગ્સ માંથી ઉમેરો.',
  afterClientOrder: (p) => `${p}. કેટલા કપડાં છે? શર્ટ, પેન્ટ કે જોડ બોલો.`,
  askTotal: 'કુલ રકમ કેટલી છે?',
  amountRetry: 'માફ કરશો, રકમ ફરી બોલો.',
  askDiscount: 'કોઈ ડિસ્કાઉન્ટ આપવો છે? રકમ બોલો, અથવા ના કહો.',
  whatsappSent: 'WhatsApp મોકલી દીધો.',
  whatsappFailed: 'WhatsApp મોકલી ના શકાયો.',
  payWhich: 'કોનું પેમેન્ટ? ગ્રાહકનું નામ બોલો.',
  clientNotFound: 'એ ગ્રાહક ના મળ્યો. નામ ફરી બોલો.',
  pickClient: (l) => `આ મળ્યા: ${l}. નંબર બોલો.`,
  pickNumber: 'નંબર બોલો, જેમ કે 1 કે 2.',
  nothingDue: (n) => `${n} પાસેથી કંઈ બાકી નથી.`,
  owes: (n, a) => `${n} પાસેથી ${a} બાકી છે.`,
  askAmount: 'કેટલા ચૂકવ્યા?',
  amountAgain: 'રકમ ફરી બોલો.',
  confirmPay: (n, a) => `${n} પાસેથી ${a} મળ્યા એમ નોંધું?`,
  recorded: (n, a, l) => `${n} પાસેથી ${a} નોંધ્યા. ${l}`,
  cancelled: 'ઠીક છે, કંઈ નોંધ્યું નથી.',
  askClientNumber: "ગ્રાહક નંબર શું છે?",
  askMeasureNow: "હમણાં માપ ઉમેરીએ?",
  askPaid: "અત્યારે કેટલા ચૂકવ્યા? રકમ બોલો, અથવા ના કહો.",
  askPayMode: "રોકડ કે UPI?",
  payModeRetry: "રોકડ કે UPI બોલો.",
  chipPayMode: ['રોકડ','UPI'],
  orderAsk: (num, t, paid) => `ઓર્ડર #${num} બની ગયો છે. કુલ રકમ ${t}.${paid ? ` ${paid} મળ્યા.` : ''} WhatsApp પર મોકલું?`,
  askPieces: "કેટલા કપડાં છે? શર્ટ, પેન્ટ કે જોડ બોલો.",
  changeMeasure: (n) => `${n} નું માપ બદલવું છે?`,
  noMeasureAdd: (n) => `${n} નું માપ સેવ નથી. હમણાં ઉમેરીએ?`,
};

const HI: Copy = {
  title: 'AI सहायक',
  placeholder: 'यहाँ लिखें…',
  listening: 'सुन रहे हैं…',
  thinking: 'सोच रहे हैं…',
  speakOrType: 'बोलें या लिखें',
  restart: 'नई बातचीत शुरू करें',
  transcript: 'बातचीत',
  phases: ['ग्राहक', 'कपड़े', 'रकम', 'पूरा'],
  micPermission: 'माइक्रोफ़ोन की अनुमति चाहिए',
  error: 'माफ़ कीजिए, कुछ गड़बड़ हो गई। फिर कोशिश करें।',
  chipClientType: ['नया', 'पुराना'],
  chipYesNo: ['हाँ', 'नहीं'],
  chipGarments: ['शर्ट', 'पैंट', 'शर्ट और पैंट'],
  chipNo: ['नहीं'],
  chips: ['आज की कमाई', 'किससे बकाया है?', 'आज के ऑर्डर', 'नया ऑर्डर', 'ग्राहक जोड़ें', 'पेमेंट दर्ज करें'],
  greet: (o) => `नमस्ते ${o}! अपनी दुकान के बारे में पूछें, या बताएं क्या करना है।`,
  more: 'और कुछ?',
  help: 'आप कमाई, ऑर्डर, डिलीवरी, बाकी भुगतान, ग्राहक या स्टाफ के बारे में पूछ सकते हैं — या कहें: नया ऑर्डर, ग्राहक जोड़ें, पेमेंट दर्ज करें, माप।',
  goodbye: 'ठीक है। जब ज़रूरत हो बुला लेना।',
  okShort: 'ठीक है।',
  askClientType: 'ग्राहक नया है या पुराना? या कहें पता नहीं।',
  clientTypeRetry: 'माफ़ कीजिए — नया, पुराना, या पता नहीं, इनमें से एक बोलें।',
  newClientPrompt: 'ग्राहक का नाम और मोबाइल नंबर बोलें।',
  existingNamePrompt: 'ग्राहक का नाम बोलें।',
  phoneMissing: 'मोबाइल नंबर नहीं मिला। फिर से नाम और 10 अंकों का नंबर बोलें।',
  phoneOnlyMissing: 'मोबाइल नंबर नहीं मिला। फिर से 10 अंकों का नंबर बोलें।',
  defaultClient: 'ग्राहक',
  addedShort: (n) => `${n} जुड़ गए`,
  noClientFound: 'कोई ग्राहक नहीं मिला। नया ग्राहक बनाएं?',
  foundShort: (n) => `${n} मिले`,
  pickedShort: (n) => `${n} चुने गए`,
  chooseFromList: (l) => `ये मिले: ${l}। कौन सा नंबर चुनें? या इनमें से कोई नहीं तो "नया ग्राहक" बोलें।`,
  createNewNamed: (n) => `ठीक है, ${n} नाम से नया ग्राहक बनाते हैं। मोबाइल नंबर बोलें।`,
  pickNumberOrNew: 'माफ़ कीजिए — 1, 2 जैसा नंबर बोलें, या "नया ग्राहक" बोलें।',
  afterClientMeasure: (p) => `${p}। शर्ट का माप या पैंट का माप? दोनों चाहिए तो दोनों बोलें।`,
  garmentRetry: 'शर्ट या पैंट, कौन सा माप बोलें।',
  measureSaved: 'माप सेव हो गया।',
  noFields: 'इसके लिए कोई माप फ़ील्ड सेट नहीं है। सेटिंग्स से जोड़ें।',
  afterClientOrder: (p) => `${p}। कितने कपड़े हैं? शर्ट, पैंट या जोड़ी बोलें।`,
  askTotal: 'कुल रकम कितनी है?',
  amountRetry: 'माफ़ कीजिए, रकम फिर बोलें।',
  askDiscount: 'कोई डिस्काउंट देना है? रकम बोलें, या नहीं कहें।',
  whatsappSent: 'WhatsApp भेज दिया।',
  whatsappFailed: 'WhatsApp नहीं भेजा जा सका।',
  payWhich: 'किसका भुगतान? ग्राहक का नाम बोलें।',
  clientNotFound: 'वह ग्राहक नहीं मिला। नाम फिर बोलें।',
  pickClient: (l) => `ये मिले: ${l}। नंबर बोलें।`,
  pickNumber: 'नंबर बोलें, जैसे 1 या 2।',
  nothingDue: (n) => `${n} से कुछ बाकी नहीं है।`,
  owes: (n, a) => `${n} से ${a} बाकी है।`,
  askAmount: 'कितने दिए?',
  amountAgain: 'रकम फिर बोलें।',
  confirmPay: (n, a) => `${n} से ${a} मिले, दर्ज करूँ?`,
  recorded: (n, a, l) => `${n} से ${a} दर्ज किए। ${l}`,
  cancelled: 'ठीक है, कुछ दर्ज नहीं किया।',
  askClientNumber: "ग्राहक नंबर क्या है?",
  askMeasureNow: "अभी माप जोड़ें?",
  askPaid: "अभी कितने दिए? रकम बोलें, या नहीं कहें।",
  askPayMode: "नकद या UPI?",
  payModeRetry: "नकद या UPI बोलें।",
  chipPayMode: ['नकद','UPI'],
  orderAsk: (num, t, paid) => `ऑर्डर #${num} बन गया। कुल रकम ${t}।${paid ? ` ${paid} मिले।` : ''} WhatsApp पर भेजूं?`,
  askPieces: "कितने कपड़े हैं? शर्ट, पैंट या जोड़ी बोलें।",
  changeMeasure: (n) => `${n} का माप बदलना है?`,
  noMeasureAdd: (n) => `${n} का माप सेव नहीं है। अभी जोड़ें?`,
};

export const COPY: Record<Lang, Copy> = { en: EN, gu: GU, hi: HI };

export const TTS_CODE: Record<Lang, 'gu-IN' | 'en-IN' | 'hi-IN'> = { gu: 'gu-IN', en: 'en-IN', hi: 'hi-IN' };
