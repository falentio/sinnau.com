## Suppress unsafe type assertion for validated upstream values

**Explain:**
The `typescript/no-unsafe-type-assertion` rule flags type assertions (`as T`) where the asserted type `T` is more narrow than the original type. This is a safety rule — it prevents runtime errors from incorrect narrowing assumptions. However, when a value has been validated upstream (e.g. checked against a known array of allowed keys, or parsed from a URL parameter with a type guard), repeating the full safety check locally can be unnecessarily verbose, especially in Drizzle column access patterns where the column types are complex generics.

**Reason:**
Adding `oxlint-disable-next-line typescript/no-unsafe-type-assertion` is correct here because:

1. The `sortKey` value has already been validated through URL parameter parsing in the route handler, or its validity is guaranteed by the fallback (`?? user.createdAt`).
2. Drizzle column references have deeply nested generic types that oxlint cannot fully resolve — widening the assertion (e.g. `as Record<string, SQL>`) introduces cascading `no-unsafe-assignment` and `no-unsafe-argument` errors on the same and subsequent lines.
3. The suppression is scoped to a single line, not a whole file or block.
4. An alternative like adding a type-safe helper function would introduce an unnecessary abstraction for a single call site.

**Before:**

```ts
const orderColumn =
  SORT_COLUMNS[sortKey as keyof typeof SORT_COLUMNS] ?? user.createdAt;
```

**After:**

```ts
const orderColumn =
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- sortKey is validated upstream; fallback handles invalid keys
  SORT_COLUMNS[sortKey as keyof typeof SORT_COLUMNS] ?? user.createdAt;
```

**Context:**
Apply this fix in Drizzle repository implementations when accessing a column lookup object with a runtime string key that has been validated upstream (URL parameter parsing, schema validation, etc.) and where a fallback exists for invalid keys. The `sortKey as keyof typeof SORT_COLUMNS` pattern is specific to Drizzle's `getTableColumns` and column reference types — oxlint cannot resolve the complex generic types, so widening assertions on the lookup object introduce cascading errors. This approach does NOT apply when: (a) the value comes from an untrusted source without prior validation, (b) the assertion is for a completely untyped or `any` value, or (c) the value has no fallback and an incorrect type assertion would cause a runtime error.

---

## Use readonly array widening instead of narrowing element assertion

**Explain:**
The `typescript/no-unsafe-type-assertion` rule flags type assertions that narrow a type. When checking whether a `string` value is a member of a `readonly` tuple (e.g. `LIST_USERS_SORT_KEYS`), using `value as (typeof LIST_USERS_SORT_KEYS)[number]` inside `.includes()` is a narrowing assertion from `string` to the tuple's element type.

**Reason:**
Widening the tuple array to `readonly string[]` is a safe widening assertion (from a specific union to a broader `string` type). This satisfies `.includes()` without narrowing the individual value. The `includes()` call then correctly checks membership at runtime. No type information is lost — the `includes` return value is `boolean`, and the function already declares its return type as `string | undefined`, so the narrowed type would not propagate.

**Before:**

```ts
const parseSortKeyParam = (value: string | null): string | undefined => {
  if (
    value !== null &&
    LIST_USERS_SORT_KEYS.includes(
      value as (typeof LIST_USERS_SORT_KEYS)[number]
    )
  ) {
    return value;
  }
  return undefined;
};
```

**After:**

```ts
const parseSortKeyParam = (value: string | null): string | undefined => {
  if (
    value !== null &&
    (LIST_USERS_SORT_KEYS as readonly string[]).includes(value)
  ) {
    return value;
  }
  return undefined;
};
```

**Context:**
Apply this fix in any utility function or param parser that needs to validate a `string` value against a `readonly` tuple constant using `.includes()`. The assertion `as readonly string[]` on the tuple is a widening assertion (safer than narrowing the element). This applies to route parameter parsers, filter validators, and similar patterns where the return type is already typed broadly as `string | undefined` (so the narrowed element type would not propagate). This approach does NOT apply when: (a) the downstream code depends on the narrowed type of the return value, (b) the array is not readonly, or (c) the array type cannot be widened to `readonly string[]` without losing needed type information.

---

## Use return redirect in SvelteKit form actions

**Explain:**
The `typescript(consistent-return)` rule requires async functions to return a value in all code paths. SvelteKit's `redirect()` function from `@sveltejs/kit` throws a `Redirect` error (it is typed as `never`), so it never returns normally. However, oxlint does not statically know that `redirect()` throws, causing a false positive when a form action has one branch that returns data (e.g. `{ error: "..." }`) and another that calls `redirect()`.

**Reason:**
Adding `return` before `redirect()` satisfies the linter without changing behavior, because `redirect()` throws before the `return` would be reached. This is the minimal change that makes all code paths syntactically consistent with a return, while preserving the idiomatic SvelteKit pattern. Alternatives like restructuring with if/else blocks or adding a redundant `return;` after `redirect()` would be noisier and offer no runtime benefit.

**Before:**

```ts
export const actions: Actions = {
  default: async ({ locals, request }) => {
    const u = locals.mustGetUser();
    // ...
    if (!accepted) {
      return { error: "..." };
    }
    await db.update(user).set({ ... }).where(eq(user.id, u.id));
    redirect(302, "/home");
  },
};
```

**After:**

```ts
export const actions: Actions = {
  default: async ({ locals, request }) => {
    const u = locals.mustGetUser();
    // ...
    if (!accepted) {
      return { error: "..." };
    }
    await db.update(user).set({ ... }).where(eq(user.id, u.id));
    return redirect(302, "/home");
  },
};
```

**Context:**
Apply this fix in SvelteKit form actions (`+page.server.ts`) where `redirect()` is used in one branch and the other branch returns data. `redirect()` from `@sveltejs/kit` is typed as `never` (it throws), so `return redirect(...)` is functionally equivalent to `redirect(...)` alone. This approach does NOT apply when: (a) the function is not a SvelteKit form action or load function, (b) `redirect` is imported from a different library that actually returns, or (c) the fix would require restructuring beyond adding a single `return` keyword.

---

## Use `String()` for safe indexing of any-like properties

**Explain:**
The `typescript(no-unsafe-member-access)` rule flags computed property access (`obj[key]`) when the key resolves to an `any` or unsafe type. This prevents runtime errors from indexing objects with unexpected or non-string values. When a value has a generic or opaque type (e.g. `error.code` from a generic error class), direct indexing is unsafe because oxlint cannot verify the key type.

**Reason:**
Using `String(error.code)` instead of `error.code` directly wraps the value in a runtime string conversion. This satisfies the linter because `String()` always returns a `string`, making the index operation safe. The runtime behavior is unchanged for string values (they pass through `String()` unchanged), and the conversion handles edge cases like `undefined` or `null` gracefully (producing `"undefined"` or `"null"` strings instead of throwing). This is preferred over a type assertion (`as string`) because `no-unsafe-type-assertion` may also flag narrowing from `any` to `string`.

**Before:**

```ts
return ORPC_ERROR_MESSAGES[error.code] ?? FALLBACK_MESSAGE;
```

**After:**

```ts
return ORPC_ERROR_MESSAGES[String(error.code)] ?? FALLBACK_MESSAGE;
```

**Context:**
Apply this fix in utility functions, error handlers, and any code indexing a `Record<string, T>` with a property whose type is generic, opaque, or `any`-like. This is the correct approach when: (a) the key comes from an external library's generic type that resolves to `any`, (b) the value is known to be a string at runtime but TypeScript/oxlint cannot prove it, and (c) a type assertion would be flagged by `no-unsafe-type-assertion`. This approach does NOT apply when: (a) the key has a well-known string literal type that can be directly indexed, (b) `String()` conversion would silently accept an incorrect type and mask a real bug (prefer validation instead), or (c) performance is critical and the overhead of `String()` is unacceptable in a hot path.

---

## Eliminate unsafe type assertions via control flow narrowing

**Explain:**
The `typescript(no-unsafe-type-assertion)` rule flags type assertions (`value as T`) where the asserted type `T` is narrower than the original type. This prevents unsafe assumptions about runtime types. When validating an `unknown` value through a series of type guards (`typeof`, `in`, `instanceof`), TypeScript's control flow analysis narrows the type automatically — making the explicit assertion redundant.

**Reason:**
After the chained conditions `typeof error === "object"`, `error !== null`, `"message" in error`, and `typeof error.message === "string"`, TypeScript narrows `error` from `unknown` to `object & { message: string }`. Inside the if-block, `error.message` can be accessed as a `string` without any type assertion. Removing the `as { message: string }` cast eliminates the lint violation while keeping the same runtime behavior — the narrowing is provably correct from the guard expressions.

**Before:**

```ts
if (
  typeof error === "object" &&
  error !== null &&
  "message" in error &&
  typeof error.message === "string"
) {
  const msg = (error as { message: string }).message;
  return AUTH_ERROR_MESSAGES[msg] ?? FALLBACK_MESSAGE;
}
```

**After:**

```ts
if (
  typeof error === "object" &&
  error !== null &&
  "message" in error &&
  typeof error.message === "string"
) {
  return AUTH_ERROR_MESSAGES[error.message] ?? FALLBACK_MESSAGE;
}
```

**Context:**
Apply this fix in utility functions that validate `unknown` values through sequential type guards. This is the correct approach when TypeScript's `in` operator narrowing (available since TS 4.9) combined with `typeof` checks produces a provably safe narrowed type. The property access is safe because the guards have already confirmed the shape and type. This approach does NOT apply when: (a) the checks don't form a complete type narrowing chain and the type would remain `unknown`/`any` inside the block, (b) the assertion is needed to widen a type (e.g. `as string[]` from `readonly string[]`), or (c) the value comes from an untrusted source where validation should be stricter than what narrowing alone provides.
