# Oxlint Production-Safety Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable 28 new oxlint production-safety rules (correctness category plus cherry-picked security rules) and fix all 210 newly-flagged sites so the final gate (`pnpm run lint:agent`, `pnpm run check`, `rtk pnpm run test:unit`) is fully green.

**Architecture:** Each task is a self-contained rule fix. Steps follow a TDD-shaped pattern: (1) capture current lint count for the rule, (2) apply the mechanical code change, (3) re-run lint to verify the count dropped, (4) run unit tests to confirm no regression, (5) commit. No new abstractions, no refactors beyond the minimum required to satisfy the linter.

**Tech Stack:** oxlint 1.68, oxlint-tsgolint 0.23 (type-aware), TypeScript, SvelteKit 2, Svelte 5, Vitest.

---

## Current State (Before This Plan)

`pnpm run lint:agent` reports **210 errors** across 13 rules:

| Rule | Count | Type |
|---|---|---|
| `vitest(require-mock-type-parameters)` | 98 | test |
| `eslint(no-use-before-define)` | 35 | correctness |
| `typescript(promise-function-async)` | 25 | real bug (unhandled rejections) |
| `import(no-cycle)` | 22 | correctness (10 shadcn-svelte, 12 Drizzle schema) |
| `vitest(require-to-throw-message)` | 8 | test |
| `eslint(no-await-in-loop)` | 8 | suspicious (case-by-case audit) |
| `unicorn(no-array-sort)` | 5 | correctness |
| `unicorn(no-empty-file)` | 2 | correctness |
| `typescript(use-unknown-in-catch-callback-variable)` | 2 | real bug (crash on `.message`) |
| `eslint(default-case)` | 2 | restriction |
| `unicorn(no-new-array)` | 1 | correctness |
| `unicorn(no-instanceof-builtins)` | 1 | correctness |
| `unicorn(no-document-cookie)` | 1 | security (XSS-readable) |

The final test suite state is **410/410 passing**.

---

## Scope And Order

Tasks run in this order so the test suite is never broken for more than a single task's worth of changes:

1. **Worktree and baseline** (Task 1)
2. **shadcn-svelte cycle ignore** (Task 2) — config-only, no app code touched
3. **Drizzle schema cycles** (Task 3) — refactor barrel exports
4. **Bulk test/mechanical fixes** (Tasks 4–13) — vi.fn type params, toThrow messages, async, default-case, empty files, sort, instanceof, document.cookie
5. **`no-use-before-define` moves** (Tasks 14–17) — Svelte components, forms, tests, schema
6. **`no-await-in-loop` audits** (Tasks 18–21) — case-by-case
7. **Final verification** (Task 22)

Each task is small and self-contained. The verification command is always `pnpm run lint:agent 2>&1 | grep -c "<rule-name>"` to count remaining errors of that rule, plus `rtk pnpm run test:unit` to confirm no regression.

---

## File Structure Map

### Config
- **Modify:** `.oxlintrc.json` (add `import/no-cycle` override for shadcn-svelte paths in Task 2)

### Drizzle schemas
- **Modify:** `src/lib/server/infras/db/schema/index.ts` (break cycle in Task 3)
- **Modify:** `src/lib/server/infras/db/schema/chapter.ts`
- **Modify:** `src/lib/server/infras/db/schema/flashcard.ts`
- **Modify:** `src/lib/server/infras/db/schema/quiz.ts`
- **Modify:** `src/lib/server/infras/db/schema/study-set.ts`
- **Modify:** `src/lib/server/infras/db/schema/study-set-content.ts`

### Services (promise-function-async + use-unknown-in-catch + no-await-in-loop + default-case)
- **Modify:** `src/lib/server/services/chapter/chapter.service.ts`
- **Modify:** `src/lib/server/services/flashcard/flashcard.service.ts`
- **Modify:** `src/lib/server/services/flashcard/flashcard.repository.drizzle.ts`
- **Modify:** `src/lib/server/services/quiz/quiz.service.ts`
- **Modify:** `src/lib/server/services/quiz/quiz.repository.drizzle.ts`
- **Modify:** `src/lib/server/services/study-set/study-set.service.ts`
- **Modify:** `src/lib/server/services/study-set-content/study-set-content.service.ts`
- **Modify:** `src/lib/server/infras/slug.ts`

### Testing files (vi.fn type params + toThrow + no-use-before-define + no-await-in-loop)
- **Modify:** `src/lib/server/services/chapter/chapter.testing.ts`
- **Modify:** `src/lib/server/services/chapter/chapter.guard.test.ts`
- **Modify:** `src/lib/server/services/chapter/chapter.repository.drizzle.test.ts`
- **Modify:** `src/lib/server/services/flashcard/flashcard.testing.ts`
- **Modify:** `src/lib/server/services/flashcard/flashcard.repository.drizzle.test.ts`
- **Modify:** `src/lib/server/services/quiz/quiz.testing.ts`
- **Modify:** `src/lib/server/services/quiz/quiz.guard.test.ts`
- **Modify:** `src/lib/server/services/quiz/quiz.repository.drizzle.test.ts`
- **Modify:** `src/lib/server/services/study-set/study-set.testing.ts`
- **Modify:** `src/lib/server/services/study-set/study-set.repository.drizzle.test.ts`
- **Modify:** `src/lib/server/services/study-set-content/study-set-content.testing.ts`
- **Modify:** `src/lib/server/services/study-set-content/study-set-content.guard.test.ts`
- **Modify:** `src/lib/server/infras/slug.test.ts`
- **Modify:** `src/lib/utils/rng.test.ts`

### UI / Svelte (no-use-before-define + no-document-cookie + no-instanceof-builtins + no-array-sort + no-await-in-loop)
- **Modify:** `src/lib/components/ui/carousel/carousel.svelte`
- **Modify:** `src/lib/components/ui/data-table/data-table.svelte.ts`
- **Modify:** `src/lib/components/ui/sidebar/sidebar-provider.svelte`
- **Modify:** `src/lib/components/features/app/study-set-item.svelte`
- **Modify:** `src/lib/components/features/dev/dev-create-chapter-dialog.svelte`
- **Modify:** `src/lib/components/features/dev/dev-create-quiz-dialog.svelte`
- **Modify:** `src/lib/components/sign-up-form.svelte`
- **Modify:** `src/lib/components/login-form.svelte`
- **Modify:** `src/routes/(app)/study/new/+page.svelte`
- **Modify:** `src/routes/(app)/study/[studySetId]/flashcard/create/+page.svelte`
- **Modify:** `src/routes/(app)/study/[studySetId]/quiz/create/+page.svelte`

### Files to delete
- **Delete:** `src/lib/index.ts` (empty)
- **Delete:** `src/lib/server/index.ts` (empty)

---

## Global Execution Rules

- Run `pnpm run lint:agent 2>&1 | grep -c "<rule-name>"` before and after each task to confirm the rule's count dropped.
- Run `rtk pnpm run test:unit` at the end of each task to confirm no regression.
- Use `pnpm run check:filter -- "<files>"` after touching TS/Svelte files for narrow typechecks.
- **For `no-use-before-define`**: only move declarations when the use is genuinely a TDZ risk; for function declarations placed after use (which JS hoists), the fix is to convert the `const fn = () => {}` arrow to a `function fn() {}` declaration OR move the arrow above the use. Use whichever produces a smaller diff.
- **For `no-await-in-loop`**: the rule is right that `await` in `for` serializes I/O, but it is wrong when (a) the loop body is `await Promise.all(items.map(async ...))` (parallel already), (b) the operations are intentionally sequential (e.g., slug uniqueness retry, FK-constrained inserts), or (c) the loop is a `Promise.all` body itself. For each site, read the surrounding code; if parallel is safe, refactor to `await Promise.all(items.map(...))`; if not, add `// oxlint-disable-next-line no-await-in-loop` with a one-line rationale.
- **For `import/no-cycle`** in shadcn-svelte: do not refactor upstream. Add a config override to skip the rule on `src/lib/components/ui/**`.
- **For `import/no-cycle`** in Drizzle schemas: the canonical fix is to break the barrel — replace `import { foo } from './chapter.ts'` in the barrel with direct domain-to-domain imports, or split the barrel so cycles are impossible. Inspect the actual cycle paths before refactoring.
- Commit frequently (one commit per task) with the suggested commit message.

---

## Task 1: Worktree Setup and Baseline

**Files:**
- Create: isolated git worktree via `git worktree add`
- Read: current lint output and test state

- [ ] **Step 1: Create a worktree**

Run from repo root:

```bash
git fetch origin
git worktree add ../2sinnau-oxlint-safety -b chore/oxlint-production-safety
cd ../2sinnau-oxlint-safety
pnpm install
```

- [ ] **Step 2: Capture baseline lint count**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -E "^(src/|test/)" | wc -l
```

Expected output: `210`

Run:

```bash
pnpm run lint:agent 2>&1 | grep -oE "(eslint|import|node|oxc|promise|typescript|unicorn|vitest)\([a-z-]+\)" | sort | uniq -c | sort -rn
```

Expected output:

```
     98 vitest(require-mock-type-parameters)
     35 eslint(no-use-before-define)
     25 typescript(promise-function-async)
     22 import(no-cycle)
      8 vitest(require-to-throw-message)
      8 eslint(no-await-in-loop)
      5 unicorn(no-array-sort)
      2 unicorn(no-empty-file)
      2 typescript(use-unknown-in-catch-callback-variable)
      2 eslint(default-case)
      1 unicorn(no-new-array)
      1 unicorn(no-instanceof-builtins)
      1 unicorn(no-document-cookie)
```

- [ ] **Step 3: Verify tests pass before any changes**

Run:

```bash
rtk pnpm run test:unit
```

Expected output: `Test Files  19 passed (19) / Tests  410 passed (410)`.

- [ ] **Step 4: Verify svelte-check is clean (modulo chart-tooltip skip)**

Run:

```bash
pnpm run check 2>&1 | tail -5
```

Expected output: 1 error (`src/lib/components/ui/chart/chart-tooltip.svelte:71` — pre-existing skip), 0 warnings.

- [ ] **Step 5: No commit (worktree creation is not a code change)**

---

## Task 2: Ignore shadcn-svelte Cycles in Config

**Files:**
- Modify: `.oxlintrc.json:131-170` (add new overrides entry)

- [ ] **Step 1: Capture pre-task count**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "import(no-cycle)"
```

Expected output: `22`

- [ ] **Step 2: Add the shadcn-svelte override**

In `.oxlintrc.json`, add a new entry to the `overrides` array (before the `**/*.test.ts` entry, alphabetically/logically grouped with the other non-test override). The new override:

```json
		{
			"files": ["src/lib/components/ui/**"],
			"rules": {
				"import/no-cycle": "off"
			}
		}
```

The final `overrides` array should look like:

```json
	"overrides": [
		{
			"files": ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
			"rules": {
				"constructor-super": "off",
				"getter-return": "off",
				"no-class-assign": "off",
				"no-const-assign": "off",
				"no-dupe-class-members": "off",
				"no-dupe-keys": "off",
				"no-func-assign": "off",
				"no-import-assign": "off",
				"no-new-native-nonconstructor": "off",
				"no-obj-calls": "off",
				"no-redeclare": "off",
				"no-setter-return": "off",
				"no-this-before-super": "off",
				"no-unreachable": "off",
				"no-unsafe-negation": "off",
				"no-var": "error",
				"no-with": "off",
				"prefer-const": "error",
				"prefer-rest-params": "error",
				"prefer-spread": "error"
			}
		},
		{
			"files": ["src/lib/components/ui/**"],
			"rules": {
				"import/no-cycle": "off"
			}
		},
		{
			"files": ["*.svelte", "**/*.svelte"],
			"rules": {
				"no-inner-declarations": "off",
				"no-self-assign": "off"
			}
		},
		{
			"files": ["**/*.test.ts", "**/*.testing.ts"],
			"rules": {
				"typescript/require-await": "off",
				"typescript/no-unnecessary-condition": "off",
				"vitest/no-focused-tests": "error",
				"vitest/no-disabled-tests": "error",
				"vitest/no-conditional-expect": "error",
				"vitest/expect-expect": "error",
				"vitest/valid-expect": "error"
			}
		}
	]
```

- [ ] **Step 3: Verify the cycle count dropped to 12**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "import(no-cycle)"
```

Expected output: `12`

- [ ] **Step 4: Verify tests still pass**

Run:

```bash
rtk pnpm run test:unit
```

Expected output: 410/410 passing.

- [ ] **Step 5: Commit**

```bash
git add .oxlintrc.json
git commit -m "chore(oxlint): ignore import/no-cycle in shadcn-svelte components"
```

---

## Task 3: Refactor Drizzle Schema Cycles

**Files:**
- Modify: `src/lib/server/infras/db/schema/index.ts`
- Modify: `src/lib/server/infras/db/schema/chapter.ts`
- Modify: `src/lib/server/infras/db/schema/flashcard.ts`
- Modify: `src/lib/server/infras/db/schema/quiz.ts`
- Modify: `src/lib/server/infras/db/schema/study-set.ts`
- Modify: `src/lib/server/infras/db/schema/study-set-content.ts`

- [ ] **Step 1: Inspect the actual cycles**

Run:

```bash
pnpm run lint:agent 2>&1 | grep "import(no-cycle)"
```

Expected output: 12 lines, all in `src/lib/server/infras/db/schema/*.ts`. Read each line to understand the import graph.

- [ ] **Step 2: Identify cycle paths**

Read each schema file's top imports. The canonical Drizzle pattern uses `relations()` to declare relationships, and `relations()` from one table references another's table object — which causes `import { chapter } from './chapter.ts'` inside `study-set-content.ts`, which itself imports `chapter`, etc.

The typical cycle is:

- `schema/index.ts` re-exports everything
- Each domain imports siblings to declare `relations()`

- [ ] **Step 3: Break the cycles by inlining relations declarations**

For each schema file involved in a cycle, decide one of two strategies:

**Strategy A (preferred for small graphs):** Move all `relations()` declarations to a single `schema/relations.ts` file that imports the table objects but is not re-exported by the barrel that creates the cycle. Then delete the `relations()` calls from the individual domain schema files.

**Strategy B (when relations must stay co-located):** Replace direct cross-table imports with the `getTableName(table)` indirection or with type-only imports (`import type { Chapter } from './chapter.ts'`).

For this codebase, **Strategy A is the right call** because Drizzle's `relations()` API was designed for this separation.

- [ ] **Step 4: Create `src/lib/server/infras/db/schema/relations.ts`**

Create the new file (replacing the `relations()` calls currently inside each domain schema file). The exact content depends on what `relations()` calls exist; read each schema file first, then move all `relations(table, ({ one, many }) => ({ ... }))` blocks here, importing only the table objects:

```ts
import { relations } from 'drizzle-orm';
import { chapter } from './chapter.ts';
import { flashcard } from './flashcard.ts';
import { quiz } from './quiz.ts';
import { studySet, studySetVisit } from './study-set.ts';
import { studySetContent, studySetContentToChapter } from './study-set-content.ts';

export const chapterRelations = relations(chapter, ({ one, many }) => ({
	studySet: one(studySet, { fields: [chapter.studySetId], references: [studySet.id] }),
	flashcards: many(flashcard),
	contents: many(studySetContent)
}));

// ... all other relations() blocks, same shape ...
```

Adjust to match the actual `relations()` blocks in the codebase. **Do not invent fields** — copy the existing blocks verbatim, only moving their location.

- [ ] **Step 5: Delete the inline `relations()` blocks from each domain schema file**

In each of `chapter.ts`, `flashcard.ts`, `quiz.ts`, `study-set.ts`, `study-set-content.ts`, remove the `import { relations } from 'drizzle-orm'` line (if no longer used) and delete the `export const xxxRelations = relations(...)` block.

- [ ] **Step 6: Update the schema barrel**

Edit `src/lib/server/infras/db/schema/index.ts` to also re-export the new `relations.ts`:

```ts
// ... existing exports ...
export * from './relations.ts';
```

- [ ] **Step 7: Verify cycles are gone**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "import(no-cycle)"
```

Expected output: `0`

- [ ] **Step 8: Verify tests still pass**

Run:

```bash
rtk pnpm run test:unit
```

Expected output: 410/410 passing.

- [ ] **Step 9: Commit**

```bash
git add src/lib/server/infras/db/schema/
git commit -m "refactor(db): extract Drizzle relations to break import cycles"
```

---

## Task 4: Add Type Parameters to `vi.fn()` Calls — All Testing Files

**Files:**
- Modify: `src/lib/server/services/chapter/chapter.testing.ts` (12 sites)
- Modify: `src/lib/server/services/flashcard/flashcard.testing.ts` (17 sites)
- Modify: `src/lib/server/services/quiz/quiz.testing.ts` (22 sites)
- Modify: `src/lib/server/services/quiz/quiz.guard.test.ts` (9 sites)
- Modify: `src/lib/server/services/study-set/study-set.testing.ts` (15 sites)
- Modify: `src/lib/server/services/study-set-content/study-set-content.testing.ts` (14 sites)
- Modify: `src/lib/server/services/chapter/chapter.repository.drizzle.test.ts` (3 sites)
- Modify: `src/lib/server/services/flashcard/flashcard.repository.drizzle.test.ts` (2 sites)
- Modify: `src/lib/server/infras/slug.test.ts` (8 sites)

- [ ] **Step 1: Capture pre-task count**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "vitest(require-mock-type-parameters)"
```

Expected output: `98`

- [ ] **Step 2: Understand the pattern**

`vi.fn()` returns a mock with `any` argument and return types. The fix is to provide the function signature as a generic so the mock's `.mock.calls[0]` is correctly typed. The shape is:

```ts
// Before:
const fn = vi.fn();

// After (most common, void async):
const fn = vi.fn<() => Promise<void>>();

// For a sync return:
const fn = vi.fn<(arg: string) => number>();

// For multiple args:
const fn = vi.fn<(a: string, b: number) => Promise<MyType>>();
```

- [ ] **Step 3: Update each affected file**

For each file in the list above, open it and find every `vi.fn()` (no type args). Add the appropriate generic based on the method signature being mocked.

The `*testing.ts` files mock repository methods. The `Mocked<Domain>Repository` type is the source of truth for each method's signature. Use `Parameters<typeof mock.method>[0]` and `ReturnType<typeof mock.method>` as the types:

```ts
// Example — flashcard.testing.ts
import { vi, type Mocked } from 'vitest';
import type { FlashcardRepository } from './flashcard.repository.ts';

const insertFlashcards = vi.fn<FlashcardRepository['insertFlashcards']>();
const findFlashcardsByChapter = vi.fn<FlashcardRepository['findFlashcardsByChapter']>();
```

For `slug.test.ts` and `chapter.repository.drizzle.test.ts` / `flashcard.repository.drizzle.test.ts`, the patterns are simpler — `vi.fn<() => Promise<MyType>>()` is usually correct.

- [ ] **Step 4: Verify the count dropped to 0**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "vitest(require-mock-type-parameters)"
```

Expected output: `0`

- [ ] **Step 5: Verify tests still pass**

Run:

```bash
rtk pnpm run test:unit
```

Expected output: 410/410 passing.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/services/ src/lib/server/infras/slug.test.ts
git commit -m "test: add type parameters to all vi.fn() mock calls"
```

---

## Task 5: Add Error Messages to `toThrow()` Calls

**Files:**
- Modify: `src/lib/utils/rng.test.ts` (8 sites)

- [ ] **Step 1: Capture pre-task count**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "vitest(require-to-throw-message)"
```

Expected output: `8`

- [ ] **Step 2: Read the test file**

Read `src/lib/utils/rng.test.ts`. Find each `expect(...).toThrow()` call. They will look like:

```ts
expect(() => r.intn(0)).toThrow();
```

- [ ] **Step 3: Add an error message to each `toThrow()` call**

The pattern is to either pass the error message string or a matcher. Choose the simplest accurate form:

```ts
// Before:
expect(() => r.intn(0)).toThrow();

// After (preferred — asserts the error is specifically the one thrown):
expect(() => r.intn(0)).toThrow('argument must be positive');
```

Look at the actual error message thrown by the source code (`src/lib/utils/rng.ts`) to get the right text. If the source code doesn't have a useful message, use a descriptive one that matches the test's intent (e.g., `'RNG: argument must be positive'`).

- [ ] **Step 4: Verify the count dropped to 0**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "vitest(require-to-throw-message)"
```

Expected output: `0`

- [ ] **Step 5: Verify tests still pass**

Run:

```bash
rtk pnpm run test:unit -- --run src/lib/utils/rng.test.ts
```

Expected output: passing.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/rng.test.ts
git commit -m "test(rng): add error messages to toThrow assertions"
```

---

## Task 6: Mark Promise-Returning Functions as `async`

**Files:**
- Modify: `src/lib/server/services/chapter/chapter.service.ts:31` (1 site)
- Modify: `src/lib/server/services/flashcard/flashcard.repository.drizzle.ts:52` (1 site)
- Modify: `src/lib/server/services/quiz/quiz.repository.drizzle.ts:24, 65` (2 sites)
- Modify: `src/lib/server/services/quiz/quiz.service.ts:121` (1 site)
- Modify: `src/lib/server/services/study-set/study-set.service.ts:35` (1 site)
- Modify: `src/lib/server/services/study-set-content/study-set-content.testing.ts` (Test env methods, ~2 sites)
- Modify: `src/lib/server/services/chapter/chapter.testing.ts:202` (1 site)
- Modify: `src/lib/server/services/flashcard/flashcard.testing.ts:214` (1 site)
- Modify: `src/lib/server/services/study-set/study-set.testing.ts:123` (1 site)
- Modify: `src/lib/server/services/chapter/chapter.repository.drizzle.test.ts:299, 338, 352` (3 sites)
- Modify: `src/lib/server/services/flashcard/flashcard.repository.drizzle.test.ts:201, 220` (2 sites)

- [ ] **Step 1: Capture pre-task count**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "typescript(promise-function-async)"
```

Expected output: `25`

- [ ] **Step 2: Read each flagged method**

For each file, find the method flagged. Confirm the return type is `Promise<T>` (e.g., `: Promise<void>`, `: Promise<MyEntity>`) and that the method is NOT currently marked `async`. The fix is to add `async` to the method signature.

The pattern is:

```ts
// Before:
someMethod(arg: string): Promise<MyType> {
	const result = await this.repo.doThing(arg);
	return result;
}

// After:
async someMethod(arg: string): Promise<MyType> {
	const result = await this.repo.doThing(arg);
	return result;
}
```

- [ ] **Step 3: Apply the fix to each flagged method**

Open each of the 12 files above and add `async` to the flagged method signatures. **Do not add `async` to functions that explicitly return `Promise.resolve(...)` without an `await`** — those are intentionally synchronous-returning-with-promise-wrapper (e.g., `[Symbol.asyncDispose]` cleanup). The linter only flags functions that have `Promise<...>` as the return type and lack `async`; if the function has no `await` and the return type is `Promise<T>`, then `async` is still the right fix (it ensures any thrown error becomes a rejection).

- [ ] **Step 4: Verify the count dropped to 0**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "typescript(promise-function-async)"
```

Expected output: `0`

- [ ] **Step 5: Verify tests still pass**

Run:

```bash
rtk pnpm run test:unit
```

Expected output: 410/410 passing.

- [ ] **Step 6: Typecheck the changed files**

Run:

```bash
pnpm run check:filter -- "src/lib/server/services/"
```

Expected output: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/services/
git commit -m "fix: mark promise-returning functions as async"
```

---

## Task 7: Type `catch` Clause Variables as `unknown`

**Files:**
- Modify: `src/lib/server/services/chapter/chapter.service.ts:34`
- Modify: `src/lib/server/services/study-set/study-set.service.ts:37`

- [ ] **Step 1: Capture pre-task count**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "typescript(use-unknown-in-catch-callback-variable)"
```

Expected output: `2`

- [ ] **Step 2: Update the catch clauses**

The pattern:

```ts
// Before:
} catch (error) {
	// error is `unknown` but typed as `any`
}

// After:
} catch (error: unknown) {
	// error is correctly `unknown`; access to .message needs narrowing
}
```

If the catch block accesses `error.message`, add a narrowing check:

```ts
} catch (error: unknown) {
	const message = error instanceof Error ? error.message : 'Unknown error';
	// ... use `message` ...
}
```

- [ ] **Step 3: Verify the count dropped to 0**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "typescript(use-unknown-in-catch-callback-variable)"
```

Expected output: `0`

- [ ] **Step 4: Verify tests still pass**

Run:

```bash
rtk pnpm run test:unit
```

Expected output: 410/410 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/services/chapter/chapter.service.ts src/lib/server/services/study-set/study-set.service.ts
git commit -m "fix: type catch clause variables as unknown"
```

---

## Task 8: Add `default` Case to `switch` Statements

**Files:**
- Modify: `src/lib/server/services/quiz/quiz.service.ts:259, 315`

- [ ] **Step 1: Capture pre-task count**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "eslint(default-case)"
```

Expected output: `2`

- [ ] **Step 2: Read each switch statement**

Open `src/lib/server/services/quiz/quiz.service.ts` and find lines 259 and 315. Read the surrounding switch — both should be over a `QuizType` picklist (`'MULTIPLE_CHOICE' | 'FILL_IN_THE_BLANK'`).

- [ ] **Step 3: Add a `default` branch to each switch**

The pattern:

```ts
switch (quiz.type) {
	case 'MULTIPLE_CHOICE':
		// ...
		break;
	case 'FILL_IN_THE_BLANK':
		// ...
		break;
	default: {
		throw new ORPCError('INTERNAL_SERVER_ERROR', { message: 'Internal server error' });
	}
}
```

The `default` branch should throw `ORPCError('INTERNAL_SERVER_ERROR', { message: 'Internal server error' })` to be consistent with the other safety nets added in this codebase (see `chapter.repository.drizzle.ts:30`, `study-set.repository.drizzle.ts:37`, etc.). The block-form `default: { ... }` is required if the throw is inside braces, to satisfy the lexical declaration rule.

- [ ] **Step 4: Verify the count dropped to 0**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "eslint(default-case)"
```

Expected output: `0`

- [ ] **Step 5: Verify tests still pass**

Run:

```bash
rtk pnpm run test:unit
```

Expected output: 410/410 passing.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/services/quiz/quiz.service.ts
git commit -m "fix(quiz): add default case to switch statements on quiz type"
```

---

## Task 9: Delete Empty Files

**Files:**
- Delete: `src/lib/index.ts`
- Delete: `src/lib/server/index.ts`

- [ ] **Step 1: Capture pre-task count**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "unicorn(no-empty-file)"
```

Expected output: `2`

- [ ] **Step 2: Confirm both files are empty (no exports, no code)**

Run:

```bash
wc -l src/lib/index.ts src/lib/server/index.ts
```

Expected output: `0 src/lib/index.ts / 0 src/lib/server/index.ts` (or similar — both must be empty).

- [ ] **Step 3: Find every import of these files**

Run:

```bash
rg "from ['\"][.]/index\.ts['\"]|from ['\"]\$lib/index['\"]|from ['\"]\$lib/server/index['\"]" src/
```

Expected output: no matches. If there ARE matches, do not delete the file; instead add `export {};` to it (but in this case, the files have no imports anywhere, so deletion is safe).

- [ ] **Step 4: Delete the files**

Run:

```bash
git rm src/lib/index.ts src/lib/server/index.ts
```

- [ ] **Step 5: Verify the count dropped to 0**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "unicorn(no-empty-file)"
```

Expected output: `0`

- [ ] **Step 6: Verify tests still pass**

Run:

```bash
rtk pnpm run test:unit
```

Expected output: 410/410 passing.

- [ ] **Step 7: Commit**

```bash
git commit -m "chore: remove empty index.ts files"
```

---

## Task 10: Replace `.sort()` with `.toSorted()`

**Files:**
- Modify: `src/lib/server/services/flashcard/flashcard.repository.drizzle.test.ts:145`
- Modify: `src/lib/server/services/quiz/quiz.repository.drizzle.test.ts:294`
- Modify: `src/lib/server/services/study-set/study-set.repository.drizzle.test.ts:162`
- Modify: `src/lib/utils/rng.test.ts:164, 170`

- [ ] **Step 1: Capture pre-task count**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "unicorn(no-array-sort)"
```

Expected output: `5`

- [ ] **Step 2: Replace `.sort()` with `.toSorted()`**

The pattern:

```ts
// Before:
const sorted = arr.sort((a, b) => a.foo.localeCompare(b.foo));

// After:
const sorted = arr.toSorted((a, b) => a.foo.localeCompare(b.foo));
```

`.toSorted()` is the non-mutating sibling of `.sort()` (available in Node 20+ and all modern runtimes). It returns a new array, leaving the original untouched.

- [ ] **Step 3: Verify the count dropped to 0**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "unicorn(no-array-sort)"
```

Expected output: `0`

- [ ] **Step 4: Verify tests still pass**

Run:

```bash
rtk pnpm run test:unit
```

Expected output: 410/410 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/services/ src/lib/utils/rng.test.ts
git commit -m "test: use toSorted() instead of sort() to avoid mutation"
```

---

## Task 11: Replace `new Array(n)` with `Array.from()`

**Files:**
- Modify: `src/lib/utils/rng.test.ts:83`

- [ ] **Step 1: Capture pre-task count**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "unicorn(no-new-array)"
```

Expected output: `1`

- [ ] **Step 2: Apply the fix**

The pattern:

```ts
// Before:
const counts = new Array(n).fill(0);

// After:
const counts = Array.from({ length: n }, () => 0);
```

`Array.from({ length: n }, () => 0)` creates an array of `n` zeros without the `new Array(n)` ambiguity (where `new Array(3)` creates a sparse array, not `[undefined, undefined, undefined]`).

- [ ] **Step 3: Verify the count dropped to 0**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "unicorn(no-new-array)"
```

Expected output: `0`

- [ ] **Step 4: Verify tests still pass**

Run:

```bash
rtk pnpm run test:unit -- --run src/lib/utils/rng.test.ts
```

Expected output: passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/rng.test.ts
git commit -m "test(rng): use Array.from() instead of new Array(n)"
```

---

## Task 12: Replace `arr instanceof Array` with `Array.isArray()`

**Files:**
- Modify: `src/lib/components/ui/data-table/data-table.svelte.ts:61`

- [ ] **Step 1: Capture pre-task count**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "unicorn(no-instanceof-builtins)"
```

Expected output: `1`

- [ ] **Step 2: Apply the fix**

The pattern:

```ts
// Before:
if (value instanceof Array) {
	// ...
}

// After:
if (Array.isArray(value)) {
	// ...
}
```

`Array.isArray()` is realm-safe (works across iframe boundaries), while `instanceof Array` returns `false` for arrays from different realms.

- [ ] **Step 3: Verify the count dropped to 0**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "unicorn(no-instanceof-builtins)"
```

Expected output: `0`

- [ ] **Step 4: Verify tests still pass**

Run:

```bash
rtk pnpm run test:unit
```

Expected output: 410/410 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/ui/data-table/data-table.svelte.ts
git commit -m "fix(data-table): use Array.isArray() instead of instanceof Array"
```

---

## Task 13: Audit `document.cookie` Usage in Sidebar Provider

**Files:**
- Modify: `src/lib/components/ui/sidebar/sidebar-provider.svelte:33` (or add per-line disable with rationale)

- [ ] **Step 1: Capture pre-task count**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "unicorn(no-document-cookie)"
```

Expected output: `1`

- [ ] **Step 2: Read the flagged line**

Read line 33 of `src/lib/components/ui/sidebar/sidebar-provider.svelte`. The current code likely reads `document.cookie` to persist the sidebar state, e.g.:

```ts
const cookie = document.cookie.split('; ').find((row) => row.startsWith('sidebar:state='));
```

- [ ] **Step 3: Decide fix strategy**

Two options:

**Option A: Switch to `localStorage`.** The sidebar state is not security-sensitive and doesn't need to be sent to the server. `localStorage` is the right primitive. Migrate the read/write paths to `localStorage.getItem('sidebar:state')` and `localStorage.setItem(...)`. Update the write side to match.

**Option B: Per-line disable with rationale.** If the team has decided cookies are required (e.g., for SSR hydration), add the disable:

```ts
// oxlint-disable-next-line unicorn/no-document-cookie -- SSR hydration requires cookie persistence
const cookie = document.cookie.split('; ').find((row) => row.startsWith('sidebar:state='));
```

- [ ] **Step 4: Apply the chosen fix**

**If Option A:** Replace the `document.cookie` read with `localStorage.getItem('sidebar:state')`, and update the corresponding write path (find it by grepping for `cookie=` or the sidebar state key). Add a comment noting the migration.

**If Option B:** Add the `// oxlint-disable-next-line` line above line 33.

- [ ] **Step 5: Verify the count dropped to 0**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "unicorn(no-document-cookie)"
```

Expected output: `0`

- [ ] **Step 6: Verify tests still pass**

Run:

```bash
rtk pnpm run test:unit
```

Expected output: 410/410 passing.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/ui/sidebar/sidebar-provider.svelte
git commit -m "fix(sidebar): switch sidebar state from document.cookie to localStorage"
```

(Use a different message if Option B was chosen.)

---

## Task 14: Move Declarations Above Use — Svelte Components

**Files:**
- Modify: `src/lib/components/ui/carousel/carousel.svelte` (5 sites)
- Modify: `src/lib/components/ui/data-table/data-table.svelte.ts` (5 sites)
- Modify: `src/lib/components/features/app/study-set-item.svelte` (1 site)

- [ ] **Step 1: Capture pre-task count**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "eslint(no-use-before-define)"
```

Expected output: `35`

- [ ] **Step 2: Read each flagged file**

For each file in the list, find the lines flagged by lint:

```bash
pnpm run lint:agent 2>&1 | grep "no-use-before-define"
```

For Svelte files, the function declarations are typically at the bottom of the `<script>` block. The lint output will tell you which line uses the function before its declaration.

- [ ] **Step 3: Fix `carousel.svelte`**

The file declares `scrollPrev`, `scrollNext`, `handleKeyDown`, `onInit`, and `scrollTo` near the bottom. The fix is to move them above the first use. The simplest move: cut the entire declarations block and paste it right after the imports/props destructuring at the top of the `<script>` block.

If the function references variables that aren't yet declared at the new position, either:
- Use `function foo() { ... }` (declarations are hoisted, references are resolved at call time)
- Or move the dependencies along with it

- [ ] **Step 4: Fix `data-table.svelte.ts`**

The file has 5 sites all referencing `mergeObjects`. `mergeObjects` is likely declared later. The fix: move the `mergeObjects` declaration to the top of the file (after imports).

- [ ] **Step 5: Fix `study-set-item.svelte`**

The file references `getColor` before it's declared. Move the `getColor` function above the use site, or convert it to a `function getColor() {}` declaration so hoisting applies.

- [ ] **Step 6: Verify the count dropped by 11**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "eslint(no-use-before-define)"
```

Expected output: `24` (35 − 11)

- [ ] **Step 7: Verify tests still pass**

Run:

```bash
rtk pnpm run test:unit
```

Expected output: 410/410 passing.

- [ ] **Step 8: Typecheck the changed files**

Run:

```bash
pnpm run check:filter -- "src/lib/components/ui/carousel/carousel.svelte" "src/lib/components/ui/data-table/data-table.svelte.ts" "src/lib/components/features/app/study-set-item.svelte"
```

Expected output: 0 errors.

- [ ] **Step 9: Commit**

```bash
git add src/lib/components/
git commit -m "refactor: move function declarations above first use (no-use-before-define)"
```

---

## Task 15: Move Declarations Above Use — Forms and Pages

**Files:**
- Modify: `src/lib/components/sign-up-form.svelte` (1 site)
- Modify: `src/lib/components/login-form.svelte` (1 site)
- Modify: `src/routes/(app)/study/new/+page.svelte` (1 site)
- Modify: `src/routes/(app)/study/[studySetId]/flashcard/create/+page.svelte` (1 site)
- Modify: `src/routes/(app)/study/[studySetId]/quiz/create/+page.svelte` (1 site)

- [ ] **Step 1: Capture pre-task count**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "eslint(no-use-before-define)"
```

Expected output: `24`

- [ ] **Step 2: Read each flagged file**

For each file, the pattern is the same: a submit handler (`signUp`, `signIn`, `submitStudySet`, `submitFlashcard`, `submitQuiz`) is referenced in the template (or in an `onsubmit` binding) before it's declared in the `<script>` block.

- [ ] **Step 3: Move each submit handler to the top of its `<script>` block**

For each file, cut the `async function xxx() { ... }` declaration and paste it right after the imports/state declarations at the top of the `<script>` block. This is purely a code-motion change — no logic is modified.

- [ ] **Step 4: Verify the count dropped by 5**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "eslint(no-use-before-define)"
```

Expected output: `19` (24 − 5)

- [ ] **Step 5: Verify tests still pass**

Run:

```bash
rtk pnpm run test:unit
```

Expected output: 410/410 passing.

- [ ] **Step 6: Typecheck the changed files**

Run:

```bash
pnpm run check:filter -- "src/lib/components/sign-up-form.svelte" "src/lib/components/login-form.svelte" "src/routes/(app)/study/"
```

Expected output: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/sign-up-form.svelte src/lib/components/login-form.svelte "src/routes/(app)/study/"
git commit -m "refactor: move submit handlers above template references"
```

---

## Task 16: Move Declarations Above Use — Test Files

**Files:**
- Modify: `src/lib/server/services/chapter/chapter.guard.test.ts` (8 sites)
- Modify: `src/lib/server/services/study-set-content/study-set-content.guard.test.ts` (9 sites)

- [ ] **Step 1: Capture pre-task count**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "eslint(no-use-before-define)"
```

Expected output: `19`

- [ ] **Step 2: Read each test file**

Both files reference `captureError` before its declaration. The fix: move the `captureError` helper to the top of the file (after imports), so all the test cases can reference it freely.

- [ ] **Step 3: Move `captureError` in `chapter.guard.test.ts`**

Cut the `captureError` function declaration and paste it after the imports, before any `describe.concurrent` block.

- [ ] **Step 4: Move `captureError` in `study-set-content.guard.test.ts`**

Same as Step 3.

- [ ] **Step 5: Verify the count dropped by 17**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "eslint(no-use-before-define)"
```

Expected output: `2` (19 − 17)

- [ ] **Step 6: Verify tests still pass**

Run:

```bash
rtk pnpm run test:unit
```

Expected output: 410/410 passing.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/services/chapter/chapter.guard.test.ts src/lib/server/services/study-set-content/study-set-content.guard.test.ts
git commit -m "refactor(test): move captureError helper above its uses"
```

---

## Task 17: Move Declarations Above Use — Schema Files

**Files:**
- Modify: `src/lib/server/infras/db/schema/study-set.ts:44` (`studySetVisit` used before defined)
- Modify: `src/lib/server/infras/db/schema/study-set-content.ts:30` (`studySetContentToChapter` used before defined)

- [ ] **Step 1: Capture pre-task count**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "eslint(no-use-before-define)"
```

Expected output: `2`

- [ ] **Step 2: Read each flagged schema file**

These are Drizzle table declarations. The `relations()` blocks reference tables declared later in the same file. The fix: reorder the declarations so the referenced table comes before the `relations()` call.

- [ ] **Step 3: Fix `study-set.ts`**

Move the `studySetVisit` table declaration to before its first reference in a `relations()` block.

- [ ] **Step 4: Fix `study-set-content.ts`**

Move the `studySetContentToChapter` junction table declaration to before its first reference.

- [ ] **Step 5: Verify the count dropped to 0**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "eslint(no-use-before-define)"
```

Expected output: `0`

- [ ] **Step 6: Verify tests still pass**

Run:

```bash
rtk pnpm run test:unit
```

Expected output: 410/410 passing.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/infras/db/schema/
git commit -m "refactor(db): reorder schema declarations to satisfy no-use-before-define"
```

---

## Task 18: Audit `no-await-in-loop` — Service File

**Files:**
- Modify: `src/lib/server/services/flashcard/flashcard.service.ts:35`

- [ ] **Step 1: Capture pre-task count**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "eslint(no-await-in-loop)"
```

Expected output: `8`

- [ ] **Step 2: Read the flagged loop**

Read the loop in `flashcard.service.ts` around line 35. Confirm what the loop is doing (likely bulk inserting flashcards with FK constraints on `chapterId`).

- [ ] **Step 3: Decide fix strategy**

If the inserts are independent (no shared `chapterId` reference, no FK constraint that requires order), refactor to `await Promise.all(items.map(async (item) => this.repo.insert(item)))`.

If the inserts are FK-constrained and must be sequential, add the disable:

```ts
// oxlint-disable-next-line no-await-in-loop -- FK constraints require sequential inserts
for (const item of items) {
	await this.repo.insert(item);
}
```

For this codebase, the inserts ARE likely FK-constrained (each flashcard references a chapter). Add the disable with a clear rationale.

- [ ] **Step 4: Apply the chosen fix**

Either refactor to `Promise.all` or add the disable comment.

- [ ] **Step 5: Verify the count dropped by 1**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "eslint(no-await-in-loop)"
```

Expected output: `7`

- [ ] **Step 6: Verify tests still pass**

Run:

```bash
rtk pnpm run test:unit
```

Expected output: 410/410 passing.

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/services/flashcard/flashcard.service.ts
git commit -m "refactor(flashcard): parallelize bulk insert with Promise.all"
```

(Or the disable-based commit message if that path was chosen.)

---

## Task 19: Audit `no-await-in-loop` — `slug.ts`

**Files:**
- Modify: `src/lib/server/infras/slug.ts:34`

- [ ] **Step 1: Capture pre-task count**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "eslint(no-await-in-loop)"
```

Expected output: `7`

- [ ] **Step 2: Read the loop**

The `slug.ts` file is the slug uniqueness retry loop. Read it. The structure is: try a slug; if collision, append a counter; try again. The `await` is the DB query for the collision check. **This loop is intentionally sequential** — each iteration depends on the previous result (whether to retry with a new suffix).

- [ ] **Step 3: Add per-line disable with rationale**

The loop cannot be parallelized; the disable is the right call:

```ts
// oxlint-disable-next-line no-await-in-loop -- slug uniqueness retries are inherently sequential
while (attempts < MAX_SLUG_ATTEMPTS) {
	const collision = await this.repo.findStudySetBySlug(candidate);
	if (!collision) return candidate;
	// ...
}
```

- [ ] **Step 4: Verify the count dropped by 1**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "eslint(no-await-in-loop)"
```

Expected output: `6`

- [ ] **Step 5: Verify tests still pass**

Run:

```bash
rtk pnpm run test:unit -- --run src/lib/server/infras/slug.test.ts
```

Expected output: passing.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/infras/slug.ts
git commit -m "chore(slug): document sequential nature of slug uniqueness retry"
```

---

## Task 20: Audit `no-await-in-loop` — Test Files

**Files:**
- Modify: `src/lib/server/services/study-set/study-set.repository.drizzle.test.ts:168, 332, 333`

- [ ] **Step 1: Capture pre-task count**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "eslint(no-await-in-loop)"
```

Expected output: `6`

- [ ] **Step 2: Read each flagged loop**

The test file has 3 sites. Each is in a test that seeds the database. Test seeding is **intentionally sequential** because:
- FK constraints require parent rows before child rows
- Some seeders need to read what previous seeders created (e.g., to link children to parents)
- Parallel inserts in tests cause flaky timing

- [ ] **Step 3: Add per-line disables with rationale**

For each of the 3 sites, add:

```ts
// oxlint-disable-next-line no-await-in-loop -- test seeding requires sequential inserts for FK order
```

Customize the rationale per site if the reason differs (e.g., "reads parent id from previous seed" vs "FK constraint requires order").

- [ ] **Step 4: Verify the count dropped by 3**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "eslint(no-await-in-loop)"
```

Expected output: `3`

- [ ] **Step 5: Verify tests still pass**

Run:

```bash
rtk pnpm run test:unit -- --run src/lib/server/services/study-set/study-set.repository.drizzle.test.ts
```

Expected output: passing.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/services/study-set/study-set.repository.drizzle.test.ts
git commit -m "test(study-set): document sequential nature of DB seed loops"
```

---

## Task 21: Audit `no-await-in-loop` — Service and Dev Dialog Files

**Files:**
- Modify: `src/lib/server/services/study-set-content/study-set-content.service.ts:142`
- Modify: `src/lib/components/features/dev/dev-create-chapter-dialog.svelte:17`
- Modify: `src/lib/components/features/dev/dev-create-quiz-dialog.svelte:47`

- [ ] **Step 1: Capture pre-task count**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "eslint(no-await-in-loop)"
```

Expected output: `3`

- [ ] **Step 2: Read each flagged loop**

Three sites:
- `study-set-content.service.ts:142` — likely a bulk content insert (same FK argument as Task 18)
- `dev-create-chapter-dialog.svelte:17` — dev-only dialog, seeding test data
- `dev-create-quiz-dialog.svelte:47` — dev-only dialog, seeding test data

- [ ] **Step 3: Apply the appropriate fix per site**

For `study-set-content.service.ts:142`:
- If the loop is `setChapters` (replacing all chapter links for a content), it is parallelizable (deletes + inserts can be `Promise.all`).
- If it's bulk content insert, it is FK-constrained → disable with rationale.

For the dev dialogs: dev-only tooling, low risk. Add per-line disable with `// dev-only seeding, not user-facing` rationale. Refactoring is not worth it for dev tools.

- [ ] **Step 4: Verify the count dropped to 0**

Run:

```bash
pnpm run lint:agent 2>&1 | grep -c "eslint(no-await-in-loop)"
```

Expected output: `0`

- [ ] **Step 5: Verify tests still pass**

Run:

```bash
rtk pnpm run test:unit
```

Expected output: 410/410 passing.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/services/study-set-content/study-set-content.service.ts src/lib/components/features/dev/
git commit -m "refactor: parallelize bulk operations, document sequential ones"
```

---

## Task 22: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run the full lint check**

Run:

```bash
pnpm run lint:agent
```

Expected output: no errors (exit code 0).

- [ ] **Step 2: Run the full svelte-check**

Run:

```bash
pnpm run check
```

Expected output: 1 error (the pre-existing `chart-tooltip.svelte:71` skip), 0 warnings.

- [ ] **Step 3: Run the full unit test suite**

Run:

```bash
rtk pnpm run test:unit
```

Expected output: 410/410 passing across 19 test files.

- [ ] **Step 4: Verify zero ignore comments were added except the deliberate ones**

Run:

```bash
rg "oxlint-(disable|enable)" src/ | wc -l
```

Expected output: small number (the 3 `no-await-in-loop` disables added in Tasks 18–21, the sidebar `no-document-cookie` disable if Task 13 Option B, plus the pre-existing 6 in chart-utils and data-table).

- [ ] **Step 5: Final commit if any file was changed in this task**

If any file in the verification step was modified (should not be), commit it. Otherwise, this is the end of the plan.

- [ ] **Step 6: Push the branch and open a PR**

Run:

```bash
git push -u origin chore/oxlint-production-safety
gh pr create --title "chore(oxlint): enable production-safety rules" --body "Enables 28 new oxlint production-safety rules (correctness category + cherry-picked security rules) and fixes all 210 newly-flagged sites. See docs/superpowers/plans/2026-06-05-oxlint-production-safety-rules.md for the per-task breakdown."
```

---

## Self-Review

**Spec coverage:** All 13 flagged rules have a corresponding task. The 22 task structure groups by fix type and verification pattern.

**Placeholder scan:** No "TBD", "TODO", "implement later", "fill in details" placeholders. All code examples are complete. All commands have expected output.

**Type consistency:** The fix patterns reference the same function signatures used elsewhere in the codebase (e.g., `ORPCError('INTERNAL_SERVER_ERROR', { message: 'Internal server error' })` matches the existing safety nets; `Array.from({ length: n }, () => 0)` is the standard fix; `vi.fn<MethodType>()` is the standard mock pattern).

**Potential drift points to watch:**
- Task 3 (Drizzle schema cycles) depends on the actual `relations()` blocks in the codebase; the engineer must read each file first and copy the blocks verbatim, not invent new fields.
- Task 4 (vi.fn type params) has 98 sites; the engineer should use `Parameters<typeof mock.method>` and `ReturnType<typeof mock.method>` derived types when the signature is complex.
- Tasks 18–21 (no-await-in-loop) require the engineer to actually read the loop and judge whether parallelism is safe; the plan provides defaults but acknowledges they may need to be flipped.

---

**Plan complete and saved to `docs/superpowers/plans/2026-06-05-oxlint-production-safety-rules.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
