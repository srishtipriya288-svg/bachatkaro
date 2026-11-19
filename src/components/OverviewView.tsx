import {
  AlertTriangle,
  ArrowUpRight,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CATEGORY_MAP,
  PAYMENT_LABELS,
  type Expense,
} from '../types/budget';
import {
  formatINR,
  formatMonthLabel,
  formatShortDate,
  type ComputedBudgetMetrics,
} from '../lib/budgetMath';

interface OverviewViewProps {
  monthKey: string;
  metrics: ComputedBudgetMetrics;
  monthExpenses: Expense[];
  onLogExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onNavigate: (tab: 'overview' | 'analytics' | 'expenses' | 'budget') => void;
}

export function OverviewView({
  monthKey,
  metrics,
  monthExpenses,
  onLogExpense,
  onEditExpense,
  onDeleteExpense,
  onNavigate,
}: OverviewViewProps) {
  const todayUsedPct =
    metrics.safeDailyLimitToday > 0
      ? Math.min(100, Math.round((metrics.todaySpent / metrics.safeDailyLimitToday) * 100))
      : metrics.todaySpent > 0
        ? 100
        : 0;

  const statusMeta =
    metrics.dailyStatus === 'exceeded'
      ? {
          label: 'Over today’s safe limit',
          textClass: 'text-red-700',
          barClass: 'bg-red-600',
        }
      : metrics.dailyStatus === 'caution'
        ? {
            label: 'Approaching daily limit',
            textClass: 'text-amber-700',
            barClass: 'bg-amber-500',
          }
        : {
            label: 'On track for month-end',
            textClass: 'text-emerald-700',
            barClass: 'bg-emerald-600',
          };

  const nonZeroCategories = metrics.categoryStats.filter((c) => c.spent > 0);
  const recentExpenses = monthExpenses.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Focal Hero Anchor: Today's Safe Daily Spending Limit */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-7">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 mb-2">
              <span>{formatMonthLabel(monthKey)}</span>
              <span aria-hidden="true">·</span>
              <span>{metrics.monthInfo.daysRemainingInclusive} days remaining</span>
              <span aria-hidden="true">·</span>
              <span className={`font-medium ${statusMeta.textClass}`}>{statusMeta.label}</span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h2 className="font-mono text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {metrics.remainingTodaySafe >= 0
                  ? formatINR(metrics.remainingTodaySafe)
                  : formatINR(0)}
              </h2>
              <p className="text-sm text-slate-600">
                safe left to spend today{' '}
                <span className="text-slate-400">
                  (of {formatINR(metrics.safeDailyLimitToday)} daily limit)
                </span>
              </p>
            </div>

            {/* Daily Limit Progress Bar */}
            <div className="mt-5 max-w-xl">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                <span className="tabular-nums">
                  Spent today: <strong className="font-mono text-slate-900">{formatINR(metrics.todaySpent)}</strong>
                </span>
                <span className="font-mono tabular-nums text-slate-500">{todayUsedPct}% used</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${statusMeta.barClass}`}
                  style={{ width: `${todayUsedPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right side breakdown separated by subtle hairline divider */}
          <div className="lg:col-span-5 lg:border-l lg:border-slate-200 lg:pl-7 flex flex-col justify-between gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Tomorrow’s projected limit</p>
                <p className="font-mono text-lg font-semibold text-slate-900 tabular-nums mt-0.5">
                  {formatINR(metrics.tomorrowProjectedLimit)}
                  <span className="text-xs font-sans font-normal text-slate-500">/day</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Protected savings goal</p>
                <p className="font-mono text-lg font-semibold text-emerald-700 tabular-nums mt-0.5">
                  {formatINR(metrics.savingsGoal)}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                Allowance {formatINR(metrics.monthlyAllowance)} − Fixed {formatINR(metrics.fixedEssentials)} − Savings{' '}
                {formatINR(metrics.savingsGoal)}
              </span>
              <button
                type="button"
                onClick={() => onNavigate('budget')}
                className="font-medium text-emerald-700 hover:text-emerald-800 whitespace-nowrap cursor-pointer"
              >
                Adjust budget
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Column KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Remaining Spendable Pool</p>
          <p
            className={`font-mono text-2xl font-semibold tabular-nums mt-1.5 ${
              metrics.remainingPool < 0 ? 'text-red-700' : 'text-slate-900'
            }`}
          >
            {formatINR(metrics.remainingPool)}
          </p>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            Out of {formatINR(metrics.spendablePool)} this month
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Spent This Month</p>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-1.5">
            {formatINR(metrics.totalSpent)}
          </p>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            {metrics.usedPoolPct}% of pool · {monthExpenses.length} entries
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Average Daily Burn</p>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-1.5">
            {formatINR(metrics.avgDailyBurn)}
            <span className="text-xs font-sans font-normal text-slate-500">/day</span>
          </p>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            Ideal pace: {formatINR(metrics.idealDailyBudget)}/day
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Projected Month-End</p>
          <p
            className={`font-mono text-2xl font-semibold tabular-nums mt-1.5 ${
              metrics.projectedSurplus < 0 ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            {metrics.projectedSurplus >= 0 ? '+' : ''}
            {formatINR(metrics.projectedSurplus)}
          </p>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            {metrics.projectedSurplus >= 0
              ? 'Projected extra savings'
              : `Runway: ${metrics.runwayDays} days at current pace`}
          </p>
        </div>
      </section>

      {/* Proactive Budget Alerts (if any triggered) */}
      {metrics.alerts.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Active Budget Alerts ({metrics.alerts.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('budget')}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Configure thresholds
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {metrics.alerts.slice(0, 4).map((alert) => (
              <div
                key={alert.id}
                className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-xs font-semibold ${
                      alert.severity === 'critical' ? 'text-red-700' : 'text-amber-700'
                    }`}
                  >
                    {alert.severity === 'critical' ? 'Alert' : 'Warning'}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <span className="font-medium text-slate-900">{alert.title}</span>
                </div>
                <span className="text-xs text-slate-600 tabular-nums">{alert.detail}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Primary Real-Time Visualization Row */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Real-Time Burn Rate vs Ideal Budget Pace */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                Cumulative Spend vs. Ideal Budget Pace
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Live cumulative spend compared against linear allowance trajectory
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-emerald-600 inline-block" />
                Actual
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 border-t border-dashed border-slate-400 inline-block" />
                Ideal pace
              </span>
            </div>
          </div>

          <div className="h-[270px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={metrics.dailySeries}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="bkCumulativeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                  width={54}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const point = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 shadow-sm text-xs">
                        <p className="font-semibold text-slate-900 mb-1">
                          {formatShortDate(point.date)}
                        </p>
                        {point.cumulativeSpend !== null && (
                          <p className="text-slate-700 font-mono tabular-nums">
                            Actual cumulative: {formatINR(point.cumulativeSpend)}
                          </p>
                        )}
                        <p className="text-slate-500 font-mono tabular-nums">
                          Ideal pace: {formatINR(point.idealPace)}
                        </p>
                        {point.dailySpend > 0 && (
                          <p className="text-emerald-700 font-mono tabular-nums mt-1 pt-1 border-t border-slate-100">
                            Day spend: {formatINR(point.dailySpend)}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="idealPace"
                  stroke="#94A3B8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeSpend"
                  stroke="#059669"
                  strokeWidth={2}
                  fill="url(#bkCumulativeFill)"
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Category Spend Breakdown Donut + Caps */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 min-w-0 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                Category Breakdown
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Spending vs. monthly category caps</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 whitespace-nowrap cursor-pointer"
            >
              Custom analytics
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {nonZeroCategories.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
              <p className="text-sm font-medium text-slate-700 mb-1">No expenses logged yet</p>
              <p className="text-xs text-slate-500 mb-4 max-w-xs">
                Log your first canteen meal, auto fare, or UPI purchase to visualize category spend.
              </p>
              <button
                type="button"
                onClick={onLogExpense}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Log First Expense
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-[150px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={nonZeroCategories}
                      dataKey="spent"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={68}
                      paddingAngle={2}
                      isAnimationActive={false}
                    >
                      {nonZeroCategories.map((entry) => (
                        <Cell key={entry.id} fill={entry.color} stroke="#FFFFFF" strokeWidth={1.5} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload.length) return null;
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-xs">
                            <p className="font-semibold text-slate-900">{item.label}</p>
                            <p className="font-mono text-slate-700 tabular-nums">
                              {formatINR(item.spent)} ({item.pctOfTotal}%)
                            </p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2.5">
                {nonZeroCategories.slice(0, 5).map((cat) => (
                  <div key={cat.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 truncate">{cat.label}</span>
                      <span className="font-mono tabular-nums text-slate-700 whitespace-nowrap ml-2">
                        {formatINR(cat.spent)}{' '}
                        <span className="text-slate-400">/ {formatINR(cat.limit)}</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, cat.pctOfLimit)}%`,
                          backgroundColor:
                            cat.status === 'exceeded'
                              ? '#DC2626'
                              : cat.status === 'warning'
                                ? '#D97706'
                                : cat.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Bottom Row: Daily Spend vs Safe Limit Bar Chart + Recent Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-5">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                Daily Spending vs. Safe Limit
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dashed line marks {formatINR(metrics.safeDailyLimitToday || metrics.idealDailyBudget)}/day safe threshold
              </p>
            </div>
          </div>

          <div className="h-[240px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metrics.dailySeries.slice(0, metrics.monthInfo.currentDayOfMonth)}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v}`}
                  width={50}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const p = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-xs">
                        <p className="font-semibold text-slate-900">{formatShortDate(p.date)}</p>
                        <p className="font-mono text-slate-700 tabular-nums mt-0.5">
                          Spent: {formatINR(p.dailySpend)}
                        </p>
                        <p
                          className={`text-[11px] font-medium mt-0.5 ${
                            p.isOverLimit ? 'text-red-700' : 'text-emerald-700'
                          }`}
                        >
                          {p.isOverLimit ? 'Above daily safe limit' : 'Within safe limit'}
                        </p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine
                  y={metrics.safeDailyLimitToday || metrics.idealDailyBudget}
                  stroke="#D97706"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
                <Bar dataKey="dailySpend" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
                  {metrics.dailySeries
                    .slice(0, metrics.monthInfo.currentDayOfMonth)
                    .map((entry) => (
                      <Cell
                        key={entry.date}
                        fill={entry.isOverLimit ? '#DC2626' : '#059669'}
                      />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Expenses Ledger */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 min-w-0 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                Recent Expenses
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Latest entries synced in real time</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('expenses')}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800 whitespace-nowrap cursor-pointer"
            >
              View all
            </button>
          </div>

          {recentExpenses.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <p className="text-sm text-slate-600 mb-3">No transactions this month yet.</p>
              <button
                type="button"
                onClick={onLogExpense}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Log Expense
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 flex-1">
              {recentExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{exp.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {CATEGORY_MAP[exp.category]?.shortLabel || exp.category} ·{' '}
                      {PAYMENT_LABELS[exp.paymentMethod]} · {formatShortDate(exp.date)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                      {formatINR(exp.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onEditExpense(exp)}
                      aria-label={`Edit ${exp.title}`}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteExpense(exp.id)}
                      aria-label={`Delete ${exp.title}`}
                      className="p-1.5 text-slate-400 hover:text-red-700 rounded hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
