/**
 * Tabler-backed drop-in for the old @expo/vector-icons (FontAwesome5 and
 * Ionicons) components. Screens that haven't been redesigned yet keep calling
 * <FontAwesome5 name="..." /> / <Ionicons name="..." />, but every glyph now
 * renders from the Tabler family. New code should import from './icons'
 * instead and pass Tabler components directly.
 */
import type { ComponentType } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import {
  IconArrowsExchange,
  IconBell,
  IconBolt,
  IconBrandWhatsapp,
  IconCalendar,
  IconCalendarEvent,
  IconCamera,
  IconChartBar,
  IconChartLine,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconCircle,
  IconCircleCheck,
  IconCirclePlus,
  IconCircleX,
  IconClipboardList,
  IconCompass,
  IconCurrencyRupee,
  IconEye,
  IconEyeOff,
  IconFileInvoice,
  IconFilter,
  IconFlag,
  IconHome,
  IconInbox,
  IconInfoCircle,
  IconKey,
  IconLogout,
  IconMailOpened,
  IconMicrophone,
  IconPencil,
  IconPhone,
  IconPlus,
  IconReceipt,
  IconRobot,
  IconRoute,
  IconRotateClockwise,
  IconRuler,
  IconRuler2,
  IconSearch,
  IconShirt,
  IconShoppingBag,
  IconTrash,
  IconUser,
  IconUserPlus,
  IconUsers,
  IconWand,
  IconX,
} from '@tabler/icons-react-native';

type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const MAP: Record<string, IconComponent> = {
  // FontAwesome5 names
  check: IconCheck,
  'trash-alt': IconTrash,
  'chevron-right': IconChevronRight,
  'chevron-down': IconChevronDown,
  tshirt: IconShirt,
  pen: IconPencil,
  microphone: IconMicrophone,
  whatsapp: IconBrandWhatsapp,
  'rupee-sign': IconCurrencyRupee,
  'ruler-combined': IconRuler2,
  ruler: IconRuler,
  'times-circle': IconCircleX,
  times: IconX,
  'shopping-bag': IconShoppingBag,
  search: IconSearch,
  plus: IconPlus,
  'plus-circle': IconCirclePlus,
  'phone-alt': IconPhone,
  magic: IconWand,
  'chart-line': IconChartLine,
  'chart-bar': IconChartBar,
  user: IconUser,
  'user-alt': IconUser,
  'user-tie': IconUser,
  'user-plus': IconUserPlus,
  'user-friends': IconUsers,
  users: IconUsers,
  'sign-out-alt': IconLogout,
  route: IconRoute,
  robot: IconRobot,
  redo: IconRotateClockwise,
  key: IconKey,
  filter: IconFilter,
  'envelope-open-text': IconMailOpened,
  'clipboard-list': IconClipboardList,
  camera: IconCamera,
  'calendar-alt': IconCalendarEvent,
  'calendar-day': IconCalendarEvent,
  bolt: IconBolt,
  eye: IconEye,
  'eye-slash': IconEyeOff,
  'check-circle': IconCircleCheck,
  'info-circle': IconInfoCircle,
  receipt: IconReceipt,
  'file-invoice': IconFileInvoice,
  'file-invoice-dollar': IconFileInvoice,
  bell: IconBell,
  'exchange-alt': IconArrowsExchange,
  compass: IconCompass,
  inbox: IconInbox,
  // Ionicons names
  add: IconPlus,
  'search-outline': IconSearch,
  'notifications-outline': IconBell,
  'chevron-back': IconChevronLeft,
  'calendar-outline': IconCalendar,
  calendar: IconCalendar,
  home: IconHome,
  'home-outline': IconHome,
  people: IconUsers,
  'people-outline': IconUsers,
  shirt: IconShirt,
  'shirt-outline': IconShirt,
  person: IconUser,
  'person-outline': IconUser,
  'person-add': IconUserPlus,
  'swap-horizontal': IconArrowsExchange,
  flag: IconFlag,
};

type LegacyProps = {
  name: string;
  size?: number;
  color?: string;
  /** Accepted for FontAwesome5 compatibility; Tabler has one weight. */
  solid?: boolean;
  style?: StyleProp<TextStyle>;
};

function make(): ComponentType<LegacyProps> {
  return function LegacyIcon({ name, size = 16, color = '#000000' }: LegacyProps) {
    const Icon = MAP[name];
    if (!Icon && __DEV__) console.warn(`[legacyIcons] No Tabler icon mapped for "${name}"`);
    const Resolved = Icon ?? IconCircle;
    return <Resolved size={size} color={color} strokeWidth={2} />;
  };
}

export const FontAwesome5 = make();
export const Ionicons = make();
