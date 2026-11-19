# Bachat Karo — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Ownership & PII Isolation**: `/users/{userId}` contains private PII (`email`). Only the authenticated, email-verified user with `request.auth.uid == userId` may `get`, `create`, or `update` their own profile. Listing `/users` is globally denied (`allow list: if false`).
2. **Master Gate**: Every document in `/users/{userId}/budgets/{monthId}` and `/users/{userId}/expenses/{expenseId}` requires the parent `/users/{userId}` document to exist (`existsAfter(...)` on write, `exists(...)` on single-document read/delete).
3. **Immutable Identity & Temporal Integrity**: `uid` / `userId`, `createdAt`, and `monthKey` (on budgets) are immutable after creation. All `createdAt` and `updatedAt` timestamps must strictly equal `request.time`.
4. **Strict Schema & Volumetric Bounds**: No unknown/shadow fields (`keys().hasAll(...) && keys().hasOnly(...)`). Every string has explicit `.size()` bounds and regex checks where defined in `firebase-blueprint.json`. Every numeric amount is bounded (`> 0` and `<= 500000` for expenses; `>= 0` and `<= 1000000` for budget fields).
5. **Action-Based Updates**: Updates explicitly allowlist modifiable fields via `incoming().diff(existing()).affectedKeys().hasOnly(...)` and always validate the resulting state with `isValid[Entity](incoming())`.
6. **Secure List Queries**: `allow list` on subcollections verifies `isOwner(userId) && existing().userId == request.auth.uid` without `get()` or `exists()` calls.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Read**: Anonymous client attempts `get` on `/users/alice/expenses/exp-1`. Expected: `PERMISSION_DENIED`.
2. **Cross-User PII Read**: Authenticated `bob` attempts `get` on `/users/alice`. Expected: `PERMISSION_DENIED`.
3. **User Collection Enumeration**: Authenticated `alice` attempts `list` on `/users`. Expected: `PERMISSION_DENIED`.
4. **Unverified Email Write**: Authenticated user with `email_verified: false` attempts `create` on `/users/u1/expenses/e1`. Expected: `PERMISSION_DENIED`.
5. **Identity Spoofing on Create**: `alice` attempts `create` on `/users/alice/expenses/e1` with `userId: "bob"`. Expected: `PERMISSION_DENIED`.
6. **Shadow Field Injection**: `alice` attempts `create` on `/users/alice` with extra ghost field `isAdmin: true`. Expected: `PERMISSION_DENIED`.
7. **Orphan Subcollection Write**: `alice` attempts `create` on `/users/alice/expenses/e1` before `/users/alice` exists. Expected: `PERMISSION_DENIED`.
8. **ID Poisoning Attack**: `alice` attempts `create` on `/users/alice/expenses/bad$$id..123` (invalid characters / oversized ID). Expected: `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: `alice` attempts `create` on `/users/alice/expenses/e1` with forged past `createdAt` != `request.time`. Expected: `PERMISSION_DENIED`.
10. **Immutable Field Tampering**: `alice` attempts `update` on `/users/alice/expenses/e1` changing `userId` or `createdAt`. Expected: `PERMISSION_DENIED`.
11. **Value Poisoning on Update**: `alice` attempts `update` on `/users/alice/expenses/e1` setting `amount: -500` or `title` with 500 characters. Expected: `PERMISSION_DENIED`.
12. **Budget Category Map Poisoning**: `alice` attempts `update` on `/users/alice/budgets/2026-11` injecting extra key `crypto: 999999` inside `categoryLimits`. Expected: `PERMISSION_DENIED`.
