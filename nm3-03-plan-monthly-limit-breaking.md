# nm3-03: Breaking Change to PLAN_MONTHLY_LIMIT Constants

**Severity: High**

## Summary

`src/lib/schemas/plan.constant.ts` lines 35-37 were modified, reducing `PLAN_MONTHLY_LIMIT` values by a factor of 1000 (from 60_000/120_000/360_000 to 60/120/360). This is a breaking change to the AI generation limits feature with no justification in the spec.

## Spec References

- **Task 1**: "Append the new constants... after `PLAN_QRIS_EXPIRY_MINUTES`" — only asked to **add** `ADMIN_GRANT_*` constants
- **Locked Decision D3**: Duration validation is 1-24 months via valibot — no mention of changing plan monthly limits
- No ticket or ADR authorizes this change

## Current State (Violations)

```typescript
// BEFORE (original)
export const PLAN_MONTHLY_LIMIT = {
  LITE: 60_000,
  PLUS: 120_000,
  PREMIUM: 360_000,
} as const;

// AFTER (current branch)
export const PLAN_MONTHLY_LIMIT = {
  LITE: 60,
  PLUS: 120,
  PREMIUM: 360,
} as const;
```

## Impact

- AI generation limits effectively reduced from 60k/120k/360k tokens to 60/120/360 tokens
- Will break existing user expectations and any client-side validation using these constants
- No migration path documented

## Required Changes

1. **Revert** `PLAN_MONTHLY_LIMIT` to original values (60_000, 120_000, 360_000)
2. If intentional, create ADR documenting the change and run migration for existing users

## Labels

`needs-triage`, `ready-for-agent`, `breaking-change`, `scope-creep`
