import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  BLUEPRINT_LIMITS,
  DEFAULT_CATEGORY_LIMITS,
  type CategoryLimits,
  type Expense,
  type ExpenseInput,
  type LivingType,
  type MonthlyBudget,
  type UserProfile,
} from '../types/budget';

function clampString(val: string, maxLen: number): string {
  return val.trim().slice(0, maxLen);
}

function clampNumber(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.min(max, Math.max(min, Math.round(val * 100) / 100));
}

function sanitizeCategoryLimits(limits: CategoryLimits): CategoryLimits {
  return {
    food: clampNumber(limits.food ?? DEFAULT_CATEGORY_LIMITS.food, 0, BLUEPRINT_LIMITS.categoryLimitMax),
    transport: clampNumber(
      limits.transport ?? DEFAULT_CATEGORY_LIMITS.transport,
      0,
      BLUEPRINT_LIMITS.categoryLimitMax
    ),
    study: clampNumber(
      limits.study ?? DEFAULT_CATEGORY_LIMITS.study,
      0,
      BLUEPRINT_LIMITS.categoryLimitMax
    ),
    hostel: clampNumber(
      limits.hostel ?? DEFAULT_CATEGORY_LIMITS.hostel,
      0,
      BLUEPRINT_LIMITS.categoryLimitMax
    ),
    social: clampNumber(
      limits.social ?? DEFAULT_CATEGORY_LIMITS.social,
      0,
      BLUEPRINT_LIMITS.categoryLimitMax
    ),
    shopping: clampNumber(
      limits.shopping ?? DEFAULT_CATEGORY_LIMITS.shopping,
      0,
      BLUEPRINT_LIMITS.categoryLimitMax
    ),
    misc: clampNumber(limits.misc ?? DEFAULT_CATEGORY_LIMITS.misc, 0, BLUEPRINT_LIMITS.categoryLimitMax),
  };
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void
): Unsubscribe {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as UserProfile);
      } else {
        onData(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeMonthlyBudget(
  uid: string,
  monthKey: string,
  onData: (budget: MonthlyBudget | null) => void
): Unsubscribe {
  const path = `users/${uid}/budgets/${monthKey}`;
  return onSnapshot(
    doc(db, 'users', uid, 'budgets', monthKey),
    (snap) => {
      if (snap.exists()) {
        onData(snap.data() as MonthlyBudget);
      } else {
        onData(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeUserExpenses(
  uid: string,
  onData: (expenses: Expense[]) => void
): Unsubscribe {
  const path = `users/${uid}/expenses`;
  // Mandatory where('userId', '==', uid) aligns with hardened allow list rule
  const q = query(collection(db, 'users', uid, 'expenses'), where('userId', '==', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Expense[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Expense, 'id'>),
      }));
      // Sort client-side by date desc, then createdAt desc to avoid composite index requirements
      list.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function completeStudentOnboarding(params: {
  uid: string;
  displayName: string;
  email: string;
  city: string;
  livingType: LivingType;
  monthKey: string;
  monthlyAllowance: number;
  fixedEssentials: number;
  savingsGoal: number;
  sampleExpenses?: ExpenseInput[];
}): Promise<void> {
  const batch = writeBatch(db);
  const userRef = doc(db, 'users', params.uid);
  const budgetRef = doc(db, 'users', params.uid, 'budgets', params.monthKey);

  const safeName = clampString(params.displayName || 'Student', BLUEPRINT_LIMITS.displayNameMax) || 'Student';
  const safeEmail = clampString(params.email, BLUEPRINT_LIMITS.emailMax);
  const safeCity = clampString(params.city || 'Dehradun', BLUEPRINT_LIMITS.cityMax) || 'Dehradun';

  batch.set(userRef, {
    uid: params.uid,
    displayName: safeName,
    email: safeEmail,
    city: safeCity,
    livingType: params.livingType,
    onboardingComplete: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const spendable = Math.max(
    1000,
    params.monthlyAllowance - params.fixedEssentials - params.savingsGoal
  );
  const scaledLimits: CategoryLimits = sanitizeCategoryLimits({
    food: Math.round(spendable * 0.34),
    transport: Math.round(spendable * 0.14),
    study: Math.round(spendable * 0.12),
    hostel: Math.round(spendable * 0.14),
    social: Math.round(spendable * 0.12),
    shopping: Math.round(spendable * 0.09),
    misc: Math.round(spendable * 0.05),
  });

  batch.set(budgetRef, {
    userId: params.uid,
    monthKey: params.monthKey,
    monthlyAllowance: clampNumber(params.monthlyAllowance, 0, BLUEPRINT_LIMITS.budgetMax),
    fixedEssentials: clampNumber(params.fixedEssentials, 0, BLUEPRINT_LIMITS.budgetMax),
    savingsGoal: clampNumber(params.savingsGoal, 0, BLUEPRINT_LIMITS.budgetMax),
    alertThresholdPct: 80,
    categoryLimits: scaledLimits,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (params.sampleExpenses && params.sampleExpenses.length > 0) {
    for (const item of params.sampleExpenses) {
      const expRef = doc(collection(db, 'users', params.uid, 'expenses'));
      const safeDate = BLUEPRINT_LIMITS.dateRegex.test(item.date) ? item.date : `${params.monthKey}-01`;
      batch.set(expRef, {
        userId: params.uid,
        monthKey: safeDate.slice(0, 7),
        title: clampString(item.title, BLUEPRINT_LIMITS.titleMax) || 'Expense',
        amount: clampNumber(item.amount, 1, BLUEPRINT_LIMITS.amountMax),
        category: item.category,
        paymentMethod: item.paymentMethod,
        spendType: item.spendType,
        date: safeDate,
        notes: clampString(item.notes || '', BLUEPRINT_LIMITS.notesMax),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${params.uid}`);
  }
}

export async function updateUserPreferences(
  uid: string,
  updates: { displayName: string; city: string; livingType: LivingType }
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: clampString(updates.displayName || 'Student', BLUEPRINT_LIMITS.displayNameMax) || 'Student',
      city: clampString(updates.city || 'Dehradun', BLUEPRINT_LIMITS.cityMax) || 'Dehradun',
      livingType: updates.livingType,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveMonthlyBudget(
  uid: string,
  monthKey: string,
  budget: Omit<MonthlyBudget, 'userId' | 'monthKey' | 'createdAt' | 'updatedAt'>,
  isExisting: boolean
): Promise<void> {
  const path = `users/${uid}/budgets/${monthKey}`;
  const ref = doc(db, 'users', uid, 'budgets', monthKey);

  const sanitizedFields = {
    monthlyAllowance: clampNumber(budget.monthlyAllowance, 0, BLUEPRINT_LIMITS.budgetMax),
    fixedEssentials: clampNumber(budget.fixedEssentials, 0, BLUEPRINT_LIMITS.budgetMax),
    savingsGoal: clampNumber(budget.savingsGoal, 0, BLUEPRINT_LIMITS.budgetMax),
    alertThresholdPct: clampNumber(budget.alertThresholdPct, 50, 100),
    categoryLimits: sanitizeCategoryLimits(budget.categoryLimits),
  };

  try {
    if (isExisting) {
      await updateDoc(ref, {
        ...sanitizedFields,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        userId: uid,
        monthKey,
        ...sanitizedFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      isExisting ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function addExpense(uid: string, input: ExpenseInput): Promise<void> {
  const expRef = doc(collection(db, 'users', uid, 'expenses'));
  const path = `users/${uid}/expenses/${expRef.id}`;
  const safeDate = input.date.trim();
  const derivedMonthKey = safeDate.slice(0, 7);

  try {
    await setDoc(expRef, {
      userId: uid,
      monthKey: derivedMonthKey,
      title: clampString(input.title, BLUEPRINT_LIMITS.titleMax) || 'Expense',
      amount: clampNumber(input.amount, 1, BLUEPRINT_LIMITS.amountMax),
      category: input.category,
      paymentMethod: input.paymentMethod,
      spendType: input.spendType,
      date: safeDate,
      notes: clampString(input.notes || '', BLUEPRINT_LIMITS.notesMax),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateExpense(
  uid: string,
  expenseId: string,
  input: ExpenseInput
): Promise<void> {
  const path = `users/${uid}/expenses/${expenseId}`;
  const safeDate = input.date.trim();
  const derivedMonthKey = safeDate.slice(0, 7);

  try {
    await updateDoc(doc(db, 'users', uid, 'expenses', expenseId), {
      monthKey: derivedMonthKey,
      title: clampString(input.title, BLUEPRINT_LIMITS.titleMax) || 'Expense',
      amount: clampNumber(input.amount, 1, BLUEPRINT_LIMITS.amountMax),
      category: input.category,
      paymentMethod: input.paymentMethod,
      spendType: input.spendType,
      date: safeDate,
      notes: clampString(input.notes || '', BLUEPRINT_LIMITS.notesMax),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteExpense(uid: string, expenseId: string): Promise<void> {
  const path = `users/${uid}/expenses/${expenseId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'expenses', expenseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedSampleExpensesBatch(
  uid: string,
  samples: ExpenseInput[]
): Promise<void> {
  const batch = writeBatch(db);
  for (const item of samples) {
    const expRef = doc(collection(db, 'users', uid, 'expenses'));
    const safeDate = item.date.trim();
    batch.set(expRef, {
      userId: uid,
      monthKey: safeDate.slice(0, 7),
      title: clampString(item.title, BLUEPRINT_LIMITS.titleMax) || 'Expense',
      amount: clampNumber(item.amount, 1, BLUEPRINT_LIMITS.amountMax),
      category: item.category,
      paymentMethod: item.paymentMethod,
      spendType: item.spendType,
      date: safeDate,
      notes: clampString(item.notes || '', BLUEPRINT_LIMITS.notesMax),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}/expenses`);
  }
}
