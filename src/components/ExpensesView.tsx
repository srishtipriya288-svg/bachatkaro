import { useMemo, useState } from 'react';
import { Download, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
  CATEGORIES,
  CATEGORY_MAP,
  PAYMENT_LABELS,
  type Expense,
  type ExpenseCategory,
  type PaymentMethod,
  type SpendType,
} from '../types/budget';
import { exportExpensesToCSV, formatINR, formatShortDate } from '../lib/budgetMath';

interface ExpensesViewProps {
  monthKey: string;
  monthExpenses: Expense[];
  onLogExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
}

export function ExpensesView({
  monthKey,
  monthExpenses,
  onLogExpense,
  onEditExpense,
  onDeleteExpense,
}: ExpensesViewProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all');
  const [spendTypeFilter, setSpendTypeFilter] = useState<SpendType | 'all'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return monthExpenses.filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (paymentFilter !== 'all' && e.paymentMethod !== paymentFilter) return false;
      if (spendTypeFilter !== 'all' && e.spendType !== spendTypeFilter) return false;
      if (q) {
        const hay = `${e.title} ${e.notes} ${CATEGORY_MAP[e.category]?.label || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [monthExpenses, search, categoryFilter, paymentFilter, spendTypeFilter]);

  const filteredTotal = useMemo(
    () => filtered.reduce((acc, item) => acc + item.amount, 0),
    [filtered]
  );

  return (
    <div className="space-y-5">
      {/* Filter Toolbar */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search expenses or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="lg:col-span-3">
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | 'all')}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filter by payment mode"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as PaymentMethod | 'all')}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
            >
              <option value="all">All Modes</option>
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              aria-label="Filter by spend nature"
              value={spendTypeFilter}
              onChange={(e) => setSpendTypeFilter(e.target.value as SpendType | 'all')}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
            >
              <option value="all">All Types</option>
              <option value="essential">Essential</option>
              <option value="discretionary">Discretionary</option>
            </select>
          </div>

          <div className="lg:col-span-1 flex justify-end">
            <button
              type="button"
              onClick={() => exportExpensesToCSV(filtered, `bachat-karo-expenses-${monthKey}.csv`)}
              disabled={filtered.length === 0}
              title="Export CSV"
              aria-label="Export CSV"
              className="inline-flex items-center justify-center p-2.5 text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span className="tabular-nums">
            Showing <strong className="text-slate-900">{filtered.length}</strong> of{' '}
            {monthExpenses.length} expenses
          </span>
          <span className="tabular-nums">
            Filtered sum:{' '}
            <strong className="font-mono text-sm text-slate-900">{formatINR(filteredTotal)}</strong>
          </span>
        </div>
      </section>

      {/* High-Density Transaction Ledger */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <p className="text-sm font-medium text-slate-800 mb-1">
              {monthExpenses.length === 0
                ? 'No expenses recorded for this month yet'
                : 'No expenses match your search or filters'}
            </p>
            <p className="text-xs text-slate-500 mb-5">
              {monthExpenses.length === 0
                ? 'Start tracking daily chai, canteen meals, or auto fares to compute your live daily limit.'
                : 'Try clearing the search query or switching category filters.'}
            </p>
            <button
              type="button"
              onClick={onLogExpense}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                  <th className="py-3 px-5">Date</th>
                  <th className="py-3 px-4">Expense</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Mode / Type</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3 px-5 font-mono text-xs text-slate-600 whitespace-nowrap tabular-nums">
                      {formatShortDate(exp.date)}
                    </td>
                    <td className="py-3 px-4 max-w-[260px]">
                      <p className="font-medium text-slate-900 truncate">{exp.title}</p>
                      {exp.notes && (
                        <p className="text-xs text-slate-500 truncate mt-0.5">{exp.notes}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                      {CATEGORY_MAP[exp.category]?.label || exp.category}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {PAYMENT_LABELS[exp.paymentMethod]} ·{' '}
                      <span className="capitalize">{exp.spendType}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                      {formatINR(exp.amount)}
                    </td>
                    <td className="py-3 px-5 text-right whitespace-nowrap">
                      {confirmDeleteId === exp.id ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteExpense(exp.id);
                              setConfirmDeleteId(null);
                            }}
                            className="text-xs font-semibold text-red-700 hover:underline cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditExpense(exp)}
                            aria-label={`Edit ${exp.title}`}
                            className="p-1.5 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(exp.id)}
                            aria-label={`Delete ${exp.title}`}
                            className="p-1.5 text-slate-400 hover:text-red-700 rounded hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
