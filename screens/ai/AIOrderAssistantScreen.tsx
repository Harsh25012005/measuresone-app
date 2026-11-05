import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Pressable } from '../../components/ds/Pressable';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { AiOrb } from '../../components/ds/AiAssistant';
import { DSBottomSheet } from '../../components/ds/BottomSheet';
import { GlassButton } from '../../components/ds/Screen';
import { IconChevronLeft, IconMessageCircle, IconMicrophone, IconRefresh, IconSend } from '../../components/ds/icons';
import { useToast } from '../../components/ui';
import { useHeroStatusBar } from '../../context/StatusBarContext';
import { useTheme } from '../../context/ThemeContext';
import { primary, status, typography } from '../../constants/tokens';
import { billsRepo, customerMeasurementsRepo, customersRepo, ordersRepo, paymentsRepo } from '../../lib/data/repository';
import { suggestDeliveryDate } from '../../lib/orderScheduling';
import { formatCurrency } from '../../lib/format';
import { sendWhatsAppMessage, buildAiOrderConfirmationMessage } from '../../lib/whatsapp';
import { useShop } from '../../context/AuthContext';
import {
  parseYesNo,
  parseClientType,
  parseGarmentChoice,
  extractFirstNumber,
  extractPhoneNumber,
  extractNameAroundPhone,
  cleanSpokenName,
  findCustomerMatches,
  parsePaymentMode,
  parseClothCounts,
} from '../../lib/aiAssistant/gujaratiNlu';
import { detectIntent, type Lang } from '../../lib/aiAssistant/intents';
import { COPY, TTS_CODE } from '../../lib/aiAssistant/copy';
import { answerQuery, loadSnapshot, unknownAnswer } from '../../lib/aiAssistant/insights';
import { applyPayment, buildMeasurementPlan, clientDue, toMeasurements, type MeasurementPlan } from '../../lib/aiAssistant/actions';
import type { DashboardScreenProps } from '../../navigation/types';
import type { Tables } from '../../lib/database.types';

type Customer = Tables<'customers'>;

type Step =
  | 'greeting'
  | 'askIntent'
  | 'askClientType'
  | 'collectNewClient'
  | 'collectNewClientName'
  | 'askClientNumber'
  | 'askMeasureNow'
  | 'askChangeMeasure'
  | 'collectNewClientPhoneOnly'
  | 'collectExistingClientSearch'
  | 'chooseClientFromList'
  | 'confirmCreateNewFallback'
  | 'askGarmentForMeasurement'
  | 'collectMeasurementField'
  | 'askClothCount'
  | 'askTotalAmount'
  | 'askDiscount'
  | 'askPaid'
  | 'askPaymentMode'
  | 'confirmWhatsApp'
  | 'collectPaymentClient'
  | 'choosePaymentClient'
  | 'collectPaymentAmount'
  | 'collectPaymentMode'
  | 'confirmPayment'
  | 'done';

/** What the owner asked for; steps are shared between flows, so this decides where they go next. */
type Mode = '' | 'order' | 'client' | 'measurement' | 'payment';

type LogEntry = { who: 'ai' | 'user'; text: string };

/** Same numbering scheme as OrderFormScreen's nextOrderNumber — highest existing "ORD-N" + 1. */
async function nextOrderNumber(shopId: string): Promise<string> {
  const orders = await ordersRepo.list(shopId);
  const highest = orders.reduce((max, row) => {
    const n = Number(row.order_number?.match(/(\d+)$/)?.[1] ?? 0);
    return n > max ? n : max;
  }, 0);
  return `ORD-${highest + 1}`;
}

/** All the state accumulated across the conversation — kept out of React state
 * since it's only ever read/written from the step-advance handler, never rendered directly. */
type Session = {
  mode: Mode;
  /** Language of the owner's last message — answers come back in it. */
  lang: Lang;
  customer: Customer | null;
  matches: Customer[];
  plan: MeasurementPlan | null;
  garmentType: string;
  fieldValues: Record<string, string>;
  fieldIndex: number;
  clothType: string;
  clothCount: number;
  totalAmount: number;
  discount: number;
  lastOrderNumber: string;
  /** The cleaned name from a failed existing-client search — reused so the
   * new-client fallback doesn't make the owner repeat the name. */
  pendingName: string;
  pendingPhone: string;
  /** Measurements were started from inside an order: carry on with the order afterwards. */
  returnToOrder: boolean;
  paid: number;
  payDue: number;
  payAmount: number;
  payMode: string;
};

function newSession(lang: Lang): Session {
  return {
    mode: '',
    lang,
    customer: null,
    matches: [],
    plan: null,
    garmentType: '',
    fieldValues: {},
    fieldIndex: 0,
    clothType: '',
    clothCount: 0,
    totalAmount: 0,
    discount: 0,
    lastOrderNumber: '',
    pendingName: '',
    pendingPhone: '',
    returnToOrder: false,
    paid: 0,
    payDue: 0,
    payAmount: 0,
    payMode: 'Cash',
  };
}

export default function AIOrderAssistantScreen({ navigation }: DashboardScreenProps<'AIOrderAssistant'>) {
  const shop = useShop();
  const showToast = useToast();
  const { i18n } = useTranslation();
  const appLang: Lang = i18n.language === 'gu' || i18n.language === 'hi' ? i18n.language : 'en';
  const c = COPY[appLang];

  const [log, setLog] = useState<LogEntry[]>([]);
  const [step, setStep] = useState<Step>('greeting');
  const [flow, setFlow] = useState<Mode>('');
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const { colors } = useTheme();
  const session = useRef<Session>(newSession(appLang));
  const scrollRef = useRef<ScrollView>(null);
  // Mirrors `step` so speech-recognition callbacks (registered once) see the live value.
  const stepRef = useRef<Step>('greeting');
  stepRef.current = step;
  // Did the current listening session produce a transcript? And how many silent
  // sessions in a row while collecting measurements (so we re-ask instead of stalling).
  const heardRef = useRef(false);
  const emptyRetries = useRef(0);

  useHeroStatusBar();
  const insets = useSafeAreaInsets();
  const [showTranscript, setShowTranscript] = useState(false);

  // the orb "breathes" while thinking and sends out rings while the mic is open
  const ring = useSharedValue(0);
  const breathe = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(ring);
    ring.value = 0;
    if (listening) ring.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false);
  }, [listening, ring]);
  useEffect(() => {
    cancelAnimation(breathe);
    breathe.value = 0;
    if (busy) breathe.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 700 })), -1, false);
  }, [busy, breathe]);
  const ringA = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - ring.value), transform: [{ scale: 1 + 0.9 * ring.value }] }));
  const ringB = useAnimatedStyle(() => {
    const t = (ring.value + 0.5) % 1;
    return { opacity: 0.35 * (1 - t), transform: [{ scale: 1 + 0.9 * t }] };
  });
  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.06 * breathe.value + (listening ? 0.04 : 0) }] }));

  // Hides the bottom tab bar while this full-screen conversation is open —
  // see CustomTabBar's descriptor-based display:none check.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => navigation.getParent()?.setOptions({ tabBarStyle: undefined });
    }, [navigation])
  );

  const appendLog = useCallback((entry: LogEntry) => {
    setLog((prev) => [...prev, entry]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  /** Speaks a line, logs it, then opens the mic for the reply (unless this is a
   * terminal line). `tts` is the voice language, `lang` the recognizer language
   * for the reply — client names/phone numbers are typically spoken or stored in
   * English/Latin script, so those prompts listen in en-IN. The order flow's own
   * prompts are Gujarati, so both default to gu-IN. */
  const speak = useCallback(
    (text: string, opts?: { listenAfter?: boolean; lang?: 'gu-IN' | 'en-IN' | 'hi-IN'; tts?: 'gu-IN' | 'en-IN' | 'hi-IN' }) => {
      appendLog({ who: 'ai', text });
      const listenAfter = opts?.listenAfter ?? true;
      const lang = opts?.lang ?? TTS_CODE[appLang];
      // `onError` matters: if the device lacks the Gujarati/Hindi voice the line is never
      // spoken and onDone never fires, which used to leave the flow stuck on one field.
      let proceeded = false;
      const proceed = () => {
        if (proceeded) return;
        proceeded = true;
        if (listenAfter) void startListening(lang);
      };
      Speech.speak(text, {
        language: opts?.tts ?? TTS_CODE[appLang],
        onDone: proceed,
        onError: proceed,
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [appendLog, appLang]
  );

  /** A line in the owner's own language (answers, payments, new-client prompts). */
  const say = (text: string, lang: Lang, opts?: { listenAfter?: boolean; lang?: 'gu-IN' | 'en-IN' | 'hi-IN' }) =>
    speak(text, { ...opts, tts: TTS_CODE[lang], lang: opts?.lang ?? TTS_CODE[lang] });

  const startListening = async (lang: 'gu-IN' | 'en-IN' | 'hi-IN' = TTS_CODE[appLang]) => {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      showToast(c.micPermission, 'error');
      return;
    }
    setListening(true);
    heardRef.current = false;
    ExpoSpeechRecognitionModule.start({ lang, interimResults: false, continuous: false });
  };
  const stopListening = () => ExpoSpeechRecognitionModule.stop();

  /** Says the field the measurement flow is currently waiting on. */
  const askCurrentField = (prefix = '') => {
    const s = session.current;
    const item = s.plan?.items[s.fieldIndex];
    if (!item) return;
    speak(`${prefix}${item.group ? item.group + ' ' : ''}${item.name}?`);
  };

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) {
      heardRef.current = true;
      emptyRetries.current = 0;
      void handleUserReply(transcript);
    }
  });
  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    // Silence / no match while collecting measurements: ask the same field again
    // rather than going quiet (a few tries, then leave the mic button to the user).
    if (!heardRef.current && stepRef.current === 'collectMeasurementField' && emptyRetries.current < 3) {
      emptyRetries.current += 1;
      askCurrentField();
    }
  });
  useSpeechRecognitionEvent('error', () => setListening(false));

  const setMode = (mode: Mode) => {
    session.current.mode = mode;
    setFlow(mode);
  };

  /** Back to "what next?" after any task or answer. */
  const backToIdle = (line: string, lang: Lang) => {
    session.current.returnToOrder = false;
    setMode('');
    setStep('askIntent');
    say(`${line} ${COPY[lang].more}`, lang);
  };

  const greet = () => {
    const ownerName = shop.owner_name || shop.shop_name || (appLang === 'gu' ? 'શેઠ' : 'there');
    session.current = newSession(appLang);
    setMode('');
    setStep('askIntent');
    say(COPY[appLang].greet(ownerName), appLang);
  };

  // Kick off the conversation once, on mount.
  useEffect(() => {
    greet();
    return () => {
      Speech.stop();
      ExpoSpeechRecognitionModule.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUserReply = async (transcript: string) => {
    appendLog({ who: 'user', text: transcript });
    setBusy(true);
    try {
      await advance(transcript);
    } catch (err) {
      speak(c.error);
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setBusy(false);
    }
  };

  /** A client was just found/created: carry on with whatever the owner asked for. */
  const afterClient = async (prefix: string) => {
    const s = session.current;
    if (s.mode === 'client') {
      setStep('askMeasureNow');
      speak(`${prefix}. ${c.askMeasureNow}`);
    } else if (s.mode === 'measurement') {
      setStep('askGarmentForMeasurement');
      speak(c.afterClientMeasure(prefix));
    } else {
      // an order starts with the client's measurements: change them, or move on
      const profile = await customerMeasurementsRepo.getByCustomer(s.customer!.id);
      setStep('askChangeMeasure');
      speak(`${prefix}. ${profile ? c.changeMeasure(s.customer!.name) : c.noMeasureAdd(s.customer!.name)}`);
    }
  };

  const advance = async (text: string) => {
    const s = session.current;

    switch (step) {
      // The home step: anything the owner says is routed to a question or a task.
      case 'askIntent': {
        const lang = appLang;
        const intent = detectIntent(text);

        if (intent.kind === 'order') {
          setMode('order');
          setStep('askClientType');
          speak(c.askClientType);
        } else if (intent.kind === 'addClient') {
          setMode('client');
          setStep('collectNewClient');
          speak(c.newClientPrompt, { lang: 'en-IN' });
        } else if (intent.kind === 'measurement') {
          setMode('measurement');
          setStep('askClientType');
          speak(c.askClientType);
        } else if (intent.kind === 'payment') {
          setMode('payment');
          setStep('collectPaymentClient');
          say(c.payWhich, lang, { lang: 'en-IN' });
        } else if (intent.kind === 'query') {
          const snap = await loadSnapshot(shop.id);
          backToIdle(answerQuery(intent.topic, snap, text, lang), lang);
        } else if (parseYesNo(text) === false) {
          setStep('done');
          say(c.goodbye, lang, { listenAfter: false });
        } else if (parseYesNo(text) === true) {
          say(c.help, lang);
        } else {
          say(unknownAnswer(lang), lang);
        }
        return;
      }

      case 'askClientType': {
        const type = parseClientType(text);
        if (type === 'new') {
          setStep('collectNewClient');
          speak(c.newClientPrompt, { lang: 'en-IN' });
        } else if (type === 'existing' || type === 'unknown') {
          setStep('collectExistingClientSearch');
          speak(c.existingNamePrompt, { lang: 'en-IN' });
        } else {
          speak(c.clientTypeRetry);
        }
        return;
      }

      case 'collectNewClient': {
        const phone = extractPhoneNumber(text);
        if (!phone) {
          speak(c.phoneMissing, { lang: 'en-IN' });
          return;
        }
        s.pendingPhone = phone;
        const name = extractNameAroundPhone(text, phone);
        if (!name) {
          setStep('collectNewClientName');
          speak(c.existingNamePrompt, { lang: 'en-IN' });
          return;
        }
        s.pendingName = name;
        setStep('askClientNumber');
        speak(c.askClientNumber, { lang: 'en-IN' });
        return;
      }

      case 'collectNewClientName': {
        const name = cleanSpokenName(text);
        if (!name) {
          speak(c.existingNamePrompt, { lang: 'en-IN' });
          return;
        }
        s.pendingName = name;
        setStep('askClientNumber');
        speak(c.askClientNumber, { lang: 'en-IN' });
        return;
      }

      case 'askClientNumber': {
        // the client form requires a client number, so the assistant asks for one too
        const bookNumber = text.replace(/\b(number|no\.?)\b|નંબર|नंबर|છે|है/gi, ' ').replace(/\s+/g, ' ').trim();
        if (!bookNumber) {
          speak(c.askClientNumber, { lang: 'en-IN' });
          return;
        }
        const customer = await customersRepo.create({
          shop_id: shop.id,
          name: s.pendingName,
          phone: s.pendingPhone,
          book_number: bookNumber,
        });
        s.customer = customer;
        await afterClient(c.addedShort(customer.name));
        return;
      }

      case 'askChangeMeasure': {
        if (parseYesNo(text) === true && s.customer) {
          s.returnToOrder = true;
          setStep('askGarmentForMeasurement');
          speak(c.afterClientMeasure(s.customer.name));
        } else {
          setStep('askClothCount');
          speak(c.askPieces);
        }
        return;
      }

      case 'askMeasureNow': {
        if (parseYesNo(text) === true && s.customer) {
          setMode('measurement');
          setStep('askGarmentForMeasurement');
          speak(c.afterClientMeasure(s.customer.name));
        } else {
          backToIdle(c.okShort, appLang);
        }
        return;
      }

      case 'collectExistingClientSearch': {
        // Names are typically typed/stored in English even though the rest
        // of the conversation is Gujarati, so the search itself is
        // language-agnostic: it matches against both the raw transcript and
        // a cleaned version, whichever script the recognizer produced.
        s.pendingName = cleanSpokenName(text);
        const all = await customersRepo.list(shop.id);
        const matches = findCustomerMatches(text, all);
        if (matches.length === 0) {
          setStep('confirmCreateNewFallback');
          speak(c.noClientFound);
        } else if (matches.length === 1) {
          s.customer = matches[0];
          await afterClient(c.foundShort(matches[0].name));
        } else {
          // Every match is read out, not just the first few, so the owner
          // never loses a client that happens to be lower in the list.
          s.matches = matches;
          const list = s.matches.map((c, i) => `${i + 1}. ${c.name}`).join(', ');
          setStep('chooseClientFromList');
          speak(c.chooseFromList(list), {
            lang: 'en-IN',
          });
        }
        return;
      }

      case 'chooseClientFromList': {
        // The right client might not be in the list at all — "નવો ગ્રાહક" /
        // "new" bails straight into creating a new one instead of forcing a
        // number pick.
        if (parseClientType(text) === 'new') {
          if (s.pendingName) {
            setStep('collectNewClientPhoneOnly');
            speak(c.createNewNamed(s.pendingName), { lang: 'en-IN' });
          } else {
            setStep('collectNewClient');
            speak(c.newClientPrompt, { lang: 'en-IN' });
          }
          return;
        }

        const idx = extractFirstNumber(text);
        const picked = idx ? s.matches[idx - 1] : undefined;
        if (!picked) {
          speak(c.pickNumberOrNew, { lang: 'en-IN' });
          return;
        }
        s.customer = picked;
        await afterClient(c.pickedShort(picked.name));
        return;
      }

      case 'confirmCreateNewFallback': {
        const yes = parseYesNo(text);
        if (yes === true) {
          if (s.pendingName) {
            setStep('collectNewClientPhoneOnly');
            speak(c.createNewNamed(s.pendingName), { lang: 'en-IN' });
          } else {
            setStep('collectNewClient');
            speak(c.newClientPrompt, { lang: 'en-IN' });
          }
        } else {
          backToIdle(c.okShort, appLang);
        }
        return;
      }

      case 'collectNewClientPhoneOnly': {
        const phone = extractPhoneNumber(text);
        if (!phone) {
          speak(c.phoneOnlyMissing, { lang: 'en-IN' });
          return;
        }
        s.pendingPhone = phone;
        if (!s.pendingName) {
          setStep('collectNewClientName');
          speak(c.existingNamePrompt, { lang: 'en-IN' });
          return;
        }
        setStep('askClientNumber');
        speak(c.askClientNumber, { lang: 'en-IN' });
        return;
      }

      case 'askGarmentForMeasurement': {
        const garment = parseGarmentChoice(text);
        if (!garment) {
          speak(c.garmentRetry);
          return;
        }
        s.garmentType = garment;
        const plan = await buildMeasurementPlan(shop.id, garment);
        if (!plan || plan.items.length === 0) {
          if (s.returnToOrder) {
            s.returnToOrder = false;
            setStep('askClothCount');
            speak(`${c.noFields} ${c.askPieces}`);
          } else {
            backToIdle(c.noFields, appLang);
          }
          return;
        }
        s.plan = plan;
        s.fieldIndex = 0;
        s.fieldValues = {};
        setStep('collectMeasurementField');
        speak(`${plan.items[0].group ? plan.items[0].group + ' ' : ''}${plan.items[0].name}?`);
        return;
      }

      case 'collectMeasurementField': {
        const plan = s.plan;
        if (!plan) return;
        const value = extractFirstNumber(text);
        const wantsSkip = /\b(skip|next|pass|no)\b|છોડ|આગળ|ના\b|छोड़|अगला|नहीं/i.test(text);
        if (value === null && !wantsSkip) {
          // Didn't catch a number: ask this field again instead of silently moving on.
          askCurrentField(appLang === 'gu' ? 'ફરી કહો. ' : appLang === 'hi' ? 'फिर से बताइए. ' : 'Say the number. ');
          return;
        }
        if (value !== null) s.fieldValues[String(s.fieldIndex)] = String(value);
        s.fieldIndex += 1;
        if (s.fieldIndex < plan.items.length) {
          askCurrentField();
          return;
        }

        // All fields collected — save to the client's measurement profile.
        await customerMeasurementsRepo.save(shop.id, {
          customer_id: s.customer!.id,
          template_id: plan.templateId,
          measurements: toMeasurements(plan.items, s.fieldValues),
        });
        if (s.returnToOrder) {
          s.returnToOrder = false;
          setStep('askClothCount');
          speak(`${c.measureSaved} ${c.askPieces}`);
        } else {
          backToIdle(c.measureSaved, appLang);
        }
        return;
      }

      case 'askClothCount': {
        const { shirtCount, pantCount } = parseClothCounts(text);
        const clothCount = shirtCount + pantCount;
        const clothType = shirtCount > 0 && pantCount > 0 ? 'Shirt + Pant' : shirtCount > 0 ? 'Shirt' : 'Pant';
        s.clothCount = clothCount || 1;
        s.clothType = clothType;
        setStep('askTotalAmount');
        speak(c.askTotal);
        return;
      }

      case 'askTotalAmount': {
        const amount = extractFirstNumber(text);
        if (amount === null) {
          speak(c.amountRetry);
          return;
        }
        s.totalAmount = amount;
        setStep('askDiscount');
        speak(c.askDiscount);
        return;
      }

      case 'askDiscount': {
        const no = parseYesNo(text) === false;
        s.discount = no ? 0 : extractFirstNumber(text) ?? 0;
        setStep('askPaid');
        speak(c.askPaid);
        return;
      }

      case 'askPaid': {
        const net = Math.max(s.totalAmount - s.discount, 0);
        const none = parseYesNo(text) === false;
        const amount = none ? 0 : extractFirstNumber(text);
        if (amount === null) {
          speak(c.amountRetry);
          return;
        }
        s.paid = Math.min(amount, net);
        if (s.paid > 0) {
          setStep('askPaymentMode');
          speak(c.askPayMode);
        } else {
          await createOrder('Cash');
        }
        return;
      }

      case 'askPaymentMode': {
        const mode = parsePaymentMode(text);
        if (!mode) {
          speak(c.payModeRetry);
          return;
        }
        await createOrder(mode);
        return;
      }

      case 'confirmWhatsApp': {
        const yes = parseYesNo(text);
        const orderNumber = s.lastOrderNumber;
        if (yes === true && s.customer) {
          try {
            const message = buildAiOrderConfirmationMessage({
              shopName: shop.shop_name || '',
              customerName: s.customer.name,
              orderNumber,
              clothType: s.clothType,
              clothCount: s.clothCount,
              totalAmount: s.totalAmount,
            });
            await sendWhatsAppMessage(s.customer.phone, message);
            backToIdle(c.whatsappSent, appLang);
          } catch {
            backToIdle(c.whatsappFailed, appLang);
          }
        } else {
          backToIdle(c.okShort, appLang);
        }
        return;
      }

      // ── record a payment
      case 'collectPaymentClient': {
        const c = COPY[appLang];
        const all = await customersRepo.list(shop.id);
        const matches = findCustomerMatches(text, all);
        if (matches.length === 0) {
          say(c.clientNotFound, appLang, { lang: 'en-IN' });
        } else if (matches.length === 1) {
          await startPayment(matches[0]);
        } else {
          s.matches = matches;
          setStep('choosePaymentClient');
          say(c.pickClient(matches.map((cu, i) => `${i + 1}. ${cu.name}`).join(', ')), appLang, { lang: 'en-IN' });
        }
        return;
      }

      case 'choosePaymentClient': {
        const idx = extractFirstNumber(text);
        const picked = idx ? s.matches[idx - 1] : undefined;
        if (!picked) {
          say(COPY[appLang].pickNumber, appLang, { lang: 'en-IN' });
          return;
        }
        await startPayment(picked);
        return;
      }

      case 'collectPaymentAmount': {
        const c = COPY[appLang];
        const amount = extractFirstNumber(text);
        if (amount === null || amount <= 0) {
          say(c.amountAgain, appLang, { lang: 'en-IN' });
          return;
        }
        s.payAmount = Math.min(amount, s.payDue);
        setStep('collectPaymentMode');
        say(c.askPayMode, appLang);
        return;
      }

      case 'collectPaymentMode': {
        const c = COPY[appLang];
        const mode = parsePaymentMode(text);
        if (!mode) {
          say(c.payModeRetry, appLang);
          return;
        }
        s.payMode = mode;
        setStep('confirmPayment');
        say(c.confirmPay(s.customer!.name, formatCurrency(s.payAmount)), appLang);
        return;
      }

      case 'confirmPayment': {
        const c = COPY[appLang];
        if (parseYesNo(text) === true && s.customer) {
          const { applied, left } = await applyPayment(shop.id, s.customer.id, s.payAmount, s.payMode);
          const leftLine = left > 0 ? c.owes(s.customer.name, formatCurrency(left)) : c.nothingDue(s.customer.name);
          backToIdle(c.recorded(s.customer.name, formatCurrency(applied), leftLine), appLang);
        } else {
          backToIdle(c.cancelled, appLang);
        }
        return;
      }

      default:
        return;
    }
  };

  /** Saves the order exactly like the order form: suggested delivery date, bill, and the payment if money was taken. */
  const createOrder = async (mode: string) => {
    const s = session.current;
    const net = Math.max(s.totalAmount - s.discount, 0);
    const paid = Math.min(s.paid, net);
    const orderNumber = await nextOrderNumber(shop.id);
    const delivery = await suggestDeliveryDate(shop.id, s.clothCount, null);

    const order = await ordersRepo.create(
      shop.id,
      {
        order_number: orderNumber,
        customer_id: s.customer!.id,
        cloth_type: s.clothType,
        cloth_count: s.clothCount,
        delivery_date: delivery.toISOString().slice(0, 10),
        total_amount: net > 0 ? net : null,
        paid_amount: paid,
        payment_mode: mode,
      },
      [{ garment_type: s.clothType, cloth_count: s.clothCount, unit_price: net }]
    );

    if (net > 0) {
      try {
        const bill = await billsRepo.create({
          shop_id: shop.id,
          order_id: order.id,
          customer_id: s.customer!.id,
          fabric_cost: 0,
          stitching_charge: s.totalAmount,
          tax: 0,
          discount: s.discount,
          payment_status: paid <= 0 ? 'unpaid' : paid >= net ? 'paid' : 'partial',
        });
        if (paid > 0) {
          await paymentsRepo.create({
            shop_id: shop.id,
            bill_id: bill.id,
            customer_id: s.customer!.id,
            amount_paid: paid,
            payment_mode: mode,
          });
        }
      } catch {
        // the order itself is saved; a missing bill is fixable from the order
      }
    }

    s.totalAmount = net;
    s.lastOrderNumber = order.order_number;
    setStep('confirmWhatsApp');
    speak(c.orderAsk(order.order_number, formatCurrency(net), paid > 0 ? formatCurrency(paid) : ''));
  };

  /** A client was picked for a payment: say what they owe, then ask how much was paid. */
  const startPayment = async (customer: Customer) => {
    const s = session.current;
    const c = COPY[appLang];
    const due = await clientDue(shop.id, customer.id);
    if (due <= 0) {
      backToIdle(c.nothingDue(customer.name), appLang);
      return;
    }
    s.customer = customer;
    s.payDue = due;
    setStep('collectPaymentAmount');
    say(`${c.owes(customer.name, formatCurrency(due))} ${c.askAmount}`, appLang, { lang: 'en-IN' });
  };

  const restart = () => {
    setLog([]);
    greet();
  };

  const sendDraft = () => {
    const text = draft.trim();
    if (!text || busy || step === 'done') return;
    setDraft('');
    Speech.stop();
    if (listening) stopListening();
    void handleUserReply(text);
  };

  const reply = (text: string) => {
    if (busy) return;
    Speech.stop();
    if (listening) stopListening();
    void handleUserReply(text);
  };

  const lastAi = [...log].reverse().find((e) => e.who === 'ai')?.text ?? '';
  const lastUser = [...log].reverse().find((e) => e.who === 'user')?.text ?? '';
  const statusText = listening ? c.listening : busy ? c.thinking : step === 'done' ? '' : c.speakOrType;

  // an order is a short journey, shown as four labelled stops (other tasks have none)
  const PHASES = c.phases;
  const phase =
    step === 'askClothCount' ? 1 : step === 'askTotalAmount' || step === 'askDiscount' || step === 'askPaid' || step === 'askPaymentMode' ? 2 : step === 'confirmWhatsApp' ? 3 : 0;

  // one-tap answers for the questions that have obvious ones
  const chips: string[] =
    step === 'askIntent'
      ? c.chips
      : step === 'askClientType'
        ? c.chipClientType
        : step === 'confirmCreateNewFallback' || step === 'confirmWhatsApp' || step === 'confirmPayment' || step === 'askMeasureNow' || step === 'askChangeMeasure'
          ? c.chipYesNo
          : step === 'askGarmentForMeasurement'
            ? c.chipGarments
            : step === 'askDiscount' || step === 'askPaid'
              ? c.chipNo
              : step === 'askPaymentMode' || step === 'collectPaymentMode'
                ? c.chipPayMode
                : [];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* soft blue glow behind the orb */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="38%" r="55%">
            <Stop offset="0" stopColor={primary[600]} stopOpacity="0.38" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#glow)" />
      </Svg>

      {/* top bar */}
      <View style={[styles.top, { paddingTop: insets.top + 10 }]}>
        <GlassButton icon={IconChevronLeft} label="Back" onPress={() => navigation.goBack()} />
        <Text style={styles.title}>{c.title}</Text>
        <GlassButton icon={IconMessageCircle} label="Transcript" onPress={() => setShowTranscript(true)} />
      </View>

      {/* order progress, only while creating an order */}
      {flow === 'order' ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.phases}>
          {PHASES.map((label, i) => (
            <View key={label} style={{ flex: 1, gap: 6 }}>
              <View style={[styles.phaseBar, { backgroundColor: i <= phase ? primary[500] : 'rgba(255,255,255,0.16)' }]} />
              <Text style={{ fontFamily: typography.family.medium, fontSize: 11, color: i <= phase ? '#FFFFFF' : 'rgba(255,255,255,0.45)' }} numberOfLines={1}>
                {label}
              </Text>
            </View>
          ))}
        </Animated.View>
      ) : (
        <View style={styles.phases} />
      )}

      {/* the stage: orb, the one thing the assistant is saying, your last answer */}
      <ScrollView contentContainerStyle={styles.stage} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.orbWrap}>
          {listening ? (
            <>
              <Animated.View pointerEvents="none" style={[styles.ring, ringA]} />
              <Animated.View pointerEvents="none" style={[styles.ring, ringB]} />
            </>
          ) : null}
          <Animated.View style={orbStyle}>
            <AiOrb size={132} />
          </Animated.View>
        </View>

        {lastAi ? (
          <Animated.Text key={log.length + lastAi} entering={FadeInDown.duration(360)} style={styles.caption}>
            {lastAi}
          </Animated.Text>
        ) : (
          <ActivityIndicator color="#FFFFFF" style={{ marginTop: 24 }} />
        )}

        {lastUser ? (
          <Animated.View key={'u' + lastUser + log.length} entering={FadeIn.duration(260)} exiting={FadeOut.duration(120)} style={styles.youChip}>
            <Text style={{ fontFamily: typography.family.medium, fontSize: 14, color: '#FFFFFF' }} numberOfLines={2}>
              {lastUser}
            </Text>
          </Animated.View>
        ) : null}
      </ScrollView>

      {/* one-tap answers */}
      {chips.length > 0 && !busy ? (
        <Animated.View key={step} entering={FadeInDown.duration(260)} style={styles.chips}>
          {chips.map((c) => (
            <Pressable key={c} onPress={() => reply(c)} accessibilityRole="button" style={({ pressed }) => [styles.chip, { opacity: pressed ? 0.7 : 1 }]}>
              <Text style={{ fontFamily: typography.family.semibold, fontSize: 14, color: '#FFFFFF' }}>{c}</Text>
            </Pressable>
          ))}
        </Animated.View>
      ) : null}

      {/* floating reply bar */}
      <View style={[styles.dock, { paddingBottom: insets.bottom + 16 }]}>
        {step === 'done' ? (
          <Pressable onPress={restart} accessibilityRole="button" style={styles.restart}>
            <IconRefresh size={20} color="#FFFFFF" strokeWidth={2.2} />
            <Text style={{ fontFamily: typography.family.semibold, fontSize: 16, color: '#FFFFFF' }}>{c.restart}</Text>
          </Pressable>
        ) : (
          <>
            {statusText ? (
              <Text style={{ fontFamily: typography.family.medium, fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>{statusText}</Text>
            ) : null}
            <View style={styles.bar}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={c.placeholder}
                placeholderTextColor="rgba(255,255,255,0.45)"
                editable={!busy}
                onSubmitEditing={sendDraft}
                returnKeyType="send"
                style={[styles.input, { outlineStyle: 'none' } as object]}
              />
              {draft.trim().length > 0 ? (
                <Pressable onPress={sendDraft} hitSlop={8} accessibilityRole="button" accessibilityLabel="Send" style={styles.send}>
                  <IconSend size={20} color="#FFFFFF" strokeWidth={2.2} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => (listening ? stopListening() : startListening(TTS_CODE[appLang]))}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Voice input"
                  style={[styles.send, { backgroundColor: listening ? status.danger[600] : busy ? 'rgba(255,255,255,0.2)' : primary[600] }]}
                >
                  <IconMicrophone size={22} color="#FFFFFF" strokeWidth={2} />
                </Pressable>
              )}
            </View>
          </>
        )}
      </View>

      {/* full conversation, on demand */}
      <DSBottomSheet visible={showTranscript} onClose={() => setShowTranscript(false)} title={c.transcript}>
        <View style={{ gap: 10, paddingTop: 12, paddingBottom: 12 }}>
          {log.length === 0 ? (
            <Text style={{ fontFamily: typography.family.regular, fontSize: 14, color: colors.textMuted }}>—</Text>
          ) : (
            log.map((entry, i) => {
              const ai = entry.who === 'ai';
              return (
                <View
                  key={i}
                  style={[
                    styles.bubble,
                    ai
                      ? { alignSelf: 'flex-start', backgroundColor: colors.primaryTint, borderTopLeftRadius: 6 }
                      : { alignSelf: 'flex-end', backgroundColor: primary[600], borderTopRightRadius: 6 },
                  ]}
                >
                  <Text style={{ fontFamily: typography.family.medium, fontSize: 15, lineHeight: 22, color: ai ? colors.textPrimary : '#FFFFFF' }}>{entry.text}</Text>
                </View>
              );
            })
          )}
        </View>
      </DSBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  title: { fontFamily: typography.family.bold, fontSize: 18, color: '#FFFFFF' },
  phases: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, marginTop: 18, minHeight: 28 },
  phaseBar: { height: 4, borderRadius: 9999 },
  stage: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 24, gap: 24 },
  orbWrap: { width: 132, height: 132, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 132, height: 132, borderRadius: 9999, backgroundColor: primary[500] },
  caption: { fontFamily: typography.family.semibold, fontSize: 24, lineHeight: 34, color: '#FFFFFF', textAlign: 'center', letterSpacing: -0.4 },
  youChip: { maxWidth: '88%', borderRadius: 9999, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.14)' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 20, paddingBottom: 14 },
  chip: { height: 40, paddingHorizontal: 16, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', backgroundColor: 'rgba(255,255,255,0.08)' },
  dock: { paddingHorizontal: 20, gap: 10 },
  bar: { flexDirection: 'row', alignItems: 'center', height: 60, borderRadius: 9999, paddingLeft: 22, paddingRight: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  input: { flex: 1, minWidth: 0, fontFamily: typography.family.medium, fontSize: 15, color: '#FFFFFF', padding: 0 },
  send: { width: 46, height: 46, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: primary[600] },
  restart: { height: 56, borderRadius: 9999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: primary[600] },
  bubble: { maxWidth: '85%', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12 },
});
