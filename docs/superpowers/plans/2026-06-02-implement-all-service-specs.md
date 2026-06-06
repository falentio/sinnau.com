# All Specs Except Generate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement every service-level `SPECS.md` except the Generate domain and provider-specific subscription payment integration with small, testable, reviewable changes.

**Architecture:** Keep the existing service package pattern: oRPC router files delegate to service classes; service classes orchestrate guards and repositories; repositories own Drizzle persistence only. Public router responses must match each domain spec, while repositories may use Drizzle row shapes internally and services map rows to public DTOs where the spec differs.

**Tech Stack:** SvelteKit 2, Svelte 5, oRPC, Valibot, Drizzle ORM, SQLite/D1-compatible schema, Vitest, LogTape when added for Subscription logging, ts-fsrs for FSRS scheduling.

---

## Scope And Order

The repo currently has a partial `study-set` implementation and only specs for `chapter`, `flashcard`, `quiz`, `referral`, `rate-limiter`, `subscription`, and `fsrs`. The `generate` domain is intentionally excluded. Implement in this order so dependencies are available before consumers:

1. Shared API, ID, time, test, and schema foundations.
2. StudySet spec alignment.
3. Chapter service.
4. Flashcard service and rating UI.
5. Quiz service.
6. Referral service.
7. Subscription service and local access lifecycle.
8. Rate Limiter service.
9. FSRS service.
10. API wiring, migrations, and final verification.

Each task below is intended to be the smallest useful unit: one contract, one layer, one route group, or one invariant group. Do not merge tasks unless they touch the same failing test and cannot pass independently.

## File Structure Map

### Shared Foundation

- Create: `src/lib/schemas/api.ts` for `{ success: true, data }` and `{ success: true }` Valibot output helpers.
- Create: `src/lib/schemas/id.ts` for UUID and prefixed ID validators.
- Create: `src/lib/server/infras/id.ts` for `ID_PREFIX`, `PrefixedId`, `createPrefixedId`, and runtime prefix checks.
- Create: `src/lib/server/infras/time.ts` for UTC window, duration, and timestamp conversion helpers.
- Modify: `src/lib/server/infras/slug.ts` only if the existing helper needs exported `normalizeSlug` for Referral lookups.
- Modify: `src/lib/server/infras/db/testing.ts` to use project formatting and to support schema migration setup used by new repository tests.

### Database Schemas

- Modify: `src/lib/server/infras/db/schema/index.ts` to export every domain schema.
- Modify: `src/lib/server/infras/db/schema/study-set.ts` for child relation exports and any response-shape alignment support.
- Create: `src/lib/server/infras/db/schema/chapter.ts`.
- Create: `src/lib/server/infras/db/schema/flashcard.ts`.
- Create: `src/lib/server/infras/db/schema/quiz.ts`.
- Create: `src/lib/server/infras/db/schema/referral.ts`.
- Create: `src/lib/server/infras/db/schema/subscription.ts`.
- Create: `src/lib/server/infras/db/schema/rate-limiter.ts`.
- Create: `src/lib/server/infras/db/schema/fsrs.ts`.

### Public Validation Schemas

- Modify: `src/lib/schemas/study-set.ts`.
- Create: `src/lib/schemas/chapter.ts`.
- Create: `src/lib/schemas/flashcard.ts`.
- Create: `src/lib/schemas/quiz.ts`.
- Create: `src/lib/schemas/referral.ts`.
- Create: `src/lib/schemas/subscription.ts`.
- Create: `src/lib/schemas/rate-limiter.ts`.
- Create: `src/lib/schemas/fsrs.ts`.

### Service Packages

- Keep and align: `src/lib/server/services/study-set/*`.
- Create full packages following `src/lib/server/services/AGENTS.md`: `chapter`, `flashcard`, `quiz`, `referral`, `subscription`, `rate-limiter`, `fsrs`.
- For every new package, create `<domain>.constant.ts`, `<domain>.repository.ts`, `<domain>.repository.drizzle.ts`, `<domain>.guard.ts`, `<domain>.service.ts`, `<domain>.testing.ts`, `<domain>.router.ts`, `commands/*.ts`, `queries/*.ts`, and the three test files required by the service guide.

### Routes And API

- Modify: `src/lib/server/api/index.ts` to add each domain router after the domain is implemented.
- Modify: `src/routes/(app)/session/[studySetId]/flashcard/+page.svelte` for the Flashcard rating UI requirement.

## Global Execution Rules

- Use TDD for every task: write or extend a failing test first, run the narrow test, implement the smallest code change, run the narrow test again, then commit.
- Use `pnpm test:unit -- --run <path>` for a single test file.
- Use `pnpm check` after each domain is wired into the API.
- Use `pnpm lint` before final completion.
- Use `pnpm db:generate` after schema batches, then commit generated migration files with the schema task that created them.
- Do not expose server-side helper procedures to clients unless the spec marks them as user-facing.
- Keep services returning public DTOs. Keep repositories returning database rows.
- When a task mentions dependency docs for a library, load `find-docs` or the domain skill at execution time before writing that code.

---

## Task 1: Shared API Response Schemas

**Files:**

- Create: `src/lib/schemas/api.ts`
- Test: `src/lib/schemas/api.test.ts`

- [ ] **Step 1: Add failing schema tests**

Create `src/lib/schemas/api.test.ts` with tests that parse these shapes:

```ts
import { describe, it } from "vitest";
import * as v from "valibot";
import { successDataSchema, successOnlySchema } from "./api.ts";

describe.concurrent("api response schemas", () => {
  it("accepts success with data", ({ expect }) => {
    const schema = successDataSchema(v.object({ id: v.string() }));
    expect(v.parse(schema, { success: true, data: { id: "row-1" } })).toEqual({
      success: true,
      data: { id: "row-1" },
    });
  });

  it("accepts success without data", ({ expect }) => {
    expect(v.parse(successOnlySchema, { success: true })).toEqual({
      success: true,
    });
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `pnpm test:unit -- --run src/lib/schemas/api.test.ts`

Expected: fail because `src/lib/schemas/api.ts` does not exist.

- [ ] **Step 3: Implement the helper schemas**

Create `src/lib/schemas/api.ts`:

```ts
import * as v from "valibot";

export function successDataSchema<const TSchema extends v.GenericSchema>(
  data: TSchema
) {
  return v.object({ success: v.literal(true), data });
}

export const successOnlySchema = v.object({ success: v.literal(true) });
```

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/schemas/api.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `test: add shared API response schema helpers`

---

## Task 2: Shared ID Helpers

**Files:**

- Create: `src/lib/server/infras/id.ts`
- Create: `src/lib/schemas/id.ts`
- Test: `src/lib/server/infras/id.test.ts`

- [ ] **Step 1: Add failing ID tests**

Create `src/lib/server/infras/id.test.ts` with coverage for `sbo_`, `sbp_`, `frs_`, `fst_`, and `frl_` prefixes, rejection of wrong prefixes, and stable type narrowing through `isPrefixedId`.

- [ ] **Step 2: Run the failing test**

Run: `pnpm test:unit -- --run src/lib/server/infras/id.test.ts`

Expected: fail because the helpers do not exist.

- [ ] **Step 3: Implement ID generation and validation**

Create `src/lib/server/infras/id.ts` with this public surface:

```ts
import { nanoid } from "nanoid";

export const ID_PREFIX = {
  SUBSCRIPTION_ORDER: "sbo",
  SUBSCRIPTION_PERIOD: "sbp",
  FSRS_SESSION: "frs",
  FLASHCARD_STATE: "fst",
  REVIEW_LOG: "frl",
} as const;

export type IdPrefix = (typeof ID_PREFIX)[keyof typeof ID_PREFIX];
export type PrefixedId<TPrefix extends string> = `${TPrefix}_${string}`;

export function createPrefixedId<const TPrefix extends IdPrefix>(
  prefix: TPrefix
): PrefixedId<TPrefix> {
  return `${prefix}_${nanoid(16)}` as PrefixedId<TPrefix>;
}

export function isPrefixedId<const TPrefix extends string>(
  value: string,
  prefix: TPrefix
): value is PrefixedId<TPrefix> {
  return value.startsWith(`${prefix}_`) && value.length > prefix.length + 1;
}
```

Create `src/lib/schemas/id.ts`:

```ts
import * as v from "valibot";

export const uuidSchema = v.pipe(v.string(), v.uuid());

export function prefixedIdSchema(prefix: string) {
  return v.pipe(
    v.string(),
    v.regex(
      new RegExp(`^${prefix}_[A-Za-z0-9_-]+$`),
      `Expected ${prefix}_ prefixed id`
    )
  );
}
```

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/infras/id.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add shared prefixed ID helpers`

---

## Task 3: Shared Time Helpers

**Files:**

- Create: `src/lib/server/infras/time.ts`
- Test: `src/lib/server/infras/time.test.ts`

- [ ] **Step 1: Add failing time tests**

Create tests for `toUnixMs`, `addDays`, `startOfUtcDay`, `nextUtcDay`, `startOfIsoWeek`, and `nextIsoWeek`. Include a Wednesday timestamp and a Sunday timestamp to prove ISO weeks start Monday UTC.

- [ ] **Step 2: Run the failing test**

Run: `pnpm test:unit -- --run src/lib/server/infras/time.test.ts`

Expected: fail because `time.ts` does not exist.

- [ ] **Step 3: Implement time helpers**

Create `src/lib/server/infras/time.ts` with exported constants `DAY_MS` and `WEEK_MS`, timestamp conversion helpers, and UTC window helpers that never use local timezone APIs.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/infras/time.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add shared UTC time helpers`

---

## Task 4: Normalize Slug Helper Exports

**Files:**

- Modify: `src/lib/server/infras/slug.ts`
- Test: `src/lib/server/infras/slug.test.ts`

- [ ] **Step 1: Add failing slug tests**

Add tests for exported `normalizeSlug(' Halo Dunia! ') === 'halo-dunia'`, short-title random generation length, and generated slug entropy suffix.

- [ ] **Step 2: Run the failing test**

Run: `pnpm test:unit -- --run src/lib/server/infras/slug.test.ts`

Expected: fail because `normalizeSlug` is private.

- [ ] **Step 3: Export normalization without changing behavior**

Rename private `sanitize` to `normalizeSlug`, export it, and update `generateSlug` to call `normalizeSlug`.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/infras/slug.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: expose shared slug normalization`

---

## Task 5: StudySet Constants And Schema Alignment

**Files:**

- Modify: `src/lib/server/services/study-set/study-set.constant.ts`
- Modify: `src/lib/schemas/study-set.ts`
- Test: `src/lib/schemas/study-set.test.ts`

- [ ] **Step 1: Add failing schema tests**

Add tests that assert StudySet title bounds, description max length, file count max, filename max length, visibility picklist, and `{ success: true, data }` output wrappers for create/update/get/list/recent/visit/admin cleanup.

- [ ] **Step 2: Run the failing test**

Run: `pnpm test:unit -- --run src/lib/schemas/study-set.test.ts`

Expected: fail because schemas still hardcode constants and router output wrappers are missing.

- [ ] **Step 3: Export StudySet schema constants**

Add these constants to `study-set.constant.ts`: title min/max, description max, filename max, files max, visibility list. Import those constants from `src/lib/schemas/study-set.ts`.

- [ ] **Step 4: Add output wrapper schemas**

Use `successDataSchema` and `successOnlySchema` so public outputs match `SPECS.md` response envelopes.

- [ ] **Step 5: Verify**

Run: `pnpm test:unit -- --run src/lib/schemas/study-set.test.ts`

Expected: pass.

- [ ] **Step 6: Commit**

Commit: `feat: align study set schemas with specs`

---

## Task 6: StudySet Service DTO And Router Envelopes

**Files:**

- Modify: `src/lib/server/services/study-set/study-set.service.ts`
- Modify: `src/lib/server/services/study-set/commands/*.ts`
- Modify: `src/lib/server/services/study-set/queries/*.ts`
- Modify: `src/lib/server/services/study-set/study-set.service.test.ts`
- Test: `src/lib/server/services/study-set/study-set.service.test.ts`

- [ ] **Step 1: Add failing service tests**

Extend service tests to assert public `StudySet` values expose `createdAt` and `updatedAt` as Unix milliseconds if the spec remains the source of truth, and router handlers return `{ success: true, data }` for non-delete operations.

- [ ] **Step 2: Run the failing tests**

Run: `pnpm test:unit -- --run src/lib/server/services/study-set/study-set.service.test.ts`

Expected: fail on DTO timestamp/envelope expectations.

- [ ] **Step 3: Add StudySet DTO mapper**

Add a private mapper in `study-set.service.ts` that converts repository rows to the public `StudySet` output type. Keep repository types unchanged.

- [ ] **Step 4: Wrap command and query outputs**

Update command/query files so create/update/get/list/recent/visit/admin cleanup outputs match `SPECS.md`. Keep delete as `{ success: true }`.

- [ ] **Step 5: Verify StudySet service tests**

Run: `pnpm test:unit -- --run src/lib/server/services/study-set/study-set.service.test.ts`

Expected: pass.

- [ ] **Step 6: Verify StudySet route typecheck**

Run: `pnpm check`

Expected: pass.

- [ ] **Step 7: Commit**

Commit: `feat: return spec envelopes from study set router`

---

## Task 7: StudySet Repository Integration Gaps

**Files:**

- Modify: `src/lib/server/services/study-set/study-set.repository.drizzle.test.ts`
- Modify: `src/lib/server/services/study-set/study-set.repository.drizzle.ts`

- [ ] **Step 1: Add failing repository tests**

Add tests for case-insensitive slug uniqueness, visit upsert uniqueness, visit cleanup cutoff, and recent visits excluding private sets owned by another user.

- [ ] **Step 2: Run the failing tests**

Run: `pnpm test:unit -- --run src/lib/server/services/study-set/study-set.repository.drizzle.test.ts`

Expected: fail only for gaps found by the tests.

- [ ] **Step 3: Fix repository gaps**

Update repository queries and test environment seeding so all spec-backed cases pass.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/study-set/study-set.repository.drizzle.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `test: cover study set repository spec rules`

---

## Task 8: Chapter Database Schema

**Files:**

- Create: `src/lib/server/infras/db/schema/chapter.ts`
- Modify: `src/lib/server/infras/db/schema/index.ts`
- Modify: `src/lib/server/infras/db/schema/study-set.ts`
- Test: `src/lib/server/services/chapter/chapter.repository.drizzle.test.ts`

- [ ] **Step 1: Add failing schema integration test**

Create a repository test that inserts a user, study set, and chapter, then asserts `(studySetId, slug)` uniqueness, owner index-backed lookup, and cascade delete from StudySet.

- [ ] **Step 2: Run the failing test**

Run: `pnpm test:unit -- --run src/lib/server/services/chapter/chapter.repository.drizzle.test.ts`

Expected: fail because the Chapter schema does not exist.

- [ ] **Step 3: Add the Chapter table**

Create `chapter.ts` with `id`, `slug`, `title`, `description`, `studySetId`, `ownerId`, `createdAt`, and `updatedAt`, composite unique index `(studySetId, slug)`, and indexes on `ownerId` and `studySetId`.

- [ ] **Step 4: Export schema**

Export `chapter` and relations from `schema/index.ts`, and add `chapters: many(chapter)` to `studySetRelations`.

- [ ] **Step 5: Generate migration**

Run: `pnpm db:generate`

Expected: new migration includes `chapter` table and indexes.

- [ ] **Step 6: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/chapter/chapter.repository.drizzle.test.ts`

Expected: pass.

- [ ] **Step 7: Commit**

Commit: `feat: add chapter database schema`

---

## Task 9: Chapter Validation Schemas

**Files:**

- Create: `src/lib/server/services/chapter/chapter.constant.ts`
- Create: `src/lib/schemas/chapter.ts`
- Test: `src/lib/schemas/chapter.test.ts`

- [ ] **Step 1: Add failing schema tests**

Test create, update, delete, list, get, title trim/min/max, description max, UUID validation, output wrapper schemas, and unknown-field stripping behavior used by Valibot object schemas.

- [ ] **Step 2: Run the failing test**

Run: `pnpm test:unit -- --run src/lib/schemas/chapter.test.ts`

Expected: fail because schemas do not exist.

- [ ] **Step 3: Implement constants and schemas**

Create constants for title min `5`, title max `50`, description max `1000`, page/order defaults if needed by repository queries, and `chapterSchema` using Unix millisecond timestamps for public output.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/schemas/chapter.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add chapter validation schemas`

---

## Task 10: Chapter Repository Interface And Testing Utilities

**Files:**

- Create: `src/lib/server/services/chapter/chapter.repository.ts`
- Create: `src/lib/server/services/chapter/chapter.testing.ts`
- Test: `src/lib/server/services/chapter/chapter.service.test.ts`

- [ ] **Step 1: Add failing service setup test**

Create a minimal `ChapterService` construction test that imports `createMockRepository`, `createMockGuard`, and `createChapterFixture` from `chapter.testing.ts`.

- [ ] **Step 2: Run the failing test**

Run: `pnpm test:unit -- --run src/lib/server/services/chapter/chapter.service.test.ts`

Expected: fail because repository/testing files do not exist.

- [ ] **Step 3: Define repository interface**

Include methods for inserting, updating, deleting, finding by ID, finding by StudySet slug scope, listing visible chapters, checking slug collisions in a StudySet, and checking whether a chapter has flashcards or quizzes.

- [ ] **Step 4: Add testing utilities**

Mirror `study-set.testing.ts` with mocked repository functions, mocked guard functions, a chapter fixture, `captureError`, and `ChapterTestEnv` seeded with users and study sets.

- [ ] **Step 5: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/chapter/chapter.service.test.ts`

Expected: the setup test passes.

- [ ] **Step 6: Commit**

Commit: `test: add chapter service test scaffolding`

---

## Task 11: Chapter Drizzle Repository

**Files:**

- Create: `src/lib/server/services/chapter/chapter.repository.drizzle.ts`
- Modify: `src/lib/server/services/chapter/chapter.repository.drizzle.test.ts`

- [ ] **Step 1: Add failing repository behavior tests**

Cover insert, update by owner, delete by owner, find by ID, list accessible chapters, slug collision scoped to StudySet, non-empty child detection returning false when no children exist.

- [ ] **Step 2: Run the failing tests**

Run: `pnpm test:unit -- --run src/lib/server/services/chapter/chapter.repository.drizzle.test.ts`

Expected: fail because the repository implementation does not exist.

- [ ] **Step 3: Implement Drizzle repository**

Use `ChapterDrizzleRepository.withDatabase(db)`, return `null` for missing rows, return `false` for failed deletes, and keep visibility filtering based on joined StudySet owner/visibility.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/chapter/chapter.repository.drizzle.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add chapter Drizzle repository`

---

## Task 12: Chapter Guard

**Files:**

- Create: `src/lib/server/services/chapter/chapter.guard.ts`
- Create: `src/lib/server/services/chapter/chapter.guard.test.ts`

- [ ] **Step 1: Add failing guard tests**

Cover `requireOwner`, `requireUser`, owner-only mutation checks, visible-by-id reads, parent StudySet ownership checks for creation, and `NOT_FOUND` for inaccessible public/private boundaries.

- [ ] **Step 2: Run the failing tests**

Run: `pnpm test:unit -- --run src/lib/server/services/chapter/chapter.guard.test.ts`

Expected: fail because guard does not exist.

- [ ] **Step 3: Implement guard**

Depend on `ChapterRepository` and `StudySetGuard` or repository visibility helpers. Throw `UNAUTHORIZED`, `FORBIDDEN`, and `NOT_FOUND` exactly as the spec describes.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/chapter/chapter.guard.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add chapter guard`

---

## Task 13: Chapter Service

**Files:**

- Create: `src/lib/server/services/chapter/chapter.service.ts`
- Modify: `src/lib/server/services/chapter/chapter.service.test.ts`

- [ ] **Step 1: Add failing service tests**

Cover create slug generation and scoped collision retry, update without slug regeneration, delete blocked by `CHAPTER_NOT_EMPTY`, list visible chapters, get visible chapter, unauthorized propagation, forbidden propagation, and slug conflict mapping.

- [ ] **Step 2: Run the failing tests**

Run: `pnpm test:unit -- --run src/lib/server/services/chapter/chapter.service.test.ts`

Expected: fail because service methods do not exist.

- [ ] **Step 3: Implement service**

Create `ChapterService` with defaults `chapterDrizzleRepository` and `new ChapterGuard(repo)`, DTO mapping to public timestamps, and ORPCError mappings for `CHAPTER_NOT_EMPTY` and `CHAPTER_SLUG_CONFLICT` or the repository's chosen domain code.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/chapter/chapter.service.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add chapter service`

---

## Task 14: Chapter Router And API Wiring

**Files:**

- Create: `src/lib/server/services/chapter/commands/chapter.create.ts`
- Create: `src/lib/server/services/chapter/commands/chapter.update.ts`
- Create: `src/lib/server/services/chapter/commands/chapter.delete.ts`
- Create: `src/lib/server/services/chapter/queries/chapter.list.ts`
- Create: `src/lib/server/services/chapter/queries/chapter.get.ts`
- Create: `src/lib/server/services/chapter/chapter.router.ts`
- Modify: `src/lib/server/api/index.ts`

- [ ] **Step 1: Add failing router import/type test**

Add a compile-time import in a lightweight test or rely on `pnpm check` after wiring.

- [ ] **Step 2: Add command/query files**

Each procedure must use `authorizedProcedure`, declare domain error maps, use schema inputs/outputs, and delegate directly to `chapterService`.

- [ ] **Step 3: Wire router**

Export `chapterRouter` with `create`, `update`, `delete`, `list`, and `get`; add `chapter: chapterRouter` to `src/lib/server/api/index.ts`.

- [ ] **Step 4: Verify**

Run: `pnpm check`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: wire chapter router`

---

## Task 15: Flashcard Database Schema

**Files:**

- Create: `src/lib/server/infras/db/schema/flashcard.ts`
- Modify: `src/lib/server/infras/db/schema/index.ts`
- Modify: `src/lib/server/infras/db/schema/chapter.ts`
- Test: `src/lib/server/services/flashcard/flashcard.repository.drizzle.test.ts`

- [ ] **Step 1: Add failing schema integration test**

Test inserting flashcards with optional `chapterId`, required `studySetId`, owner ID, cascade delete from StudySet and Chapter, and indexes used for `ownerId`, `chapterId`, and `studySetId` lookups.

- [ ] **Step 2: Run the failing test**

Run: `pnpm test:unit -- --run src/lib/server/services/flashcard/flashcard.repository.drizzle.test.ts`

Expected: fail because Flashcard schema does not exist.

- [ ] **Step 3: Add Flashcard table and relations**

Create table fields from `flashcard/SPECS.md`, reference `study_set.id` and nullable `chapter.id`, and export types.

- [ ] **Step 4: Generate migration**

Run: `pnpm db:generate`

Expected: migration adds `flashcard` table and indexes.

- [ ] **Step 5: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/flashcard/flashcard.repository.drizzle.test.ts`

Expected: pass.

- [ ] **Step 6: Commit**

Commit: `feat: add flashcard database schema`

---

## Task 16: Flashcard Validation Schemas

**Files:**

- Create: `src/lib/server/services/flashcard/flashcard.constant.ts`
- Create: `src/lib/schemas/flashcard.ts`
- Test: `src/lib/schemas/flashcard.test.ts`

- [ ] **Step 1: Add failing schema tests**

Cover batch create array validation, required front/back, hint max `500`, `importance >= 0`, optional chapter ID, output wrappers, and delete batch IDs.

- [ ] **Step 2: Run the failing test**

Run: `pnpm test:unit -- --run src/lib/schemas/flashcard.test.ts`

Expected: fail because schemas do not exist.

- [ ] **Step 3: Implement constants and schemas**

Use plain text string schemas with trimmed non-empty checks for `front` and `back`, positive integer array checks for delete IDs, and public timestamp outputs as Unix milliseconds.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/schemas/flashcard.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add flashcard validation schemas`

---

## Task 17: Flashcard Repository And Guard

**Files:**

- Create: `src/lib/server/services/flashcard/flashcard.repository.ts`
- Create: `src/lib/server/services/flashcard/flashcard.repository.drizzle.ts`
- Create: `src/lib/server/services/flashcard/flashcard.guard.ts`
- Create: `src/lib/server/services/flashcard/flashcard.testing.ts`
- Create: `src/lib/server/services/flashcard/flashcard.guard.test.ts`
- Modify: `src/lib/server/services/flashcard/flashcard.repository.drizzle.test.ts`

- [ ] **Step 1: Add failing guard and repository tests**

Cover ownership of target StudySet/Chapter on create, visible parent StudySet for reads, all-or-nothing blocked ID detection for batch delete, and ordering by `createdAt` descending.

- [ ] **Step 2: Run the failing tests**

Run: `pnpm test:unit -- --run src/lib/server/services/flashcard/flashcard.guard.test.ts src/lib/server/services/flashcard/flashcard.repository.drizzle.test.ts`

Expected: fail because files do not exist.

- [ ] **Step 3: Implement repository and guard**

Repository methods must support transactional batch insert/delete, find by ID with parent visibility data, list by StudySet, update by owner, and blocked ID lookup before delete. Guard must throw `PARTIAL_FORBIDDEN` with blocked IDs for batch deletion failures.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/flashcard/flashcard.guard.test.ts src/lib/server/services/flashcard/flashcard.repository.drizzle.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add flashcard repository and guard`

---

## Task 18: Flashcard Service

**Files:**

- Create: `src/lib/server/services/flashcard/flashcard.service.ts`
- Create: `src/lib/server/services/flashcard/flashcard.service.test.ts`

- [ ] **Step 1: Add failing service tests**

Cover batch create order preservation, all-or-nothing validation propagation, update replace semantics, default `importance = 0`, delete blocked IDs, get/list visibility, and unauthorized propagation.

- [ ] **Step 2: Run the failing test**

Run: `pnpm test:unit -- --run src/lib/server/services/flashcard/flashcard.service.test.ts`

Expected: fail because service does not exist.

- [ ] **Step 3: Implement service**

Create `FlashcardService` with DTO mapping, transactional repository calls, guard orchestration, `BATCH_VALIDATION_FAILED`, `PARTIAL_FORBIDDEN`, `FORBIDDEN`, and `NOT_FOUND` mappings.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/flashcard/flashcard.service.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add flashcard service`

---

## Task 19: Flashcard Router And API Wiring

**Files:**

- Create: `src/lib/server/services/flashcard/commands/flashcard.create.ts`
- Create: `src/lib/server/services/flashcard/commands/flashcard.update.ts`
- Create: `src/lib/server/services/flashcard/commands/flashcard.delete.ts`
- Create: `src/lib/server/services/flashcard/queries/flashcard.list.ts`
- Create: `src/lib/server/services/flashcard/queries/flashcard.get.ts`
- Create: `src/lib/server/services/flashcard/flashcard.router.ts`
- Modify: `src/lib/server/api/index.ts`

- [ ] **Step 1: Add router files**

Use `authorizedProcedure`, declare the Flashcard error map, wrap success outputs to match specs, and delegate to `flashcardService`.

- [ ] **Step 2: Wire router**

Export `flashcardRouter` and add `flashcard: flashcardRouter` to `src/lib/server/api/index.ts`.

- [ ] **Step 3: Verify**

Run: `pnpm check`

Expected: pass.

- [ ] **Step 4: Commit**

Commit: `feat: wire flashcard router`

---

## Task 20: Flashcard Rating UI

**Files:**

- Modify: `src/routes/(app)/session/[studySetId]/flashcard/+page.svelte`
- Test: `src/routes/(app)/session/[studySetId]/flashcard/+page.svelte`

- [ ] **Step 1: Inspect current component**

Read the file and keep the existing visual language: rounded card, subtle shadow, color-coded choices, and existing `Button` component usage.

- [ ] **Step 2: Update markup**

Ensure title `Seberapa paham kamu?`, optional label `Jadwal ulang`, four equal-width visible buttons in one row on mobile and desktop, icon/label/interval stack, time icon with interval text, and accessible labels that include interval text.

- [ ] **Step 3: Run Svelte autofixer**

Run: `npx @sveltejs/mcp svelte-autofixer "src/routes/(app)/session/[studySetId]/flashcard/+page.svelte" --svelte-version 5`

Expected: no blocking Svelte issues.

- [ ] **Step 4: Verify app typecheck**

Run: `pnpm check`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: align flashcard rating panel with specs`

---

## Task 21: Quiz Database Schema

**Files:**

- Create: `src/lib/server/infras/db/schema/quiz.ts`
- Modify: `src/lib/server/infras/db/schema/index.ts`
- Modify: `src/lib/server/infras/db/schema/chapter.ts`
- Modify: `src/lib/server/infras/db/schema/study-set.ts`
- Test: `src/lib/server/services/quiz/quiz.repository.drizzle.test.ts`

- [ ] **Step 1: Add failing schema integration test**

Test quiz insert, option insert, cascade delete quiz to options, cascade delete StudySet/Chapter to quizzes, enum storage for quiz type, and indexes on owner/chapter/studySet/quiz IDs.

- [ ] **Step 2: Run the failing test**

Run: `pnpm test:unit -- --run src/lib/server/services/quiz/quiz.repository.drizzle.test.ts`

Expected: fail because schema does not exist.

- [ ] **Step 3: Add quiz and quiz option tables**

Create `quiz` and `quiz_option` tables with fields and relations from the spec.

- [ ] **Step 4: Generate migration**

Run: `pnpm db:generate`

Expected: migration includes quiz tables and indexes.

- [ ] **Step 5: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/quiz/quiz.repository.drizzle.test.ts`

Expected: pass.

- [ ] **Step 6: Commit**

Commit: `feat: add quiz database schema`

---

## Task 22: Quiz Validation Schemas And Invariant Helpers

**Files:**

- Create: `src/lib/server/services/quiz/quiz.constant.ts`
- Create: `src/lib/server/services/quiz/quiz.invariant.ts`
- Create: `src/lib/server/services/quiz/quiz.invariant.test.ts`
- Create: `src/lib/schemas/quiz.ts`
- Test: `src/lib/schemas/quiz.test.ts`

- [ ] **Step 1: Add failing schema and invariant tests**

Cover quiz type picklist, create/update/delete schemas, option create/update/delete schemas, embedded option output, MC exactly one correct when complete, MS at least one correct when options exist, and FITB exactly one correct option.

- [ ] **Step 2: Run failing tests**

Run: `pnpm test:unit -- --run src/lib/schemas/quiz.test.ts src/lib/server/services/quiz/quiz.invariant.test.ts`

Expected: fail because files do not exist.

- [ ] **Step 3: Implement schemas and invariant helpers**

Keep Valibot input validation separate from cross-row invariant checks. Export pure helper functions such as `assertQuizOptionSetValid` and `assertQuizOptionMutationValid` that throw `ORPCError` codes required by the spec.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/schemas/quiz.test.ts src/lib/server/services/quiz/quiz.invariant.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add quiz schemas and invariants`

---

## Task 23: Quiz Repository And Guard

**Files:**

- Create: `src/lib/server/services/quiz/quiz.repository.ts`
- Create: `src/lib/server/services/quiz/quiz.repository.drizzle.ts`
- Create: `src/lib/server/services/quiz/quiz.guard.ts`
- Create: `src/lib/server/services/quiz/quiz.testing.ts`
- Create: `src/lib/server/services/quiz/quiz.guard.test.ts`
- Modify: `src/lib/server/services/quiz/quiz.repository.drizzle.test.ts`

- [ ] **Step 1: Add failing tests**

Cover owned StudySet/Chapter creation checks, visible parent StudySet query checks, embedded options ordered by creation time, batch delete blocked IDs, and all-or-nothing option batch inserts/deletes.

- [ ] **Step 2: Run failing tests**

Run: `pnpm test:unit -- --run src/lib/server/services/quiz/quiz.guard.test.ts src/lib/server/services/quiz/quiz.repository.drizzle.test.ts`

Expected: fail because files do not exist.

- [ ] **Step 3: Implement repository and guard**

Repository must expose methods to load quizzes with options, create quiz with options transactionally, create options transactionally, update option, delete quiz batch, delete option batch, and inspect existing option sets for invariant checks.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/quiz/quiz.guard.test.ts src/lib/server/services/quiz/quiz.repository.drizzle.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add quiz repository and guard`

---

## Task 24: Quiz Service

**Files:**

- Create: `src/lib/server/services/quiz/quiz.service.ts`
- Create: `src/lib/server/services/quiz/quiz.service.test.ts`

- [ ] **Step 1: Add failing service tests**

Cover create without options, create with options atomically, update question text only, delete quizzes all-or-nothing, create options batch invariants, update option invariants, delete option invariants, get/list embedded options, and error propagation.

- [ ] **Step 2: Run failing tests**

Run: `pnpm test:unit -- --run src/lib/server/services/quiz/quiz.service.test.ts`

Expected: fail because service does not exist.

- [ ] **Step 3: Implement service**

Use guard checks before writes, invariant helpers before mutating option sets, DTO mapping for quiz with embedded options, and ORPCError codes from the spec.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/quiz/quiz.service.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add quiz service`

---

## Task 25: Quiz Router And API Wiring

**Files:**

- Create: `src/lib/server/services/quiz/commands/quiz.create.ts`
- Create: `src/lib/server/services/quiz/commands/quiz.update.ts`
- Create: `src/lib/server/services/quiz/commands/quiz.delete.ts`
- Create: `src/lib/server/services/quiz/commands/quiz-option.create.ts`
- Create: `src/lib/server/services/quiz/commands/quiz-option.update.ts`
- Create: `src/lib/server/services/quiz/commands/quiz-option.delete.ts`
- Create: `src/lib/server/services/quiz/queries/quiz.list.ts`
- Create: `src/lib/server/services/quiz/queries/quiz.get.ts`
- Create: `src/lib/server/services/quiz/quiz.router.ts`
- Modify: `src/lib/server/api/index.ts`

- [ ] **Step 1: Add command/query files**

Use nested router shape `quiz.option.create`, `quiz.option.update`, and `quiz.option.delete` for option procedures. Keep quiz procedures at `quiz.create`, `quiz.update`, `quiz.delete`, `quiz.list`, and `quiz.get`.

- [ ] **Step 2: Wire router**

Add `quiz: quizRouter` to the API router.

- [ ] **Step 3: Verify**

Run: `pnpm check`

Expected: pass.

- [ ] **Step 4: Commit**

Commit: `feat: wire quiz router`

---

## Task 26: Referral Database Schema

**Files:**

- Create: `src/lib/server/infras/db/schema/referral.ts`
- Modify: `src/lib/server/infras/db/schema/index.ts`
- Test: `src/lib/server/services/referral/referral.repository.drizzle.test.ts`

- [ ] **Step 1: Add failing schema integration test**

Test unique profile user ID, unique slug, unique relationship referred user ID, unique subscription event idempotency key, cascade delete from user and relationship, and indexes on referrer/referred fields.

- [ ] **Step 2: Run failing test**

Run: `pnpm test:unit -- --run src/lib/server/services/referral/referral.repository.drizzle.test.ts`

Expected: fail because schema does not exist.

- [ ] **Step 3: Add referral tables**

Create `referral_profile`, `referral_relationship`, and `referral_subscription_event` with Date timestamp columns and foreign keys from the spec.

- [ ] **Step 4: Generate migration**

Run: `pnpm db:generate`

Expected: migration adds referral tables and constraints.

- [ ] **Step 5: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/referral/referral.repository.drizzle.test.ts`

Expected: pass.

- [ ] **Step 6: Commit**

Commit: `feat: add referral database schema`

---

## Task 27: Referral Schemas And Repository

**Files:**

- Create: `src/lib/server/services/referral/referral.constant.ts`
- Create: `src/lib/schemas/referral.ts`
- Create: `src/lib/server/services/referral/referral.repository.ts`
- Create: `src/lib/server/services/referral/referral.repository.drizzle.ts`
- Create: `src/lib/server/services/referral/referral.testing.ts`
- Test: `src/lib/schemas/referral.test.ts`
- Test: `src/lib/server/services/referral/referral.repository.drizzle.test.ts`

- [ ] **Step 1: Add failing schema/repository tests**

Cover profile lookup/create, slug lookup normalization, relationship uniqueness, idempotency key uniqueness, optimistic profile update by version, and resulting-balance non-negative protection.

- [ ] **Step 2: Run failing tests**

Run: `pnpm test:unit -- --run src/lib/schemas/referral.test.ts src/lib/server/services/referral/referral.repository.drizzle.test.ts`

Expected: fail because files are missing.

- [ ] **Step 3: Implement schemas and repository**

Use Valibot point/version/idempotency validators and repository methods that return conflict result objects instead of throwing domain errors.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/schemas/referral.test.ts src/lib/server/services/referral/referral.repository.drizzle.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add referral schemas and repository`

---

## Task 28: Referral Guard And Service

**Files:**

- Create: `src/lib/server/services/referral/referral.guard.ts`
- Create: `src/lib/server/services/referral/referral.guard.test.ts`
- Create: `src/lib/server/services/referral/referral.service.ts`
- Create: `src/lib/server/services/referral/referral.service.test.ts`

- [ ] **Step 1: Add failing tests**

Cover auth-required profile operations, trusted server mutations, lazy profile creation requiring usable username, slug conflict retry exhaustion, self-referral rejection, existing relationship rejection, repeated awards with distinct idempotency keys, duplicate idempotency conflicts, optimistic locking conflict with current version, and negative adjustment conflict.

- [ ] **Step 2: Run failing tests**

Run: `pnpm test:unit -- --run src/lib/server/services/referral/referral.guard.test.ts src/lib/server/services/referral/referral.service.test.ts`

Expected: fail because guard/service files do not exist.

- [ ] **Step 3: Implement guard and service**

Keep user-facing methods auth-gated. Expose service methods for server-side orchestration without client routes for relationship/point commands unless the API layer marks them trusted.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/referral/referral.guard.test.ts src/lib/server/services/referral/referral.service.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add referral service`

---

## Task 29: Referral Router And API Wiring

**Files:**

- Create: `src/lib/server/services/referral/commands/referral.get-or-create-profile.ts`
- Create: `src/lib/server/services/referral/queries/referral.get-my-profile.ts`
- Create: `src/lib/server/services/referral/queries/referral.resolve-slug.ts`
- Create: `src/lib/server/services/referral/referral.router.ts`
- Modify: `src/lib/server/api/index.ts`

- [ ] **Step 1: Add user-facing procedures**

Expose only `getOrCreateProfile`, `getMyProfile`, and `resolveSlug` to clients. Keep relationship and point mutations as service methods for trusted server orchestration.

- [ ] **Step 2: Wire router**

Add `referral: referralRouter` to the API router.

- [ ] **Step 3: Verify**

Run: `pnpm check`

Expected: pass.

- [ ] **Step 4: Commit**

Commit: `feat: wire referral router`

---

## Task 30: Subscription Database Schema

**Files:**

- Create: `src/lib/server/infras/db/schema/subscription.ts`
- Modify: `src/lib/server/infras/db/schema/index.ts`
- Test: `src/lib/server/services/subscription/subscription.repository.drizzle.test.ts`

- [ ] **Step 1: Add failing schema integration test**

Test order and period inserts, local order ID uniqueness, indexes, nullable period `orderId`, user cascade behavior, and order delete preserving period when `orderId` is set null.

- [ ] **Step 2: Run failing test**

Run: `pnpm test:unit -- --run src/lib/server/services/subscription/subscription.repository.drizzle.test.ts`

Expected: fail because schema does not exist.

- [ ] **Step 3: Add subscription tables**

Create `subscription_order` and `subscription_period` with enum text fields, ID prefixes, timestamp columns, and indexes from the spec.

- [ ] **Step 4: Generate migration**

Run: `pnpm db:generate`

Expected: migration adds subscription tables and constraints.

- [ ] **Step 5: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/subscription/subscription.repository.drizzle.test.ts`

Expected: pass.

- [ ] **Step 6: Commit**

Commit: `feat: add subscription database schema`

---

## Task 31: Subscription Constants And Schemas

**Files:**

- Create: `src/lib/server/services/subscription/subscription.constant.ts`
- Create: `src/lib/server/services/subscription/subscription.pricing.ts`
- Create: `src/lib/server/services/subscription/subscription.pricing.test.ts`
- Create: `src/lib/schemas/subscription.ts`
- Test: `src/lib/schemas/subscription.test.ts`

- [ ] **Step 1: Add failing pricing and schema tests**

Cover all plan/duration amount combinations, duration day counts, floor rounding, referral reward points capped at `25_000`, input validation for paid plans only, duration picklists, reason trimming, and output wrappers.

- [ ] **Step 2: Run failing tests**

Run: `pnpm test:unit -- --run src/lib/server/services/subscription/subscription.pricing.test.ts src/lib/schemas/subscription.test.ts`

Expected: fail because files do not exist.

- [ ] **Step 3: Implement constants, pricing, and schemas**

Create typed plan maps for `FREE`, `PRO`, `PREMIUM`; duration maps for `MONTHLY`, `QUARTERLY`, `SEMI_ANNUAL`; and Valibot schemas for all commands and queries.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/subscription/subscription.pricing.test.ts src/lib/schemas/subscription.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add subscription pricing and schemas`

---

## Task 32: Subscription Repository And Guard

**Files:**

- Create: `src/lib/server/services/subscription/subscription.repository.ts`
- Create: `src/lib/server/services/subscription/subscription.repository.drizzle.ts`
- Create: `src/lib/server/services/subscription/subscription.guard.ts`
- Create: `src/lib/server/services/subscription/subscription.testing.ts`
- Create: `src/lib/server/services/subscription/subscription.guard.test.ts`
- Modify: `src/lib/server/services/subscription/subscription.repository.drizzle.test.ts`

- [ ] **Step 1: Add failing tests**

Cover order creation snapshots, pending order lookup, local order status updates, active/future period lookup, current plan precedence, cleanup mutations, manual grant/revoke mutations, and user/admin ownership checks.

- [ ] **Step 2: Run failing tests**

Run: `pnpm test:unit -- --run src/lib/server/services/subscription/subscription.guard.test.ts src/lib/server/services/subscription/subscription.repository.drizzle.test.ts`

Expected: fail because files do not exist.

- [ ] **Step 3: Implement repository and guard**

Repository must expose small operations used by the service and never call external payment providers or Referral. Guard must cover auth, admin auth, own-order access, and manual admin operations.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/subscription/subscription.guard.test.ts src/lib/server/services/subscription/subscription.repository.drizzle.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add subscription repository and guard`

---

## Task 33: Subscription Local Order And Status Service

**Files:**

- Create: `src/lib/server/services/subscription/subscription.service.ts`
- Create: `src/lib/server/services/subscription/subscription.service.test.ts`

- [ ] **Step 1: Add failing service tests for local orders/status**

Cover auth, paid plan validation, invalid duration, lower-plan transition rejection, server amount calculation, local pending order creation with a 1-hour expiry, `GetMySubscriptionStatus`, and `GetCurrentPlanForUser` pure read behavior.

- [ ] **Step 2: Run failing tests**

Run: `pnpm test:unit -- --run src/lib/server/services/subscription/subscription.service.test.ts`

Expected: fail because service does not exist.

- [ ] **Step 3: Implement local order and status methods**

Inject repository and guard dependencies. Keep current-plan helper server-only and do not expose it through router. Do not integrate an external payment provider in this plan.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/subscription/subscription.service.test.ts`

Expected: local order/status tests pass.

- [ ] **Step 5: Commit**

Commit: `feat: add subscription local order and status service`

---

## Task 34: Subscription Payment Update Processing

**Files:**

- Modify: `src/lib/server/services/subscription/subscription.service.ts`
- Modify: `src/lib/server/services/subscription/subscription.service.test.ts`

- [ ] **Step 1: Add failing payment tests**

Cover paid activation with matching amount, amount mismatch conflict, late paid update after local expiry, duplicate paid update idempotent no-op, pending/expired/canceled/failed mappings, refund excluding access, partial refund ignored for access changes, unknown status stored unresolved, and impossible transition conflict.

- [ ] **Step 2: Run failing tests**

Run: `pnpm test:unit -- --run src/lib/server/services/subscription/subscription.service.test.ts`

Expected: fail on payment-processing cases.

- [ ] **Step 3: Implement payment update processing**

Update order state first, create/extend/refund period second, store selected provider-agnostic diagnostic fields, and leave manual repair path documented by repository state when period creation fails after order update.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/subscription/subscription.service.test.ts`

Expected: payment-processing tests pass.

- [ ] **Step 5: Commit**

Commit: `feat: process subscription payment updates`

---

## Task 35: Subscription Admin And Referral Side Effects

**Files:**

- Modify: `src/lib/server/services/subscription/subscription.service.ts`
- Modify: `src/lib/server/services/subscription/subscription.service.test.ts`

- [ ] **Step 1: Add failing admin/referral tests**

Cover cleanup counts, manual grant same-plan extension, manual revoke reason validation, full refund period marking, referral reward calculation, idempotency key `subscription-order:<orderId>`, success status `AWARDED`, failure status `FAILED`, and `NOT_APPLICABLE` when no eligible referral exists.

- [ ] **Step 2: Run failing tests**

Run: `pnpm test:unit -- --run src/lib/server/services/subscription/subscription.service.test.ts`

Expected: fail on admin/referral cases.

- [ ] **Step 3: Implement admin/referral flows**

Keep referral failures from rolling back paid access. Store `referralRewardStatus` exactly as the spec requires.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/subscription/subscription.service.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add subscription admin and referral flows`

---

## Task 36: Subscription Router

**Files:**

- Create: `src/lib/server/services/subscription/commands/subscription.create-order.ts`
- Create: `src/lib/server/services/subscription/commands/subscription.cleanup.ts`
- Create: `src/lib/server/services/subscription/commands/subscription.grant-period.ts`
- Create: `src/lib/server/services/subscription/commands/subscription.revoke-period.ts`
- Create: `src/lib/server/services/subscription/queries/subscription.get-my-status.ts`
- Create: `src/lib/server/services/subscription/subscription.router.ts`
- Modify: `src/lib/server/api/index.ts`

- [ ] **Step 1: Add command/query files**

Use `authorizedProcedure` for user local order creation and status, and `adminProcedure` for cleanup/grant/revoke.

- [ ] **Step 2: Wire router**

Add `subscription: subscriptionRouter` to API router.

- [ ] **Step 3: Verify**

Run: `pnpm check`

Expected: pass.

- [ ] **Step 4: Commit**

Commit: `feat: wire subscription router`

---

## Task 37: Rate Limiter Database Schema

**Files:**

- Create: `src/lib/server/infras/db/schema/rate-limiter.ts`
- Modify: `src/lib/server/infras/db/schema/index.ts`
- Test: `src/lib/server/services/rate-limiter/rate-limiter.repository.drizzle.test.ts`

- [ ] **Step 1: Add failing schema integration test**

Test usage uniqueness `(userId, windowType, windowStart)`, operation references to daily and weekly usage rows, cascade delete from user, and cleanup indexes.

- [ ] **Step 2: Run failing test**

Run: `pnpm test:unit -- --run src/lib/server/services/rate-limiter/rate-limiter.repository.drizzle.test.ts`

Expected: fail because schema does not exist.

- [ ] **Step 3: Add rate limiter tables**

Create `rate_limit_usage` and `rate_limit_operation` with fields and indexes from the spec.

- [ ] **Step 4: Generate migration**

Run: `pnpm db:generate`

Expected: migration adds rate limiter tables and constraints.

- [ ] **Step 5: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/rate-limiter/rate-limiter.repository.drizzle.test.ts`

Expected: pass.

- [ ] **Step 6: Commit**

Commit: `feat: add rate limiter database schema`

---

## Task 38: Rate Limiter Constants, Schemas, And Windows

**Files:**

- Create: `src/lib/server/services/rate-limiter/rate-limiter.constant.ts`
- Create: `src/lib/server/services/rate-limiter/rate-limiter.window.ts`
- Create: `src/lib/server/services/rate-limiter/rate-limiter.window.test.ts`
- Create: `src/lib/schemas/rate-limiter.ts`
- Test: `src/lib/schemas/rate-limiter.test.ts`

- [ ] **Step 1: Add failing tests**

Cover plan limits, unknown plan validation, amount validation, UTC day reset, ISO Monday week reset, output status shapes, and cleanup request `olderThanDays: 90`.

- [ ] **Step 2: Run failing tests**

Run: `pnpm test:unit -- --run src/lib/server/services/rate-limiter/rate-limiter.window.test.ts src/lib/schemas/rate-limiter.test.ts`

Expected: fail because files do not exist.

- [ ] **Step 3: Implement constants, windows, and schemas**

Use shared UTC helpers and hardcoded plan limit map from the spec.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/rate-limiter/rate-limiter.window.test.ts src/lib/schemas/rate-limiter.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add rate limiter schemas and windows`

---

## Task 39: Rate Limiter Repository, Guard, And Service

**Files:**

- Create: `src/lib/server/services/rate-limiter/rate-limiter.repository.ts`
- Create: `src/lib/server/services/rate-limiter/rate-limiter.repository.drizzle.ts`
- Create: `src/lib/server/services/rate-limiter/rate-limiter.guard.ts`
- Create: `src/lib/server/services/rate-limiter/rate-limiter.testing.ts`
- Create: `src/lib/server/services/rate-limiter/rate-limiter.service.ts`
- Create: `src/lib/server/services/rate-limiter/rate-limiter.service.test.ts`
- Create: `src/lib/server/services/rate-limiter/rate-limiter.guard.test.ts`
- Modify: `src/lib/server/services/rate-limiter/rate-limiter.repository.drizzle.test.ts`

- [ ] **Step 1: Add failing tests**

Cover missing status rows returning zero without writes, lazy row creation on first consumption, atomic daily/weekly consume success, over-limit failure with no row changes, refund success, double refund conflict, non-negative counters, and cleanup deleted count.

- [ ] **Step 2: Run failing tests**

Run: `pnpm test:unit -- --run src/lib/server/services/rate-limiter/rate-limiter.service.test.ts src/lib/server/services/rate-limiter/rate-limiter.guard.test.ts src/lib/server/services/rate-limiter/rate-limiter.repository.drizzle.test.ts`

Expected: fail because service files do not exist.

- [ ] **Step 3: Implement repository, guard, and service**

Inject `subscriptionService.getCurrentPlanForUser` or a small `currentPlanLookup` dependency into the service. Keep consume/refund writes inside a Drizzle transaction.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/rate-limiter/rate-limiter.service.test.ts src/lib/server/services/rate-limiter/rate-limiter.guard.test.ts src/lib/server/services/rate-limiter/rate-limiter.repository.drizzle.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add rate limiter service`

---

## Task 40: Rate Limiter Router And API Wiring

**Files:**

- Create: `src/lib/server/services/rate-limiter/commands/rate-limiter.consume.ts`
- Create: `src/lib/server/services/rate-limiter/commands/rate-limiter.refund.ts`
- Create: `src/lib/server/services/rate-limiter/commands/rate-limiter.cleanup.ts`
- Create: `src/lib/server/services/rate-limiter/queries/rate-limiter.get-status.ts`
- Create: `src/lib/server/services/rate-limiter/rate-limiter.router.ts`
- Modify: `src/lib/server/api/index.ts`

- [ ] **Step 1: Add command/query files**

Use `authorizedProcedure` for consume/refund/status and `adminProcedure` for cleanup.

- [ ] **Step 2: Wire router**

Add `rateLimiter: rateLimiterRouter` to the API router.

- [ ] **Step 3: Verify**

Run: `pnpm check`

Expected: pass.

- [ ] **Step 4: Commit**

Commit: `feat: wire rate limiter router`

---

## Task 41: FSRS Dependency And Database Schema

**Files:**

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/lib/server/infras/db/schema/fsrs.ts`
- Modify: `src/lib/server/infras/db/schema/index.ts`
- Test: `src/lib/server/services/fsrs/fsrs.repository.drizzle.test.ts`

- [ ] **Step 1: Fetch current ts-fsrs docs**

Use `find-docs` for `ts-fsrs` card/rating APIs before adding the scheduler adapter.

- [ ] **Step 2: Add dependency**

Run: `pnpm add ts-fsrs`

Expected: `package.json` and `pnpm-lock.yaml` update.

- [ ] **Step 3: Add failing schema integration test**

Test prefixed IDs, unique flashcard state `(userId, flashcardId)`, unique session `(userId, studySetId)`, repeated review logs allowed, cascade deletes, due/session indexes, and JSON snapshots.

- [ ] **Step 4: Run failing test**

Run: `pnpm test:unit -- --run src/lib/server/services/fsrs/fsrs.repository.drizzle.test.ts`

Expected: fail because schema does not exist.

- [ ] **Step 5: Add FSRS tables**

Create `flashcard_state`, `review_session`, and `review_log` with fields and indexes from the spec.

- [ ] **Step 6: Generate migration**

Run: `pnpm db:generate`

Expected: migration adds FSRS tables and constraints.

- [ ] **Step 7: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/fsrs/fsrs.repository.drizzle.test.ts`

Expected: pass.

- [ ] **Step 8: Commit**

Commit: `feat: add FSRS dependency and schema`

---

## Task 42: FSRS Schemas And Scheduler Adapter

**Files:**

- Create: `src/lib/server/services/fsrs/fsrs.constant.ts`
- Create: `src/lib/server/services/fsrs/fsrs.scheduler.ts`
- Create: `src/lib/server/services/fsrs/fsrs.scheduler.test.ts`
- Create: `src/lib/schemas/fsrs.ts`
- Test: `src/lib/schemas/fsrs.test.ts`

- [ ] **Step 1: Add failing tests**

Cover prefixed ID schemas, rating picklist, public `FsrsCardState` shape, timestamp conversion, empty-card preview for all ratings, ts-fsrs rating mapping, and exclusion of deprecated elapsed-day fields.

- [ ] **Step 2: Run failing tests**

Run: `pnpm test:unit -- --run src/lib/server/services/fsrs/fsrs.scheduler.test.ts src/lib/schemas/fsrs.test.ts`

Expected: fail because files do not exist.

- [ ] **Step 3: Implement schemas and scheduler adapter**

Hide ts-fsrs Date/object details behind adapter functions that accept and return service-owned DTO shapes.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/fsrs/fsrs.scheduler.test.ts src/lib/schemas/fsrs.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add FSRS schemas and scheduler adapter`

---

## Task 43: FSRS Repository And Guard

**Files:**

- Create: `src/lib/server/services/fsrs/fsrs.repository.ts`
- Create: `src/lib/server/services/fsrs/fsrs.repository.drizzle.ts`
- Create: `src/lib/server/services/fsrs/fsrs.guard.ts`
- Create: `src/lib/server/services/fsrs/fsrs.testing.ts`
- Create: `src/lib/server/services/fsrs/fsrs.guard.test.ts`
- Modify: `src/lib/server/services/fsrs/fsrs.repository.drizzle.test.ts`

- [ ] **Step 1: Add failing tests**

Cover session ownership, current StudySet visibility, flashcard belongs to session StudySet, live new/due worklist queries, progress counts, atomic review write operations, delete session cleanup, and due StudySet dashboard query.

- [ ] **Step 2: Run failing tests**

Run: `pnpm test:unit -- --run src/lib/server/services/fsrs/fsrs.guard.test.ts src/lib/server/services/fsrs/fsrs.repository.drizzle.test.ts`

Expected: fail because files do not exist.

- [ ] **Step 3: Implement repository and guard**

Repository must return only IDs and scheduling state for session cards. Guard must block commands when the parent StudySet becomes inaccessible.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/fsrs/fsrs.guard.test.ts src/lib/server/services/fsrs/fsrs.repository.drizzle.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add FSRS repository and guard`

---

## Task 44: FSRS Service

**Files:**

- Create: `src/lib/server/services/fsrs/fsrs.service.ts`
- Create: `src/lib/server/services/fsrs/fsrs.service.test.ts`

- [ ] **Step 1: Add failing service tests**

Cover `StartSession` get-or-create, `DeleteSession` resetting state, `ReviewFlashcard` new card flow, repeated review after due, reject other-StudySet flashcard, reject not-due reviewed card, atomic state/log/session update, `GetSession`, `GetSessions` derived completion filtering, `GetSessionCards` new before due with previews, and `GetStudySetsWithDueCards` excluding never-reviewed cards.

- [ ] **Step 2: Run failing test**

Run: `pnpm test:unit -- --run src/lib/server/services/fsrs/fsrs.service.test.ts`

Expected: fail because service does not exist.

- [ ] **Step 3: Implement service**

Use scheduler adapter for previews/reviews, repository transactions for review writes, and live progress computation for every returned session.

- [ ] **Step 4: Verify**

Run: `pnpm test:unit -- --run src/lib/server/services/fsrs/fsrs.service.test.ts`

Expected: pass.

- [ ] **Step 5: Commit**

Commit: `feat: add FSRS service`

---

## Task 45: FSRS Router And API Wiring

**Files:**

- Create: `src/lib/server/services/fsrs/commands/fsrs.start-session.ts`
- Create: `src/lib/server/services/fsrs/commands/fsrs.delete-session.ts`
- Create: `src/lib/server/services/fsrs/commands/fsrs.review-flashcard.ts`
- Create: `src/lib/server/services/fsrs/queries/fsrs.get-session.ts`
- Create: `src/lib/server/services/fsrs/queries/fsrs.get-sessions.ts`
- Create: `src/lib/server/services/fsrs/queries/fsrs.get-session-cards.ts`
- Create: `src/lib/server/services/fsrs/queries/fsrs.get-study-sets-with-due-cards.ts`
- Create: `src/lib/server/services/fsrs/fsrs.router.ts`
- Modify: `src/lib/server/api/index.ts`

- [ ] **Step 1: Add command/query files**

Use `authorizedProcedure` for all FSRS operations and declare FSRS error maps on procedures that can throw domain-specific codes.

- [ ] **Step 2: Wire router**

Add `fsrs: fsrsRouter` to API router.

- [ ] **Step 3: Verify**

Run: `pnpm check`

Expected: pass.

- [ ] **Step 4: Commit**

Commit: `feat: wire FSRS router`

---

## Task 46: Cross-Domain Cascade And Integration Tests

**Files:**

- Modify: repository integration tests across StudySet, Chapter, Flashcard, Quiz, FSRS, Referral, Subscription, and Rate Limiter.

- [ ] **Step 1: Add cross-domain cascade tests**

Cover StudySet delete cascading to chapters, flashcards, quizzes, quiz options, and FSRS rows through flashcard/study set references.

- [ ] **Step 2: Add cross-domain visibility tests**

Cover public/private StudySet visibility inherited by Chapter, Flashcard, Quiz, and FSRS state privacy for public StudySets.

- [ ] **Step 3: Run all service tests**

Run: `pnpm test:unit -- --run src/lib/server/services`

Expected: pass.

- [ ] **Step 4: Commit**

Commit: `test: add cross-domain integration coverage`

---

## Task 47: Final API And Migration Verification

**Files:**

- Modify: generated migration files under `drizzle/` if `pnpm db:generate` produced them in earlier tasks.
- Modify: `src/lib/server/api/index.ts` only if a router is missing.

- [ ] **Step 1: Verify API router exports**

Confirm `router` contains `studySet`, `chapter`, `flashcard`, `quiz`, `referral`, `subscription`, `rateLimiter`, and `fsrs`.

- [ ] **Step 2: Regenerate migrations once**

Run: `pnpm db:generate`

Expected: no unintended migration churn after all schemas are exported.

- [ ] **Step 3: Run full test suite**

Run: `pnpm test`

Expected: pass.

- [ ] **Step 4: Run typecheck**

Run: `pnpm check`

Expected: pass.

- [ ] **Step 5: Run lint**

Run: `pnpm lint`

Expected: pass.

- [ ] **Step 6: Commit**

Commit: `chore: verify all service specs`

---

## Spec Coverage Checklist

- StudySet: create/update/delete/list/get, slug rules, visibility, files, visits, admin cleanup, schema constants, API response envelopes.
- Chapter: create/update/delete/list/get, scoped slug rules, non-empty delete block, inherited visibility, schema persistence.
- Flashcard: batch create/delete, update replace semantics, importance rules, inherited visibility, rating UI.
- Quiz: quiz CRUD, option CRUD, embedded options, type invariants, all-or-nothing batch behavior.
- Referral: lazy profile, slug resolution, relationships, points, idempotency, optimistic locking, trusted orchestration methods.
- Subscription: pricing, durations, local orders, provider-agnostic payment updates, activation/renewal/upgrade/refund/revoke, referral rewards, cleanup, current-plan lookup.
- Rate Limiter: UTC windows, hardcoded plan limits, status, atomic consume/refund, cleanup, subscription current-plan integration.
- FSRS: prefixed IDs, sessions, live worklists, review state/logs, previews, due dashboard, access blocking after StudySet visibility changes.

## Execution Handoff

Plan complete. Recommended execution is subagent-driven by domain after the shared foundation tasks are complete, because domains after Flashcard/Quiz can be developed with fewer file conflicts.
