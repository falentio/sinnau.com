## Use `!==` instead of `!=` for nullish comparisons

**Explain:**
The `eslint(eqeqeq)` rule requires strict equality operators (`===` / `!==`) instead of loose ones (`==` / `!=`), unless the config explicitly allows `null` (the `"smart"` option permits `== null`/`!= null` when comparing against `null`). The rule's intent is to avoid type coercion surprises — loose equality performs implicit conversions (e.g. `"0" == 0`, `"" == false`), which are a common source of subtle bugs. When the config does not allow the smart-null exception, every `!=` is flagged.

**Reason:**
`URLSearchParams.get()` returns `string | null`, so `!= null` and `!== null` evaluate identically — no coercion can occur because the operands are already `string | null` and `null`. Replacing `!=` with `!==` satisfies the rule with zero runtime difference and makes the strict comparison explicit. This aligns with the codebase's configured lint settings, which disallow even the smart-null `!= null` form.

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
Apply this fix in Svelte 5 components (and any TypeScript module) wherever a loose equality operator against `null` appears — e.g. `searchParams.get("key") != null`, `value != null`, `result != undefined` — when the project's oxlint config disables the smart-null exception. This is the correct approach when the comparison is a pure nullish check on a value whose type is `T | null` (no coercion risk), so `!== null` is a drop-in replacement. This approach does NOT apply when: (a) the code intentionally relies on loose-equality coercion semantics (e.g. `value == 0` matching both `0` and `""`) — restructure to explicit strict comparisons instead, or (b) the linter config uses `"smart"` mode and the comparison target is exactly `null` — then `!= null` may be left as-is, though `!== null` remains the clearer choice.
