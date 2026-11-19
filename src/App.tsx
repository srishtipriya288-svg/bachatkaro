import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  ReceiptText,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SignInView } from './components/SignInView';
import { OnboardingModal } from './components/OnboardingModal';
import { ExpenseModal } from './components/ExpenseModal';
import { OverviewView } from './components/OverviewView';
import { AnalyticsView } from './components/AnalyticsView';
import { ExpensesView } from './components/ExpensesView';
import { BudgetSettingsView } from './components/BudgetSettingsView';
import {
  addExpense,
  completeStudentOnboarding,
  deleteExpense,
  saveMonthlyBudget,
  seedSampleExpensesBatch,
  subscribeMonthlyBudget,
  subscribeUserExpenses,
  subscribeUserProfile,
  updateExpense,
  updateUserPreferences,
} from './lib/firestoreService';
import {
  computeBudgetMetrics,
  createDefaultBudget,
  formatMonthLabel,
  generateSampleStudentExpenses,
  getCurrentMonthKey,
  shiftMonthKey,
} from './lib/budgetMath';
import {
  LIVING_TYPE_LABELS,
  type Expense,
  type ExpenseInput,
  type LivingType,
  type MonthlyBudget,
  type UserProfile,
} from './types/budget';

type NavTab = 'overview' | 'analytics' | 'expenses' | 'budget';

const NAV_ITEMS: { id: NavTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'expenses', label: 'Expenses', icon: ReceiptText },
  { id: 'budget', label: 'Monthly Budget', icon: SlidersHorizontal },
];

function DashboardShell() {
  const { user, authReady, signingIn, authError, signInWithGoogle, signOutUser } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [monthKey, setMonthKey] = useState<string>(getCurrentMonthKey());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [budgetDoc, setBudgetDoc] = useState<MonthlyBudget | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoaded, setExpensesLoaded] = useState(false);

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Subscribe to user profile & expenses when authenticated
  useEffect(() => {
    if (!authReady || !user) {
      setProfile(null);
      setProfileLoaded(false);
      setBudgetDoc(null);
      setExpenses([]);
      setExpensesLoaded(false);
      return;
    }

    const unsubProfile = subscribeUserProfile(user.uid, (data) => {
      setProfile(data);
      setProfileLoaded(true);
    });

    const unsubExpenses = subscribeUserExpenses(user.uid, (list) => {
      setExpenses(list);
      setExpensesLoaded(true);
    });

    return () => {
      unsubProfile();
      unsubExpenses();
    };
  }, [authReady, user]);

  // Subscribe to the active month's budget document once profile exists
  useEffect(() => {
    if (!authReady || !user || !profile) {
      setBudgetDoc(null);
      return;
    }

    const unsubBudget = subscribeMonthlyBudget(user.uid, monthKey, (data) => {
      setBudgetDoc(data);
    });

    return () => {
      unsubBudget();
    };
  }, [authReady, user, profile, monthKey]);

  const effectiveBudget = useMemo(() => {
    if (budgetDoc) return budgetDoc;
    return createDefaultBudget(user?.uid || '', monthKey);
  }, [budgetDoc, user?.uid, monthKey]);

  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.monthKey === monthKey),
    [expenses, monthKey]
  );

  const metrics = useMemo(
    () => computeBudgetMetrics(effectiveBudget, expenses, monthKey),
    [effectiveBudget, expenses, monthKey]
  );

  const handleSaveExpense = async (input: ExpenseInput, existingId?: string) => {
    if (!user) return;
    if (existingId) {
      await updateExpense(user.uid, existingId, input);
    } else {
      await addExpense(user.uid, input);
    }
    if (input.monthKey !== monthKey) {
      setMonthKey(input.monthKey);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!user) return;
    await deleteExpense(user.uid, expenseId);
  };

  const handleOpenNewExpense = () => {
    setEditingExpense(null);
    setExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setExpenseModalOpen(true);
  };

  // Auth loading skeleton
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="font-display text-lg font-bold text-slate-900">Bachat Karo</p>
          <p className="text-xs text-slate-500 mt-1">Checking your session...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated state: Google Sign-In screen
  if (!user) {
    return (
      <SignInView
        onSignIn={signInWithGoogle}
        signingIn={signingIn}
        authError={authError}
      />
    );
  }

  // Waiting for profile check
  if (!profileLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-3">
          <div className="h-5 w-32 bg-slate-200 rounded animate-pulse mx-auto" />
          <div className="h-3 w-48 bg-slate-200/80 rounded animate-pulse mx-auto" />
        </div>
      </div>
    );
  }

  // First-time onboarding setup
  if (!profile || !profile.onboardingComplete) {
    return (
      <OnboardingModal
        defaultName={user.displayName || 'Student'}
        email={user.email || ''}
        monthKey={monthKey}
        onComplete={async (data) => {
          const samples = data.includeSampleExpenses
            ? generateSampleStudentExpenses(monthKey)
            : [];
          await completeStudentOnboarding({
            uid: user.uid,
            displayName: data.displayName,
            email: user.email || '',
            city: data.city,
            livingType: data.livingType,
            monthKey,
            monthlyAllowance: data.monthlyAllowance,
            fixedEssentials: data.fixedEssentials,
            savingsGoal: data.savingsGoal,
            sampleExpenses: samples,
          });
        }}
      />
    );
  }

  const activeNavLabel = NAV_ITEMS.find((i) => i.id === activeTab)?.label || 'Overview';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar (248px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[248px] lg:shrink-0 bg-white border-r border-slate-200 sticky top-0 h-screen">
        <div className="h-16 px-6 flex items-center border-b border-slate-200">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            Bachat Karo
          </span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={profile.displayName}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-display font-semibold text-sm flex items-center justify-center shrink-0">
                {profile.displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{profile.displayName}</p>
              <p className="text-xs text-slate-500 truncate">
                {profile.city} · {LIVING_TYPE_LABELS[profile.livingType]}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={signOutUser}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] bg-white h-full flex flex-col border-r border-slate-200 z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
              <span className="font-display text-lg font-bold text-slate-900">Bachat Karo</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200">
              <p className="text-sm font-medium text-slate-900 truncate">{profile.displayName}</p>
              <p className="text-xs text-slate-500 truncate mb-3">{profile.email}</p>
              <button
                type="button"
                onClick={signOutUser}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Contextual Breadcrumb Left + Month Selector & Single Primary Action Right */}
        <header className="sticky top-0 z-30 h-16 bg-slate-50/95 backdrop-blur border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200/60"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline whitespace-nowrap">Bachat Karo</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-display font-semibold text-slate-900 truncate">
                {activeNavLabel}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Month Switcher */}
            <div className="inline-flex items-center bg-white border border-slate-200 rounded-lg">
              <button
                type="button"
                onClick={() => setMonthKey((m) => shiftMonthKey(m, -1))}
                aria-label="Previous month"
                className="p-2 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-medium text-slate-800 whitespace-nowrap tabular-nums min-w-[106px] text-center">
                {formatMonthLabel(monthKey)}
              </span>
              <button
                type="button"
                onClick={() => setMonthKey((m) => shiftMonthKey(m, 1))}
                aria-label="Next month"
                className="p-2 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Primary Action */}
            <button
              type="button"
              onClick={handleOpenNewExpense}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Expense</span>
            </button>
          </div>
        </header>

        {/* Viewport Container */}
        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {!expensesLoaded ? (
            <div className="space-y-6">
              <div className="h-44 bg-white border border-slate-200 rounded-xl animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((k) => (
                  <div
                    key={k}
                    className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            </div>
          ) : activeTab === 'overview' ? (
            <OverviewView
              monthKey={monthKey}
              metrics={metrics}
              monthExpenses={monthExpenses}
              onLogExpense={handleOpenNewExpense}
              onEditExpense={handleOpenEditExpense}
              onDeleteExpense={handleDeleteExpense}
              onNavigate={setActiveTab}
            />
          ) : activeTab === 'analytics' ? (
            <AnalyticsView
              monthKey={monthKey}
              allExpenses={expenses}
              metrics={metrics}
              onLogExpense={handleOpenNewExpense}
            />
          ) : activeTab === 'expenses' ? (
            <ExpensesView
              monthKey={monthKey}
              monthExpenses={monthExpenses}
              onLogExpense={handleOpenNewExpense}
              onEditExpense={handleOpenEditExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          ) : (
            <BudgetSettingsView
              monthKey={monthKey}
              budget={effectiveBudget}
              profile={profile}
              monthExpenseCount={monthExpenses.length}
              onSaveBudget={async (updated) => {
                await saveMonthlyBudget(user.uid, monthKey, updated, Boolean(budgetDoc));
              }}
              onSaveProfile={async (updates: {
                displayName: string;
                city: string;
                livingType: LivingType;
              }) => {
                await updateUserPreferences(user.uid, updates);
              }}
              onSeedSampleMonth={async () => {
                const samples = generateSampleStudentExpenses(monthKey);
                await seedSampleExpensesBatch(user.uid, samples);
              }}
            />
          )}
        </main>
      </div>

      {/* Log / Edit Expense Modal */}
      {expenseModalOpen && (
        <ExpenseModal
          initialExpense={editingExpense}
          remainingTodaySafe={metrics.remainingTodaySafe}
          onClose={() => {
            setExpenseModalOpen(false);
            setEditingExpense(null);
          }}
          onSave={handleSaveExpense}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DashboardShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
