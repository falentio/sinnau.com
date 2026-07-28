## Use const arrow function for exported functions

**Explain:**
The `eslint(func-style)` rule enforces consistent use of either `function` declarations or function expressions (const assignments) across the codebase. When configured with "expression" style, the rule flags `export function name() { ... }` and expects `export const name = () => { ... }` instead. This improves consistency and avoids subtle differences in hoisting behavior between declarations and expressions.

**Reason:**
Changing `export function getErrorMessage(...)` to `export const getErrorMessage = (...) => { ... }` satisfies the rule by using a function expression assigned to a const variable. The semantics are identical for a named export — the function is still hoisted within the module scope, and the export behaves the same way at the call site. The `const` assignment prevents accidental reassignment and aligns with the rest of the module's variable declarations.

**Before:**

```ts
export function getErrorMessage(error: unknown): string {
  // ...
}
```

**After:**

```ts
export const getErrorMessage = (error: unknown): string => {
  // ...
};
```

**Context:**
Apply this fix in TypeScript modules and Svelte `<script lang="ts">` blocks when the project's linter config prefers function expressions (`"expression"` style) over declarations. This applies to utility modules, helpers, and any exported functions where changing to a const arrow function does not affect runtime behavior. This approach does NOT apply when: (a) the function uses `this` binding (arrow functions capture `this` lexically), (b) the function needs to be a generator (`function*`), or (c) the function is a class method or object method where the declaration is the only valid syntax.
