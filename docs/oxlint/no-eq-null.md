## Use strict `!== null` for URL search param presence checks

**Explain:**
The `eslint(no-eq-null)` rule forbids loose `null` comparisons (`== null` / `!= null`) without type-checking operators. Loose null equality (`!= null`) also matches `undefined`, which can silently accept values that were never meant to be nullish. The rule's intent is to force explicit, strict comparison so the developer states exactly which nullish value they are handling — preventing bugs where an `undefined` sneaks through a `!= null` guard that was only meant to skip `null`.

**Reason:**
`URLSearchParams.get()` has a return type of `string | null` — it never yields `undefined`. Therefore `!= null` and `!== null` are runtime-identical for this expression, and switching to `!== null` satisfies the rule without any behavior change. The strict operator also documents the actual type contract (`string | null`, not `string | null | undefined`), which is more precise than the loose form.

**Before:**

```ts
const forceBlurred = $derived(
  dev && $page.url.searchParams.get("blurred") != null
);
```

**After:**

```ts
const forceBlurred = $derived(
  dev && $page.url.searchParams.get("blurred") !== null
);
```

**Context:**
Apply this fix in Svelte 5 components (and any TypeScript module) when checking whether a URL search parameter is present — e.g. `$page.url.searchParams.get("key") !== null` in a `$derived` expression for a dev-only blurred view flag. This is the correct approach when the expression's type is exactly `T | null` (like `URLSearchParams.get()`), so the loose `!=` adds nothing. This approach does NOT apply when: (a) the expression can actually be `undefined` and the code intentionally wants to treat both `null` and `undefined` as absent (then keep `== null` deliberately or restructure to `x == null` with a documented reason), or (b) the comparison is against a non-null value (the rule does not flag `!= null` checks where the left side cannot be nullish — in those cases the comparison is likely dead code and should be removed instead).
