import { useEffect, useState, type FormEvent } from 'react';
import { Check, Sparkles } from 'lucide-react';
import {
  CATEGORIES,
  INDIAN_STUDENT_CITIES,
  LIVING_TYPE_LABELS,
  type CategoryLimits,
  type ExpenseCategory,
  type LivingType,
  type MonthlyBudget,
  type UserProfile,
} from '../types/budget';
import { formatINR, formatMonthLabel, getMonthInfo } from '../lib/budgetMath';

interface BudgetSettingsViewProps {
  monthKey: string;
  budget: MonthlyBudget;
  profile: UserProfile;
  monthExpenseCount: number;
  onSaveBudget: (
    updated: Omit<MonthlyBudget, 'userId' | 'monthKey' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  onSaveProfile: (updates: {
    displayName: string;
    city: string;
    livingType: LivingType;
  }) => Promise<void>;
  onSeedSampleMonth: () => Promise<void>;
}

export function BudgetSettingsView({
  monthKey,
  budget,
  profile,
  monthExpenseCount,
  onSaveBudget,
  onSaveProfile,
  onSeedSampleMonth,
}: BudgetSettingsViewProps) {
  const [allowance, setAllowance] = useState(String(budget.monthlyAllowance));
  const [essentials, setEssentials] = useState(String(budget.fixedEssentials));
  const [savingsGoal, setSavingsGoal] = useState(String(budget.savingsGoal));
  const [alertPct, setAlertPct] = useState(budget.alertThresholdPct);
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimits>({
    ...budget.categoryLimits,
  });

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [city, setCity] = useState(profile.city);
  const [livingType, setLivingType] = useState<LivingType>(profile.livingType);

  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetSaved, setBudgetSaved] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    setAllowance(String(budget.monthlyAllowance));
    setEssentials(String(budget.fixedEssentials));
    setSavingsGoal(String(budget.savingsGoal));
    setAlertPct(budget.alertThresholdPct);
    setCategoryLimits({ ...budget.categoryLimits });
  }, [budget]);

  useEffect(() => {
    setDisplayName(profile.displayName);
    setCity(profile.city);
    setLivingType(profile.livingType);
  }, [profile]);

  const monthInfo = getMonthInfo(monthKey);
  const allowanceNum = Math.max(0, Number(allowance) || 0);
  const essentialsNum = Math.max(0, Number(essentials) || 0);
  const savingsNum = Math.max(0, Number(savingsGoal) || 0);
  const spendablePool = Math.max(0, allowanceNum - essentialsNum - savingsNum);
  const idealDaily = Math.floor(spendablePool / monthInfo.daysInMonth);
  const sumOfCaps = Object.values(categoryLimits).reduce((a, b) => a + (Number(b) || 0), 0);

  const handleCategoryLimitChange = (cat: ExpenseCategory, val: string) => {
    setCategoryLimits((prev) => ({
      ...prev,
      [cat]: Math.max(0, Number(val) || 0),
    }));
  };

  const handleBudgetSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSavingBudget(true);
    setBudgetSaved(false);
    try {
      await onSaveBudget({
        monthlyAllowance: allowanceNum,
        fixedEssentials: essentialsNum,
        savingsGoal: savingsNum,
        alertThresholdPct: alertPct,
        categoryLimits,
      });
      setBudgetSaved(true);
      setTimeout(() => setBudgetSaved(false), 2500);
    } finally {
      setSavingBudget(false);
    }
  };

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSaved(false);
    try {
      await onSaveProfile({
        displayName: displayName.trim() || 'Student',
        city,
        livingType,
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await onSeedSampleMonth();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Monthly Allowance & Category Caps Form */}
      <form
        onSubmit={handleBudgetSubmit}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Monthly Budget — {formatMonthLabel(monthKey)}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Changes recalculate your Safe Daily Spending Limit and alerts instantaneously
            </p>
          </div>

          <button
            type="submit"
            disabled={savingBudget}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            {budgetSaved ? (
              <>
                <Check className="w-4 h-4" />
                Saved
              </>
            ) : savingBudget ? (
              'Saving...'
            ) : (
              'Save Monthly Budget'
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label htmlFor="b-allowance" className="block text-xs font-medium text-slate-700 mb-1.5">
              Monthly Allowance / Stipend (₹)
            </label>
            <input
              id="b-allowance"
              type="number"
              min={0}
              max={1000000}
              value={allowance}
              onChange={(e) => setAllowance(e.target.value)}
              className="w-full px-3.5 py-2.5 text-base font-mono font-semibold tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="b-essentials" className="block text-xs font-medium text-slate-700 mb-1.5">
              Fixed Essentials (Rent, Mess, Fees) (₹)
            </label>
            <input
              id="b-essentials"
              type="number"
              min={0}
              max={1000000}
              value={essentials}
              onChange={(e) => setEssentials(e.target.value)}
              className="w-full px-3.5 py-2.5 text-base font-mono font-semibold tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="b-savings" className="block text-xs font-medium text-slate-700 mb-1.5">
              Protected Bachat Savings Goal (₹)
            </label>
            <input
              id="b-savings"
              type="number"
              min={0}
              max={1000000}
              value={savingsGoal}
              onChange={(e) => setSavingsGoal(e.target.value)}
              className="w-full px-3.5 py-2.5 text-base font-mono font-semibold tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>
        </div>

        {/* Live Pool Summary Strip */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-sm">
          <div>
            <span className="text-slate-600">Spendable monthly pool: </span>
            <strong className="font-mono text-slate-900 tabular-nums">
              {formatINR(spendablePool)}
            </strong>
          </div>
          <div>
            <span className="text-slate-600">Baseline daily budget: </span>
            <strong className="font-mono text-emerald-700 tabular-nums">
              {formatINR(idealDaily)}/day
            </strong>
          </div>
        </div>

        {/* Alert Threshold Slider */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <label htmlFor="b-threshold" className="font-medium text-slate-700">
              Proactive Warning Alert Threshold
            </label>
            <span className="font-mono font-semibold text-slate-900 tabular-nums">
              Trigger warnings at {alertPct}% of limit
            </span>
          </div>
          <input
            id="b-threshold"
            type="range"
            min={50}
            max={95}
            step={5}
            value={alertPct}
            onChange={(e) => setAlertPct(Number(e.target.value))}
            className="w-full accent-emerald-700 cursor-pointer"
          />
        </div>

        {/* Category Caps Grid */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-900">
                Per-Category Monthly Caps
              </h3>
              <p className="text-xs text-slate-500">
                Receive alerts whenever a category approaches {alertPct}% of its monthly cap
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              Total caps: {formatINR(sumOfCaps)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => (
              <div key={cat.id}>
                <label
                  htmlFor={`cap-${cat.id}`}
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  {cat.label}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                    ₹
                  </span>
                  <input
                    id={`cap-${cat.id}`}
                    type="number"
                    min={0}
                    max={500000}
                    value={categoryLimits[cat.id] ?? 0}
                    onChange={(e) => handleCategoryLimitChange(cat.id, e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>

      {/* Student Profile Preferences & Sample Data Utility */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleProfileSubmit}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                Student Profile
              </h3>
              <p className="text-xs text-slate-500">{profile.email}</p>
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {profileSaved ? 'Saved' : savingProfile ? 'Saving...' : 'Update Profile'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="p-name" className="block text-xs font-medium text-slate-700 mb-1">
                Display name
              </label>
              <input
                id="p-name"
                type="text"
                maxLength={100}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="p-city" className="block text-xs font-medium text-slate-700 mb-1">
                City
              </label>
              <select
                id="p-city"
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

            <div>
              <label htmlFor="p-living" className="block text-xs font-medium text-slate-700 mb-1">
                Accommodation
              </label>
              <select
                id="p-living"
                value={livingType}
                onChange={(e) => setLivingType(e.target.value as LivingType)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900"
              >
                {(Object.keys(LIVING_TYPE_LABELS) as LivingType[]).map((lt) => (
                  <option key={lt} value={lt}>
                    {LIVING_TYPE_LABELS[lt]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900 mb-1">
              Populate Sample Student Month
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Need realistic data for {formatMonthLabel(monthKey)} to demo Bachat Karo’s charts and
              daily spending alerts? Add 14 Indian college student expenses (canteen, auto, UPI
              snacks, printouts) in one click.
            </p>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 tabular-nums">
              Current month entries: {monthExpenseCount}
            </span>
            <button
              type="button"
              onClick={handleSeed}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {seeding ? 'Adding...' : 'Add Sample Expenses'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
