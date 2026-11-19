/**
 * Bachat Karo — Firestore Security Rules Adversarial Test Suite (Dirty Dozen)
 *
 * Run against Firebase Emulator Suite with @firebase/rules-unit-testing:
 * Verifies all 12 Dirty Dozen payloads return PERMISSION_DENIED and valid owner flows succeed.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  actor: { uid: string; emailVerified: boolean } | null;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Read of Expense',
    actor: null,
    operation: 'get',
    path: '/users/alice/expenses/exp_1',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-User PII Profile Read',
    actor: { uid: 'bob', emailVerified: true },
    operation: 'get',
    path: '/users/alice',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Global User Collection Enumeration',
    actor: { uid: 'alice', emailVerified: true },
    operation: 'list',
    path: '/users',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Unverified Email Expense Write',
    actor: { uid: 'alice', emailVerified: false },
    operation: 'create',
    path: '/users/alice/expenses/exp_unverified',
    payload: {
      userId: 'alice',
      monthKey: '2026-11',
      title: 'Chai',
      amount: 20,
      category: 'food',
      paymentMethod: 'upi',
      spendType: 'discretionary',
      date: '2026-11-19',
      notes: '',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Identity Spoofing on Expense Create',
    actor: { uid: 'alice', emailVerified: true },
    operation: 'create',
    path: '/users/alice/expenses/exp_spoof',
    payload: {
      userId: 'bob',
      monthKey: '2026-11',
      title: 'Spoofed entry',
      amount: 100,
      category: 'food',
      paymentMethod: 'upi',
      spendType: 'essential',
      date: '2026-11-19',
      notes: '',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Shadow Field Injection on User Profile',
    actor: { uid: 'alice', emailVerified: true },
    operation: 'create',
    path: '/users/alice',
    payload: {
      uid: 'alice',
      displayName: 'Alice',
      email: 'alice@example.com',
      city: 'Dehradun',
      livingType: 'hostel',
      onboardingComplete: true,
      isAdmin: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Orphan Subcollection Write Without Parent User',
    actor: { uid: 'orphan_user', emailVerified: true },
    operation: 'create',
    path: '/users/orphan_user/expenses/exp_orphan',
    payload: {
      userId: 'orphan_user',
      monthKey: '2026-11',
      title: 'Orphan Lunch',
      amount: 80,
      category: 'food',
      paymentMethod: 'cash',
      spendType: 'essential',
      date: '2026-11-19',
      notes: '',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Document ID Poisoning',
    actor: { uid: 'alice', emailVerified: true },
    operation: 'create',
    path: '/users/alice/expenses/bad$$id..poison',
    payload: {
      userId: 'alice',
      monthKey: '2026-11',
      title: 'Poisoned ID',
      amount: 50,
      category: 'misc',
      paymentMethod: 'upi',
      spendType: 'discretionary',
      date: '2026-11-19',
      notes: '',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client Timestamp Forgery',
    actor: { uid: 'alice', emailVerified: true },
    operation: 'create',
    path: '/users/alice/expenses/exp_time_forge',
    payload: {
      userId: 'alice',
      monthKey: '2026-11',
      title: 'Forged Timestamp',
      amount: 40,
      category: 'transport',
      paymentMethod: 'upi',
      spendType: 'essential',
      date: '2026-11-19',
      notes: '',
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Immutable Field Tampering on Update',
    actor: { uid: 'alice', emailVerified: true },
    operation: 'update',
    path: '/users/alice/expenses/exp_1',
    payload: {
      userId: 'bob',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Value Poisoning on Expense Update',
    actor: { uid: 'alice', emailVerified: true },
    operation: 'update',
    path: '/users/alice/expenses/exp_1',
    payload: {
      amount: -500,
      title: 'A'.repeat(250),
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Budget Category Map Shadow Key Poisoning',
    actor: { uid: 'alice', emailVerified: true },
    operation: 'update',
    path: '/users/alice/budgets/2026-11',
    payload: {
      categoryLimits: {
        food: 3000,
        transport: 1000,
        study: 1000,
        hostel: 2000,
        social: 1000,
        shopping: 1000,
        misc: 500,
        crypto: 999999,
      },
    },
    expected: 'PERMISSION_DENIED',
  },
];
