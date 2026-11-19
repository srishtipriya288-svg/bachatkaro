import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import {
  BLUEPRINT_LIMITS,
  CATEGORIES,
  CATEGORY_MAP,
  PAYMENT_LABELS,
  type Expense,
  type ExpenseCategory,
  type ExpenseInput,
  type PaymentMethod,
  type SpendType,
} from '../types/budget';
import { formatINR, getTodayDateString } from '../lib/budgetMath';

interface ExpenseModalProps {
  initialExpense?: Expense | null;
  remainingTodaySafe: number;
  onClose: () => void;
  onSave: (input: ExpenseInput, existingId?: string) => Promise<void>;
}

const QUICK_AMOUNTS = [20, 50, 100, 250, 500];

export function ExpenseModal({
  initialExpense,
  remainingTodaySafe,
  onClose,
  onSave,
}: ExpenseModalProps) {
  const isEditing = Boolean(initialExpense);
  const [title, setTitle] = useState(initialExpense?.title || '');
  const [amount, setAmount] = useState(initialExpense ? String(initialExpense.amount) : '');
  const [category, setCategory] = useState<ExpenseCategory>(initialExpense?.category || 'food');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initialExpense?.paymentMethod || 'upi'
  );
  const [spendType, setSpendType] = useState<SpendType>(initialExpense?.spendType || 'essential');
  const [date, setDate] = useState(initialExpense?.date || getTodayDateString());
  const [notes, setNotes] = useState(initialExpense?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericAmount = Number(amount) || 0;
  const todayStr = getTodayDateString();
  const isTodayEntry = date === todayStr;

  const adjustedRemainingToday = isTodayEntry
    ? remainingTodaySafe + (isEditing && initialExpense?.date === todayStr ? initialExpense.amount : 0) - numericAmount
    : remainingTodaySafe;

  const handleCategoryChange = (cat: ExpenseCategory) => {
    setCategory(cat);
    if (!isEditing) {
      setSpendType(CATEGORY_MAP[cat].defaultSpendType);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Enter a short title (e.g. Canteen Lunch, Auto to Campus).');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > BLUEPRINT_LIMITS.amountMax) {
      setError(`Enter a valid amount between ₹1 and ${formatINR(BLUEPRINT_LIMITS.amountMax)}.`);
      return;
    }
    if (!BLUEPRINT_LIMITS.dateRegex.test(date)) {
      setError('Select a valid date.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSave(
        {
          monthKey: date.slice(0, 7),
          title: trimmedTitle.slice(0, BLUEPRINT_LIMITS.titleMax),
          amount: Math.round(numericAmount * 100) / 100,
          category,
          paymentMethod,
          spendType,
          date,
          notes: notes.trim().slice(0, BLUEPRINT_LIMITS.notesMax),
        },
        initialExpense?.id
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save expense.');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/45 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 id="expense-modal-title" className="font-display text-lg font-semibold text-slate-900">
            {isEditing ? 'Edit Expense' : 'Log Expense'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Amount + quick rupee buttons */}
          <div>
            <label htmlFor="exp-amount" className="block text-xs font-medium text-slate-700 mb-1.5">
              Amount (INR)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-base font-semibold text-slate-400">
                ₹
              </span>
              <input
                id="exp-amount"
                type="number"
                min={1}
                max={BLUEPRINT_LIMITS.amountMax}
                step="any"
                placeholder="0"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 text-xl font-mono font-semibold tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(String((Number(amount) || 0) + val))}
                  className="px-2.5 py-1 text-xs font-mono font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors tabular-nums cursor-pointer"
                >
                  +₹{val}
                </button>
              ))}
              {numericAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount('')}
                  className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Title & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="exp-title" className="block text-xs font-medium text-slate-700 mb-1.5">
                What did you spend on?
              </label>
              <input
                id="exp-title"
                type="text"
                maxLength={BLUEPRINT_LIMITS.titleMax}
                placeholder="e.g. Canteen lunch, Auto fare, Printout"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
            <div>
              <label htmlFor="exp-date" className="block text-xs font-medium text-slate-700 mb-1.5">
                Date
              </label>
              <input
                id="exp-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <span className="block text-xs font-medium text-slate-700 mb-1.5">Category</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors whitespace-nowrap truncate cursor-pointer ${
                    category === cat.id
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Mode & Spend Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-medium text-slate-700 mb-1.5">Payment mode</span>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                {(['upi', 'cash', 'card'] as PaymentMethod[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMethod(mode)}
                    className={`py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      paymentMethod === mode
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {PAYMENT_LABELS[mode]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-slate-700 mb-1.5">Spend nature</span>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
                {(['essential', 'discretionary'] as SpendType[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSpendType(st)}
                    className={`py-1.5 text-xs font-medium rounded-md transition-colors capitalize cursor-pointer ${
                      spendType === st
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label htmlFor="exp-notes" className="block text-xs font-medium text-slate-700 mb-1.5">
              Note (optional)
            </label>
            <input
              id="exp-notes"
              type="text"
              maxLength={BLUEPRINT_LIMITS.notesMax}
              placeholder="Any extra detail for your records"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          {/* Live Daily Safe Limit Impact */}
          {isTodayEntry && numericAmount > 0 && (
            <div className="px-4 py-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600">After this entry, left for today:</span>
              <span
                className={`font-mono font-semibold tabular-nums ${
                  adjustedRemainingToday < 0 ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                {adjustedRemainingToday < 0
                  ? `${formatINR(Math.abs(adjustedRemainingToday))} over today's limit`
                  : `${formatINR(adjustedRemainingToday)} remaining`}
              </span>
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
