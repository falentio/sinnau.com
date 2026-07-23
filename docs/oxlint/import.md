## Move stray imports to top of module

**Explain:**
The `import/first` rule enforces that all `import` statements appear at the top of a module, before any other code (e.g. `let`, `const`, `$state`, function declarations). This is a standard JavaScript/TypeScript convention — bundlers and runtimes hoist imports, but keeping them physically at the top improves readability and avoids subtle issues with Temporal Dead Zone (TDZ) between imports and ambient declarations. The rule triggers when any non-import statement precedes an import.

**Reason:**
Moving the `import { INSTAGRAM_URL } from "$lib/constants"` statement from the middle of the script (after `let search = $state("")` and `const user = getUser`) to the top of the import block brings it in line with the convention that all imports precede any other module-level code. This does not change runtime behavior since ES module imports are hoisted, but it eliminates the lint error and keeps the codebase consistent.

**Before:**

```ts
import { HugeiconsIcon } from "@hugeicons/svelte";

let search = $state("");

const user = getUser;

import { INSTAGRAM_URL } from "$lib/constants";
```

**After:**

```ts
import { INSTAGRAM_URL } from "$lib/constants";
import { HugeiconsIcon } from "@hugeicons/svelte";

let search = $state("");

const user = getUser;
```

**Context:**
Apply this fix whenever an `import` statement appears after any non-import code (variable declarations, `$state` calls, function definitions, expressions) in a `<script lang="ts">` block or `.ts` module. Simply move the stray import to be grouped with the other imports at the top of the file. This is the correct approach for all file types (Svelte components, utility modules, route files) — there is no case where a middle-of-file import is idiomatic. The only exception would be dynamic `import()` expressions inside functions, which are not affected by this rule.
