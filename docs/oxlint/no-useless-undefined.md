# no-useless-undefined

## Explicit undefined to exercise a required `string | null | undefined` parameter

**Explain:**
`unicorn/no-useless-undefined` flags explicit `undefined` arguments because at
runtime `fn(undefined)` is indistinguishable from `fn()`. However, when the
parameter is typed `string | null | undefined` **without** being optional, the
TypeScript checker rejects `fn()` with "Expected 1 arguments, but got 0" — the
parameter must be supplied. This creates a conflict between the linter (which
demands the argument be omitted) and the type checker (which demands it be
present). The rule's intent is to catch sloppy `undefined` passing where the
parameter is optional or defaulted; it is not meant to force removing an
argument that is required at the type level.

**Reason:**
Passing `undefined` explicitly is the only way to exercise the
`undefined`-valued path of a required parameter at the type level. When the
test suite distinguishes the `undefined` case from the `null` case (e.g.
"anonymous caller" where `context.user?.role` yields `undefined` vs. an
explicit `null` role), removing the argument would break compilation, and
changing the parameter to optional would weaken the guard's contract for the
sake of a test. The inline `oxlint-disable-next-line` documents that the
`undefined` is intentional and type-required, so the rule still catches
genuinely useless `undefined` everywhere else.

**Before:**

```ts
it("returns false for anonymous callers", async ({ expect }) => {
  const { guard } = setupGuard();
  expect(guard.canSeeAdminOnlyPlans(null)).toBe(false);
  expect(guard.canSeeAdminOnlyPlans(undefined)).toBe(false);
});
```

**After:**

```ts
it("returns false for anonymous callers", async ({ expect }) => {
  const { guard } = setupGuard();
  expect(guard.canSeeAdminOnlyPlans(null)).toBe(false);
  // oxlint-disable-next-line unicorn/no-useless-undefined -- parameter is required, so omitting it is a compile error; exercises the undefined-role path distinct from null
  expect(guard.canSeeAdminOnlyPlans(undefined)).toBe(false);
});
```

**Context:**
Use this approach in unit tests (Vitest) when a method under test declares a
required parameter typed `string | null | undefined` and the test must assert
the `undefined` branch separately from the `null` branch. It applies to guard
and service tests in `src/lib/server/services/<domain>/` where the guard API
convention is required `string | null | undefined` parameters (see the
`requireOwner` / `requireAdmin` / `canSeeAdminOnlyPlans` pattern in
`plan.guard.ts`), and where an adjacent assertion already covers the `null`
path so the two cases are exercised distinctly.

Do NOT use this approach when:

- The parameter is already optional (`role?: string | null`) — then simply omit the argument.
- The `undefined` path is not meaningfully distinct from `null` and only one
  of them is asserted — prefer removing the redundant assertion instead of
  adding an ignore.
- The `undefined` is passed to an optional/defaulted parameter — that is the
  genuine uselessness the rule targets; fix the call, do not suppress.

This matches the existing repo convention at
`plan.service.test.ts` (the `grantPlan(input, undefined)` FORBIDDEN test),
which uses the same explicit-undefined-with-reason pattern.

---
