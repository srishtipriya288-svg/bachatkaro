import { useMemo, useState } from 'react';
import { ArrowRight, BarChart3, BellRing, Calculator, ShieldCheck } from 'lucide-react';
import { formatINR } from '../lib/budgetMath';

interface SignInViewProps {
  onSignIn: () => Promise<void>;
  signingIn: boolean;
  authError: string | null;
}

function GoogleMark() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.54-5.17 3.54-8.87z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.27v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29A7.19 7.19 0 0 1 4.9 12c0-.79.14-1.56.38-2.29V6.62H1.27a12 12 0 0 0 0 10.76l4.01-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.61 4.59 1.79l3.44-3.44C17.94 1.19 15.23 0 12 0A12 12 0 0 0 1.27 6.62l4.01 3.09C6.23 6.87 8.88 4.76 12 4.76z"
      />
    </svg>
  );
}

export function SignInView({ onSignIn, signingIn, authError }: SignInViewProps) {
  const [allowance, setAllowance] = useState(12000);
  const [essentials, setEssentials] = useState(4500);
  const [savings, setSavings] = useState(1500);
  const [daysLeft, setDaysLeft] = useState(18);

  const preview = useMemo(() => {
    const spendable = Math.max(0, allowance - essentials - savings);
    const safeDaily = Math.floor(spendable / Math.max(1, daysLeft));
    return { spendable, safeDaily };
  }, [allowance, essentials, savings, daysLeft]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Bachat Karo
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#calculator"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Daily Limit
            </a>
            <a
              href="#features"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#analytics-preview"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Analytics
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onSignIn}
              disabled={signingIn}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {signingIn ? 'Connecting...' : 'Sign in with Google'}
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Hero Split */}
        <section className="max-w-6xl mx-auto px-6 pt-14 pb-16 lg:pt-20 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left: Narrative & Google Sign-In */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <p className="text-sm font-medium text-emerald-700 mb-3">
                Personal budgeting for Indian college students
              </p>
              <h1
                className="font-display font-bold text-slate-900 tracking-tight leading-[1.08] mb-5 max-w-xl"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.35rem)', textWrap: 'balance' }}
              >
                Know how much you can safely spend today.
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-xl mb-8">
                Stop realizing your monthly allowance is gone ten days before month-end. Bachat
                Karo turns your remaining balance, hostel or PG essentials, and days left into one
                clear daily safe spending limit—backed by live charts and instant UPI expense
                tracking.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
                <button
                  type="button"
                  onClick={onSignIn}
                  disabled={signingIn}
                  className="inline-flex items-center justify-center gap-3 px-6 py-3.5 text-sm font-semibold text-slate-900 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <GoogleMark />
                  <span>{signingIn ? 'Opening Google Sign-In...' : 'Continue with Google'}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {authError && (
                <div
                  role="alert"
                  className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 max-w-md"
                >
                  {authError}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                <span>Private Google cloud sync</span>
                <span aria-hidden="true">·</span>
                <span>Built for hostel, PG &amp; flat allowances</span>
                <span aria-hidden="true">·</span>
                <span>Real-time analytics &amp; CSV export</span>
              </div>
            </div>

            {/* Right: Interactive Live Safe-Spend Calculator */}
            <div
              id="calculator"
              className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 sm:p-7 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="font-display text-base font-semibold text-slate-900">
                      Try the Safe Daily Limit
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Adjust your monthly numbers to preview your daily guide
                    </p>
                  </div>
                  <Calculator className="w-4 h-4 text-emerald-700 shrink-0" />
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <label htmlFor="calc-allowance" className="font-medium text-slate-700">
                        Monthly allowance
                      </label>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {formatINR(allowance)}
                      </span>
                    </div>
                    <input
                      id="calc-allowance"
                      type="range"
                      min={3000}
                      max={30000}
                      step={500}
                      value={allowance}
                      onChange={(e) => setAllowance(Number(e.target.value))}
                      className="w-full accent-emerald-700 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <label htmlFor="calc-essentials" className="font-medium text-slate-700">
                        Fixed hostel, PG &amp; mess
                      </label>
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {formatINR(essentials)}
                      </span>
                    </div>
                    <input
                      id="calc-essentials"
                      type="range"
                      min={0}
                      max={Math.min(20000, allowance)}
                      step={500}
                      value={Math.min(essentials, allowance)}
                      onChange={(e) => setEssentials(Number(e.target.value))}
                      className="w-full accent-emerald-700 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <label htmlFor="calc-savings" className="font-medium text-slate-700">
                          Savings goal
                        </label>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {formatINR(savings)}
                        </span>
                      </div>
                      <input
                        id="calc-savings"
                        type="range"
                        min={0}
                        max={8000}
                        step={250}
                        value={savings}
                        onChange={(e) => setSavings(Number(e.target.value))}
                        className="w-full accent-emerald-700 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <label htmlFor="calc-days" className="font-medium text-slate-700">
                          Days remaining
                        </label>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {daysLeft} days
                        </span>
                      </div>
                      <input
                        id="calc-days"
                        type="range"
                        min={1}
                        max={30}
                        step={1}
                        value={daysLeft}
                        onChange={(e) => setDaysLeft(Number(e.target.value))}
                        className="w-full accent-emerald-700 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-200">
                <div className="flex items-baseline justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Recommended safe spend</p>
                    <p className="font-mono text-3xl font-semibold text-emerald-700 tabular-nums mt-1">
                      {formatINR(preview.safeDaily)}
                      <span className="text-sm font-sans font-normal text-slate-500"> / day</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Spendable pool</p>
                    <p className="font-mono text-sm font-medium text-slate-800 tabular-nums mt-0.5">
                      {formatINR(preview.spendable)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mechanism-to-Outcome Strip */}
        <section id="features" className="border-t border-slate-200 bg-white">
          <div className="max-w-6xl mx-auto px-6 py-14">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                  <Calculator className="w-4 h-4" />
                </div>
                <h3 className="font-display text-base font-semibold text-slate-900 mb-2">
                  Dynamic Daily Spending Limit
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Every chai, auto ride, or canteen lunch immediately recalculates what remains safe
                  for today and tomorrow—so your allowance lasts until the 30th.
                </p>
              </div>

              <div id="analytics-preview">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3 className="font-display text-base font-semibold text-slate-900 mb-2">
                  Custom Real-Time Analytics
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Watch burn-rate pace lines, daily spend vs. limit bars, category donuts, and slice
                  your own UPI vs. Cash or Essential vs. Discretionary charts live.
                </p>
              </div>

              <div>
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                  <BellRing className="w-4 h-4" />
                </div>
                <h3 className="font-display text-base font-semibold text-slate-900 mb-2">
                  Proactive Category Alerts
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Set monthly caps for Food, Outings, Transport, and Shopping. Receive clear alerts
                  at 80% before small UPI payments quietly drain your balance.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Your expenses are stored privately under your Google account.</span>
          </div>
          <span>Bachat Karo · Built for college students across India</span>
        </div>
      </footer>
    </div>
  );
}
