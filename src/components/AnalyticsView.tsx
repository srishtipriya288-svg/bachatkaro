import { useMemo, useState } from 'react';
import { Download, RotateCcw } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CATEGORIES,
  PAYMENT_LABELS,
  type AnalyticsChartType,
  type AnalyticsGroupBy,
  type AnalyticsMetric,
  type AnalyticsTimeframe,
  type Expense,
  type ExpenseCategory,
  type PaymentMethod,
} from '../types/budget';
import {
  buildCustomAnalyticsData,
  exportExpensesToCSV,
  filterExpensesForAnalytics,
  formatINR,
  type ComputedBudgetMetrics,
} from '../lib/budgetMath';

interface AnalyticsViewProps {
  monthKey: string;
  allExpenses: Expense[];
  metrics: ComputedBudgetMetrics;
  onLogExpense: () => void;
}

const TIMEFRAME_LABELS: Record<AnalyticsTimeframe, string> = {
  month: 'Selected Month',
  last14: 'Last 14 Days',
  last7: 'Last 7 Days',
  today: 'Today',
};

const METRIC_LABELS: Record<AnalyticsMetric, string> = {
  total: 'Total Spend (₹)',
  average: 'Avg Ticket (₹)',
  count: 'Transactions',
};

const GROUP_BY_LABELS: Record<AnalyticsGroupBy, string> = {
  category: 'Category',
  dayOfWeek: 'Day of Week',
  paymentMethod: 'Payment Mode',
  spendType: 'Essential vs. Discretionary',
};

export function AnalyticsView({
  monthKey,
  allExpenses,
  metrics,
  onLogExpense,
}: AnalyticsViewProps) {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('month');
  const [metric, setMetric] = useState<AnalyticsMetric>('total');
  const [groupBy, setGroupBy] = useState<AnalyticsGroupBy>('category');
  const [chartType, setChartType] = useState<AnalyticsChartType>('bar');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');

  const filteredExpenses = useMemo(
    () =>
      filterExpensesForAnalytics(
        allExpenses,
        monthKey,
        timeframe,
        categoryFilter,
        paymentFilter
      ),
    [allExpenses, monthKey, timeframe, categoryFilter, paymentFilter]
  );

  const chartData = useMemo(
    () => buildCustomAnalyticsData(filteredExpenses, metric, groupBy),
    [filteredExpenses, metric, groupBy]
  );

  const summary = useMemo(() => {
    const total = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);
    const count = filteredExpenses.length;
    const avg = count > 0 ? Math.round(total / count) : 0;
    const upiTotal = filteredExpenses
      .filter((e) => e.paymentMethod === 'upi')
      .reduce((acc, e) => acc + e.amount, 0);
    const cashTotal = filteredExpenses
      .filter((e) => e.paymentMethod === 'cash')
      .reduce((acc, e) => acc + e.amount, 0);
    const cardTotal = filteredExpenses
      .filter((e) => e.paymentMethod === 'card')
      .reduce((acc, e) => acc + e.amount, 0);
    const essentialTotal = filteredExpenses
      .filter((e) => e.spendType === 'essential')
      .reduce((acc, e) => acc + e.amount, 0);
    const discretionaryTotal = filteredExpenses
      .filter((e) => e.spendType === 'discretionary')
      .reduce((acc, e) => acc + e.amount, 0);
    const maxExpense = filteredExpenses.reduce<Expense | null>(
      (max, e) => (!max || e.amount > max.amount ? e : max),
      null
    );

    return {
      total,
      count,
      avg,
      upiTotal,
      cashTotal,
      cardTotal,
      essentialTotal,
      discretionaryTotal,
      maxExpense,
    };
  }, [filteredExpenses]);

  const formatMetricValue = (v: number) =>
    metric === 'count' ? `${v} entries` : formatINR(v);

  const hasActiveFilters =
    timeframe !== 'month' || categoryFilter !== 'all' || paymentFilter !== 'all';

  const resetFilters = () => {
    setTimeframe('month');
    setCategoryFilter('all');
    setPaymentFilter('all');
    setMetric('total');
    setGroupBy('category');
    setChartType('bar');
  };

  const nonZeroDonutData = chartData.filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Custom Analytics Query Builder Bar */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Custom Analytics Builder
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Slice your live Firestore spending stream by dimension, metric, payment mode, and
              chart type
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                exportExpensesToCSV(
                  filteredExpenses,
                  `bachat-karo-${monthKey}-${timeframe}.csv`
                )
              }
              disabled={filteredExpenses.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Control Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label htmlFor="an-timeframe" className="block text-xs font-medium text-slate-600 mb-1.5">
              Timeframe
            </label>
            <select
              id="an-timeframe"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as AnalyticsTimeframe)}
              className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-900"
            >
              {(Object.keys(TIMEFRAME_LABELS) as AnalyticsTimeframe[]).map((tf) => (
                <option key={tf} value={tf}>
                  {TIMEFRAME_LABELS[tf]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="an-metric" className="block text-xs font-medium text-slate-600 mb-1.5">
              Metric
            </label>
            <select
              id="an-metric"
              value={metric}
              onChange={(e) => setMetric(e.target.value as AnalyticsMetric)}
              className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-900"
            >
              {(Object.keys(METRIC_LABELS) as AnalyticsMetric[]).map((m) => (
                <option key={m} value={m}>
                  {METRIC_LABELS[m]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="an-groupby" className="block text-xs font-medium text-slate-600 mb-1.5">
              Group by
            </label>
            <select
              id="an-groupby"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as AnalyticsGroupBy)}
              className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-900"
            >
              {(Object.keys(GROUP_BY_LABELS) as AnalyticsGroupBy[]).map((g) => (
                <option key={g} value={g}>
                  {GROUP_BY_LABELS[g]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="an-cat" className="block text-xs font-medium text-slate-600 mb-1.5">
              Category filter
            </label>
            <select
              id="an-cat"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | 'all')}
              className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-900"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="an-pay" className="block text-xs font-medium text-slate-600 mb-1.5">
              Payment filter
            </label>
            <select
              id="an-pay"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as PaymentMethod | 'all')}
              className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-900"
            >
              <option value="all">All Payment Modes</option>
              <option value="upi">UPI Only</option>
              <option value="cash">Cash Only</option>
              <option value="card">Card Only</option>
            </select>
          </div>
        </div>

        {/* Chart Type Segmented Switcher & Filtered Summary */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 tabular-nums">
            <span>
              Matching total: <strong className="font-mono text-slate-900">{formatINR(summary.total)}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Entries: <strong className="font-mono text-slate-900">{summary.count}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Avg ticket: <strong className="font-mono text-slate-900">{formatINR(summary.avg)}</strong>
            </span>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(
              [
                { id: 'bar', label: 'Bar Chart' },
                { id: 'area', label: 'Area Trend' },
                { id: 'donut', label: 'Donut Split' },
              ] as { id: AnalyticsChartType; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setChartType(opt.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  chartType === opt.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Dynamic Visualization Canvas */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 min-w-0">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              {METRIC_LABELS[metric]} by {GROUP_BY_LABELS[groupBy]}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {TIMEFRAME_LABELS[timeframe]}
              {categoryFilter !== 'all' ? ` · ${categoryFilter}` : ''}
              {paymentFilter !== 'all' ? ` · ${PAYMENT_LABELS[paymentFilter]}` : ''}
            </p>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-slate-700 mb-1">
              No matching expenses for this filter selection
            </p>
            <p className="text-xs text-slate-500 mb-4">
              Try widening your timeframe or log a new expense to see real-time analytics.
            </p>
            <div className="flex items-center justify-center gap-3">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Clear filters
                </button>
              )}
              <button
                type="button"
                onClick={onLogExpense}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
              >
                Log Expense
              </button>
            </div>
          </div>
        ) : (
          <div className="h-[320px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#475569' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (metric === 'count' ? String(v) : `₹${v}`)}
                    width={56}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const r = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 shadow-sm text-xs">
                          <p className="font-semibold text-slate-900 mb-1">{r.label}</p>
                          <p className="font-mono text-slate-800 tabular-nums">
                            {METRIC_LABELS[metric]}: {formatMetricValue(r.value)}
                          </p>
                          <p className="text-slate-500 font-mono tabular-nums mt-0.5">
                            Total: {formatINR(r.total)} · {r.count} entries ({r.sharePct}%)
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={52} isAnimationActive={false}>
                    {chartData.map((row) => (
                      <Cell key={row.key} fill={row.color} />
                    ))}
                  </Bar>
                </BarChart>
              ) : chartType === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 8 }}>
                  <defs>
                    <linearGradient id="bkCustomArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#475569' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (metric === 'count' ? String(v) : `₹${v}`)}
                    width={56}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const r = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 shadow-sm text-xs">
                          <p className="font-semibold text-slate-900 mb-1">{r.label}</p>
                          <p className="font-mono text-emerald-700 tabular-nums">
                            {formatMetricValue(r.value)}
                          </p>
                          <p className="text-slate-500 font-mono tabular-nums mt-0.5">
                            {r.count} entries · {r.sharePct}% share
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#059669"
                    strokeWidth={2.2}
                    fill="url(#bkCustomArea)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              ) : (
                <PieChart>
                  <Pie
                    data={nonZeroDonutData}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={120}
                    paddingAngle={2}
                    isAnimationActive={false}
                  >
                    {nonZeroDonutData.map((row) => (
                      <Cell key={row.key} fill={row.color} stroke="#FFFFFF" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const r = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 shadow-sm text-xs">
                          <p className="font-semibold text-slate-900">{r.label}</p>
                          <p className="font-mono text-slate-800 tabular-nums mt-0.5">
                            {formatMetricValue(r.value)} ({r.sharePct}%)
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Secondary Insights Grid: Payment / Spend-Type Splits + Runway & Table */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900 mb-3">
              UPI vs. Cash vs. Card
            </h3>
            <div className="space-y-3">
              {[
                { label: 'UPI Payments', amount: summary.upiTotal, color: '#059669' },
                { label: 'Cash', amount: summary.cashTotal, color: '#D97706' },
                { label: 'Card', amount: summary.cardTotal, color: '#0284C7' },
              ].map((row) => {
                const pct = summary.total > 0 ? Math.round((row.amount / summary.total) * 100) : 0;
                return (
                  <div key={row.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700">{row.label}</span>
                      <span className="font-mono tabular-nums text-slate-900">
                        {formatINR(row.amount)} <span className="text-slate-400">({pct}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: row.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-5 border-t border-slate-100">
            <h3 className="font-display text-base font-semibold text-slate-900 mb-3">
              Essential vs. Discretionary
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Essential</p>
                <p className="font-mono text-lg font-semibold text-slate-900 tabular-nums mt-0.5">
                  {formatINR(summary.essentialTotal)}
                </p>
                <p className="text-xs text-slate-500 tabular-nums">
                  {summary.total > 0
                    ? Math.round((summary.essentialTotal / summary.total) * 100)
                    : 0}
                  % of spend
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Discretionary</p>
                <p className="font-mono text-lg font-semibold text-amber-700 tabular-nums mt-0.5">
                  {formatINR(summary.discretionaryTotal)}
                </p>
                <p className="text-xs text-slate-500 tabular-nums">
                  {summary.total > 0
                    ? Math.round((summary.discretionaryTotal / summary.total) * 100)
                    : 0}
                  % of spend
                </p>
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-slate-100">
            <h3 className="font-display text-base font-semibold text-slate-900 mb-2">
              Runway &amp; Largest Purchase
            </h3>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Estimated allowance runway</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {metrics.runwayDays} days
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Largest single expense</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {summary.maxExpense
                    ? `${formatINR(summary.maxExpense.amount)} (${summary.maxExpense.title.slice(0, 22)})`
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* High-Density Breakdown Table */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Breakdown Table ({GROUP_BY_LABELS[groupBy]})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-6">Group</th>
                  <th className="py-2.5 px-4 text-right">Entries</th>
                  <th className="py-2.5 px-4 text-right">Avg Ticket</th>
                  <th className="py-2.5 px-4 text-right">Total Spend</th>
                  <th className="py-2.5 px-6 text-right">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {chartData.map((row) => (
                  <tr key={row.key} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-6 font-medium text-slate-900 whitespace-nowrap">
                      {row.label}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-600 tabular-nums">
                      {row.count}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-xs text-slate-600 tabular-nums">
                      {formatINR(row.average)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatINR(row.total)}
                    </td>
                    <td className="py-2.5 px-6 text-right font-mono text-xs text-slate-600 tabular-nums">
                      {row.sharePct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
