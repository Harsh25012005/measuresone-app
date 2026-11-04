import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ConfirmEmail: { email: string };
  ComponentShowcase: undefined;
};

export type OrderListFilter = 'Active' | 'Due today' | 'Overdue' | 'Unpaid' | 'Received' | 'Ready' | 'Delivered' | 'All';

/** Screens shared across several stacks (orders reachable from many tabs). */
type SharedOrderRoutes = {
  OrderForm:
    | {
        customerId?: string;
        orderId?: string;
        /** Pre-filled garments / delivery date, e.g. from a TrueFit AI card. */
        prefill?: { garments?: { garment: 'shirt' | 'pant' | 'both'; count: number }[]; deliveryDate?: string };
      }
    | undefined;
  OrderDetail: { orderId: string };
  MeasurementForm: { customerId: string; templateId?: string; clothType?: string };
  /** Global search (customer, phone, order no., book no.), reachable from every tab. */
  Search: undefined;
};

export type CustomersStackParamList = SharedOrderRoutes & {
  CustomerList: undefined;
  CustomerDetail: { customerId: string; initialTab?: 'info' | 'orders' | 'measurements' };
  CustomerForm: { customerId?: string; prefill?: { name?: string; phone?: string; bookNumber?: string } } | undefined;
};

export type OrdersStackParamList = SharedOrderRoutes & {
  /** `filter` opens the list on one of its filter chips (Home links, TrueFit AI). */
  OrderList: { filter?: OrderListFilter } | undefined;
};

export type DashboardStackParamList = SharedOrderRoutes & {
  Dashboard: undefined;
  Notifications: undefined;
  Calendar: undefined;
  Transactions: undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
  ShopEdit: undefined;
  Staff: undefined;
  StaffForm: { staffId?: string } | undefined;
  StaffDetail: { staffId: string };
  StaffWorkEntryForm: { staffId: string; prefill?: { workType?: 'pant' | 'shirt' | 'pant_shirt'; quantity?: number } };
  Revenue: undefined;
  CustomMeasurementFields: undefined;
  UniversalMeasurements: undefined;
  UniversalTemplateDetail: { templateId: string };
  Calendar: undefined;
};

/**
 * Four tabs plus a centre "Add" action button (the Add button is not a tab —
 * it opens the QuickAddMenu instead of navigating).
 */
export type MainTabParamList = {
  DashboardTab: undefined;
  CustomersTab: undefined;
  OrdersTab: undefined;
  SettingsTab: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  ShopSetup: undefined;
  Main: undefined;
  ResetPassword: undefined;
};

/**
 * Union of every in-app route. Screens that are registered in more than one
 * stack (OrderForm, OrderDetail) type against this so they can be
 * reused without re-declaring props per stack.
 */
export type AppParamList = CustomersStackParamList &
  OrdersStackParamList &
  DashboardStackParamList &
  SettingsStackParamList;

export type AppScreenProps<T extends keyof AppParamList> = NativeStackScreenProps<AppParamList, T>;

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;
export type CustomersScreenProps<T extends keyof CustomersStackParamList> = NativeStackScreenProps<
  CustomersStackParamList,
  T
>;
export type OrdersScreenProps<T extends keyof OrdersStackParamList> = NativeStackScreenProps<
  OrdersStackParamList,
  T
>;
export type DashboardScreenProps<T extends keyof DashboardStackParamList> = NativeStackScreenProps<
  DashboardStackParamList,
  T
>;
export type SettingsScreenProps<T extends keyof SettingsStackParamList> = NativeStackScreenProps<
  SettingsStackParamList,
  T
>;
