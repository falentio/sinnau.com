# nm3-04: SPECS.md Not Updated

**Severity: High**

## Summary

The spec document `src/lib/server/services/plan/SPECS.md` was not updated as required by the implementation plan.

## Spec References

- **File Map line 65**: "Modify `src/lib/server/services/plan/SPECS.md` — Add 'Admin' section, rule 7 in 'Lifecycle Rules', authorize the new procedures, document the table, add the new validation constants"

## Current State

`SPECS.md` remains unchanged from base commit. No admin section, no lifecycle rule 7, no procedure authorization, no `admin_grant` table documentation.

## Required Updates (per plan)

1. **Admin section** documenting `admin.grantPlan` and `admin.listGrants` procedures
2. **Lifecycle Rules — Rule 7**: "Active admin grants participate in plan derivation via union-append (L1). They extend the current plan's expiry using the same-tier extension algorithm, even when the granted tier is lower than the active tier. Grants never cut short an active paid plan."
3. **Procedure authorization**: Document that both procedures require `adminProcedure` (role-gated)
4. **Table documentation**: Document `admin_grant` table schema, indexes, FK behavior
5. **Validation constants**: Document `ADMIN_GRANT_MIN_MONTHS`, `ADMIN_GRANT_MAX_MONTHS`, `ADMIN_GRANT_NOTE_MAX_LENGTH`, `ADMIN_GRANT_PAGE_LIMIT`, `ADMIN_GRANT_ID_PREFIX`

## Labels

`needs-triage`, `ready-for-agent`, `spec-violation`, `documentation`
