# no-unused-vars

## Remove an import that was added but never referenced

**Explain:**
The `eslint(no-unused-vars)` rule flags declarations — variables, function parameters, and imports — that are never referenced anywhere in the module. In this codebase the common trigger is a type-only import (`import type { X } from "..."`) that was added while sketching out a new API boundary but left behind once the implementation settled on a looser signature (e.g. a `string` parameter validated at runtime instead of a strict union type). Unused imports bloat the module graph, signal dead intent, and confuse future readers into thinking the symbol is part of the module's contract.

**Reason:**
Removing the unused `import type` is the minimal fix that satisfies the rule without changing runtime behavior. Type-only imports are erased at compile time, so deleting the line cannot affect the emitted JavaScript. Here the strict union type (`OutputLanguageId`) is still enforced one level up at the caller's options type (`GenerateOptions.outputLanguage?: OutputLanguageId`), while the leaf function intentionally accepts a loose `string` and validates it at runtime via a type guard (`isOutputLanguageId`) that throws on unknown values. This mirrors the sibling parameter (`id: string`) of the same function, keeping both parameter contracts symmetric. Type safety is not lost because the loose `string` is always fed through the same validating getter.

**Before:**

```ts
import { getOutputLanguage } from "./output-language";
import type { OutputLanguageId } from "./output-language";
import academic from "./prompt/language-style/academic.md?raw";

export const composeSystemPrompt = (
  id: string = DEFAULT_LANGUAGE_STYLE,
  outputLanguage?: string
): string => {
  const languageProfile = getOutputLanguage(outputLanguage);
  // ...
};
```

**After:**

```ts
import { getOutputLanguage } from "./output-language";
import academic from "./prompt/language-style/academic.md?raw";

export const composeSystemPrompt = (
  id: string = DEFAULT_LANGUAGE_STYLE,
  outputLanguage?: string
): string => {
  const languageProfile = getOutputLanguage(outputLanguage);
  // ...
};
```

**Context:**
Apply this fix in any TypeScript module (utility modules, infras layer, server services, or Svelte `<script lang="ts">` blocks) when a `no-unused-vars` violation points at an `import type` that nothing in the module references. This is the correct approach when: (a) the module already validates the value at runtime through a getter/type guard rather than relying on the compile-time union, (b) the strict type is still enforced at the calling layer (e.g. an options interface), and (c) the remaining parameter types in the same signature are deliberately loose `string`s, so typing this one as a union would be inconsistent. Do NOT use this approach when the symbol should actually be referenced — e.g. the parameter's loose `string` would let invalid values slip through to a caller that never validates them, in which case retype the parameter to the union type so the import becomes used. Also do NOT apply it to value imports (non-`type`) that are genuinely unused; prefer removing those too, but double-check for side-effect imports which must stay.
