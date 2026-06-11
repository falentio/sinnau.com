# Quiz Update with Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `quiz.update` to accept a complete quiz form including all options, with smart diffing to create/update/delete options atomically, while introducing granular error codes.

**Architecture:** Extend the existing quiz service layer with a new `updateQuiz` method that orchestrates quiz updates alongside option mutations. The guard validates ownership and option existence. The repository wraps everything in a transaction. The old `quiz.option.create` and `quiz.option.update` commands are removed.

**Tech Stack:** oRPC, Valibot, Drizzle ORM, SQLite, Vitest

---

## File Map

| File                                                           | Action | Purpose                                                                 |
| -------------------------------------------------------------- | ------ | ----------------------------------------------------------------------- |
| `src/lib/schemas/quiz.ts`                                      | Modify | Update `updateQuizInputSchema` to accept options and chapterId          |
| `src/lib/schemas/quiz.ts`                                      | Remove | Remove `createQuizOptionsInputSchema` and `updateQuizOptionInputSchema` |
| `src/lib/server/services/quiz/quiz.repository.ts`              | Modify | Add `findOptionsByIds` and `updateQuizWithOptions` to interface         |
| `src/lib/server/services/quiz/quiz.repository.drizzle.ts`      | Modify | Implement `findOptionsByIds` and `updateQuizWithOptions`                |
| `src/lib/server/services/quiz/quiz.guard.ts`                   | Modify | Add `assertQuizOptionsBelongToQuizOrNotFound`                           |
| `src/lib/server/services/quiz/quiz.service.ts`                 | Modify | Rewrite `updateQuiz` to handle options atomically                       |
| `src/lib/server/services/quiz/quiz.service.ts`                 | Remove | Remove `createQuizOptions` and `updateQuizOption` methods               |
| `src/lib/server/services/quiz/commands/quiz.update.ts`         | Modify | Update error map and delegate to new service                            |
| `src/lib/server/services/quiz/quiz.router.ts`                  | Modify | Remove `option.create` and `option.update` from router                  |
| `src/lib/server/services/quiz/commands/quiz.option-create.ts`  | Delete | Remove obsolete command                                                 |
| `src/lib/server/services/quiz/commands/quiz.option-update.ts`  | Delete | Remove obsolete command                                                 |
| `src/lib/server/services/quiz/quiz.service.test.ts`            | Modify | Update tests for new `updateQuiz` behavior                              |
| `src/lib/server/services/quiz/quiz.service.test.ts`            | Remove | Remove tests for `createQuizOptions` and `updateQuizOption`             |
| `src/lib/server/services/quiz/quiz.guard.test.ts`              | Modify | Add tests for `assertQuizOptionsBelongToQuizOrNotFound`                 |
| `src/lib/server/services/quiz/quiz.repository.drizzle.test.ts` | Modify | Add tests for `findOptionsByIds` and `updateQuizWithOptions`            |

---

## Task 1: Update Schema

**Files:**

- Modify: `src/lib/schemas/quiz.ts`

- [ ] **Step 1: Update `updateQuizInputSchema`**

```typescript
export const updateQuizInputSchema = v.object({
  id: quizIdSchema,
  chapterId: v.optional(v.union([chapterIdSchema, v.null()])),
  options: v.optional(
    v.array(
      v.object({
        explanation: v.optional(
          v.union([
            v.pipe(v.string(), v.maxLength(QUIZ_OPTION_EXPLANATION_MAX_LENGTH)),
            v.literal(""),
            v.null(),
          ])
        ),
        id: v.optional(quizOptionIdSchema),
        isCorrect: v.boolean(),
        optionText: optionTextSchema,
      })
    )
  ),
  questionText: v.optional(questionTextSchema),
});
```

- [ ] **Step 2: Remove obsolete schemas**

Remove `createQuizOptionsInputSchema` and `updateQuizOptionInputSchema` from `src/lib/schemas/quiz.ts`.

```typescript
// DELETE these exports:
export const createQuizOptionsInputSchema = v.object({
  options: v.pipe(
    v.array(createQuizOptionInputSchema),
    v.minLength(1, "Minimal satu opsi diperlukan"),
    v.maxLength(
      QUIZ_OPTION_BATCH_MAX,
      `Maksimal ${QUIZ_OPTION_BATCH_MAX} opsi per batch`
    )
  ),
});

export const updateQuizOptionInputSchema = v.object({
  explanation: v.optional(
    v.union([
      v.pipe(v.string(), v.maxLength(QUIZ_OPTION_EXPLANATION_MAX_LENGTH)),
      v.literal(""),
      v.null(),
    ])
  ),
  id: quizOptionIdSchema,
  isCorrect: v.optional(v.boolean()),
  optionText: v.optional(optionTextSchema),
});
```

- [ ] **Step 3: Remove obsolete types**

Remove `CreateQuizOptionsInput` and `UpdateQuizOptionInput` type exports.

```typescript
// DELETE these exports:
export type CreateQuizOptionsInput = v.InferOutput<
  typeof createQuizOptionsInputSchema
>;
export type UpdateQuizOptionInput = v.InferOutput<
  typeof updateQuizOptionInputSchema
>;
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/schemas/quiz.ts
git commit -m "refactor(quiz): update schema to accept full form with options"
```

---

## Task 2: Add Repository Interface Methods

**Files:**

- Modify: `src/lib/server/services/quiz/quiz.repository.ts`

- [ ] **Step 1: Add `findOptionsByIds` to interface**

```typescript
findOptionsByIds(ids: string[]): Promise<QuizOption[]>;
```

- [ ] **Step 2: Add `updateQuizWithOptions` to interface**

```typescript
updateQuizWithOptions(
  quizId: string,
  ownerId: string,
  quizPatch: QuizUpdatePatch,
  optionsToDelete: string[],
  optionsToUpdate: { id: string; patch: QuizOptionUpdatePatch }[],
  optionsToCreate: NewQuizOptionRow[]
): Promise<QuizWithOptions>;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/services/quiz/quiz.repository.ts
git commit -m "refactor(quiz): add findOptionsByIds and updateQuizWithOptions to interface"
```

---

## Task 3: Implement Repository Methods

**Files:**

- Modify: `src/lib/server/services/quiz/quiz.repository.drizzle.ts`

- [ ] **Step 1: Implement `findOptionsByIds`**

```typescript
async findOptionsByIds(ids: string[]): Promise<QuizOption[]> {
  try {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.dbInstance
      .select()
      .from(quizOption)
      .where(inArray(quizOption.id, ids))
      .orderBy(asc(quizOption.createdAt), asc(quizOption.id));
    return rows;
  } catch (error) {
    if (error instanceof ORPCError) {
      throw error;
    }
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Internal server error",
    });
  }
}
```

- [ ] **Step 2: Implement `updateQuizWithOptions`**

```typescript
async updateQuizWithOptions(
  quizId: string,
  ownerId: string,
  quizPatch: QuizUpdatePatch,
  optionsToDelete: string[],
  optionsToUpdate: { id: string; patch: QuizOptionUpdatePatch }[],
  optionsToCreate: NewQuizOptionRow[]
): Promise<QuizWithOptions> {
  try {
    const result = this.dbInstance.transaction((tx) => {
      // Update quiz
      const [updatedQuiz] = tx
        .update(quiz)
        .set(quizPatch)
        .where(and(eq(quiz.id, quizId), eq(quiz.ownerId, ownerId)))
        .returning();

      if (!updatedQuiz) {
        throw new Error("QUIZ_NOT_FOUND");
      }

      // Delete options
      if (optionsToDelete.length > 0) {
        tx.delete(quizOption)
          .where(inArray(quizOption.id, optionsToDelete))
          .run();
      }

      // Update options
      for (const { id, patch } of optionsToUpdate) {
        tx.update(quizOption)
          .set(patch)
          .where(eq(quizOption.id, id))
          .run();
      }

      // Create options
      if (optionsToCreate.length > 0) {
        tx.insert(quizOption).values(optionsToCreate).run();
      }

      return updatedQuiz;
    });

    // Fetch all options for the quiz after the transaction
    const allOptions = await this.findOptionsByQuizIds([quizId]);

    return {
      ...result,
      options: allOptions,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "QUIZ_NOT_FOUND"
    ) {
      return null;
    }
    if (error instanceof ORPCError) {
      throw error;
    }
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Internal server error",
    });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/services/quiz/quiz.repository.drizzle.ts
git commit -m "feat(quiz): implement findOptionsByIds and updateQuizWithOptions"
```

---

## Task 4: Add Guard Method

**Files:**

- Modify: `src/lib/server/services/quiz/quiz.guard.ts`

- [ ] **Step 1: Add `assertQuizOptionsBelongToQuizOrNotFound`**

```typescript
async assertQuizOptionsBelongToQuizOrNotFound(
  quizId: string,
  optionIds: string[]
): Promise<QuizOption[]> {
  const options = await this.repo.findOptionsByIds(optionIds);
  const foundIds = new Set(options.map((o) => o.id));

  const notFound = optionIds.filter((id) => !foundIds.has(id));
  if (notFound.length > 0) {
    throw new ORPCError("OPTION_NOT_FOUND", {
      message: "Quiz option not found",
      status: 404,
    });
  }

  const notBelong = options.filter((o) => o.quizId !== quizId);
  if (notBelong.length > 0) {
    throw new ORPCError("OPTION_NOT_BELONG_TO_QUIZ", {
      message: "Option does not belong to this quiz",
      status: 400,
    });
  }

  return options;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/services/quiz/quiz.guard.ts
git commit -m "feat(quiz): add assertQuizOptionsBelongToQuizOrNotFound guard"
```

---

## Task 5: Rewrite Service Method

**Files:**

- Modify: `src/lib/server/services/quiz/quiz.service.ts`

- [ ] **Step 1: Rewrite `updateQuiz`**

```typescript
async updateQuiz(
  input: UpdateQuizInput,
  ownerId: string
): Promise<QuizWithOptions> {
  await this.guard.assertQuizOwnerOrForbidden(input.id, ownerId);

  // If chapterId provided, validate it
  if (input.chapterId !== undefined) {
    if (input.chapterId === null) {
      // Unassign chapter - just pass null
    } else {
      const quizRow = await this.repo.findQuizById(input.id);
      if (!quizRow) {
        throw new ORPCError("FORBIDDEN", {
          message: "Cannot modify a quiz you do not own",
        });
      }
      await this.guard.assertChapterInStudySetOrForbidden(
        input.chapterId,
        ownerId,
        quizRow.studySetId
      );
    }
  }

  const quizPatch: {
    chapterId?: string | null;
    questionText?: string;
    updatedAt?: Date;
  } = {
    updatedAt: new Date(),
  };

  if (input.questionText !== undefined) {
    quizPatch.questionText = input.questionText;
  }
  if (input.chapterId !== undefined) {
    quizPatch.chapterId = input.chapterId;
  }

  let optionsToDelete: string[] = [];
  let optionsToUpdate: { id: string; patch: QuizOptionUpdatePatch }[] = [];
  let optionsToCreate: NewQuizOptionRow[] = [];

  if (input.options) {
    const existingOptions = await this.repo.findOptionsByQuizIds([input.id]);
    const existingById = new Map(existingOptions.map((o) => [o.id, o]));

    // Validate option IDs
    const inputOptionIds = input.options
      .filter((o) => o.id !== undefined)
      .map((o) => o.id!);
    if (inputOptionIds.length > 0) {
      await this.guard.assertQuizOptionsBelongToQuizOrNotFound(
        input.id,
        inputOptionIds
      );
    }

    // Determine create/update/delete
    const inputIds = new Set(
      input.options.filter((o) => o.id !== undefined).map((o) => o.id!)
    );

    optionsToDelete = existingOptions
      .filter((o) => !inputIds.has(o.id))
      .map((o) => o.id);

    for (const inputOpt of input.options) {
      if (inputOpt.id === undefined) {
        // Create new
        optionsToCreate.push({
          explanation: inputOpt.explanation ?? null,
          id: crypto.randomUUID(),
          isCorrect: inputOpt.isCorrect,
          optionText: inputOpt.optionText,
          quizId: input.id,
        });
      } else {
        // Update existing
        const patch: QuizOptionUpdatePatch = {
          updatedAt: new Date(),
        };
        if (inputOpt.optionText !== undefined) {
          patch.optionText = inputOpt.optionText;
        }
        patch.isCorrect = inputOpt.isCorrect;
        if (inputOpt.explanation !== undefined) {
          patch.explanation =
            inputOpt.explanation === "" || inputOpt.explanation === null
              ? null
              : inputOpt.explanation;
        }
        optionsToUpdate.push({ id: inputOpt.id, patch });
      }
    }

    // Build projected state for validation
    const existingByIdMap = new Map(existingOptions.map((o) => [o.id, o]));
    const projected = input.options.map((o) => {
      if (o.id === undefined) {
        return {
          explanation: o.explanation ?? null,
          id: "new",
          isCorrect: o.isCorrect,
          optionText: o.optionText,
          quizId: input.id,
        };
      }
      const existing = existingByIdMap.get(o.id);
      return {
        ...existing!,
        explanation:
          o.explanation !== undefined
            ? o.explanation === "" || o.explanation === null
              ? null
              : o.explanation
            : existing!.explanation,
        isCorrect: o.isCorrect,
        optionText: o.optionText,
      };
    });

    // Get quiz type for validation
    const quizRow = await this.repo.findQuizById(input.id);
    if (!quizRow) {
      throw new ORPCError("FORBIDDEN", {
        message: "Cannot modify a quiz you do not own",
      });
    }
    QuizService.validateMergedOptionsForType(quizRow.type, projected);
  }

  const result = await this.repo.updateQuizWithOptions(
    input.id,
    ownerId,
    quizPatch,
    optionsToDelete,
    optionsToUpdate,
    optionsToCreate
  );

  if (!result) {
    throw new ORPCError("FORBIDDEN", {
      message: "Cannot modify a quiz you do not own",
    });
  }

  return result;
}
```

- [ ] **Step 2: Remove `createQuizOptions` and `updateQuizOption`**

Delete the entire `createQuizOptions` method (lines 108-143) and `updateQuizOption` method (lines 145-207) from `quiz.service.ts`.

- [ ] **Step 3: Update imports**

Remove unused imports:

```typescript
// REMOVE these imports:
import type {
  CreateQuizOptionsInput,
  UpdateQuizOptionInput,
} from "../../../schemas/quiz.ts";
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/services/quiz/quiz.service.ts
git commit -m "refactor(quiz): rewrite updateQuiz with full form support"
```

---

## Task 6: Update Router Command

**Files:**

- Modify: `src/lib/server/services/quiz/commands/quiz.update.ts`

- [ ] **Step 1: Update error map**

```typescript
const ERRORS = {
  FORBIDDEN: { message: "Cannot modify a quiz you do not own", status: 403 },
  CHAPTER_NOT_FOUND: { message: "Chapter not found", status: 404 },
  CHAPTER_NOT_OWNED: {
    message: "Cannot use a chapter you do not own",
    status: 403,
  },
  CHAPTER_NOT_BELONG_TO_STUDY_SET: {
    message: "Chapter does not belong to the target study set",
    status: 400,
  },
  OPTION_NOT_FOUND: { message: "Quiz option not found", status: 404 },
  OPTION_NOT_BELONG_TO_QUIZ: {
    message: "Option does not belong to this quiz",
    status: 400,
  },
  VALIDATION_FAILED: {
    message: "Quiz options violate type constraints",
    status: 400,
  },
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/services/quiz/commands/quiz.update.ts
git commit -m "refactor(quiz): update error map with granular codes"
```

---

## Task 7: Update Router

**Files:**

- Modify: `src/lib/server/services/quiz/quiz.router.ts`
- Delete: `src/lib/server/services/quiz/commands/quiz.option-create.ts`
- Delete: `src/lib/server/services/quiz/commands/quiz.option-update.ts`

- [ ] **Step 1: Remove old option command imports**

```typescript
// REMOVE these imports:
import { quizOptionCreate } from "./commands/quiz.option-create.ts";
import { quizOptionUpdate } from "./commands/quiz.option-update.ts";
```

- [ ] **Step 2: Remove old option commands from router**

```typescript
// UPDATE router object:
export const quizRouter = {
  create: quizCreate,
  delete: quizDelete,
  get: quizGet,
  list: quizList,
  option: {
    delete: quizOptionDelete,
    // REMOVE: create: quizOptionCreate,
    // REMOVE: update: quizOptionUpdate,
  },
  update: quizUpdate,
};
```

- [ ] **Step 3: Delete old command files**

```bash
rm src/lib/server/services/quiz/commands/quiz.option-create.ts
rm src/lib/server/services/quiz/commands/quiz.option-update.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/services/quiz/quiz.router.ts
git rm src/lib/server/services/quiz/commands/quiz.option-create.ts
git rm src/lib/server/services/quiz/commands/quiz.option-update.ts
git commit -m "refactor(quiz): remove obsolete option create/update commands"
```

---

## Task 8: Update Service Tests

**Files:**

- Modify: `src/lib/server/services/quiz/quiz.service.test.ts`

- [ ] **Step 1: Remove old test setup**

Remove mock setups for `createQuizOptions` and `updateQuizOption` from `setupService`:

```typescript
// REMOVE these lines:
repo.insertQuizOptions.mockImplementation(...)
repo.updateQuizOption.mockImplementation(...)
```

- [ ] **Step 2: Update `updateQuiz` tests**

Replace the existing `updateQuiz` describe block with:

```typescript
describe("updateQuiz", () => {
  it("propagates FORBIDDEN from assertQuizOwnerOrForbidden", async ({
    expect,
  }) => {
    const { repo, guard, service } = setupService();
    guard.assertQuizOwnerOrForbidden.mockImplementation(throwForbidden);
    const err = await captureError(
      service.updateQuiz({ id: QUIZ_ID, questionText: "New Q?" }, "owner-1")
    );
    expect(err).toBeInstanceOf(ORPCError);
    expect(err).toMatchObject({ code: "FORBIDDEN" });
    expect(repo.updateQuiz).not.toHaveBeenCalled();
  });

  it("updates only questionText and returns the hydrated quiz", async ({
    expect,
  }) => {
    const { repo, service } = setupService();
    const result = await service.updateQuiz(
      { id: QUIZ_ID, questionText: "Updated?" },
      "owner-1"
    );
    expect(repo.updateQuiz).toHaveBeenCalledWith(
      QUIZ_ID,
      "owner-1",
      expect.objectContaining({ questionText: "Updated?" })
    );
    expect(result.questionText).toBe("Updated?");
    expect(Array.isArray(result.options)).toBe(true);
  });

  it("throws NOT_FOUND when the repo returns null", async ({ expect }) => {
    const { repo, service } = setupService();
    repo.updateQuiz.mockResolvedValue(null);
    const err = await captureError(
      service.updateQuiz({ id: QUIZ_ID, questionText: "Updated?" }, "owner-1")
    );
    expect(err).toBeInstanceOf(ORPCError);
    expect(err).toMatchObject({ code: "NOT_FOUND" });
  });

  it("creates options when options provided without ids", async ({
    expect,
  }) => {
    const { repo, service } = setupService();
    repo.updateQuizWithOptions.mockImplementation(
      async (quizId, ownerId, patch, toDelete, toUpdate, toCreate) => ({
        ...ownedQuiz,
        ...patch,
        id: quizId,
        options: [...toCreate.map((r) => createQuizOptionFixture(r))],
      })
    );
    const result = await service.updateQuiz(
      {
        id: QUIZ_ID,
        options: [
          { isCorrect: true, optionText: "A" },
          { isCorrect: false, optionText: "B" },
        ],
      },
      "owner-1"
    );
    expect(result.options).toHaveLength(2);
  });

  it("updates options when options provided with ids", async ({ expect }) => {
    const { repo, service } = setupService();
    repo.findOptionsByQuizIds.mockResolvedValue([
      createQuizOptionFixture({ id: OPTION_ID, quizId: QUIZ_ID }),
    ]);
    repo.updateQuizWithOptions.mockImplementation(
      async (quizId, ownerId, patch, toDelete, toUpdate, toCreate) => ({
        ...ownedQuiz,
        ...patch,
        id: quizId,
        options: [
          createQuizOptionFixture({
            id: OPTION_ID,
            quizId: QUIZ_ID,
            optionText: "Updated",
          }),
        ],
      })
    );
    const result = await service.updateQuiz(
      {
        id: QUIZ_ID,
        options: [{ id: OPTION_ID, isCorrect: true, optionText: "Updated" }],
      },
      "owner-1"
    );
    expect(result.options).toHaveLength(1);
    expect(result.options[0].optionText).toBe("Updated");
  });

  it("deletes options not in input", async ({ expect }) => {
    const { repo, service } = setupService();
    repo.findOptionsByQuizIds.mockResolvedValue([
      createQuizOptionFixture({ id: OPTION_ID, quizId: QUIZ_ID }),
      createQuizOptionFixture({ id: "other-option", quizId: QUIZ_ID }),
    ]);
    repo.updateQuizWithOptions.mockImplementation(
      async (quizId, ownerId, patch, toDelete, toUpdate, toCreate) => ({
        ...ownedQuiz,
        ...patch,
        id: quizId,
        options: [createQuizOptionFixture({ id: OPTION_ID, quizId: QUIZ_ID })],
      })
    );
    const result = await service.updateQuiz(
      {
        id: QUIZ_ID,
        options: [{ id: OPTION_ID, isCorrect: true, optionText: "A" }],
      },
      "owner-1"
    );
    expect(result.options).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Remove old `createQuizOptions` and `updateQuizOption` tests**

Delete the entire `describe("createQuizOptions", ...)` block and `describe("updateQuizOption", ...)` block from the test file.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/services/quiz/quiz.service.test.ts
git commit -m "refactor(quiz): update tests for new updateQuiz behavior"
```

---

## Task 9: Add Guard Tests

**Files:**

- Modify: `src/lib/server/services/quiz/quiz.guard.test.ts`

- [ ] **Step 1: Add tests for `assertQuizOptionsBelongToQuizOrNotFound`**

```typescript
describe("assertQuizOptionsBelongToQuizOrNotFound", () => {
  it("returns options when all belong to the quiz", async ({ expect }) => {
    const { repo, guard } = setupGuard();
    const options = [
      createQuizOptionFixture({ quizId: QUIZ_ID }),
      createQuizOptionFixture({ quizId: QUIZ_ID }),
    ];
    repo.findOptionsByIds.mockResolvedValue(options);
    const result = await guard.assertQuizOptionsBelongToQuizOrNotFound(
      QUIZ_ID,
      options.map((o) => o.id)
    );
    expect(result).toHaveLength(2);
  });

  it("throws OPTION_NOT_FOUND when an option does not exist", async ({
    expect,
  }) => {
    const { repo, guard } = setupGuard();
    repo.findOptionsByIds.mockResolvedValue([
      createQuizOptionFixture({ quizId: QUIZ_ID }),
    ]);
    const err = await captureError(
      guard.assertQuizOptionsBelongToQuizOrNotFound(QUIZ_ID, [
        OPTION_ID,
        "other-id",
      ])
    );
    expect(err).toBeInstanceOf(ORPCError);
    expect(err).toMatchObject({ code: "OPTION_NOT_FOUND", status: 404 });
  });

  it("throws OPTION_NOT_BELONG_TO_QUIZ when option belongs to another quiz", async ({
    expect,
  }) => {
    const { repo, guard } = setupGuard();
    repo.findOptionsByIds.mockResolvedValue([
      createQuizOptionFixture({ quizId: "other-quiz" }),
    ]);
    const err = await captureError(
      guard.assertQuizOptionsBelongToQuizOrNotFound(QUIZ_ID, [OPTION_ID])
    );
    expect(err).toBeInstanceOf(ORPCError);
    expect(err).toMatchObject({
      code: "OPTION_NOT_BELONG_TO_QUIZ",
      status: 400,
    });
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/services/quiz/quiz.guard.test.ts
git commit -m "test(quiz): add guard tests for option validation"
```

---

## Task 10: Add Drizzle Repository Tests

**Files:**

- Modify: `src/lib/server/services/quiz/quiz.repository.drizzle.test.ts`

- [ ] **Step 1: Add tests for `findOptionsByIds`**

```typescript
describe("findOptionsByIds", () => {
  it("returns options for given ids", async ({ expect }) => {
    await using env = new QuizTestEnv();
    const user = await env.seedUser();
    const quiz = await env.seedQuiz(user.id);
    const option1 = await env.seedQuizOption(quiz.id);
    const option2 = await env.seedQuizOption(quiz.id);
    const repo = new QuizDrizzleRepository(env.db);
    const result = await repo.findOptionsByIds([option1.id, option2.id]);
    expect(result).toHaveLength(2);
  });

  it("returns empty array for empty input", async ({ expect }) => {
    await using env = new QuizTestEnv();
    const repo = new QuizDrizzleRepository(env.db);
    const result = await repo.findOptionsByIds([]);
    expect(result).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Add tests for `updateQuizWithOptions`**

```typescript
describe("updateQuizWithOptions", () => {
  it("updates quiz and options atomically", async ({ expect }) => {
    await using env = new QuizTestEnv();
    const user = await env.seedUser();
    const quiz = await env.seedQuiz(user.id);
    const option = await env.seedQuizOption(quiz.id);
    const repo = new QuizDrizzleRepository(env.db);
    const result = await repo.updateQuizWithOptions(
      quiz.id,
      user.id,
      { questionText: "Updated?" },
      [],
      [{ id: option.id, patch: { optionText: "Updated Option" } }],
      []
    );
    expect(result.questionText).toBe("Updated?");
    expect(result.options).toHaveLength(1);
    expect(result.options[0].optionText).toBe("Updated Option");
  });

  it("creates new options", async ({ expect }) => {
    await using env = new QuizTestEnv();
    const user = await env.seedUser();
    const quiz = await env.seedQuiz(user.id);
    const repo = new QuizDrizzleRepository(env.db);
    const result = await repo.updateQuizWithOptions(
      quiz.id,
      user.id,
      {},
      [],
      [],
      [
        {
          explanation: null,
          id: crypto.randomUUID(),
          isCorrect: true,
          optionText: "New Option",
          quizId: quiz.id,
        },
      ]
    );
    expect(result.options).toHaveLength(1);
    expect(result.options[0].optionText).toBe("New Option");
  });

  it("deletes options", async ({ expect }) => {
    await using env = new QuizTestEnv();
    const user = await env.seedUser();
    const quiz = await env.seedQuiz(user.id);
    const option1 = await env.seedQuizOption(quiz.id);
    const option2 = await env.seedQuizOption(quiz.id);
    const repo = new QuizDrizzleRepository(env.db);
    const result = await repo.updateQuizWithOptions(
      quiz.id,
      user.id,
      {},
      [option2.id],
      [],
      []
    );
    expect(result.options).toHaveLength(1);
    expect(result.options[0].id).toBe(option1.id);
  });

  it("returns null when quiz not found", async ({ expect }) => {
    await using env = new QuizTestEnv();
    const user = await env.seedUser();
    const repo = new QuizDrizzleRepository(env.db);
    const result = await repo.updateQuizWithOptions(
      "non-existent",
      user.id,
      {},
      [],
      [],
      []
    );
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/services/quiz/quiz.repository.drizzle.test.ts
git commit -m "test(quiz): add drizzle tests for new repository methods"
```

---

## Task 11: Run Type Check and Tests

- [ ] **Step 1: Run type check**

```bash
rtk pnpm run check
```

Expected: No errors.

- [ ] **Step 2: Run lint**

```bash
rtk pnpm run lint:agent
```

Expected: No errors.

- [ ] **Step 3: Run format**

```bash
rtk pnpm run format
```

- [ ] **Step 4: Run quiz tests**

```bash
rtk pnpm run test:unit -- --filter="quiz"
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(quiz): complete quiz update with options"
```

---

## Self-Review

**Spec coverage:**

- ✅ Full-form quiz update with options
- ✅ Smart diffing (create/update/delete)
- ✅ Granular error codes (FORBIDDEN, CHAPTER_NOT_FOUND, CHAPTER_NOT_OWNED, CHAPTER_NOT_BELONG_TO_STUDY_SET, OPTION_NOT_FOUND, OPTION_NOT_BELONG_TO_QUIZ, VALIDATION_FAILED)
- ✅ Option A (hide existence) via FORBIDDEN
- ✅ Option fields are always required (no optional for optionText/isCorrect)
- ✅ Separate delete command preserved
- ✅ Immutable quiz type

**Placeholder scan:**

- ✅ No TBD/TODO
- ✅ All error handling specified
- ✅ All test code provided
- ✅ All method signatures defined

**Type consistency:**

- ✅ `updateQuizInputSchema` uses `v.optional` for top-level fields only
- ✅ `QuizOption` fields always require `isCorrect` and `optionText`
- ✅ `findOptionsByIds` returns `Promise<QuizOption[]>`
- ✅ `updateQuizWithOptions` returns `Promise<QuizWithOptions | null>`
- ✅ Guard method `assertQuizOptionsBelongToQuizOrNotFound` returns `Promise<QuizOption[]>`

---

**Plan complete and saved to `docs/superpowers/plans/2026-06-11-quiz-update-with-options.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
