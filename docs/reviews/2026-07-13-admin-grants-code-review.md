# Code Review: `wayfinder/23-admin-grants`

**Base**: `b723be9` (merge-base with `main`)  
**HEAD**: `a68a008` feat(plan): implement admin grants feature  
**Date**: 2026-07-13  
**Files changed**: 20 files, +6004 / −21 lines

---

## Standards

### Hard violations (documented standard breach)

1. **`requireAdmin` throws `FORBIDDEN` instead of `UNAUTHORIZED`**
   - **File**: `src/lib/server/services/plan/plan.guard.ts:27`
   - **Rule**: `src/lib/server/services/AGENTS.md` line 208 — _"All `require*` methods... throw `UNAUTHORIZED` when falsy."_
   - **Found**: `throw new ORPCError("FORBIDDEN", { message: "Admin access required" });`
   - **Impact**: `FORBIDDEN` is semantically for "authed but not owner of the resource" (AGENTS.md line 413). The test at `plan.service.test.ts:634` compounds this by naming `it("throws UNAUTHORIZED...")` while asserting `{ code: "FORBIDDEN" }`.

2. **Missing command/query files — feature unplumbed**
   - **Files that do not exist**:
     - `src/lib/server/services/plan/commands/plan.admin.grant-plan.ts`
     - `src/lib/server/services/plan/queries/plan.admin.list-grants.ts`
   - **File not updated**: `src/lib/server/services/plan/plan.router.ts` — no `admin: { ... }` sub-object.
   - **Rule**: AGENTS.md lines 400-407 — _"Admin actions live in a nested `admin: { ... }` object on the router"_ and _"each command and query is its own file"_.
   - **Impact**: `grantPlan` and `listGrants` are unreachable via oRPC.

### Baseline smells (judgement calls)

3. **Mysterious Name — test label vs assertion**
   - **File**: `src/lib/server/services/plan/plan.service.test.ts:634,646`
   - **Hunk**: `it("throws UNAUTHORIZED when admin id is null"...` but asserts `toMatchObject({ code: "FORBIDDEN" })`.
   - **Note**: Not a hard violation since it's a test name, but it misleads readers.

4. **Duplicated Code — try-catch boilerplate (overridden by server AGENTS.md)**
   - Every Drizzle repository method wraps identical `try-catch → ORPCError('INTERNAL_SERVER_ERROR')`. The server-layer AGENTS.md mandates this pattern, so it's accepted convention, not a violation.

5. **Speculative Generality — user domain (judgement call)**
   - `src/lib/server/services/user/` exists solely for `findUserById`. Acceptable trade-off: a proper repository interface is cleaner than inlining Drizzle calls into `PlanGuard`.

---

## Spec

### Missing / partial requirements

1. **`applyDerivedPlan` NOT rewritten for L1 union** (CRITICAL)
   - **Spec**: Locked decision L1 (line 28), Task 9.2 (lines 1121-1168).
   - **Found**: Current `applyDerivedPlan` reads `findPaidOrdersForUser` only. It never unions `findActiveAdminGrantsForUser`. No `alwaysApply` flag exists in `AppliedOrder` or `deriveUserPlan`.
   - **Impact**: Admin grants do not participate in the derivation pipeline. Tier-ranking, same-tier extension, and the `alwaysApply` invariant are all dead code that was never wired.

2. **`grantPlan` does NOT call `applyDerivedPlan`** (CRITICAL)
   - **Spec**: Task 9.3, line 1203: `await this.applyDerivedPlan(input.userId);`
   - **Found**: Implementation calls `this.repo.upsertUserPlan(...)` directly (line 350) then `insertAdminGrant` (line 359). `applyDerivedPlan` is never invoked.
   - **Impact**: Admin grants bypass the entire derivation pipeline. Existing paid orders are ignored. The L1 "never cut short, never silently skip" invariant is not enforced.

3. **Command/query files missing**
   - **Spec**: File map lines 62-63.
   - **Found**: Neither `plan.admin.grant-plan.ts` nor `plan.admin.list-grants.ts` exist.

4. **Router has no admin sub-router**
   - **Spec**: File map line 64, Task 12 (line 1711).
   - **Found**: `plan.router.ts` lines 1-15 have no `admin:` nested object.

5. **SPECS.md not updated**
   - **Spec**: File map line 65, Task 13 (line 1756).
   - **Found**: No Admin section, no Lifecycle Rule 7, no persistence or validation docs for `admin_grant`.

6. **`deriveUserPlan` not widened**
   - **Spec**: Locked decision T2' (line 36): must accept `{ appliedAt, planKey, durationMonths, alwaysApply }`.
   - **Found**: `AppliedOrder` interface and `deriveUserPlan` function lack the `alwaysApply` field entirely.

### Scope creep

7. **`grantPlan` writes `user_plan` directly**
   - **Spec**: F1 (line 37): _"No transaction between insertAdminGrant and applyDerivedPlan. The grant is the audit record; a failed derivation does not roll it back."_
   - **Found**: Calls `upsertUserPlan` (state change) before `insertAdminGrant` (audit), completely outside the derivation pipeline.

### Wrong implementation behaviour

8. **L1 lifecycle fundamentally broken**
   - Because `applyDerivedPlan` is never called, admin grants:
     - Cut short active paid plans instead of extending them (violates "never cut short").
     - Can be silently skipped on tier mismatch (violates `alwaysApply: true`).
     - Do not participate in same-tier extension or upgrade logic.

9. **F1 ordering reversed**
   - `insertAdminGrant` (audit record, line 359) runs _after_ `upsertUserPlan` (state mutation, line 350). If the grant insert fails, the `user_plan` is already mutated with no audit trail.

---

## Summary

| Axis          | Findings                                                          | Worst issue                                                                                                |
| ------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Standards** | 2 hard violations, 3 smells (all judgements)                      | Unplumbed command/query layer — feature is unreachable via oRPC                                            |
| **Spec**      | 6 missing/partial (2 critical), 1 scope creep, 2 wrong behaviours | L1 lifecycle not implemented — admin grants bypass all derivation logic, violating the core spec invariant |
