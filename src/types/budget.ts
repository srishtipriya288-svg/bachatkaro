import type { Timestamp } from 'firebase/firestore';

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'study'
  | 'hostel'
  | 'social'
  | 'shopping'
  | 'misc';

export type PaymentMethod = 'upi' | 'cash' | 'card';
export type SpendType = 'essential' | 'discretionary';
export type LivingType = 'hostel' | 'pg' | 'rented_flat' | 'home';

export type CategoryLimits = Record<ExpenseCategory, number>;

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  city: string;
  livingType: LivingType;
  onboardingComplete: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface MonthlyBudget {
  userId: string;
  monthKey: string;
  monthlyAllowance: number;
  fixedEssentials: number;
  savingsGoal: number;
  alertThresholdPct: number;
  categoryLimits: CategoryLimits;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Expense {
  id: string;
  userId: string;
  monthKey: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  paymentMethod: PaymentMethod;
  spendType: SpendType;
  date: string; // YYYY-MM-DD
  notes: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type ExpenseInput = Omit<Expense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

export type AnalyticsMetric = 'total' | 'average' | 'count';
export type AnalyticsGroupBy = 'category' | 'dayOfWeek' | 'paymentMethod' | 'spendType';
export type AnalyticsChartType = 'bar' | 'area' | 'donut';
export type AnalyticsTimeframe = 'month' | 'last14' | 'last7' | 'today';

export interface CategoryMeta {
  id: ExpenseCategory;
  label: string;
  shortLabel: string;
  color: string;
  defaultLimit: number;
  defaultSpendType: SpendType;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'food',
    label: 'Food & Chai',
    shortLabel: 'Food',
    color: '#059669',
    defaultLimit: 2500,
    defaultSpendType: 'essential',
  },
  {
    id: 'transport',
    label: 'Auto & Transit',
    shortLabel: 'Transit',
    color: '#0284C7',
    defaultLimit: 1000,
    defaultSpendType: 'essential',
  },
  {
    id: 'study',
    label: 'Study & Books',
    shortLabel: 'Study',
    color: '#4F46E5',
    defaultLimit: 800,
    defaultSpendType: 'essential',
  },
  {
    id: 'hostel',
    label: 'Hostel & Utility',
    shortLabel: 'Hostel',
    color: '#0D9488',
    defaultLimit: 1000,
    defaultSpendType: 'essential',
  },
  {
    id: 'social',
    label: 'Outings & Social',
    shortLabel: 'Social',
    color: '#D97706',
    defaultLimit: 1000,
    defaultSpendType: 'discretionary',
  },
  {
    id: 'shopping',
    label: 'Shopping & Online',
    shortLabel: 'Shopping',
    color: '#DC2626',
    defaultLimit: 800,
    defaultSpendType: 'discretionary',
  },
  {
    id: 'misc',
    label: 'Misc & Personal',
    shortLabel: 'Misc',
    color: '#64748B',
    defaultLimit: 400,
    defaultSpendType: 'discretionary',
  },
];

export const CATEGORY_MAP: Record<ExpenseCategory, CategoryMeta> = CATEGORIES.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<ExpenseCategory, CategoryMeta>
);

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  upi: 'UPI',
  cash: 'Cash',
  card: 'Card',
};

export const LIVING_TYPE_LABELS: Record<LivingType, string> = {
  hostel: 'College Hostel',
  pg: 'PG Accommodation',
  rented_flat: 'Rented Flat',
  home: 'Living at Home',
};

export const INDIAN_STUDENT_CITIES = [
  'Dehradun',
  'Delhi NCR',
  'Bengaluru',
  'Pune',
  'Mumbai',
  'Kolkata',
  'Hyderabad',
  'Chennai',
  'Jaipur',
  'Chandigarh',
];

export const DEFAULT_CATEGORY_LIMITS: CategoryLimits = {
  food: 2500,
  transport: 1000,
  study: 800,
  hostel: 1000,
  social: 1000,
  shopping: 800,
  misc: 400,
};

// Synchronized verbatim with firebase-blueprint.json constraints
export const BLUEPRINT_LIMITS = {
  displayNameMax: 100,
  emailMax: 200,
  cityMax: 60,
  titleMax: 80,
  notesMax: 200,
  amountMax: 500000,
  budgetMax: 1000000,
  categoryLimitMax: 500000,
  monthKeyRegex: /^[0-9]{4}-[0-9]{2}$/,
  dateRegex: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
} as const;
