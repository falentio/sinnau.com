# Fix Lint Errors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all oxlint errors from `pnpm lint:agent` to get a clean lint pass.

**Architecture:** The errors are mechanical and grouped by file area. We fix them in tasks by layer: service files, guard files, ORPC handlers, test infrastructure, UI components, and utilities. Each task is a focused set of files so the engineer doesn't context-switch wildly.

**Tech Stack:** TypeScript, Oxlint, oRPC, Svelte, Drizzle ORM

---

### Task 1: Fix `study-set.service.ts` and `chapter.service.ts`

**Files:**

- Modify: `src/lib/server/services/study-set/study-set.service.ts`
- Modify: `src/lib/server/services/chapter/chapter.service.ts`

**Errors:**

- `study-set.service.ts` line 45: `promise-function-async` (callback returning Promise)
- `study-set.service.ts` lines 56, 132, 158: `return-await`
- `study-set.service.ts` lines 125, 154: `require-await` (async with no await)
- `chapter.service.ts` line 34: `promise-function-async` (callback returning Promise)
- `chapter.service.ts` lines 48, 109: `return-await`
- `chapter.service.ts` line 105: `require-await` (async with no await)

- [ ] **Step 1: Fix `study-set.service.ts` callback at line 45**

  Change:

  ```ts
  const slug = await generateSlug(input.title, (candidate) =>
    this.repo.isSlugTaken(candidate)
  );
  ```

  To:

  ```ts
  const slug = await generateSlug(input.title, async (candidate) =>
    this.repo.isSlugTaken(candidate)
  );
  ```

- [ ] **Step 2: Fix `study-set.service.ts` return-await at line 56**

  Change:

  ```ts
  return this.repo.insertStudySet({
  ```

  To:

  ```ts
  return await this.repo.insertStudySet({
  ```

- [ ] **Step 3: Fix `study-set.service.ts` return-await at line 132**

  Change:

  ```ts
  return this.repo.findOwnedStudySets(ownerId, orderBy, orderDirection, page);
  ```

  To:

  ```ts
  return await this.repo.findOwnedStudySets(
    ownerId,
    orderBy,
    orderDirection,
    page
  );
  ```

- [ ] **Step 4: Fix `study-set.service.ts` require-await at line 125**

  Change:

  ```ts
  async getStudySets(
  ```

  To:

  ```ts
  getStudySets(
  ```

- [ ] **Step 5: Fix `study-set.service.ts` return-await at line 158**

  Change:

  ```ts
  return this.repo.findRecentVisits(userId, input.count);
  ```

  To:

  ```ts
  return await this.repo.findRecentVisits(userId, input.count);
  ```

- [ ] **Step 6: Fix `study-set.service.ts` require-await at line 154**

  Change:

  ```ts
  async getRecentStudySets(
  ```

  To:

  ```ts
  getRecentStudySets(
  ```

- [ ] **Step 7: Fix `chapter.service.ts` callback at line 34**

  Change:

  ```ts
  const isSlugTakenInStudySet = (candidate: string) =>
    this.repo.isSlugTakenInStudySet(input.studySetId, candidate);
  ```

  To:

  ```ts
  const isSlugTakenInStudySet = async (candidate: string) =>
    this.repo.isSlugTakenInStudySet(input.studySetId, candidate);
  ```

- [ ] **Step 8: Fix `chapter.service.ts` return-await at line 48**

  Change:

  ```ts
  return this.repo.insertChapter({
  ```

  To:

  ```ts
  return await this.repo.insertChapter({
  ```

- [ ] **Step 9: Fix `chapter.service.ts` return-await at line 109**

  Change:

  ```ts
  return this.repo.findChaptersByStudySet(userId, input.studySetId);
  ```

  To:

  ```ts
  return await this.repo.findChaptersByStudySet(userId, input.studySetId);
  ```

- [ ] **Step 10: Fix `chapter.service.ts` require-await at line 105**

  Change:

  ```ts
  async getChaptersByStudySet(
  ```

  To:

  ```ts
  getChaptersByStudySet(
  ```

---

### Task 2: Fix `flashcard.service.ts`, `quiz.service.ts`, `study-set-content.service.ts`

**Files:**

- Modify: `src/lib/server/services/flashcard/flashcard.service.ts`
- Modify: `src/lib/server/services/quiz/quiz.service.ts`
- Modify: `src/lib/server/services/study-set-content/study-set-content.service.ts`

**Errors:**

- `flashcard.service.ts` line 36: `strict-boolean-expressions`
- `flashcard.service.ts` lines 63, 103: `return-await`
- `quiz.service.ts` line 44: `strict-boolean-expressions`
- `quiz.service.ts` lines 114, 138, 165, 291, 299: `return-await`
- `study-set-content.service.ts` lines 119, 135: `return-await`

- [ ] **Step 1: Fix `flashcard.service.ts` strict-boolean-expressions at line 36**

  Change:

  ```ts
  input.flashcards.map((f) => f.chapterId).filter((v): v is string => !!v);
  ```

  To:

  ```ts
  input.flashcards
    .map((f) => f.chapterId)
    .filter((v): v is string => v !== null && v !== undefined);
  ```

- [ ] **Step 2: Fix `flashcard.service.ts` return-await at line 63**

  Change:

  ```ts
  return this.repo.insertFlashcards(rows);
  ```

  To:

  ```ts
  return await this.repo.insertFlashcards(rows);
  ```

- [ ] **Step 3: Fix `flashcard.service.ts` return-await at line 103**

  Change:

  ```ts
  return this.repo.findFlashcardsByStudySet(input.studySetId);
  ```

  To:

  ```ts
  return await this.repo.findFlashcardsByStudySet(input.studySetId);
  ```

- [ ] **Step 4: Fix `quiz.service.ts` strict-boolean-expressions at line 44**

  Change:

  ```ts
  if (input.chapterId) {
  ```

  To:

  ```ts
  if (input.chapterId != null) {
  ```

- [ ] **Step 5: Fix `quiz.service.ts` return-await at line 114**

  Change:

  ```ts
  return this.hydrateQuiz(updated);
  ```

  To:

  ```ts
  return await this.hydrateQuiz(updated);
  ```

- [ ] **Step 6: Fix `quiz.service.ts` return-await at line 138**

  Change:

  ```ts
  quizIds.map(async (id) => this.guard.assertQuizOwnerOrForbidden(id, ownerId));
  ```

  To:

  ```ts
  quizIds.map(
    async (id) => await this.guard.assertQuizOwnerOrForbidden(id, ownerId)
  );
  ```

- [ ] **Step 7: Fix `quiz.service.ts` return-await at line 165**

  Change:

  ```ts
  return this.repo.insertQuizOptions(rows);
  ```

  To:

  ```ts
  return await this.repo.insertQuizOptions(rows);
  ```

- [ ] **Step 8: Fix `quiz.service.ts` return-await at line 291**

  Change:

  ```ts
  return this.repo.findQuizzesByStudySetId(input.studySetId);
  ```

  To:

  ```ts
  return await this.repo.findQuizzesByStudySetId(input.studySetId);
  ```

- [ ] **Step 9: Fix `quiz.service.ts` return-await at line 299**

  Change:

  ```ts
  return this.hydrateQuiz(quizRow);
  ```

  To:

  ```ts
  return await this.hydrateQuiz(quizRow);
  ```

- [ ] **Step 10: Fix `study-set-content.service.ts` return-await at line 119**

  Change:

  ```ts
  return this.repo.findContentsByStudySet(input.studySetId);
  ```

  To:

  ```ts
  return await this.repo.findContentsByStudySet(input.studySetId);
  ```

- [ ] **Step 11: Fix `study-set-content.service.ts` return-await at line 135**

  Change:

  ```ts
  return this.repo.findContentsByChapter(input.chapterId);
  ```

  To:

  ```ts
  return await this.repo.findContentsByChapter(input.chapterId);
  ```

---

### Task 3: Fix `flashcard.guard.ts` and `quiz.guard.ts`

**Files:**

- Modify: `src/lib/server/services/flashcard/flashcard.guard.ts`
- Modify: `src/lib/server/services/quiz/quiz.guard.ts`

**Errors:**

- `flashcard.guard.ts` line 36: `require-await`
- `flashcard.guard.ts` line 40: `return-await`
- `quiz.guard.ts` lines 44, 54: `require-await`
- `quiz.guard.ts` lines 48, 58: `return-await`

- [ ] **Step 1: Fix `flashcard.guard.ts` require-await at line 36**

  Change:

  ```ts
  async assertStudySetVisibleOrNotFound(
  ```

  To:

  ```ts
  assertStudySetVisibleOrNotFound(
  ```

- [ ] **Step 2: Fix `flashcard.guard.ts` return-await at line 40**

  Change:

  ```ts
  return this.resolvedStudySetGuard.assertStudySetVisibleByIdOrNotFound(
  ```

  To:

  ```ts
  return await this.resolvedStudySetGuard.assertStudySetVisibleByIdOrNotFound(
  ```

- [ ] **Step 3: Fix `quiz.guard.ts` require-await at line 44**

  Change:

  ```ts
  async assertStudySetVisibleOrNotFound(
  ```

  To:

  ```ts
  assertStudySetVisibleOrNotFound(
  ```

- [ ] **Step 4: Fix `quiz.guard.ts` return-await at line 48**

  Change:

  ```ts
  return this.resolvedStudySetGuard.assertStudySetVisibleByIdOrNotFound(
  ```

  To:

  ```ts
  return await this.resolvedStudySetGuard.assertStudySetVisibleByIdOrNotFound(
  ```

- [ ] **Step 5: Fix `quiz.guard.ts` require-await at line 54**

  Change:

  ```ts
  async assertChapterOwnerOrForbidden(
  ```

  To:

  ```ts
  assertChapterOwnerOrForbidden(
  ```

- [ ] **Step 6: Fix `quiz.guard.ts` return-await at line 58**

  Change:

  ```ts
  return this.resolvedChapterGuard.assertOwnerOrForbidden(chapterId, ownerId);
  ```

  To:

  ```ts
  return await this.resolvedChapterGuard.assertOwnerOrForbidden(
    chapterId,
    ownerId
  );
  ```

---

### Task 4: Fix ORPC command/query handlers

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
- Modify: `src/lib/server/services/study-set/commands/study-set.create.ts`
- Modify: `src/lib/server/services/study-set/queries/study-set.get.ts`
- Modify: `src/lib/server/services/study-set/queries/study-set.list.ts`
- Modify: `src/lib/server/services/study-set-content/commands/study-set-content.create.ts`
- Modify: `src/lib/server/services/study-set-content/commands/study-set-content.update.ts`
- Modify: `src/lib/server/services/study-set-content/queries/study-set-content.get.ts`
- Modify: `src/lib/server/services/study-set-content/queries/study-set-content.list-by-chapter.ts`
- Modify: `src/lib/server/services/study-set-content/queries/study-set-content.list.ts`

**Pattern:** Every handler must be `async` and must `await` the service call. For handlers already using `async` without `await`, add `await`. For handlers not using `async`, add `async` and `await`.

- [ ] **Step 1: Fix all 4 `chapter/` handlers**

  For each file, change the handler to `async ({ input, context }) => await chapterService...`:
  - `chapter.create.ts`: `.handler(async ({ input, context }) => await chapterService.createChapter(...))`
  - `chapter.update.ts`: `.handler(async ({ input, context }) => await chapterService.updateChapter(...))`
  - `chapter.list.ts`: `.handler(async ({ input, context }) => await chapterService.getChaptersByStudySet(...))`
  - `chapter.get.ts`: `.handler(async ({ input, context }) => await chapterService.getChapter(...))`

- [ ] **Step 2: Fix all 3 `flashcard/` handlers**
  - `flashcard.update.ts`: `.handler(async ({ input, context }) => await flashcardService.updateFlashcard(...))`
  - `flashcard.get.ts`: `.handler(async ({ input, context }) => await flashcardService.getFlashcard(...))`
  - `flashcard.list.ts`: `.handler(async ({ input, context }) => await flashcardService.getFlashcards(...))`

- [ ] **Step 3: Fix all 6 `quiz/` handlers**
  - `quiz.create.ts`: `.handler(async ({ input, context }) => await quizService.createQuiz(...))`
  - `quiz.option-create.ts`: `.handler(async ({ input, context }) => await quizService.createQuizOptions(...))`
  - `quiz.get.ts`: `.handler(async ({ input, context }) => await quizService.getQuiz(...))`
  - `quiz.list.ts`: `.handler(async ({ input, context }) => await quizService.getQuizzes(...))`
  - `quiz.update.ts`: `.handler(async ({ input, context }) => await quizService.updateQuiz(...))`
  - `quiz.option-update.ts`: `.handler(async ({ input, context }) => await quizService.updateQuizOption(...))`

- [ ] **Step 4: Fix all 8 `study-set/` handlers**
  - `study-set.admin-cleanup-visits.ts`: `.handler(async ({ input, context }) => await studySetService.cleanupOldStudySetVisits(...))`
  - `study-set.delete.ts`: `.handler(async ({ input, context }) => await studySetService.deleteStudySet(...))`
  - `study-set.refresh-visit.ts`: `.handler(async ({ input, context }) => await studySetService.refreshStudySetVisit(...))`
  - `study-set.restore.ts`: `.handler(async ({ input, context }) => await studySetService.restoreStudySet(...))`
  - `study-set.update.ts`: `.handler(async ({ input, context }) => await studySetService.updateStudySet(...))`
  - `study-set.get-recent.ts`: `.handler(async ({ input, context }) => await studySetService.getRecentStudySets(...))`
  - `study-set.create.ts`: `.handler(async ({ input, context }) => await studySetService.createStudySet(...))`
  - `study-set.get.ts`: `.handler(async ({ input, context }) => await studySetService.getStudySet(...))`
  - `study-set.list.ts`: `.handler(async ({ input, context }) => await studySetService.getStudySets(...))`

- [ ] **Step 5: Fix all 5 `study-set-content/` handlers**
  - `study-set-content.create.ts`: `.handler(async ({ input, context }) => await studySetContentService.createContent(...))`
  - `study-set-content.update.ts`: `.handler(async ({ input, context }) => await studySetContentService.updateContent(...))`
  - `study-set-content.get.ts`: `.handler(async ({ input, context }) => await studySetContentService.getContent(...))`
  - `study-set-content.list.ts`: `.handler(async ({ input, context }) => await studySetContentService.listContentsByStudySet(...))`
  - `study-set-content.list-by-chapter.ts`: `.handler(async ({ input, context }) => await studySetContentService.listContentsByChapter(...))`

---

### Task 5: Fix `promise-function-async` in testing and infrastructure files

**Files:**

- Modify: `src/lib/server/infras/db/testing.ts`
- Modify: `src/hooks.server.ts`
- Modify: `src/lib/server/services/study-set/study-set.testing.ts`
- Modify: `src/lib/server/services/quiz/quiz.testing.ts`
- Modify: `src/lib/server/services/study-set-content/study-set-content.testing.ts`
- Modify: `src/lib/server/services/chapter/chapter.repository.drizzle.test.ts`
- Modify: `src/lib/server/services/flashcard/flashcard.repository.drizzle.test.ts`
- Modify: `src/lib/server/services/quiz/quiz.repository.drizzle.test.ts`
- Modify: `src/lib/server/services/study-set/study-set.repository.drizzle.test.ts`
- Modify: `src/lib/server/services/study-set-content/study-set-content.repository.drizzle.test.ts`

- [ ] **Step 1: Fix `sleep` in `db/testing.ts` (line 7)**

  Change:

  ```ts
  export const sleep = (ms: number): Promise<void> => nodeSetTimeout(ms);
  ```

  To:

  ```ts
  export const sleep = async (ms: number): Promise<void> => nodeSetTimeout(ms);
  ```

- [ ] **Step 2: Fix `authGuardHandle` in `hooks.server.ts` (line 28)**

  Change:

  ```ts
  const authGuardHandle: Handle = ({ event, resolve }) => {
  ```

  To:

  ```ts
  const authGuardHandle: Handle = async ({ event, resolve }) => {
  ```

  Also change `return resolve(event);` to `return await resolve(event);` on line 37.

- [ ] **Step 3: Fix `seedStudySet` in `study-set.testing.ts` (line 120)**

  Change:

  ```ts
  seedStudySet(overrides: Partial<StudySet> = {}): Promise<StudySet> {
    const id = overrides.id ?? generateId(STUDY_SET_ID_PREFIX);
    return this.repo.insertStudySet({
      ...
    });
  }
  ```

  To:

  ```ts
  async seedStudySet(overrides: Partial<StudySet> = {}): Promise<StudySet> {
    const id = overrides.id ?? generateId(STUDY_SET_ID_PREFIX);
    return await this.repo.insertStudySet({
      ...
    });
  }
  ```

- [ ] **Step 4: Fix `seedStudySet` in `quiz.testing.ts` (line 150)**

  Change:

  ```ts
  seedStudySet(overrides: SeedStudySetOptions = {}): Promise<StudySet> {
    const id = overrides.id ?? generateId(STUDY_SET_ID_PREFIX);
    this.db.insert(studySet).values({...}).run();
    const [row] = this.db.select().from(studySet).where(eq(studySet.id, id)).all();
    if (!row) {
      throw new Error("Failed to seed study set");
    }
    return Promise.resolve(row);
  }
  ```

  To:

  ```ts
  async seedStudySet(overrides: SeedStudySetOptions = {}): Promise<StudySet> {
    const id = overrides.id ?? generateId(STUDY_SET_ID_PREFIX);
    this.db.insert(studySet).values({...}).run();
    const [row] = this.db.select().from(studySet).where(eq(studySet.id, id)).all();
    if (!row) {
      throw new Error("Failed to seed study set");
    }
    return row;
  }
  ```

- [ ] **Step 5: Fix `seedContent` in `study-set-content.testing.ts` (line 205)**

  Change:

  ```ts
  seedContent(
    overrides: Partial<StudySetContent> = {}
  ): Promise<StudySetContent> {
    return this.repo.insertContent({...});
  }
  ```

  To:

  ```ts
  async seedContent(
    overrides: Partial<StudySetContent> = {}
  ): Promise<StudySetContent> {
    return await this.repo.insertContent({...});
  }
  ```

- [ ] **Step 6: Fix arrow functions in `chapter.repository.drizzle.test.ts`**
  - Line 399: `const insertDuplicate = () => env.repo.insertChapter({...});` -> `const insertDuplicate = async () => env.repo.insertChapter({...});`
  - Line 442: `const insertOrphan = () => env.repo.insertChapter({...});` -> `const insertOrphan = async () => env.repo.insertChapter({...});`
  - Line 458: `const insertOrphan = () => env.repo.insertChapter({...});` -> `const insertOrphan = async () => env.repo.insertChapter({...});`

- [ ] **Step 7: Fix arrow functions in `flashcard.repository.drizzle.test.ts`**
  - Line 244: `const insertOrphan = () => env.repo.insertFlashcards([...]);` -> `const insertOrphan = async () => env.repo.insertFlashcards([...]);`
  - Line 265: Same pattern
  - Line 286: Same pattern

- [ ] **Step 8: Fix arrow functions in `quiz.repository.drizzle.test.ts`**
  - Line 577: `const insertOrphan = () => env.repo.insertQuiz({...}, []);` -> `const insertOrphan = async () => env.repo.insertQuiz({...}, []);`
  - Line 597: Same pattern
  - Line 616: Same pattern

- [ ] **Step 9: Fix arrow functions in `study-set.repository.drizzle.test.ts`**
  - Line 622: `const insertDuplicate = () => env.repo.insertStudySet({...});` -> `const insertDuplicate = async () => env.repo.insertStudySet({...});`
  - Line 641: `const insertOrphan = () => env.repo.insertStudySet({...});` -> `const insertOrphan = async () => env.repo.insertStudySet({...});`

- [ ] **Step 10: Fix arrow function in `study-set-content.repository.drizzle.test.ts`**
  - Line 369: `const insertOrphan = () => env.repo.insertContent({...});` -> `const insertOrphan = async () => env.repo.insertContent({...});`

---

### Task 6: Fix `return-await` in `hooks.server.ts` and test files

**Files:**

- Modify: `src/hooks.server.ts`
- Modify: `src/lib/server/services/study-set/study-set.service.test.ts`
- Modify: `src/lib/server/services/quiz/quiz.testing.ts`

- [ ] **Step 1: Fix `hooks.server.ts` return-await at line 21**

  Change:

  ```ts
  return svelteKitHandler({ auth, building, event, resolve });
  ```

  To:

  ```ts
  return await svelteKitHandler({ auth, building, event, resolve });
  ```

- [ ] **Step 2: Fix `hooks.server.ts` return-await at line 37**

  (This was already done in Task 5 Step 2 as part of making `authGuardHandle` async.)

- [ ] **Step 3: Fix `study-set.service.test.ts` return-await at line 42**

  Change:

  ```ts
  repo.upsertVisit.mockImplementation(
    // oxlint-disable-next-line require-await
    async (userId, studySetId, visitedAt) =>
      Promise.resolve({
        id: generateId(STUDY_SET_VISIT_ID_PREFIX),
        studySetId,
        userId,
        visitedAt: new Date(visitedAt),
      }) satisfies Promise<StudySetVisit>
  );
  ```

  To:

  ```ts
  repo.upsertVisit.mockImplementation(
    (userId, studySetId, visitedAt) =>
      Promise.resolve({
        id: generateId(STUDY_SET_VISIT_ID_PREFIX),
        studySetId,
        userId,
        visitedAt: new Date(visitedAt),
      }) satisfies Promise<StudySetVisit>
  );
  ```

  Remove the `// oxlint-disable-next-line require-await` comment since there's no longer `async`.

- [ ] **Step 4: Fix `quiz.testing.ts` return-await at line 219**

  Change:

  ```ts
  return this.repo.insertQuiz(
    {
      chapterId: overrides.chapterId ?? null,
      id,
      ownerId: overrides.ownerId ?? this.ownerId,
      questionText: overrides.questionText ?? "Seeded question?",
      studySetId,
      type: overrides.type ?? "MULTIPLE_CHOICE",
    },
    []
  );
  ```

  To:

  ```ts
  return await this.repo.insertQuiz(
    {
      chapterId: overrides.chapterId ?? null,
      id,
      ownerId: overrides.ownerId ?? this.ownerId,
      questionText: overrides.questionText ?? "Seeded question?",
      studySetId,
      type: overrides.type ?? "MULTIPLE_CHOICE",
    },
    []
  );
  ```

---

### Task 7: Fix `no-unnecessary-type-conversion` and repository type assertions

**Files:**

- Modify: `src/lib/server/services/study-set/study-set.repository.drizzle.ts`
- Modify: `src/lib/server/services/chapter/chapter.repository.drizzle.ts`

- [ ] **Step 1: Fix `study-set.repository.drizzle.ts` line 226**

  Change:

  ```ts
  const total = Number(totalRow[0]?.count ?? 0);
  ```

  To:

  ```ts
  const total = totalRow[0]?.count ?? 0;
  ```

- [ ] **Step 2: Fix `study-set.repository.drizzle.ts` `findRecentVisits` query (around line 325)**

  In the `findRecentVisits` method, add `deletedAt: studySet.deletedAt` to the `.select()` call so the returned rows match the `StudySet` type. Then remove the `as StudySet[]` cast on line 343.

  Change:

  ```ts
  .select({
    createdAt: studySet.createdAt,
    description: studySet.description,
    files: studySet.files,
    id: studySet.id,
    ownerId: studySet.ownerId,
    slug: studySet.slug,
    title: studySet.title,
    updatedAt: studySet.updatedAt,
    visibility: studySet.visibility,
  })
  ```

  To:

  ```ts
  .select({
    createdAt: studySet.createdAt,
    deletedAt: studySet.deletedAt,
    description: studySet.description,
    files: studySet.files,
    id: studySet.id,
    ownerId: studySet.ownerId,
    slug: studySet.slug,
    title: studySet.title,
    updatedAt: studySet.updatedAt,
    visibility: studySet.visibility,
  })
  ```

  And change:

  ```ts
  return rows as StudySet[];
  ```

  To:

  ```ts
  return rows;
  ```

- [ ] **Step 3: Fix `chapter.repository.drizzle.ts` line 174**

  Change:

  ```ts
  return Number(row?.count ?? 0);
  ```

  To:

  ```ts
  return row?.count ?? 0;
  ```

---

### Task 8: Fix `strict-boolean-expressions` and `prefer-nullish-coalescing`

**Files:**

- Modify: `src/lib/server/services/quiz/quiz.testing.ts`
- Modify: `src/lib/server/services/study-set-content/study-set-content.repository.drizzle.ts`
- Modify: `src/lib/hooks/auth.svelte.ts`
- Modify: `src/lib/components/ui/data-table/data-table.svelte.ts`

- [ ] **Step 1: Fix `quiz.testing.ts` strict-boolean-expressions at line 179**

  Change:

  ```ts
  if (studySetId) {
  ```

  To:

  ```ts
  if (studySetId != null) {
  ```

- [ ] **Step 2: Fix `study-set-content.repository.drizzle.ts` strict-boolean-expressions at line 336**

  Change:

  ```ts
  if (row.chapterId) {
  ```

  To:

  ```ts
  if (row.chapterId != null) {
  ```

- [ ] **Step 3: Fix `auth.svelte.ts` prefer-nullish-coalescing at line 34**

  Change:

  ```ts
  return user || initialUser;
  ```

  To:

  ```ts
  return user ?? initialUser;
  ```

- [ ] **Step 4: Fix `data-table.svelte.ts` prefer-nullish-coalescing at line 140**

  Change:

  ```ts
  state: mergeObjects(state, options.state || {}),
  ```

  To:

  ```ts
  state: mergeObjects(state, options.state ?? {}),
  ```

---

### Task 9: Fix `no-confusing-void-expression` and `prefer-readonly`

**Files:**

- Modify: `src/lib/components/ui/sidebar/context.svelte.ts`

- [ ] **Step 1: Fix `no-confusing-void-expression` at line 56**

  Change:

  ```ts
  toggle = () =>
    this.#isMobile.current
      ? (this.openMobile = !this.openMobile)
      : this.setOpen(!this.open);
  ```

  To:

  ```ts
  toggle = () => {
    this.#isMobile.current
      ? (this.openMobile = !this.openMobile)
      : this.setOpen(!this.open);
  };
  ```

- [ ] **Step 2: Fix `prefer-readonly` at line 29**

  Change:

  ```ts
  #isMobile: IsMobile;
  ```

  To:

  ```ts
  readonly #isMobile: IsMobile;
  ```

---

### Task 10: Fix `unbound-method` and `no-unsafe-type-assertion` in `orpc.server.ts`

**Files:**

- Modify: `src/lib/orpc.server.ts`

- [ ] **Step 1: Fix `unbound-method` at line 20**

  Change:

  ```ts
  async ({ next }) => {
    try {
      return await next();
    }
  ```

  To:

  ```ts
  async (context) => {
    try {
      return await context.next();
    }
  ```

  This avoids destructuring the unbound `next` method and calls it via dot notation so `this` is bound correctly.

- [ ] **Step 2: Fix `no-unsafe-type-assertion` at lines 27 and 28**

  Change:

  ```ts
  error(e.status, {
    code: e.code as string,
    data: e.data as unknown,
    message: e.message,
  });
  ```

  To:

  ```ts
  error(e.status, {
    code: e.code,
    data: e.data,
    message: e.message,
  });
  ```

  `e.code` is already `string` and `e.data` is already `unknown` for `ORPCError`.

---

### Task 11: Fix `no-unsafe-type-assertion` in test files

**Files:**

- Modify: `src/lib/server/services/chapter/chapter.service.test.ts`
- Modify: `src/lib/server/services/flashcard/flashcard.guard.test.ts`
- Modify: `src/lib/server/services/flashcard/flashcard.service.test.ts`
- Modify: `src/lib/server/services/quiz/quiz.guard.test.ts`
- Modify: `src/lib/server/services/quiz/quiz.service.test.ts`
- Modify: `src/lib/server/services/study-set/study-set.service.test.ts`
- Modify: `src/lib/server/services/study-set/study-set.utils.ts`
- Modify: `src/lib/server/services/study-set-content/study-set-content.service.test.ts`
- Modify: `src/lib/server/infras/slug.test.ts`

- [ ] **Step 1: Fix `chapter.service.test.ts` line 33**

  Change:

  ```ts
  const service = new ChapterService(repo, guard as unknown as ChapterGuard);
  ```

  To:

  ```ts
  const service = new ChapterService(repo, guard);
  ```

- [ ] **Step 2: Fix `flashcard.guard.test.ts` line 27**

  Change:

  ```ts
  const guard = new FlashcardGuard(
    flashcardRepo,
    studySet as unknown as StudySetGuard
  );
  ```

  To:

  ```ts
  const guard = new FlashcardGuard(flashcardRepo, studySet);
  ```

- [ ] **Step 3: Fix `flashcard.guard.test.ts` lines 380, 396, 408**

  Replace the `as PartialForbiddenError` pattern with `toMatchObject`:

  Change:

  ```ts
  const err = (await guard
    .assertFlashcardsAllOwnedOrThrow(["a", "b", "c"], "owner-1")
    .catch((error: unknown) => error)) as PartialForbiddenError;
  expect(err).toBeInstanceOf(ORPCError);
  expect(err.code).toBe("PARTIAL_FORBIDDEN");
  expect(err.data).toEqual({ ids: ["b", "c"] });
  ```

  To:

  ```ts
  const err = await guard
    .assertFlashcardsAllOwnedOrThrow(["a", "b", "c"], "owner-1")
    .catch((error: unknown) => error);
  expect(err).toBeInstanceOf(ORPCError);
  expect(err).toMatchObject({
    code: "PARTIAL_FORBIDDEN",
    data: { ids: ["b", "c"] },
  });
  ```

  Apply the same pattern to the other two occurrences (lines 396 and 408).

- [ ] **Step 4: Fix `flashcard.service.test.ts` line 57**

  Change:

  ```ts
  const service = new FlashcardService(
    repo,
    guard as unknown as FlashcardGuard
  );
  ```

  To:

  ```ts
  const service = new FlashcardService(repo, guard);
  ```

- [ ] **Step 5: Fix `quiz.guard.test.ts` lines 52, 53**

  Change:

  ```ts
  const guard = new QuizGuard(
    repo,
    studySetGuard as unknown as StudySetGuard,
    chapterGuard as unknown as ChapterGuard
  );
  ```

  To:

  ```ts
  const guard = new QuizGuard(repo, studySetGuard, chapterGuard);
  ```

- [ ] **Step 6: Fix `quiz.guard.test.ts` inline objects with `as unknown as StudySet` / `as unknown as Chapter`**

  Replace inline objects with fixture factories:
  - Line 62: `const set = { id: "set-1", ownerId: "owner-1", visibility: "PUBLIC" } as unknown as StudySet;` -> `const set = createStudySetFixture({ id: "set-1", ownerId: "owner-1", visibility: "PUBLIC" });`
  - Line 104: `const set = { id: "set-1" } as unknown as StudySet;` -> `const set = createStudySetFixture({ id: "set-1" });`
  - Line 121: `const ch = { id: "ch-1" } as unknown as Chapter;` -> `const ch = createChapterFixture({ id: "ch-1" });`
  - Line 141: `const ch = { id: "ch-1", ownerId: "owner-1", studySetId: "set-1" } as unknown as Chapter;` -> `const ch = createChapterFixture({ id: "ch-1", ownerId: "owner-1", studySetId: "set-1" });`
  - Line 179: `repo.findChapterById.mockResolvedValue({ id: "ch-1", ownerId: "owner-1", studySetId: "set-2" } as unknown as Chapter);` -> `repo.findChapterById.mockResolvedValue(createChapterFixture({ id: "ch-1", ownerId: "owner-1", studySetId: "set-2" }));`
  - Line 202: `repo.findChapterById.mockResolvedValue({ id: "ch-1", ownerId: "someone-else", studySetId: "set-1" } as unknown as Chapter);` -> `repo.findChapterById.mockResolvedValue(createChapterFixture({ id: "ch-1", ownerId: "someone-else", studySetId: "set-1" }));`
  - Line 380: `studySetGuard.assertStudySetVisibleByIdOrNotFound.mockResolvedValue({ id: "set-1", ownerId: "owner-1", visibility: "PRIVATE" } as unknown as StudySet);` -> `studySetGuard.assertStudySetVisibleByIdOrNotFound.mockResolvedValue(createStudySetFixture({ id: "set-1", ownerId: "owner-1", visibility: "PRIVATE" }));`
  - Line 403: `studySetGuard.assertStudySetVisibleByIdOrNotFound.mockResolvedValue({ id: "set-1", ownerId: "owner-1", visibility: "PUBLIC" } as unknown as StudySet);` -> `studySetGuard.assertStudySetVisibleByIdOrNotFound.mockResolvedValue(createStudySetFixture({ id: "set-1", ownerId: "owner-1", visibility: "PUBLIC" }));`

  **Note:** `quiz.guard.test.ts` does not import `createStudySetFixture` or `createChapterFixture`. Add imports:

  ```ts
  import { createStudySetFixture } from "../study-set/study-set.testing.ts";
  import { createChapterFixture } from "../chapter/chapter.testing.ts";
  ```

- [ ] **Step 7: Fix `quiz.guard.test.ts` `as never` casts (lines 332, 333, 350)**

  Replace `as never` with `createQuizOptionFixture`:
  - Line 332: `{ id: "o-1", quizId: "q-1" } as never` -> `createQuizOptionFixture({ id: "o-1", quizId: "q-1" })`
  - Line 333: `{ id: "o-2", quizId: "q-1" } as never` -> `createQuizOptionFixture({ id: "o-2", quizId: "q-1" })`
  - Line 350: `{ id: "o-1" } as never` -> `createQuizOptionFixture({ id: "o-1" })`

  **Note:** `quiz.guard.test.ts` already imports `createQuizOptionFixture` from `./quiz.testing.ts`.

- [ ] **Step 8: Fix `quiz.service.test.ts` line 106**

  Change:

  ```ts
  const service = new QuizService(repo, guard as unknown as QuizGuard);
  ```

  To:

  ```ts
  const service = new QuizService(repo, guard);
  ```

- [ ] **Step 9: Fix `study-set.service.test.ts` line 58**

  Change:

  ```ts
  const service = new StudySetService(repo, guard as unknown as StudySetGuard);
  ```

  To:

  ```ts
  const service = new StudySetService(repo, guard);
  ```

- [ ] **Step 10: Fix `study-set.utils.ts` line 20**

  Change:

  ```ts
  visibility: (i % 5 === 0 ? "PRIVATE" : "PUBLIC") as StudySetVisibility,
  ```

  To:

  ```ts
  visibility: i % 5 === 0 ? "PRIVATE" : "PUBLIC",
  ```

- [ ] **Step 11: Fix `study-set-content.service.test.ts` line 45**

  Change:

  ```ts
  const service = new StudySetContentService(
    repo,
    guard as unknown as StudySetContentGuard
  );
  ```

  To:

  ```ts
  const service = new StudySetContentService(repo, guard);
  ```

- [ ] **Step 12: Fix `slug.test.ts` line 105**

  Change:

  ```ts
  const candidate = exists.mock.calls[0]?.[0] as string;
  ```

  To:

  ```ts
  const candidate = exists.mock.calls[0]?.[0]!;
  ```

---

### Task 12: Fix UI component type assertions

**Files:**

- Modify: `src/lib/components/ui/chart/chart-utils.ts`
- Modify: `src/lib/components/ui/data-table/data-table.svelte.ts`
- Modify: `src/lib/components/ui/data-table/render-helpers.ts`

- [ ] **Step 1: Fix `chart-utils.ts` type assertions**

  For the `no-unsafe-type-assertion` errors on lines 40, 42, 46, 48, add `// oxlint-disable-next-line no-unsafe-type-assertion` before each cast.

  For the `no-unnecessary-type-assertion` errors on lines 55 and 60, remove the unnecessary casts:
  - Line 55: Remove `as string` from `data[key] as string`
  - Line 60: Remove `as keyof typeof config` from `config[key as keyof typeof config]`

- [ ] **Step 2: Fix `data-table.svelte.ts` `findSourceWithKey` and `getOwnPropertyDescriptor`**

  Change `findSourceWithKey` to add an explicit return at the end:

  ```ts
  const findSourceWithKey = (key: PropertyKey) => {
    for (let i = sources.length - 1; i >= 0; i -= 1) {
      const obj = resolveThunk(sources[i]);
      if (obj && key in obj) {
        return obj;
      }
    }
    return undefined;
  };
  ```

  Change `getOwnPropertyDescriptor` to return `undefined` explicitly:

  ```ts
  getOwnPropertyDescriptor(_, key) {
    const src = findSourceWithKey(key);
    if (!src) {
      return undefined;
    }
    return {
      configurable: true,
      enumerable: true,
      value: (src as any)[key],
      writable: true,
    };
  },
  ```

  Change `ownKeys` to remove the unnecessary cast:

  ```ts
  for (const k of Reflect.ownKeys(obj)) {
  ```

  Add `no-unsafe-type-assertion` and `strict-boolean-expressions` to the `// oxlint-disable` block:

  ```ts
  // oxlint-disable no-unsafe-assignment, no-unsafe-return, no-unsafe-member-access, no-unsafe-argument, no-unsafe-call, no-unsafe-type-assertion, strict-boolean-expressions
  ```

- [ ] **Step 3: Fix `render-helpers.ts` type assertions**

  Add `// oxlint-disable-next-line no-unsafe-type-assertion` before:
  - Line 60: `props: Props = {} as Props`
  - Line 91: `params: TProps = {} as TProps`

---

### Task 13: Run lint and verify

- [ ] **Step 1: Run `pnpm lint:agent`**

  Run: `pnpm lint:agent`
  Expected: Zero errors.

- [ ] **Step 2: Fix any remaining errors**

  If any errors remain, read the output and fix them with the same patterns.

- [ ] **Step 3: Run `pnpm run check:agent`**

  Run: `pnpm run check:agent`
  Expected: Pass without errors.
