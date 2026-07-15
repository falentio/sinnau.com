# nm3-02: Admin API Surface Missing (Router/Commands/Queries)

**Severity: Critical**

## Summary

The two admin procedures (`admin.grantPlan` and `admin.listGrants`) are implemented in the service layer but are **not exposed via the oRPC router**. No command/query files exist, and `plan.router.ts` has no `admin` namespace.

## Spec References

- **Decision S2**: "Scope: `admin.grantPlan` + `admin.listGrants`. `admin.revokeGrant` is deferred to a future map."
- **File Map**: Requires creation of:
  - `src/lib/server/services/plan/commands/plan.admin.grant-plan.ts`
  - `src/lib/server/services/plan/queries/plan.admin.list-grants.ts`
  - Update `plan.router.ts` with `admin: { grantPlan, listGrants }`

## Current State (Violations)

1. **Missing file**: `src/lib/server/services/plan/commands/plan.admin.grant-plan.ts`
2. **Missing file**: `src/lib/server/services/plan/queries/plan.admin.list-grants.ts`
3. **`plan.router.ts`** — No `admin` object added to router

## Standards Violations (AGENTS.md)

- Lines 20-25, 345-409: Commands/queries must be separate files importing service from `'../index'`
- Line 407: "Admin actions live in a nested `admin: { ... }` object on the router"
- Line 408: Files named `<domain>.<action>.ts` (kebab-case)

## Required Changes

1. Create `commands/plan.admin.grant-plan.ts` with `adminProcedure`, `grantPlanInputSchema`, `grantPlanOutputSchema`, delegating to `planService.grantPlan(input, context.user.id)`
2. Create `queries/plan.admin.list-grants.ts` with `adminProcedure`, `listGrantsInputSchema`, `listGrantsOutputSchema`, delegating to `planService.listGrants(input, context.user.id)`
3. Update `plan.router.ts` to import both and add `admin: { grantPlan, listGrants }`

## Labels

`needs-triage`, `ready-for-agent`, `spec-violation`, `critical`
