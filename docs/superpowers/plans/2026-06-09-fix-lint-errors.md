# Fix Lint Errors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all oxlint errors from `pnpm lint:agent` to get a clean lint pass.

**Architecture:** The errors are mechanical and grouped by type. We fix them in batches by error category: promise-function-async, return-await, no-unsafe-type-assertion, strict-boolean-expressions, no-unnecessary-type-conversion, prefer-nullish-coalescing, no-confusing-void-expression, prefer-readonly, unbound-method, consistent-return, and non-nullable-type-assertion-style.

**Tech Stack:** TypeScript, Oxlint, oRPC, Svelte, Drizzle ORM

---

### Task 1: Fix `promise-function-async` errors in service layer

**Files:**

- Modify: `src/lib/server/services/study-set/study-set.service.ts`
- Modify: `src/lib/server/services/chapter/chapter.service.ts`
- Modify: `src/lib/server/services/flashcard/flashcard.guard.ts`
- Modify: `src/lib/server/services/quiz/quiz.guard.ts`
- Modify: `src/lib/server/services/quiz/quiz.service.ts`

- [ ] **Step 1: Add `async` to `getStudySets` in `study-set.service.ts`**
      Change `getStudySets(` to `async getStudySets(` on line 125.

- [ ] **Step 2: Add `async` to `getRecentStudySets` in `study-set.service.ts`**
      Change `getRecentStudySets(` to `async getRecentStudySets(` on line 154.

- [ ] **Step 3: Add `async` to `getChaptersByStudySet` in `chapter.service.ts`**
      Change `getChaptersByStudySet(` to `async getChaptersByStudySet(` on line 105.

- [ ] **Step 4: Add `async` to `assertStudySetVisibleOrNotFound` in `flashcard.guard.ts`**
      Change `assertStudySetVisibleOrNotFound(` to `async assertStudySetVisibleOrNotFound(` on line 36.

- [ ] **Step 5: Add `async` to `assertStudySetVisibleOrNotFound` in `quiz.guard.ts`**
      Change `assertStudySetVisibleOrNotFound(` to `async assertStudySetVisibleOrNotFound(` on line 44.

- [ ] **Step 6: Add `async` to `assertChapterOwnerOrForbidden` in `quiz.guard.ts`**
      Change `assertChapterOwnerOrForbidden(` to `async assertChapterOwnerOrForbidden(` on line 54.

- [ ] **Step 7: Add `async` to map callback in `quiz.service.ts`**
      On line 137, change `quizIds.map((id) => this.guard.assertQuizOwnerOrForbidden(id, ownerId))` to `quizIds.map(async (id) => this.guard.assertQuizOwnerOrForbidden(id, ownerId))`.

---

### Task 2: Fix `promise-function-async` errors in ORPC command/query handlers

**Files:**

- Modify: `src/lib/server/services/chapter/commands/chapter.create.ts`
- Modify: `src/lib/server/services/chapter/commands/chapter.update.ts`
- Modify: `src/lib/server/services/chapter/queries/chapter.list.ts`
- Modify: `src/lib/server/services/chapter/queries/chapter.get.ts`
- Modify: `src/lib/server/services/flashcard/commands/flashcard.update.ts`
- Modify: `src/lib/server/services/flashcard/queries/flashcard.get.ts`
- Modify: `src/lib/server/services/flashcard/queries/flashcard.list.ts`
- Modify: `src/lib/server/services/quiz/commands/quiz.create.ts`
- Modify: `src/lib/server/services/quiz/commands/quiz.option-create.ts`
- Modify: `src/lib/server/services/quiz/queries/quiz.get.ts`
- Modify: `src/lib/server/services/quiz/commands/quiz.update.ts`
- Modify: `src/lib/server/services/quiz/commands/quiz.option-update.ts`
- Modify: `src/lib/server/services/quiz/queries/quiz.list.ts`
- Modify: `src/lib/server/services/study-set/commands/study-set.admin-cleanup-visits.ts`
- Modify: `src/lib/server/services/study-set/commands/study-set.delete.ts`
- Modify: `src/lib/server/services/study-set/commands/study-set.refresh-visit.ts`
- Modify: `src/lib/server/services/study-set/commands/study-set.restore.ts`
- Modify: `src/lib/server/services/study-set/commands/study-set.update.ts`
- Modify: `src/lib/server/services/study-set/queries/study-set.get-recent.ts`
- Modify: `src/lib/server/services/study-set/queries/study-set.get.ts`
- Modify: `src/lib/server/services/study-set/commands/study-set.create.ts`
- Modify: `src/lib/server/services/study-set/queries/study-set.list.ts`
- Modify: `src/lib/server/services/study-set-content/commands/study-set-content.create.ts`
- Modify: `src/lib/server/services/study-set-content/commands/study-set-content.update.ts`
- Modify: `src/lib/server/services/study-set-content/queries/study-set-content.get.ts`
- Modify: `src/lib/server/services/study-set-content/queries/study-set-content.list-by-chapter.ts`
- Modify: `src/lib/server/services/study-set-content/queries/study-set-content.list.ts`

- [ ] **Step 1: Fix all ORPC handlers in `chapter/` commands and queries**
      Add `async` before the arrow function parameter in `.handler(...)` for all 4 files.

- [ ] **Step 2: Fix all ORPC handlers in `flashcard/` commands and queries**
      Add `async` before the arrow function parameter in `.handler(...)` for all 3 files.

- [ ] **Step 3: Fix all ORPC handlers in `quiz/` commands and queries**
      Add `async` before the arrow function parameter in `.handler(...)` for all 6 files.

- [ ] **Step 4: Fix all ORPC handlers in `study-set/` commands and queries**
      Add `async` before the arrow function parameter in `.handler(...)` for all 8 files.

- [ ] **Step 5: Fix all ORPC handlers in `study-set-content/` commands and queries**
      Add `async` before the arrow function parameter in `.handler(...)` for all 5 files.

---

### Task 3: Fix `promise-function-async` errors in testing files

**Files:**

- Modify: `src/lib/server/services/study-set/study-set.testing.ts`
- Modify: `src/lib/server/services/quiz/quiz.testing.ts`
- Modify: `src/lib/server/services/study-set-content/study-set-content.testing.ts`
- Modify: `src/lib/server/services/chapter/chapter.repository.drizzle.test.ts`
- Modify: `src/lib/server/services/flashcard/flashcard.repository.drizzle.test.ts`
- Modify: `src/lib/server/services/quiz/quiz.repository.drizzle.test.ts`
- Modify: `src/lib/server/services/study-set/study-set.repository.drizzle.test.ts`
- Modify: `src/lib/server/services/study-set-content/study-set-content.repository.drizzle.test.ts`
- Modify: `src/lib/server/infras/db/testing.ts`
- Modify: `src/hooks.server.ts`

- [ ] **Step 1: Fix `seedStudySet` in `study-set.testing.ts`**
      Add `async` to `seedStudySet` on line 120.

- [ ] **Step 2: Fix `seedStudySet` in `quiz.testing.ts`**
      Add `async` to `seedStudySet` on line 150.

- [ ] **Step 3: Fix `seedContent` in `study-set-content.testing.ts`**
      Add `async` to `seedContent` on line 205.

- [ ] **Step 4: Fix arrow functions in `chapter.repository.drizzle.test.ts`**
      Add `async` to `insertDuplicate` on line 399, `insertOrphan` on line 442, and `insertOrphan` on line 458.

- [ ] **Step 5: Fix arrow functions in `flashcard.repository.drizzle.test.ts`**
      Add `async` to `insertOrphan` on lines 244, 265, and 286.

- [ ] **Step 6: Fix arrow functions in `quiz.repository.drizzle.test.ts`**
      Add `async` to `insertOrphan` on lines 577, 597, and 616.

- [ ] **Step 7: Fix arrow functions in `study-set.repository.drizzle.test.ts`**
      Add `async` to `insertDuplicate` on line 622 and `insertOrphan` on line 641.

- [ ] **Step 8: Fix arrow function in `study-set-content.repository.drizzle.test.ts`**
      Add `async` to `insertOrphan` on line 369.

- [ ] **Step 9: Fix `sleep` in `db/testing.ts`**
      Add `async` to `sleep` on line 7.

- [ ] **Step 10: Fix `authGuardHandle` in `hooks.server.ts`**
      Add `async` to `authGuardHandle` on line 28.

---

### Task 4: Fix `return-await` errors

**Files:**

- Modify: `src/lib/server/services/study-set/study-set.service.ts`
- Modify: `src/lib/server/services/chapter/chapter.service.ts`
- Modify: `src/lib/server/services/flashcard/flashcard.service.ts`
- Modify: `src/lib/server/services/quiz/quiz.service.ts`
- Modify: `src/lib/server/services/study-set-content/study-set-content.service.ts`
- Modify: `src/hooks.server.ts`
- Modify: `src/lib/server/services/quiz/quiz.testing.ts`
- Modify: `src/lib/server/services/study-set/study-set.service.test.ts`

- [ ] **Step 1: Add `await` in `study-set.service.ts`**
      Change `return this.repo.insertStudySet(...)` on line 56 to `return await this.repo.insertStudySet(...)`.

- [ ] **Step 2: Add `await` in `chapter.service.ts`**
      Change `return this.repo.insertChapter(...)` on line 48 to `return await this.repo.insertChapter(...)`.

- [ ] **Step 3: Add `await` in `flashcard.service.ts`**
      Change `return this.repo.insertFlashcards(...)` on line 63 to `return await this.repo.insertFlashcards(...)`.
      Change `return this.repo.findFlashcardsByStudySet(...)` on line 103 to `return await this.repo.findFlashcardsByStudySet(...)`.

- [ ] **Step 4: Add `await` in `quiz.service.ts`**
      Change `return this.hydrateQuiz(updated)` on line 114 to `return await this.hydrateQuiz(updated)`.
      Change `return this.repo.insertQuizOptions(...)` on line 163 to `return await this.repo.insertQuizOptions(...)`.
      Change `return this.repo.findQuizzesByStudySetId(...)` on line 289 to `return await this.repo.findQuizzesByStudySetId(...)`.
      Change `return this.hydrateQuiz(quizRow)` on line 297 to `return await this.hydrateQuiz(quizRow)`.

- [ ] **Step 5: Add `await` in `study-set-content.service.ts`**
      Change `return this.repo.findContentsByStudySet(...)` on line 119 to `return await this.repo.findContentsByStudySet(...)`.
      Change `return this.repo.findContentsByChapter(...)` on line 135 to `return await this.repo.findContentsByChapter(...)`.

- [ ] **Step 6: Add `await` in `hooks.server.ts`**
      Change `return svelteKitHandler(...)` on line 21 to `return await svelteKitHandler(...)`.

- [ ] **Step 7: Add `await` in `quiz.testing.ts`**
      Change `return this.repo.insertQuiz(...)` on line 219 to `return await this.repo.insertQuiz(...)`.

- [ ] **Step 8: Add `await` in `study-set.service.test.ts`**
      Change `Promise.resolve(...)` on line 42 to `return await Promise.resolve(...)`.

---

### Task 5: Fix `no-unnecessary-type-conversion` errors

**Files:**

- Modify: `src/lib/server/services/study-set/study-set.repository.drizzle.ts`
- Modify: `src/lib/server/services/chapter/chapter.repository.drizzle.ts`

- [ ] **Step 1: Remove `Number()` wrapper in `study-set.repository.drizzle.ts`**
      Change `Number(totalRow[0]?.count ?? 0)` on line 226 to `totalRow[0]?.count ?? 0`.

- [ ] **Step 2: Remove `Number()` wrapper in `chapter.repository.drizzle.ts`**
      Change `Number(row?.count ?? 0)` on line 174 to `row?.count ?? 0`.

---

### Task 6: Fix `strict-boolean-expressions` errors

**Files:**

- Modify: `src/lib/server/services/flashcard/flashcard.service.ts`
- Modify: `src/lib/server/services/quiz/quiz.service.ts`
- Modify: `src/lib/server/services/quiz/quiz.testing.ts`
- Modify: `src/lib/server/services/study-set-content/study-set-content.repository.drizzle.ts`

- [ ] **Step 1: Fix `flashcard.service.ts` line 36**
      Change `filter((v): v is string => !!v)` to `filter((v): v is string => v !== null && v !== undefined)`.

- [ ] **Step 2: Fix `quiz.service.ts` line 44**
      Change `if (input.chapterId)` to `if (input.chapterId != null)`.

- [ ] **Step 3: Fix `quiz.testing.ts` line 179**
      Change `if (studySetId)` to `if (studySetId != null)`.

- [ ] **Step 4: Fix `study-set-content.repository.drizzle.ts` line 336**
      Change `if (row.chapterId)` to `if (row.chapterId != null)`.

---

### Task 7: Fix `prefer-nullish-coalescing` errors

**Files:**

- Modify: `src/lib/components/ui/data-table/data-table.svelte.ts`
- Modify: `src/lib/hooks/auth.svelte.ts`

- [ ] **Step 1: Fix `data-table.svelte.ts` line 140**
      Change `options.state || {}` to `options.state ?? {}`.

- [ ] **Step 2: Fix `auth.svelte.ts` line 34**
      Change `return user || initialUser` to `return user ?? initialUser`.

---

### Task 8: Fix `no-confusing-void-expression` and `prefer-readonly` errors

**Files:**

- Modify: `src/lib/components/ui/sidebar/context.svelte.ts`

- [ ] **Step 1: Fix `no-confusing-void-expression` on line 59**
      Change the ternary arrow function to use braces:

  ```
  toggle = () => {
    this.#isMobile.current
      ? (this.openMobile = !this.openMobile)
      : this.setOpen(!this.open);
  }
  ```

- [ ] **Step 2: Fix `prefer-readonly` on line 29**
      Change `#isMobile: IsMobile;` to `readonly #isMobile: IsMobile;`.

---

### Task 9: Fix `unbound-method` and `no-unsafe-type-assertion` in `orpc.server.ts`

**Files:**

- Modify: `src/lib/orpc.server.ts`

- [ ] **Step 1: Fix `unbound-method` on line 20**
      Change `async ({ next }) => {` to use an arrow function that doesn't reference `next` as an unbound method, or add `this: void` annotation.
      Actually, the issue is `next` is being passed as a callback. The fix is to keep it as-is but since it's an arrow function, we just need to change: `async ({ next }) => {` — this is already an arrow function. The issue might be that `next()` is being called. Wait, looking at the error: `src/lib/orpc.server.ts:20:14: error typescript(unbound-method): Avoid referencing unbound methods which may cause unintentional scoping of this.`
      The fix is to wrap `next` in a lambda or use bind. Change `return await next()` to `return await next.call(this)` or similar. Actually, a simpler fix: `const { next } = args; return await next();` — no, that doesn't change anything. The linter is saying `next` is an unbound method. We can fix it by calling `next.call(args)` or just storing it differently. Actually, the best fix is to destructure differently or use `const result = await next();`.

  Wait, looking more carefully: `interceptors: [ async ({ next }) => { try { return await next(); }` — the issue is that `next` is a method on the object and calling it without binding could lose `this`. The fix is to either use `next.bind({})()` or `(() => next())()`. Actually, the simplest fix for oxlint is to change `return await next()` to `return await next.call({})` or `return await next.call(null)` or `return await next.call(undefined)` — but that might look weird.

  Actually, a better fix: assign `next` to a local variable and call it:

  ```
  async (args) => {
    const { next } = args;
    try {
      return await next();
    }
  ```

  But that doesn't change the unbound method issue. The linter specifically says: `Avoid referencing unbound methods which may cause unintentional scoping of this. help: If your function does not access this, you can annotate it with this: void, or consider using an arrow function instead.`

  So we can annotate `next` with `this: void` in the type. But we can't change the type. Another option: wrap in an arrow function: `await (() => next())()`. Hmm.

  Actually, looking at the oRPC source, `next` is probably typed as `(this: void) => Promise<T>`. The issue might be that in the interceptor type, `next` is not annotated with `this: void`. The simplest fix for the linter is to not destructure `next` but instead call it via `await args.next()` — but that has the same issue.

  The actual fix: `const invokeNext = () => next(); return await invokeNext();` — no, `next` is still referenced.

  Wait, the linter says: "If your function does not access this, you can annotate it with this: void, or consider using an arrow function instead."

  So we can use an arrow function to wrap it: `const boundNext = (...args2: Parameters<typeof next>) => next(...args2);` — but that's too complex.

  Actually, the simplest fix is to change:

  ```
  async ({ next }) => {
    try {
      return await next();
  ```

  to:

  ```
  async (ctx) => {
    try {
      return await ctx.next();
  ```

  But that still references `ctx.next` as an unbound method.

  Hmm, let me think about this differently. The linter rule `unbound-method` triggers when you extract a method from an object and call it without binding. `next` is a method on the interceptor context object. When we destructure `{ next }`, we're extracting it. The fix is to not destructure:

  ```
  async (context) => {
    try {
      return await context.next();
  ```

  But `context.next()` is still calling `next` with `context` as `this`, which is fine! The linter shouldn't complain about `context.next()` because `this` is bound correctly. Let me check... actually, `context.next()` binds `next` to `context` via the dot notation. So the linter shouldn't flag this.

  So the fix is to not destructure `next` and instead call `context.next()`.

- [ ] **Step 2: Fix `no-unsafe-type-assertion` on line 27**
      Change `e.code as string` to use proper type narrowing. Since `e` is `ORPCError`, `e.code` is already `string`. Remove the `as string` cast: `e.code` instead of `e.code as string`.

  Also fix `e.data as unknown` on line 28 — `e.data` is already `unknown` for `ORPCError`. Remove the cast: `e.data` instead of `e.data as unknown`.

---

### Task 10: Fix `no-unsafe-type-assertion` errors in test files

**Files:**

- Modify: `src/lib/server/services/chapter/chapter.service.test.ts`
- Modify: `src/lib/server/services/flashcard/flashcard.guard.test.ts`
- Modify: `src/lib/server/services/flashcard/flashcard.service.test.ts`
- Modify: `src/lib/server/services/quiz/quiz.guard.test.ts`
- Modify: `src/lib/server/services/quiz/quiz.service.test.ts`
- Modify: `src/lib/server/services/study-set/study-set.service.test.ts`
- Modify: `src/lib/server/services/study-set/study-set.utils.ts`
- Modify: `src/lib/server/services/study-set-content/study-set-content.service.test.ts`

- [ ] **Step 1: Fix `chapter.service.test.ts` line 33**
      Change `guard as unknown as ChapterGuard` to `guard as unknown as ChapterGuard` — this is actually fine, but the linter complains. Wait, the error says "Unsafe type assertion: type 'ChapterGuard' is more narrow than the original type." The original type is `MockedGuard` which has `MockedFunction` properties. The fix is to use `satisfies` or to cast via `unknown` first, which is already done. Hmm, but the linter says it's unsafe. Let me think... the issue is `MockedGuard` is a mapped type with `MockedFunction`, which might be narrower than `ChapterGuard` because `MockedFunction` has extra properties like `mock`. So `as unknown as ChapterGuard` is going from a wider type to a narrower type. The linter says this is unsafe. The fix is to not cast at all but to use a proper mock. But that's too invasive. Alternatively, we can use `as ChapterGuard` without `unknown`, or use `as unknown as ChapterGuard` — the linter says the assertion is unsafe because the target type is narrower.

  Actually, looking at the error: `type 'ChapterGuard' is more narrow than the original type` — this means the original type (MockedChapterGuard) is WIDER than ChapterGuard. So the assertion is going from wide to narrow, which is unsafe because the object might have extra properties. The fix is to not use a type assertion at all, but since this is a test file with mocks, a common pattern is to use `as unknown as ChapterGuard` which bypasses the check. But oxlint still flags it.

  One way to fix this is to change the constructor call to accept a mock that implements the interface. But since we use `vi.fn()` for every method, the mock is already structurally compatible. We can just cast without `unknown`: `guard as ChapterGuard`. But the linter might still complain.

  Another approach: use `// oxlint-disable-next-line no-unsafe-type-assertion` for test files. But that defeats the purpose of the lint rule.

  Actually, the best fix for test files is to use a proper type assertion that oxlint accepts. The linter says: "Unsafe type assertion: the original type is assignable to the constraint of type 'ChapterGuard', but 'ChapterGuard' could be instantiated with a different subtype of its constraint." This is a classic TypeScript unsoundness issue. The fix for this is often to use `as unknown as ChapterGuard` but that also triggers the rule.

  Wait, looking at the error again: `Unsafe type assertion: type 'ChapterGuard' is more narrow than the original type.` — the `original type` is the mock type which has additional properties. The linter is complaining that we're hiding those extra properties. The proper fix is to not use a type assertion at all. Instead, we can change the service constructor to accept a mocked type, or we can cast the mock type to the interface type by using `satisfies ChapterGuard`.

  Actually, `satisfies ChapterGuard` would require the mock to be structurally compatible, which it is. But then `satisfies` doesn't change the type; it just checks. So the service constructor would still receive a `MockedChapterGuard` which might not be assignable to `ChapterGuard` if `MockedChapterGuard` has extra properties.

  Let me think about this differently. The issue is that `MockedFunction` wraps a function with additional properties like `mock`, `mockResolvedValue`, etc. So `MockedChapterGuard` is `{ [K in keyof ChapterGuard]: MockedFunction<ChapterGuard[K]> }`. This has MORE properties than `ChapterGuard` (each method has mock properties). TypeScript should allow passing a MORE specific type to a parameter expecting a LESS specific type (covariance in function parameters). Wait, no — for object types, having extra properties is generally allowed in structural typing. Let me check if `MockedChapterGuard` is assignable to `ChapterGuard`.

  `MockedFunction<T>` is a function that also has mock properties. Since `ChapterGuard` methods are functions, `MockedFunction<ChapterGuard[K]>` is a function that is assignable to `ChapterGuard[K]` because it has the same call signature. So `MockedChapterGuard` should be assignable to `ChapterGuard`. If it is, we don't need the cast at all!

  Let me verify: in TypeScript, if `A extends B` and `B` is a function, then `A` is assignable to `B` if `A` has the same or more specific call signatures. `MockedFunction<T>` has the same call signature as `T` plus extra properties. So `MockedFunction<T>` is assignable to `T`. Therefore, `MockedChapterGuard` should be assignable to `ChapterGuard`. We can remove the cast entirely!

  Wait, but the user might have added the cast because TypeScript complained. Let me check if we can just remove the cast. If TypeScript is happy without the cast, that's the best fix. If not, we need to use a different approach.

  Actually, looking at the error, it says `type 'ChapterGuard' is more narrow than the original type`. This means the original type (MockedChapterGuard) is wider. So `MockedChapterGuard` should be assignable to `ChapterGuard`. If the cast is there, we can just remove it. But the test might have been written with the cast to silence a different TypeScript error.

  Let me try removing the cast and see if TypeScript is happy. Since I can't test right now, I'll plan to remove the cast if possible. If TypeScript complains, I'll use an alternative approach.

  For the test files, I'll change:

  ```
  const service = new ChapterService(repo, guard as unknown as ChapterGuard);
  ```

  to:

  ```
  const service = new ChapterService(repo, guard);
  ```

  and see if TypeScript is happy. If not, I'll need to add a type annotation.

  Actually, a safer approach: we can use `as ChapterGuard` without `unknown`. But the linter will still flag it. The only way to truly satisfy the linter is to not use `as` at all. Let me try that first.

  For test files that use `as unknown as StudySetGuard` with inline objects like `{ id: "set-1", ... }`, we need to use proper fixtures or `createStudySetFixture()` instead of inline objects.

  For the quiz guard tests, the inline objects like `{ id: "set-1" } as unknown as StudySet` should be replaced with `createStudySetFixture({ id: "set-1" })` if available. If not, we can use `as unknown as StudySet` but that triggers the linter. The best fix is to use the fixture factory.

  Wait, looking at the quiz guard test file: `const set = { id: "set-1", ownerId: "owner-1", visibility: "PUBLIC" } as unknown as StudySet;` — this is an inline object. The fix is to use `createStudySetFixture({ id: "set-1", ownerId: "owner-1", visibility: "PUBLIC" })` instead. Similarly for other inline objects.

  For `as never` casts in quiz guard tests, we need to use a proper type. The `as never` is used for `QuizOption[]` in the mock. The fix is to use `createQuizOptionFixture({ id: "o-1", quizId: "q-1" })` instead.

  This is a lot of changes. Let me plan the test file fixes more carefully:
  1. `chapter.service.test.ts` line 33: Remove `as unknown as ChapterGuard` cast, pass `guard` directly.
  2. `flashcard.guard.test.ts` line 27: Remove `as unknown as StudySetGuard` cast, pass `studySet` directly.
  3. `flashcard.guard.test.ts` lines 380, 396, 408: Remove `as PartialForbiddenError` cast. Instead, use type narrowing or check properties directly without casting.
  4. `flashcard.service.test.ts` line 57: Remove `as unknown as FlashcardGuard` cast.
  5. `quiz.guard.test.ts` lines 52, 53: Remove `as unknown as StudySetGuard` and `as unknown as ChapterGuard` casts.
  6. `quiz.guard.test.ts` lines 62, 104, 121, 141, 179, 202, 380, 403: Replace inline objects with fixture factories.
  7. `quiz.guard.test.ts` lines 332, 333, 350: Replace `as never` with `createQuizOptionFixture(...)`.
  8. `quiz.service.test.ts` line 106: Remove `as unknown as QuizGuard` cast.
  9. `study-set.service.test.ts` line 58: Remove `as unknown as StudySetGuard` cast.
  10. `study-set.utils.ts` line 20: Remove `as StudySetVisibility` cast. The value is already typed correctly.
  11. `study-set-content.service.test.ts` line 45: Remove `as unknown as StudySetContentGuard` cast.
  12. `slug.test.ts` line 105: Change `as string` to `!` (non-null assertion).

  Let me now plan the fixes for the `chart-utils.ts` and `data-table.svelte.ts` files.

---

### Task 11: Fix `no-unsafe-type-assertion` and `no-unnecessary-type-assertion` in UI components

**Files:**

- Modify: `src/lib/components/ui/chart/chart-utils.ts`
- Modify: `src/lib/components/ui/data-table/data-table.svelte.ts`
- Modify: `src/lib/components/ui/data-table/render-helpers.ts`

- [ ] **Step 1: Fix `chart-utils.ts` lines 40, 42, 46, 48, 55, 60**
      The issue is `as keyof typeof payload` and `as string` casts. These are shadcn-svelte vendored components. The safest approach is to add `// oxlint-disable-next-line` comments for these specific shadcn-svelte vendored files since modifying them extensively might break things or make future updates harder. Alternatively, use type guards.

  For line 40: `typeof payload[key as keyof typeof payload] === "string"` — use a helper function or just add an oxlint-disable.
  For line 42: `payload[key as keyof typeof payload] as string` — same.
  For lines 46, 48: Similar pattern with `payloadConfig`.
  For line 55: `data[key] as string` — use `String(data[key])` or type guard.
  For line 60: `config[key as keyof typeof config]` — add oxlint-disable.

  Since these are shadcn-svelte vendored components and the errors are in complex generic type handling, the pragmatic fix is to add `// oxlint-disable-next-line` comments for the specific unsafe casts.

- [ ] **Step 2: Fix `data-table.svelte.ts` lines 32-70**
      This is a complex Proxy-based implementation. The issues are:
  - Line 32: `findSourceWithKey` expected a return value. Add `return undefined;` at the end.
  - Line 35: Unexpected `any` value in conditional. The `obj` is `any` due to the `// oxlint-disable` block. Add proper type guards or keep the oxlint-disable.
  - Line 41: `as never` cast. Remove or add oxlint-disable.
  - Line 44: `as never` cast. Remove or add oxlint-disable.
  - Line 49: Unexpected `any` value in conditional. Add type guard.
  - Line 52: `getOwnPropertyDescriptor` expected no return value. But the function returns an object. Wait, the error says "expected no return value" but the code returns a property descriptor. This seems like a false positive. The issue might be that the function is declared as `getOwnPropertyDescriptor` but returns a value. Actually, `getOwnPropertyDescriptor` should return a value. The error might be because the type is wrong. Let me look again... The error says `Function 'getOwnPropertyDescriptor' expected no return value.` That's strange. Maybe the linter thinks the function signature doesn't allow a return. Actually, looking at the Proxy handler, `getOwnPropertyDescriptor` should return `PropertyDescriptor | undefined`. The code returns an object. So this is a linter false positive or a type inference issue. We can add `return undefined;` at the end if it expects no return, but that would break the code. Actually, looking at the error more carefully: `src/lib/components/ui/data-table/data-table.svelte.ts:52:7: error typescript(consistent-return): Function 'getOwnPropertyDescriptor' expected no return value.` Wait, `consistent-return` says the function should either always return or never return. But `getOwnPropertyDescriptor` has a conditional return. Let me check if the code has a return at the end... No, the function returns inside the if block but not after. So if `src` is truthy, it returns the descriptor. If `src` is falsy, it falls through and returns `undefined` implicitly. The linter wants an explicit `return undefined;` at the end. So add `return undefined;` after the if block.

  - Line 56: `as any` cast. Remove or add oxlint-disable.
  - Line 62: Unexpected `any` value in conditional. Add type guard.
  - Line 69: Unexpected `any` value in conditional. Add type guard.
  - Line 70: Unnecessary type assertion. Remove it.
  - Line 140: `prefer-nullish-coalescing` — already planned in Task 7.

  For the `any` issues in this file, since it's a vendored shadcn-svelte component with intentional use of `any` for Proxy-based merging, the best approach is to add `// oxlint-disable` comments for the specific lines where `any` is intentionally used.

- [ ] **Step 3: Fix `render-helpers.ts` lines 60, 91**
      The issues are `props: Props = {} as Props` and `params: TProps = {} as TProps`. These are default values with type assertions. The fix is to not assert and let TypeScript infer, or use `satisfies`.
      For line 60: Change `props: Props = {} as Props` to `props: Props = {}` — but TypeScript might complain if `Props` doesn't allow empty objects. The better fix is to use `props: Props = {} satisfies Props` but that still requires `Props` to be compatible with `{}`. Actually, since these are shadcn-svelte vendored components, adding oxlint-disable comments is safer.

---

### Task 12: Fix `study-set.repository.drizzle.ts` type assertion

**Files:**

- Modify: `src/lib/server/services/study-set/study-set.repository.drizzle.ts`

- [ ] **Step 1: Fix `findRecentVisits` return type assertion on line 343**
      The issue is `return rows as StudySet[];`. The selected columns don't include `deletedAt`. The fix is to add `deletedAt: studySet.deletedAt` to the select query, or use a proper type annotation. Let's add `deletedAt: studySet.deletedAt` to the `.select()` block on the query around line 325.

---

### Task 13: Run lint and verify all errors are fixed

- [ ] **Step 1: Run `pnpm lint:agent`**
      Expected: No errors or only remaining errors that need further attention.

- [ ] **Step 2: Fix any remaining errors**
      Address any new errors that appear after the fixes.

- [ ] **Step 3: Run `pnpm run check:agent`**
      Expected: Pass without errors.
