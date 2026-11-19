import { useState, type FormEvent } from 'react';
import {
  INDIAN_STUDENT_CITIES,
  LIVING_TYPE_LABELS,
  type LivingType,
} from '../types/budget';
import { formatINR, getMonthInfo } from '../lib/budgetMath';

interface OnboardingModalProps {
  defaultName: string;
  email: string;
  monthKey: string;
  onComplete: (data: {
    displayName: string;
    city: string;
    livingType: LivingType;
    monthlyAllowance: number;
    fixedEssentials: number;
    savingsGoal: number;
    includeSampleExpenses: boolean;
  }) => Promise<void>;
}

export function OnboardingModal({
  defaultName,
  email,
  monthKey,
  onComplete,
}: OnboardingModalProps) {
  const [displayName, setDisplayName] = useState(defaultName || 'Student');
  const [city, setCity] = useState('Dehradun');
  const [livingType, setLivingType] = useState<LivingType>('hostel');
  const [monthlyAllowance, setMonthlyAllowance] = useState('12000');
  const [fixedEssentials, setFixedEssentials] = useState('4000');
  const [savingsGoal, setSavingsGoal] = useState('1500');
  const [includeSampleExpenses, setIncludeSampleExpenses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const monthInfo = getMonthInfo(monthKey);
  const allowanceNum = Math.max(0, Number(monthlyAllowance) || 0);
  const essentialsNum = Math.max(0, Number(fixedEssentials) || 0);
  const savingsNum = Math.max(0, Number(savingsGoal) || 0);
  const spendable = Math.max(0, allowanceNum - essentialsNum - savingsNum);
  const dailyPreview = Math.floor(spendable / Math.max(1, monthInfo.daysRemainingInclusive));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (allowanceNum <= 0) {
      setError('Enter a monthly allowance greater than ₹0.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onComplete({
        displayName: displayName.trim(),
        city,
        livingType,
        monthlyAllowance: allowanceNum,
        fixedEssentials: essentialsNum,
        savingsGoal: savingsNum,
        includeSampleExpenses,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save your setup.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-xl w-full bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-medium text-emerald-700 mb-1">Welcome to Bachat Karo</p>
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            Set up your monthly allowance
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Signed in as <span className="font-medium text-slate-800">{email}</span>. You can adjust
            these figures anytime in Monthly Budget.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="onb-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                Your name
              </label>
              <input
                id="onb-name"
                type="text"
                maxLength={100}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>

            <div>
              <label htmlFor="onb-city" className="block text-xs font-medium text-slate-700 mb-1.5">
                City
              </label>
              <select
                id="onb-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
              >
                {INDIAN_STUDENT_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700 mb-1.5">
              Accommodation type
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(LIVING_TYPE_LABELS) as LivingType[]).map((lt) => (
                <button
                  key={lt}
                  type="button"
                  onClick={() => setLivingType(lt)}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                    livingType === lt
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {LIVING_TYPE_LABELS[lt]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <label
                htmlFor="onb-allowance"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Monthly allowance (₹)
              </label>
              <input
                id="onb-allowance"
                type="number"
                min={500}
                max={1000000}
                value={monthlyAllowance}
                onChange={(e) => setMonthlyAllowance(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900"
                required
              />
            </div>

            <div>
              <label
                htmlFor="onb-essentials"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Fixed rent / mess (₹)
              </label>
              <input
                id="onb-essentials"
                type="number"
                min={0}
                max={1000000}
                value={fixedEssentials}
                onChange={(e) => setFixedEssentials(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="onb-savings"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Monthly savings goal (₹)
              </label>
              <input
                id="onb-savings"
                type="number"
                min={0}
                max={1000000}
                value={savingsGoal}
                onChange={(e) => setSavingsGoal(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">
                Starting Safe Daily Limit ({monthInfo.daysRemainingInclusive} days left this month)
              </p>
              <p className="font-mono text-2xl font-semibold text-emerald-700 tabular-nums mt-0.5">
                {formatINR(dailyPreview)}
                <span className="text-xs font-sans font-normal text-slate-500"> / day</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Spendable pool</p>
              <p className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                {formatINR(spendable)}
              </p>
            </div>
          </div>

          <label className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeSampleExpenses}
              onChange={(e) => setIncludeSampleExpenses(e.target.checked)}
              className="mt-1 accent-emerald-700 rounded cursor-pointer"
            />
            <span>
              Pre-fill with 14 sample Indian student expenses (canteen, auto, printouts, UPI snacks)
              so you can explore all real-time analytics charts immediately.
            </span>
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
          >
            {submitting ? 'Creating your dashboard...' : 'Launch Bachat Karo Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
}
