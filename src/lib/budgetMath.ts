import {
  CATEGORIES,
  CATEGORY_MAP,
  DEFAULT_CATEGORY_LIMITS,
  PAYMENT_LABELS,
  type AnalyticsGroupBy,
  type AnalyticsMetric,
  type AnalyticsTimeframe,
  type Expense,
  type ExpenseCategory,
  type ExpenseInput,
  type MonthlyBudget,
  type PaymentMethod,
} from '../types/budget';

export function formatINR(value: number, showDecimals = false): string {
  const safe = Number.isFinite(value) ? value : 0;
  const isNegative = safe < 0;
  const absVal = Math.abs(safe);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: showDecimals ? 2 : 0,
    minimumFractionDigits: showDecimals ? 2 : 0,
  }).format(absVal);
  return `${isNegative ? '-' : ''}₹${formatted}`;
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentMonthKey(): string {
  return getTodayDateString().slice(0, 7);
}

export function formatMonthLabel(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  const year = Number(yStr);
  const monthIdx = Number(mStr) - 1;
  const date = new Date(year, monthIdx, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [yStr, mStr] = monthKey.split('-');
  const d = new Date(Number(yStr), Number(mStr) - 1 + delta, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function formatShortDate(dateStr: string): string {
  const today = getTodayDateString();
  if (dateStr === today) return 'Today';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export interface MonthCalendarInfo {
  year: number;
  monthIndex: number; // 0-11
  daysInMonth: number;
  currentDayOfMonth: number; // 1..daysInMonth (clamped for past/future months)
  daysRemainingInclusive: number; // includes today if current month
  isCurrentMonth: boolean;
  isPastMonth: boolean;
}

export function getMonthInfo(monthKey: string): MonthCalendarInfo {
  const [yStr, mStr] = monthKey.split('-');
  const year = Number(yStr);
  const monthIndex = Number(mStr) - 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth();
  const curD = now.getDate();

  const isCurrentMonth = year === curY && monthIndex === curM;
  const isPastMonth = year < curY || (year === curY && monthIndex < curM);

  if (isCurrentMonth) {
    return {
      year,
      monthIndex,
      daysInMonth,
      currentDayOfMonth: curD,
      daysRemainingInclusive: Math.max(1, daysInMonth - curD + 1),
      isCurrentMonth: true,
      isPastMonth: false,
    };
  }

  if (isPastMonth) {
    return {
      year,
      monthIndex,
      daysInMonth,
      currentDayOfMonth: daysInMonth,
      daysRemainingInclusive: 1,
      isCurrentMonth: false,
      isPastMonth: true,
    };
  }

  // Future month
  return {
    year,
    monthIndex,
    daysInMonth,
    currentDayOfMonth: 1,
    daysRemainingInclusive: daysInMonth,
    isCurrentMonth: false,
    isPastMonth: false,
  };
}

export interface DailyPoint {
  day: number;
  date: string;
  label: string;
  dailySpend: number;
  cumulativeSpend: number | null;
  idealPace: number;
  safeLimitRef: number;
  isToday: boolean;
  isOverLimit: boolean;
}

export interface CategoryStat {
  id: ExpenseCategory;
  label: string;
  shortLabel: string;
  color: string;
  spent: number;
  limit: number;
  count: number;
  pctOfLimit: number;
  pctOfTotal: number;
  status: 'nominal' | 'warning' | 'exceeded';
}

export interface BudgetAlert {
  id: string;
  severity: 'warning' | 'critical';
  title: string;
  detail: string;
}

export interface ComputedBudgetMetrics {
  monthInfo: MonthCalendarInfo;
  monthlyAllowance: number;
  fixedEssentials: number;
  savingsGoal: number;
  spendablePool: number;
  totalSpent: number;
  todaySpent: number;
  essentialSpent: number;
  discretionarySpent: number;
  remainingPool: number;
  usedPoolPct: number;
  safeDailyLimitToday: number;
  remainingTodaySafe: number;
  tomorrowProjectedLimit: number;
  avgDailyBurn: number;
  idealDailyBudget: number;
  projectedMonthEndSpent: number;
  projectedSurplus: number;
  runwayDays: number;
  dailyStatus: 'healthy' | 'caution' | 'exceeded';
  dailySeries: DailyPoint[];
  categoryStats: CategoryStat[];
  alerts: BudgetAlert[];
}

export function createDefaultBudget(userId: string, monthKey: string): MonthlyBudget {
  return {
    userId,
    monthKey,
    monthlyAllowance: 12000,
    fixedEssentials: 4000,
    savingsGoal: 1500,
    alertThresholdPct: 80,
    categoryLimits: { ...DEFAULT_CATEGORY_LIMITS },
  };
}

export function computeBudgetMetrics(
  budget: MonthlyBudget,
  expenses: Expense[],
  monthKey: string
): ComputedBudgetMetrics {
  const monthInfo = getMonthInfo(monthKey);
  const todayStr = getTodayDateString();
  const monthExpenses = expenses.filter((e) => e.monthKey === monthKey);

  const spendablePool = Math.max(
    0,
    budget.monthlyAllowance - budget.fixedEssentials - budget.savingsGoal
  );

  let totalSpent = 0;
  let todaySpent = 0;
  let essentialSpent = 0;
  let discretionarySpent = 0;

  const dailyMap = new Map<string, number>();
  const catSpent: Record<ExpenseCategory, number> = {
    food: 0,
    transport: 0,
    study: 0,
    hostel: 0,
    social: 0,
    shopping: 0,
    misc: 0,
  };
  const catCount: Record<ExpenseCategory, number> = {
    food: 0,
    transport: 0,
    study: 0,
    hostel: 0,
    social: 0,
    shopping: 0,
    misc: 0,
  };

  for (const exp of monthExpenses) {
    totalSpent += exp.amount;
    if (exp.date === todayStr) {
      todaySpent += exp.amount;
    }
    if (exp.spendType === 'essential') {
      essentialSpent += exp.amount;
    } else {
      discretionarySpent += exp.amount;
    }
    dailyMap.set(exp.date, (dailyMap.get(exp.date) || 0) + exp.amount);
    catSpent[exp.category] = (catSpent[exp.category] || 0) + exp.amount;
    catCount[exp.category] = (catCount[exp.category] || 0) + 1;
  }

  const remainingPool = spendablePool - totalSpent;
  const usedPoolPct = spendablePool > 0 ? Math.round((totalSpent / spendablePool) * 100) : 0;

  // Safe daily limit at the start of today = remaining pool before today's spending / days left inclusive
  const spentBeforeToday = monthInfo.isCurrentMonth ? totalSpent - todaySpent : totalSpent;
  const poolBeforeToday = spendablePool - spentBeforeToday;
  const safeDailyLimitToday = monthInfo.isCurrentMonth
    ? Math.max(0, Math.floor(poolBeforeToday / monthInfo.daysRemainingInclusive))
    : Math.max(0, Math.floor(spendablePool / monthInfo.daysInMonth));

  const remainingTodaySafe = safeDailyLimitToday - todaySpent;

  const daysAfterToday = Math.max(1, monthInfo.daysRemainingInclusive - 1);
  const tomorrowProjectedLimit =
    monthInfo.daysRemainingInclusive > 1
      ? Math.max(0, Math.floor(Math.max(0, remainingPool) / daysAfterToday))
      : Math.max(0, Math.floor(remainingPool));

  const elapsedDays = Math.max(1, monthInfo.currentDayOfMonth);
  const avgDailyBurn = Math.round(totalSpent / elapsedDays);
  const idealDailyBudget = Math.round(spendablePool / monthInfo.daysInMonth);
  const projectedMonthEndSpent = Math.round(avgDailyBurn * monthInfo.daysInMonth);
  const projectedSurplus = spendablePool - projectedMonthEndSpent;

  const runwayDays =
    remainingPool <= 0
      ? 0
      : avgDailyBurn > 0
        ? Math.floor(remainingPool / avgDailyBurn)
        : monthInfo.daysRemainingInclusive;

  let dailyStatus: 'healthy' | 'caution' | 'exceeded' = 'healthy';
  if (safeDailyLimitToday === 0 && totalSpent > spendablePool) {
    dailyStatus = 'exceeded';
  } else if (todaySpent > safeDailyLimitToday) {
    dailyStatus = 'exceeded';
  } else if (
    safeDailyLimitToday > 0 &&
    (todaySpent / safeDailyLimitToday) * 100 >= budget.alertThresholdPct
  ) {
    dailyStatus = 'caution';
  }

  // Build day-by-day series for charts
  const dailySeries: DailyPoint[] = [];
  let runningCumulative = 0;

  for (let day = 1; day <= monthInfo.daysInMonth; day++) {
    const date = `${monthKey}-${String(day).padStart(2, '0')}`;
    const spent = dailyMap.get(date) || 0;
    const isFutureDay = monthInfo.isCurrentMonth && day > monthInfo.currentDayOfMonth;

    if (!isFutureDay) {
      runningCumulative += spent;
    }

    const idealPace = Math.round((spendablePool / monthInfo.daysInMonth) * day);
    dailySeries.push({
      day,
      date,
      label: `${day}`,
      dailySpend: spent,
      cumulativeSpend: isFutureDay ? null : runningCumulative,
      idealPace,
      safeLimitRef: safeDailyLimitToday || idealDailyBudget,
      isToday: date === todayStr,
      isOverLimit: spent > (safeDailyLimitToday || idealDailyBudget),
    });
  }

  // Category stats
  const categoryStats: CategoryStat[] = CATEGORIES.map((cat) => {
    const spent = catSpent[cat.id] || 0;
    const limit = budget.categoryLimits?.[cat.id] ?? cat.defaultLimit;
    const pctOfLimit = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    const pctOfTotal = totalSpent > 0 ? Math.round((spent / totalSpent) * 100) : 0;
    let status: 'nominal' | 'warning' | 'exceeded' = 'nominal';
    if (limit > 0 && spent > limit) {
      status = 'exceeded';
    } else if (limit > 0 && pctOfLimit >= budget.alertThresholdPct) {
      status = 'warning';
    }
    return {
      id: cat.id,
      label: cat.label,
      shortLabel: cat.shortLabel,
      color: cat.color,
      spent,
      limit,
      count: catCount[cat.id] || 0,
      pctOfLimit,
      pctOfTotal,
      status,
    };
  }).sort((a, b) => b.spent - a.spent);

  // Smart budget alerts
  const alerts: BudgetAlert[] = [];

  if (remainingPool < 0) {
    alerts.push({
      id: 'monthly-exceeded',
      severity: 'critical',
      title: 'Monthly spendable budget exceeded',
      detail: `You are ${formatINR(Math.abs(remainingPool))} over your ${formatINR(spendablePool)} spendable pool (after essentials & savings goal).`,
    });
  } else if (usedPoolPct >= budget.alertThresholdPct && spendablePool > 0) {
    alerts.push({
      id: 'monthly-warning',
      severity: 'warning',
      title: `${usedPoolPct}% of monthly spendable pool used`,
      detail: `${formatINR(remainingPool)} left for the remaining ${monthInfo.daysRemainingInclusive} days of the month.`,
    });
  }

  if (monthInfo.isCurrentMonth && todaySpent > safeDailyLimitToday) {
    alerts.push({
      id: 'daily-exceeded',
      severity: 'critical',
      title: "Today's safe daily limit exceeded",
      detail: `Spent ${formatINR(todaySpent)} today against a ${formatINR(safeDailyLimitToday)} limit. Tomorrow's limit adjusts to ${formatINR(tomorrowProjectedLimit)}/day.`,
    });
  }

  for (const cs of categoryStats) {
    if (cs.status === 'exceeded') {
      alerts.push({
        id: `cat-exceeded-${cs.id}`,
        severity: 'critical',
        title: `${cs.label} cap exceeded`,
        detail: `${formatINR(cs.spent)} spent out of ${formatINR(cs.limit)} (${cs.pctOfLimit}%).`,
      });
    } else if (cs.status === 'warning') {
      alerts.push({
        id: `cat-warning-${cs.id}`,
        severity: 'warning',
        title: `${cs.label} nearing monthly cap`,
        detail: `${formatINR(cs.spent)} spent out of ${formatINR(cs.limit)} (${cs.pctOfLimit}%).`,
      });
    }
  }

  return {
    monthInfo,
    monthlyAllowance: budget.monthlyAllowance,
    fixedEssentials: budget.fixedEssentials,
    savingsGoal: budget.savingsGoal,
    spendablePool,
    totalSpent,
    todaySpent,
    essentialSpent,
    discretionarySpent,
    remainingPool,
    usedPoolPct,
    safeDailyLimitToday,
    remainingTodaySafe,
    tomorrowProjectedLimit,
    avgDailyBurn,
    idealDailyBudget,
    projectedMonthEndSpent,
    projectedSurplus,
    runwayDays,
    dailyStatus,
    dailySeries,
    categoryStats,
    alerts,
  };
}

export interface CustomAnalyticsRow {
  key: string;
  label: string;
  total: number;
  average: number;
  count: number;
  value: number;
  sharePct: number;
  color: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_COLORS = [
  '#D97706',
  '#059669',
  '#0284C7',
  '#0D9488',
  '#4F46E5',
  '#E11D48',
  '#EA580C',
];

export function filterExpensesForAnalytics(
  expenses: Expense[],
  monthKey: string,
  timeframe: AnalyticsTimeframe,
  categoryFilter: ExpenseCategory | 'all',
  paymentFilter: PaymentMethod | 'all'
): Expense[] {
  const today = new Date();
  const todayStr = getTodayDateString();

  return expenses.filter((exp) => {
    if (categoryFilter !== 'all' && exp.category !== categoryFilter) return false;
    if (paymentFilter !== 'all' && exp.paymentMethod !== paymentFilter) return false;

    if (timeframe === 'month') {
      return exp.monthKey === monthKey;
    }
    if (timeframe === 'today') {
      return exp.date === todayStr;
    }
    const [y, m, d] = exp.date.split('-').map(Number);
    const expDate = new Date(y, m - 1, d);
    const diffDays = Math.floor((today.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24));
    if (timeframe === 'last7') return diffDays >= 0 && diffDays < 7;
    if (timeframe === 'last14') return diffDays >= 0 && diffDays < 14;
    return true;
  });
}

export function buildCustomAnalyticsData(
  filteredExpenses: Expense[],
  metric: AnalyticsMetric,
  groupBy: AnalyticsGroupBy
): CustomAnalyticsRow[] {
  const buckets = new Map<string, { label: string; total: number; count: number; color: string }>();

  if (groupBy === 'category') {
    for (const c of CATEGORIES) {
      buckets.set(c.id, { label: c.label, total: 0, count: 0, color: c.color });
    }
  } else if (groupBy === 'dayOfWeek') {
    WEEKDAYS.forEach((day, idx) => {
      buckets.set(String(idx), { label: day, total: 0, count: 0, color: WEEKDAY_COLORS[idx] });
    });
  } else if (groupBy === 'paymentMethod') {
    buckets.set('upi', { label: 'UPI', total: 0, count: 0, color: '#059669' });
    buckets.set('cash', { label: 'Cash', total: 0, count: 0, color: '#D97706' });
    buckets.set('card', { label: 'Card', total: 0, count: 0, color: '#0284C7' });
  } else if (groupBy === 'spendType') {
    buckets.set('essential', { label: 'Essential', total: 0, count: 0, color: '#059669' });
    buckets.set('discretionary', {
      label: 'Discretionary',
      total: 0,
      count: 0,
      color: '#D97706',
    });
  }

  for (const exp of filteredExpenses) {
    let key = '';
    if (groupBy === 'category') {
      key = exp.category;
    } else if (groupBy === 'dayOfWeek') {
      const [y, m, d] = exp.date.split('-').map(Number);
      key = String(new Date(y, m - 1, d).getDay());
    } else if (groupBy === 'paymentMethod') {
      key = exp.paymentMethod;
    } else {
      key = exp.spendType;
    }

    const bucket = buckets.get(key);
    if (bucket) {
      bucket.total += exp.amount;
      bucket.count += 1;
    }
  }

  const grandTotal = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
  const grandCount = filteredExpenses.length;

  const rows: CustomAnalyticsRow[] = Array.from(buckets.entries()).map(([key, b]) => {
    const average = b.count > 0 ? Math.round(b.total / b.count) : 0;
    const value = metric === 'total' ? b.total : metric === 'average' ? average : b.count;
    const sharePct =
      metric === 'count'
        ? grandCount > 0
          ? Math.round((b.count / grandCount) * 100)
          : 0
        : grandTotal > 0
          ? Math.round((b.total / grandTotal) * 100)
          : 0;

    return {
      key,
      label: b.label,
      total: b.total,
      average,
      count: b.count,
      value,
      sharePct,
      color: b.color,
    };
  });

  if (groupBy === 'dayOfWeek') {
    // Keep Mon -> Sun calendar order
    const order = ['1', '2', '3', '4', '5', '6', '0'];
    return order.map((k) => rows.find((r) => r.key === k)!).filter(Boolean);
  }

  return rows.sort((a, b) => b.value - a.value);
}

export function exportExpensesToCSV(expenses: Expense[], filename: string): void {
  const headers = ['Date', 'Title', 'Category', 'Amount (INR)', 'Payment Mode', 'Type', 'Notes'];
  const escapeCsv = (val: string | number) => {
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };
  const lines = [
    headers.join(','),
    ...expenses.map((e) =>
      [
        escapeCsv(e.date),
        escapeCsv(e.title),
        escapeCsv(CATEGORY_MAP[e.category]?.label || e.category),
        e.amount,
        escapeCsv(PAYMENT_LABELS[e.paymentMethod] || e.paymentMethod),
        escapeCsv(e.spendType === 'essential' ? 'Essential' : 'Discretionary'),
        escapeCsv(e.notes || ''),
      ].join(',')
    ),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateSampleStudentExpenses(monthKey: string): ExpenseInput[] {
  const monthInfo = getMonthInfo(monthKey);
  const maxDay = Math.max(1, monthInfo.currentDayOfMonth);

  const clampDay = (offsetFromToday: number) => {
    const day = Math.max(1, Math.min(maxDay, maxDay - offsetFromToday));
    return `${monthKey}-${String(day).padStart(2, '0')}`;
  };

  return [
    {
      monthKey,
      title: 'College Canteen Lunch & Chai',
      amount: 115,
      category: 'food',
      paymentMethod: 'upi',
      spendType: 'essential',
      date: clampDay(0),
      notes: 'Rajma chawal and ginger chai after morning lecture',
    },
    {
      monthKey,
      title: 'Shared Auto to Campus',
      amount: 40,
      category: 'transport',
      paymentMethod: 'cash',
      spendType: 'essential',
      date: clampDay(0),
      notes: 'Morning commute from PG gate',
    },
    {
      monthKey,
      title: 'Photocopy & Lab Manual Printout',
      amount: 180,
      category: 'study',
      paymentMethod: 'upi',
      spendType: 'essential',
      date: clampDay(1),
      notes: 'Semester case study readings',
    },
    {
      monthKey,
      title: 'Evening Cold Coffee with Friends',
      amount: 240,
      category: 'social',
      paymentMethod: 'upi',
      spendType: 'discretionary',
      date: clampDay(1),
      notes: 'Post-class catch-up near campus cafe',
    },
    {
      monthKey,
      title: 'Hostel Laundry & Ironing',
      amount: 220,
      category: 'hostel',
      paymentMethod: 'cash',
      spendType: 'essential',
      date: clampDay(2),
      notes: 'Weekly clothes bundle',
    },
    {
      monthKey,
      title: 'Late-Night Swiggy Roll Order',
      amount: 285,
      category: 'food',
      paymentMethod: 'upi',
      spendType: 'discretionary',
      date: clampDay(3),
      notes: 'Exam prep dinner with roommate',
    },
    {
      monthKey,
      title: 'Campus Bus Monthly Pass Top-up',
      amount: 450,
      category: 'transport',
      paymentMethod: 'upi',
      spendType: 'essential',
      date: clampDay(4),
      notes: 'Student transit recharge',
    },
    {
      monthKey,
      title: 'Notebooks & Gel Pens',
      amount: 195,
      category: 'study',
      paymentMethod: 'upi',
      spendType: 'essential',
      date: clampDay(5),
      notes: 'Stationery shop outside gate 2',
    },
    {
      monthKey,
      title: 'Weekend Movie Ticket & Snacks',
      amount: 480,
      category: 'social',
      paymentMethod: 'card',
      spendType: 'discretionary',
      date: clampDay(6),
      notes: 'Student discount ticket + popcorn',
    },
    {
      monthKey,
      title: 'Fruits, Milk & Oats (Grocery)',
      amount: 340,
      category: 'food',
      paymentMethod: 'upi',
      spendType: 'essential',
      date: clampDay(7),
      notes: 'Breakfast essentials for the week',
    },
    {
      monthKey,
      title: 'USB-C Charging Cable',
      amount: 399,
      category: 'shopping',
      paymentMethod: 'upi',
      spendType: 'discretionary',
      date: clampDay(8),
      notes: 'Replacement cable ordered online',
    },
    {
      monthKey,
      title: 'Drinking Water Jar & Toiletries',
      amount: 310,
      category: 'hostel',
      paymentMethod: 'upi',
      spendType: 'essential',
      date: clampDay(10),
      notes: 'Monthly PG room essentials',
    },
    {
      monthKey,
      title: 'Street Momos & Lemon Soda',
      amount: 90,
      category: 'food',
      paymentMethod: 'upi',
      spendType: 'discretionary',
      date: clampDay(12),
      notes: 'Evening snack run',
    },
    {
      monthKey,
      title: 'Haircut & Grooming',
      amount: 160,
      category: 'misc',
      paymentMethod: 'cash',
      spendType: 'essential',
      date: clampDay(14),
      notes: 'Local salon near hostel',
    },
  ];
}
