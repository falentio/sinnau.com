# nm3-01: Core L1 Derivation Logic Missing (Spec Violation)

**Severity: Critical**

## Summary

The implementation is missing the core L1 derivation logic that was the central architectural decision of the spec. The `applyDerivedPlan` method was not rewritten to union admin grants with paid orders, and `deriveUserPlan` was not widened to accept the `alwaysApply` flag.

## Spec References

- **Decision L1**: "Union/append. Active grants are added to `applyDerivedPlan`; they never cut short an active paid plan and are never silently skipped on tier mismatch. Implemented by an `alwaysApply: true` flag on `AppliedOrder`."
- **Decision T2' Derivation**: "Modify `deriveUserPlan` to accept `{ appliedAt, planKey, durationMonths, alwaysApply }` — smallest change, clearest L1 invariant."
- **Task 9.1/9.2**: Explicitly requires rewriting `AppliedOrder` interface, `deriveUserPlan` function, and `applyDerivedPlan` method.

## Current State (Violations)

1. **`src/lib/server/services/plan/plan.service.ts`** — `AppliedOrder` interface (lines 328-336) lacks `alwaysApply` field
2. **`deriveUserPlan` function** (lines 338-385) does not accept or honor `alwaysApply` flag
3. **`applyDerivedPlan` method** (lines 508-542) was NOT rewritten — still only processes paid orders, completely ignores admin grants
4. **`grantPlan` method** (lines 438-468) bypasses `applyDerivedPlan` entirely, directly calling `upsertUserPlan` — violating the "grant is audit record, derivation is consequence" principle (Decision F1)

## Required Changes

1. Add `alwaysApply: boolean` to `AppliedOrder` interface
2. Rewrite `deriveUserPlan` to handle `alwaysApply` branch (extend current plan's expiry on downgrade)
3. Rewrite `applyDerivedPlan` to:
   - Fetch both paid orders AND active admin grants in parallel
   - Build unified `AppliedOrder[]` with `alwaysApply: true` for grants
   - Call `deriveUserPlan` once with combined array
4. Update `grantPlan` to call `applyDerivedPlan` AFTER inserting grant (audit-first, per Decision F1)

## Impact

Without this, admin grants do not participate in the plan derivation lifecycle. A user with an active paid PLUS plan who receives a LITE grant will NOT have the grant apply when the PLUS plan expires — the core "union/append" invariant is broken.

## Labels

`needs-triage`, `ready-for-agent`, `spec-violation`, `critical`
