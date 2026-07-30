## Fallback object for array access

**Explain:**
The `typescript(no-non-null-assertion)` rule forbids the `!` postfix expression operator (non-null assertion) because it bypasses TypeScript's type checking and can lead to runtime crashes if the value is actually `null` or `undefined`. It triggers when `!` is used on any expression — array elements (`arr[0]!`), optional chaining results, or function returns. The rule's intent is to force explicit handling of `null`/`undefined` so that every potential `null` path is accounted for at compile time.

**Reason:**
Replacing `plan.durations[0]!` with `plan.durations[0] ?? fallbackObject` eliminates the non-null assertion and provides a guaranteed fallback if the array is somehow empty. The fallback object provides safe default values (`months: 1`, `grossAmount: 0`, `discountLabel: ""`) so the component can render without crashing even if data is missing. The data model guarantees `durations` is non-empty, but this fix defensively handles the edge case without sacrificing type safety.

**Before:**

```ts
const duration: PlanCatalogDuration = $derived(
  plan.durations.find((d) => d.months === selectedDuration) ??
    plan.durations[0]!
);
```

**After:**

```ts
const duration: PlanCatalogDuration = $derived(
  plan.durations.find((d) => d.months === selectedDuration) ??
    plan.durations[0] ?? { months: 1, grossAmount: 0, discountLabel: "" }
);
```

**Context:**
This approach applies when accessing an array element that TypeScript doesn't know is non-empty, in Svelte 5 components (or any TS files) where a `$derived` value needs a safe fallback. Use this when the data model guarantees the array has elements but TypeScript can't prove it (e.g., valibot-inferred types where `v.array(...)` doesn't imply at least one element). The fallback object's shape must match the expected type structurally. This approach does NOT apply when:

- You have a ready-made default instance you can reference instead
- The array access is in a hot path where the extra `??` check matters (extremely rare)
- You actually need to throw or short-circuit on missing data (use a type guard + early return instead)
