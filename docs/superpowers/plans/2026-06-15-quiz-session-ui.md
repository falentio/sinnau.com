# Quiz Session UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the three frontend pages (hub, taking, results) for the quiz-session domain on top of the existing backend (`src/lib/server/services/quiz-session/`), plus one new backend query (`countInScope`) the hub needs to render chapter picker counts.

**Architecture:** Three SvelteKit routes under a shared `+layout.{svelte,server.ts}` that pre-loads `{ studySet, chapters }` once for the subtree. Data loading uses the oRPC client (`$lib/orpc`) in `+page.server.ts` (per the project rule — never call `<Domain>Service` from SvelteKit form/page/layout loads). Form actions use **formsnap + valibot** (per the project rule). Auto-save on the taking page calls `orpc.quizSession.submitAnswer(...)` **directly** (not a SvelteKit form action) so the page's load isn't revalidated on every click — the page owns the canonical `localAnswers` map and the progress pills derive from it.

**Tech Stack:** SvelteKit (Svelte 5 runes), oRPC, valibot, formsnap + sveltekit-superforms, shadcn-svelte, Tailwind v4, hugeicons, sonner, vitest.

**Spec reference:** `docs/superpowers/specs/2026-06-15-quiz-session-ui-design.md` — read the relevant section before starting each task.

---

## File Map

| File                                                                             | Action  | Purpose                                                                                             |
| -------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| `src/lib/schemas/quiz-session.ts`                                                | Modify  | Add `countQuizSessionInScopeInputSchema` / output + inferred types                                  |
| `src/lib/server/services/quiz-session/queries/quiz-session.count-in-scope.ts`    | Create  | Thin oRPC query delegating to service                                                               |
| `src/lib/server/services/quiz-session/quiz-session.service.ts`                   | Modify  | Add `countInScope` method                                                                           |
| `src/lib/server/services/quiz-session/quiz-session.router.ts`                    | Modify  | Register `countInScope`                                                                             |
| `src/lib/server/services/quiz-session/quiz-session.service.test.ts`              | Modify  | Add `describe.concurrent('countInScope', ...)` block                                                |
| `src/lib/server/services/quiz-session/quiz-session.utils.ts`                     | Create  | Dev stub fixtures (mirrors `quiz/quiz.utils.ts`)                                                    |
| `src/lib/utils/quiz-session.ts`                                                  | Create  | `formatSessionTimestamp`, `scoreToCopy`, `sessionStatusLabel`, `tweenedScore`, `answerStateForPill` |
| `src/lib/utils/quiz-session.test.ts`                                             | Create  | Unit tests for pure utilities                                                                       |
| `src/lib/components/features/quiz-session/session-header.svelte`                 | Create  | Slim back-button + study-set title                                                                  |
| `src/lib/components/features/quiz-session/quiz-session-card.svelte`              | Create  | Card A (active) + Card B (start)                                                                    |
| `src/lib/components/features/quiz-session/chapter-scope-picker.svelte`           | Create  | Controlled horizontal chip row for chapter scope                                                    |
| `src/lib/components/features/quiz-session/quiz-session-list-filter.svelte`       | Create  | Three-chip filter `[Semua] [Aktif] [Selesai]` for the recent list                                   |
| `src/lib/components/features/quiz-session/quiz-session-row.svelte`               | Create  | Single past-session row                                                                             |
| `src/lib/components/features/quiz-session/quiz-session-empty.svelte`             | Create  | 0-quiz scope empty state                                                                            |
| `src/lib/components/features/quiz-session/question-card.svelte`                  | Create  | Three variants (MC / MS / FITB) with `$bindable` onChange callback                                  |
| `src/lib/components/features/quiz-session/option-row.svelte`                     | Create  | Single option row (radio / checkbox / text input)                                                   |
| `src/lib/components/features/quiz-session/progress-pills.svelte`                 | Create  | N clickable pill segments, 4 visual states                                                          |
| `src/lib/components/features/quiz-session/complete-session-sheet.svelte`         | Create  | Selesai confirmation bottom sheet                                                                   |
| `src/lib/components/features/quiz-session/results-hero.svelte`                   | Create  | Massive score with count-up animation                                                               |
| `src/lib/components/features/quiz-session/failing-chapter-row.svelte`            | Create  | Chip list of failing chapters (informational only)                                                  |
| `src/lib/components/features/quiz-session/incorrect-question-card.svelte`        | Create  | Wrong/right/explanation review card, 3 variants                                                     |
| `src/routes/(app)/session/[studySetId]/quiz/+layout.svelte`                      | Create  | Renders `<session-header>` + `<slot/>`                                                              |
| `src/routes/(app)/session/[studySetId]/quiz/+layout.server.ts`                   | Create  | Loads `{ studySet, chapters }` once                                                                 |
| `src/routes/(app)/session/[studySetId]/quiz/+page.svelte`                        | Replace | Hub: Card A + Card B + recent list + filter                                                         |
| `src/routes/(app)/session/[studySetId]/quiz/+page.server.ts`                     | Replace | Hub load + `?/createSession` action                                                                 |
| `src/routes/(app)/session/[studySetId]/quiz/[sessionId]/+page.svelte`            | Create  | Taking page (one-question-per-screen)                                                               |
| `src/routes/(app)/session/[studySetId]/quiz/[sessionId]/+page.server.ts`         | Create  | Taking load + `?/completeSession` action                                                            |
| `src/routes/(app)/session/[studySetId]/quiz/[sessionId]/results/+page.svelte`    | Create  | Results page                                                                                        |
| `src/routes/(app)/session/[studySetId]/quiz/[sessionId]/results/+page.server.ts` | Create  | Results load                                                                                        |

---

## Required Skills (Mandatory)

Before working on **any** frontend/Svelte task (Tasks 4, 5, 6, 7), the engineer MUST load the listed sub-skills and follow the Svelte MCP workflow below. These skills take priority over any code sample in this plan when they conflict — the plan's Svelte templates are starting points, not final decisions.

### Required sub-skills (load via `skill` tool BEFORE any UI work)

1. **`design-taste-frontend`** — Anti-slop frontend skill. Reads the brief, infers the right design direction, ships interfaces that do not look templated. Audit-first on redesigns, strict pre-flight check.
2. **`high-end-visual-design`** — High-end-agency rules for fonts, spacing, shadows, card structures, and animations. Blocks AI defaults that make designs look cheap or generic.

### Required documentation (per project `AGENTS.md`)

- **shadcn-svelte** — fetch `https://shadcn-svelte.com/llms.txt` whenever working with `$lib/components/ui/**/*` (Button, Sheet, Badge, etc.).
- **Svelte 5 / SvelteKit** — use the Svelte MCP server (`Svelte_list-sections` → `Svelte_get-documentation`) before writing runes (`$state`, `$derived`, `$props`, `$effect`, `$bindable`, snippets, callback props).

### Per-step Svelte workflow

1. Read the task's "Read first" callout.
2. Load the required sub-skills.
3. Read the relevant Svelte 5 / SvelteKit sections for the runes you'll use.
4. Write the component.
5. Run `svelte_svelte-autofixer` and iterate until it returns no issues or suggestions.
6. Run `rtk pnpm run check`, `rtk pnpm run lint:agent`, `rtk pnpm run format` (in that order).
7. Visually verify in `pnpm dev` against the dev-stub URL pattern.

**Skilled-enforcement check**: a step is not done until the autofixer is clean **AND** the visual smoke test in `pnpm dev` matches the design direction implied by `design-taste-frontend` + `high-end-visual-design`. Silent autofixer + templated look (uniform border-radius, generic gray, copy-paste shadcn defaults) = re-run the design skills before claiming the step is complete.

---

## Task 1: Backend `countInScope` query

**Files:**

- Modify: `src/lib/schemas/quiz-session.ts`
- Create: `src/lib/server/services/quiz-session/queries/quiz-session.count-in-scope.ts`
- Modify: `src/lib/server/services/quiz-session/quiz-session.service.ts`
- Modify: `src/lib/server/services/quiz-session/quiz-session.router.ts`
- Modify: `src/lib/server/services/quiz-session/quiz-session.service.test.ts`

> **Read first:** the spec section "Data Flow & Backend Additions → New backend query: `quizSession.countInScope`". Then read `src/lib/server/services/quiz-session/queries/quiz-session.list.ts` for the query-file pattern, `quiz-session.service.ts` for the service-method pattern, and `quiz-session.service.test.ts` for the test pattern (uses `setupService()`, `throwUnauthorized`, `throwNotFound` from `quiz-session.testing.ts`).

### Step 1: Add the input/output schemas

In `src/lib/schemas/quiz-session.ts`, after the existing `listQuizSessionsInputSchema` block, add:

```typescript
export const countQuizSessionInScopeInputSchema = v.object({
  chapterId: v.optional(chapterIdSchema),
  studySetId: studySetIdSchema,
});

export const countQuizSessionInScopeOutputSchema = v.object({
  count: v.number(),
});
```

And after the existing inferred types block, add:

```typescript
export type CountQuizSessionInScopeInput = v.InferOutput<
  typeof countQuizSessionInScopeInputSchema
>;
export type CountQuizSessionInScopeOutput = v.InferOutput<
  typeof countQuizSessionInScopeOutputSchema
>;
```

### Step 2: Add the service method

In `src/lib/server/services/quiz-session/quiz-session.service.ts`:

1. Add `CountQuizSessionInScopeInput` to the import list from `$lib/schemas/quiz-session`.
2. After `listSessions` (the last public method before `adminDeleteExpiredSessions`), add:

```typescript
async countInScope(
  input: CountQuizSessionInScopeInput,
  userId: string | null | undefined
): Promise<{ count: number }> {
  const ownerId = this.guard.requireUser(userId);
  await this.guard.assertStudySetVisibleOrNotFound(input.studySetId, ownerId);

  return {
    count: await this.repo.countQuizzesInScope(
      input.studySetId,
      input.chapterId
    ),
  };
}
```

(`countQuizzesInScope` is already on the repository — no repository changes needed.)

### Step 3: Create the query file

Create `src/lib/server/services/quiz-session/queries/quiz-session.count-in-scope.ts`:

```typescript
import {
  countQuizSessionInScopeInputSchema,
  countQuizSessionInScopeOutputSchema,
} from "$lib/schemas/quiz-session";
import { authorizedProcedure } from "$lib/server/api/base";
import * as v from "valibot";

import { quizSessionService } from "../index";

const ERRORS = {
  NOT_FOUND: {
    message: "Study set not found",
  },
} as const;

export const quizSessionCountInScope = authorizedProcedure
  .errors(ERRORS)
  .input(countQuizSessionInScopeInputSchema)
  .output(countQuizSessionInScopeOutputSchema)
  .handler(
    async ({ input, context }) =>
      await quizSessionService.countInScope(input, context.user.id)
  );
```

### Step 4: Register in the router

In `src/lib/server/services/quiz-session/quiz-session.router.ts`:

1. Add the import:

```typescript
import { quizSessionCountInScope } from "./queries/quiz-session.count-in-scope.ts";
```

2. Add to the router object (alphabetical, between `complete` and `create`):

```typescript
export const quizSessionRouter = {
  admin: { deleteExpired: quizSessionAdminDeleteExpired },
  complete: quizSessionComplete,
  countInScope: quizSessionCountInScope,
  create: quizSessionCreate,
  get: quizSessionGet,
  getQuestions: quizSessionGetQuestions,
  getResults: quizSessionGetResults,
  list: quizSessionList,
  submitAnswer: quizSessionSubmitAnswer,
};
```

### Step 5: Write the failing tests

In `src/lib/server/services/quiz-session/quiz-session.service.test.ts`, add a new `describe.concurrent` block at the end of the file:

```typescript
describe.concurrent("QuizSessionService.countInScope", () => {
  it("throws UNAUTHORIZED when requireUser fails", async ({ expect }) => {
    const { service, guard } = setupService();
    throwUnauthorized(guard.requireUser);

    const error = await captureError(
      service.countInScope({ studySetId: "sst_000000000000000001" }, null)
    );
    expect(error).toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws NOT_FOUND when study set is not visible", async ({ expect }) => {
    const { service, guard } = setupService();
    throwNotFound(guard.assertStudySetVisibleOrNotFound);

    const error = await captureError(
      service.countInScope({ studySetId: "sst_000000000000000001" }, "user-1")
    );
    expect(error).toMatchObject({ code: "NOT_FOUND" });
  });

  it("returns { count } on the happy path with no chapterId", async ({
    expect,
  }) => {
    const { service, repo } = setupService();
    repo.countQuizzesInScope.mockResolvedValue(7);

    const result = await service.countInScope(
      { studySetId: "sst_000000000000000001" },
      "user-1"
    );
    expect(result).toEqual({ count: 7 });
    expect(repo.countQuizzesInScope).toHaveBeenCalledWith(
      "sst_000000000000000001",
      undefined
    );
  });

  it("passes chapterId through to the repository when provided", async ({
    expect,
  }) => {
    const { service, repo } = setupService();
    repo.countQuizzesInScope.mockResolvedValue(3);

    const result = await service.countInScope(
      {
        chapterId: "chp_000000000000000001",
        studySetId: "sst_000000000000000001",
      },
      "user-1"
    );
    expect(result).toEqual({ count: 3 });
    expect(repo.countQuizzesInScope).toHaveBeenCalledWith(
      "sst_000000000000000001",
      "chp_000000000000000001"
    );
  });
});
```

`setupService`, `throwUnauthorized`, `throwNotFound`, and `captureError` are already imported at the top of the test file (verify before adding — they should be from `./quiz-session.testing`).

### Step 6: Run the tests to verify they fail

```bash
rtk pnpm run test:unit -- quiz-session.service.test.ts
```

Expected: the four new `countInScope` tests fail with "service.countInScope is not a function" or similar. The other existing tests still pass.

### Step 7: Run the tests to verify they pass

(The implementation is already in place from Steps 2–4.) Re-run:

```bash
rtk pnpm run test:unit -- quiz-session.service.test.ts
```

Expected: all tests pass, including the four new ones.

### Step 8: Lint, format, typecheck

```bash
rtk pnpm run format
rtk pnpm run lint:agent
rtk pnpm run check
```

Expected: all green.

### Step 9: Commit

```bash
git add src/lib/schemas/quiz-session.ts \
        src/lib/server/services/quiz-session/queries/quiz-session.count-in-scope.ts \
        src/lib/server/services/quiz-session/quiz-session.service.ts \
        src/lib/server/services/quiz-session/quiz-session.router.ts \
        src/lib/server/services/quiz-session/quiz-session.service.test.ts
git commit -m "feat(quiz-session): add countInScope query for hub chapter counts"
```

---

## Task 2: Frontend utilities (with unit tests)

**Files:**

- Create: `src/lib/utils/quiz-session.ts`
- Create: `src/lib/utils/quiz-session.test.ts`

> **Read first:** the spec section "Components → Utilities (`$lib/utils/quiz-session.ts`)" for the function list. Note: the spec's `answerStateForPill` signature is `(question, localAnswer, isCurrent)` — the plan uses `(localAnswer, isCurrent, isVisited)` instead, because the 4-state design with clickable pills requires explicit tracking of which questions have been visited (the spec's `currentIndex`-only derivation breaks for non-sequential navigation). The taking page's local state (Task 6) adds `visited: Set<sessionQuizId>` to support this.

### Step 1: Write the failing tests

Create `src/lib/utils/quiz-session.test.ts`:

```typescript
import { describe, it } from "vitest";

import {
  answerStateForPill,
  formatSessionTimestamp,
  scoreToCopy,
  sessionStatusLabel,
} from "./quiz-session.ts";

describe.concurrent("scoreToCopy", () => {
  it.each([
    [100, "Sempurna"],
    [99, "Bagus sekali"],
    [90, "Bagus sekali"],
    [89, "Hebat"],
    [75, "Hebat"],
    [74, "Coba lagi"],
    [50, "Coba lagi"],
    [0, "Coba lagi"],
  ])("score %i → %s", (score, expected) => {
    const { expect } = import.meta.vitest;
    expect(scoreToCopy(score)).toBe(expected);
  });
});

describe.concurrent("sessionStatusLabel", () => {
  it.each([
    ["ACTIVE", "Aktif"],
    ["COMPLETED", "Selesai"],
  ])("%s → %s", (status, expected) => {
    const { expect } = import.meta.vitest;
    expect(sessionStatusLabel(status as "ACTIVE" | "COMPLETED")).toBe(expected);
  });
});

describe.concurrent("answerStateForPill", () => {
  const nil = null;
  const empty: string[] = [];
  const filled: string[] = ["opt_000000000000000001"];

  it("current + any answer is 'current'", ({ expect }) => {
    expect(answerStateForPill(nil, true, false)).toBe("current");
    expect(answerStateForPill(empty, true, false)).toBe("current");
    expect(answerStateForPill(filled, true, false)).toBe("current");
    expect(answerStateForPill(nil, true, true)).toBe("current");
  });

  it("not current + no answer + not visited is 'unvisited'", ({ expect }) => {
    expect(answerStateForPill(nil, false, false)).toBe("unvisited");
    expect(answerStateForPill(empty, false, false)).toBe("unvisited");
  });

  it("not current + no answer + visited is 'visited-unanswered'", ({
    expect,
  }) => {
    expect(answerStateForPill(nil, false, true)).toBe("visited-unanswered");
    expect(answerStateForPill(empty, false, true)).toBe("visited-unanswered");
  });

  it("not current + answer is 'answered' regardless of visited", ({
    expect,
  }) => {
    expect(answerStateForPill(filled, false, false)).toBe("answered");
    expect(answerStateForPill(filled, false, true)).toBe("answered");
  });
});

describe.concurrent("formatSessionTimestamp", () => {
  const now = new Date("2026-06-15T12:00:00Z").getTime();

  it("under 1 minute → 'Baru saja'", ({ expect }) => {
    expect(formatSessionTimestamp(now - 30_000, now)).toBe("Baru saja");
  });

  it("1 hour → '1 jam lalu'", ({ expect }) => {
    expect(formatSessionTimestamp(now - 60 * 60_000, now)).toBe("1 jam lalu");
  });

  it("yesterday → 'Kemarin'", ({ expect }) => {
    expect(formatSessionTimestamp(now - 26 * 60 * 60_000, now)).toBe("Kemarin");
  });

  it("7 days ago → '8 Jun' (no year when current year)", ({ expect }) => {
    expect(formatSessionTimestamp(now - 7 * 24 * 60 * 60_000, now)).toBe(
      "8 Jun"
    );
  });

  it("last year → includes the year", ({ expect }) => {
    expect(
      formatSessionTimestamp(new Date("2025-12-01T00:00:00Z").getTime(), now)
    ).toBe("1 Des 2025");
  });
});
```

### Step 2: Run the tests to verify they fail

```bash
rtk pnpm run test:unit -- quiz-session.test.ts
```

Expected: all fail with "Cannot find module './quiz-session.ts'" or "scoreToCopy is not a function".

### Step 3: Write the implementation

Create `src/lib/utils/quiz-session.ts`:

```typescript
import { cubicOut } from "svelte/easing";
import { tweened, type Readable } from "svelte/motion";
import { browser } from "$app/environment";

export type AnswerState =
  | "unvisited"
  | "visited-unanswered"
  | "answered"
  | "current";

export type SessionStatus = "ACTIVE" | "COMPLETED";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const MONTHS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

export function scoreToCopy(score: number): string {
  if (score === 100) return "Sempurna";
  if (score >= 90) return "Bagus sekali";
  if (score >= 75) return "Hebat";
  return "Coba lagi";
}

export function sessionStatusLabel(status: SessionStatus): "Aktif" | "Selesai" {
  return status === "ACTIVE" ? "Aktif" : "Selesai";
}

export function answerStateForPill(
  localAnswer: string[] | null,
  isCurrent: boolean,
  isVisited: boolean
): AnswerState {
  if (isCurrent) return "current";
  if (localAnswer && localAnswer.length > 0) return "answered";
  if (isVisited) return "visited-unanswered";
  return "unvisited";
}

export function formatSessionTimestamp(
  timestampMs: number,
  nowMs: number = Date.now()
): string {
  const diff = nowMs - timestampMs;
  if (diff < MINUTE_MS) return "Baru saja";
  if (diff < HOUR_MS) return `${Math.floor(diff / MINUTE_MS)} menit lalu`;
  if (diff < 24 * HOUR_MS) {
    const hours = Math.floor(diff / HOUR_MS);
    return `${hours} jam lalu`;
  }
  if (diff < 2 * DAY_MS) return "Kemarin";

  const date = new Date(timestampMs);
  const now = new Date(nowMs);
  const day = date.getUTCDate();
  const month = MONTHS_ID[date.getUTCMonth()];
  if (date.getUTCFullYear() === now.getUTCFullYear()) {
    return `${day} ${month}`;
  }
  return `${day} ${month} ${date.getUTCFullYear()}`;
}

export function tweenedScore(
  target: number,
  durationMs: number = 1200
): Readable<number> {
  const store = tweened(0, { duration: durationMs, easing: cubicOut });
  if (browser) {
    const prefersReduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (prefersReduced) {
      store.set(target);
    } else {
      store.set(target);
    }
  } else {
    store.set(target);
  }
  return store;
}
```

### Step 4: Run the tests to verify they pass

```bash
rtk pnpm run test:unit -- quiz-session.test.ts
```

Expected: all pass.

### Step 5: Lint, format, typecheck

```bash
rtk pnpm run format
rtk pnpm run lint:agent
rtk pnpm run check
```

Expected: all green.

### Step 6: Commit

```bash
git add src/lib/utils/quiz-session.ts src/lib/utils/quiz-session.test.ts
git commit -m "feat(quiz-session): add frontend utilities with unit tests"
```

---

## Task 3: Dev stubs

**Files:**

- Create: `src/lib/server/services/quiz-session/quiz-session.utils.ts`

> **Read first:** the spec section "Testing → Dev stubs" for the filter list. Then read `src/lib/server/services/quiz/quiz.utils.ts` (or whichever file holds the quiz dev stubs — search `grep "VALID_FILTERS" src/lib/server/services/quiz/`) for the existing pattern. The hub/taking/results `+page.server.ts` files (Tasks 5–7) import `DEV_STUB_FILTERS` and a `getStubFor(filter)` function from this module.

### Step 1: Create the dev stub module

Create `src/lib/server/services/quiz-session/quiz-session.utils.ts`:

```typescript
import type { QuizSessionResults } from "$lib/schemas/quiz-session";
import type {
  ListQuizSessionsResponse,
  QuizSessionQuestionItem,
} from "$lib/schemas/quiz-session";

export const DEV_STUB_FILTERS = new Set([
  "empty",
  "active",
  "500",
  "mc",
  "ms",
  "fitb",
  "perfect",
  "partial",
  "zero",
] as const);

export type DevStubFilter =
  | (typeof DEV_STUB_FILTERS extends Set<infer T> ? T : never)
  | string;

const hubStubs = {
  empty: () => ({
    activeSessions: [] as ListQuizSessionsResponse[],
    recentSessions: [] as ListQuizSessionsResponse[],
    recentCounts: { active: 0, all: 0, completed: 0 },
    chapterQuizCounts: {} as Record<string, number>,
    totalScopeCount: 0,
  }),
  active: () => ({
    activeSessions: [makeSession("ACTIVE", 7, 20)],
    recentSessions: [makeSession("ACTIVE", 7, 20)],
    recentCounts: { active: 1, all: 1, completed: 0 },
    chapterQuizCounts: { chp_000000000000000001: 20 },
    totalScopeCount: 20,
  }),
  "500": () => {
    throw new Error("DEV_STUB_500");
  },
} as const;

const takingStubs = {
  mc: () => [makeQuestion("MULTIPLE_CHOICE")],
  ms: () => [makeQuestion("MULTIPLE_SELECT")],
  fitb: () => [makeQuestion("FILL_IN_THE_BLANK")],
} as const;

const resultsStubs = {
  perfect: (): QuizSessionResults => ({
    correctCount: 20,
    failingChapterIds: [],
    incorrectQuestions: [],
    score: 100,
    totalQuestions: 20,
  }),
  partial: (): QuizSessionResults => ({
    correctCount: 15,
    failingChapterIds: ["chp_000000000000000002"],
    incorrectQuestions: [makeQuestion("MULTIPLE_CHOICE", true)],
    score: 75,
    totalQuestions: 20,
  }),
  zero: (): QuizSessionResults => ({
    correctCount: 0,
    failingChapterIds: [
      "chp_000000000000000001",
      "chp_000000000000000002",
      "chp_000000000000000003",
    ],
    incorrectQuestions: [makeQuestion("MULTIPLE_CHOICE", true)],
    score: 0,
    totalQuestions: 20,
  }),
} as const;

function makeSession(
  status: "ACTIVE" | "COMPLETED",
  answered: number,
  total: number
): ListQuizSessionsResponse {
  return {
    chapterId: null,
    completedAt: status === "COMPLETED" ? new Date() : null,
    createdAt: new Date(Date.now() - 60 * 60_000),
    id: `qsg_${status === "ACTIVE" ? "active0000000001" : "complete00000001"}`,
    lastAnsweredAt: new Date(),
    lastQuestionText: "Sample question text",
    quizCount: total,
    score: status === "COMPLETED" ? Math.round((answered / total) * 100) : null,
    status,
    totalQuestions: total,
  };
}

function makeQuestion(
  type: "MULTIPLE_CHOICE" | "MULTIPLE_SELECT" | "FILL_IN_THE_BLANK",
  isIncorrect = false
): QuizSessionQuestionItem {
  const options =
    type === "FILL_IN_THE_BLANK"
      ? [
          {
            explanation: null,
            id: `qso_${type.toLowerCase()}0000000001`,
            isCorrect: true,
            optionText: "correct answer",
            position: 0,
            sessionQuizId: `qsa_q${type.toLowerCase()}0000000001`,
          },
        ]
      : [
          {
            explanation: null,
            id: `qso_${type.toLowerCase()}0000000001`,
            isCorrect: true,
            optionText: "Correct",
            position: 0,
            sessionQuizId: `qsa_q${type.toLowerCase()}0000000001`,
          },
          {
            explanation: null,
            id: `qso_${type.toLowerCase()}0000000002`,
            isCorrect: false,
            optionText: "Wrong 1",
            position: 1,
            sessionQuizId: `qsa_q${type.toLowerCase()}0000000001`,
          },
          {
            explanation: null,
            id: `qso_${type.toLowerCase()}0000000003`,
            isCorrect: false,
            optionText: "Wrong 2",
            position: 2,
            sessionQuizId: `qsa_q${type.toLowerCase()}0000000001`,
          },
        ];
  return {
    chapterId: null,
    currentAnswer: isIncorrect
      ? type === "MULTIPLE_CHOICE"
        ? [options[1]!.id]
        : []
      : null,
    id: `qsa_q${type.toLowerCase()}0000000001`,
    options,
    originalQuizId: null,
    position: 0,
    questionText: `Sample ${type.toLowerCase().replace("_", " ")} question`,
    sessionId: "qsg_active0000000001",
    type,
  };
}

export function getHubStub(filter: string | null) {
  if (!filter) return null;
  if (!(DEV_STUB_FILTERS as Set<string>).has(filter)) return null;
  if (filter in hubStubs) {
    return hubStubs[filter as keyof typeof hubStubs]();
  }
  return null;
}

export function getTakingStub(
  filter: string | null
): QuizSessionQuestionItem[] | null {
  if (!filter || !(DEV_STUB_FILTERS as Set<string>).has(filter)) return null;
  if (filter in takingStubs) {
    return takingStubs[filter as keyof typeof takingStubs]();
  }
  return null;
}

export function getResultsStub(
  filter: string | null
): QuizSessionResults | null {
  if (!filter || !(DEV_STUB_FILTERS as Set<string>).has(filter)) return null;
  if (filter in resultsStubs) {
    return resultsStubs[filter as keyof typeof resultsStubs]();
  }
  return null;
}
```

### Step 2: Verify with typecheck

```bash
rtk pnpm run check
```

Expected: green. (No tests for this file — it's only invoked when `?filter=…` is present, used by manual smoke tests.)

### Step 3: Commit

```bash
git add src/lib/server/services/quiz-session/quiz-session.utils.ts
git commit -m "feat(quiz-session): add dev stub fixtures for hub/taking/results"
```

---

## Task 4: Shared layout + session-header component

> **Required sub-skills** (load BEFORE writing any Svelte code): `design-taste-frontend` and `high-end-visual-design`. Fetch the shadcn-svelte docs for the `Button` primitive under `$lib/components/ui/button/`. Read the Svelte 5 sections on `$props()`, snippets (`children`), and `$bindable`. Run `svelte_svelte-autofixer` on every `.svelte` file and iterate until clean. See "Required Skills (Mandatory)" at the top of this plan for the full workflow.

**Files:**

- Create: `src/lib/components/features/quiz-session/session-header.svelte`
- Create: `src/routes/(app)/session/[studySetId]/quiz/+layout.svelte`
- Create: `src/routes/(app)/session/[studySetId]/quiz/+layout.server.ts`

> **Read first:** the spec section "URL Structure & Layout" for the layout's data shape. Then read `src/routes/(app)/session/[studySetId]/flashcard/+page.svelte` for the existing visual rhythm (the back-button-with-title pattern, the `max-w-2xl mx-auto` page container).

### Step 1: Create the `session-header` component

Create `src/lib/components/features/quiz-session/session-header.svelte`:

```svelte
<script lang="ts">
  import { ArrowLeft01Icon } from "$lib/components/features/icons";
  import { page } from "$app/state";
  import Button from "$lib/components/ui/button/button.svelte";
  import { HugeiconsIcon } from "@hugeicons/svelte";

  interface Props {
    title: string;
  }
  let { title }: Props = $props();
</script>

<header
  class="sticky top-0 z-10 flex h-16 items-center gap-2 border-b bg-background/80 px-6 backdrop-blur"
>
  <Button
    variant="ghost"
    size="sm"
    href="/study/{page.params.studySetId}/quiz/"
  >
    <HugeiconsIcon icon={ArrowLeft01Icon} />
    <span>Kembali</span>
  </Button>
  <h1 class="truncate text-sm font-medium text-muted-foreground">
    {title}
  </h1>
</header>
```

### Step 2: Create the layout server load

Create `src/routes/(app)/session/[studySetId]/quiz/+layout.server.ts`:

```typescript
import { orpc } from "$lib/orpc.server";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ params }) => {
  const [studySet, chapters] = await Promise.all([
    orpc.studySet.get({ id: params.studySetId }),
    orpc.chapter.list({ studySetId: params.studySetId }),
  ]);
  return { chapters, studySet };
};
```

(If `orpc.studySet.get` or `orpc.chapter.list` has a different argument shape in your codebase — verify against the existing `chapter.list` query file before committing.)

### Step 3: Create the layout Svelte

Create `src/routes/(app)/session/[studySetId]/quiz/+layout.svelte`:

```svelte
<script lang="ts">
  import SessionHeader from "$lib/components/features/quiz-session/session-header.svelte";
  import type { LayoutData } from "./$types";

  interface Props {
    data: LayoutData;
    children: import("svelte").Snippet;
  }
  let { data, children }: Props = $props();
</script>

<SessionHeader title={data.studySet.title} />
<main class="mx-auto w-full max-w-2xl px-6 py-6">
  {@render children()}
</main>
```

### Step 4: Verify with dev server

```bash
pnpm dev
```

Open `http://localhost:5173/session/<a-study-set-id>/quiz/` (any study set in your dev DB). The placeholder message should still be there for now (we replace it in Task 5), but the slim header with the study-set title and "Kembali" button should appear at the top.

### Step 5: Lint, format, typecheck

```bash
rtk pnpm run format
rtk pnpm run lint:agent
rtk pnpm run check
```

Expected: all green.

### Step 6: Commit

```bash
git add src/lib/components/features/quiz-session/session-header.svelte \
        src/routes/\(app\)/session/\[studySetId\]/quiz/+layout.svelte \
        src/routes/\(app\)/session/\[studySetId\]/quiz/+layout.server.ts
git commit -m "feat(quiz-session): add shared layout and session-header for quiz subtree"
```

---

## Task 5: Hub — atomic components, page, server

> **Required sub-skills** (load BEFORE writing any Svelte code): `design-taste-frontend` and `high-end-visual-design`. Fetch the shadcn-svelte docs for `Button` and any other `$lib/components/ui/**/*` primitives used. Read the Svelte 5 sections on `$state`, `$derived`, `$props`, snippets (`children`), and callback props. Run `svelte_svelte-autofixer` on every `.svelte` file and iterate until clean. See "Required Skills (Mandatory)" at the top of this plan for the full workflow.

**Files:**

- Create: `src/lib/components/features/quiz-session/chapter-scope-picker.svelte`
- Create: `src/lib/components/features/quiz-session/quiz-session-list-filter.svelte`
- Create: `src/lib/components/features/quiz-session/quiz-session-row.svelte`
- Create: `src/lib/components/features/quiz-session/quiz-session-empty.svelte`
- Create: `src/lib/components/features/quiz-session/quiz-session-card.svelte`
- Create: `src/routes/(app)/session/[studySetId]/quiz/+page.server.ts` (replaces placeholder)
- Create: `src/routes/(app)/session/[studySetId]/quiz/+page.svelte` (replaces placeholder)

> **Read first:** the spec section "Hub Page" for the data shape and the three-card composition. Then read an existing formsnap form action (e.g., grep for `superValidate` in `src/routes/(app)/study/`) for the valibot adapter pattern.

### Step 1: Create `chapter-scope-picker.svelte`

```svelte
<script lang="ts">
  interface Chip {
    chapterId: string | null;
    label: string;
    count: number;
  }
  interface Props {
    value: string | null;
    chapters: { id: string; title: string }[];
    counts: { all: number; byChapter: Record<string, number> };
    onChange: (chapterId: string | null) => void;
  }
  let { value, chapters, counts, onChange }: Props = $props();

  const chips = $derived<Chip[]>([
    { chapterId: null, label: "Semua", count: counts.all },
    ...chapters.map((c) => ({
      chapterId: c.id,
      label: c.title,
      count: counts.byChapter[c.id] ?? 0,
    })),
  ]);
</script>

<div class="flex flex-wrap gap-2">
  {#each chips as chip (chip.chapterId ?? "__all__")}
    {@const active = chip.chapterId === value}
    <button
      type="button"
      class="rounded-full border px-3 py-1.5 text-sm transition-colors {active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-card text-foreground hover:bg-muted'}"
      onclick={() => onChange(chip.chapterId)}
    >
      {chip.label} ({chip.count})
    </button>
  {/each}
</div>
```

### Step 2: Create `quiz-session-list-filter.svelte`

```svelte
<script lang="ts">
  type FilterValue = "all" | "active" | "completed";
  interface Props {
    value: FilterValue;
    counts: { all: number; active: number; completed: number };
    onChange: (value: FilterValue) => void;
  }
  let { value, counts, onChange }: Props = $props();

  const chips: { value: FilterValue; label: string }[] = [
    { value: "all", label: `Semua (${counts.all})` },
    { value: "active", label: `Aktif (${counts.active})` },
    { value: "completed", label: `Selesai (${counts.completed})` },
  ];
</script>

<div class="flex flex-wrap gap-2">
  {#each chips as chip (chip.value)}
    {@const active = chip.value === value}
    <button
      type="button"
      class="rounded-full border px-3 py-1.5 text-sm transition-colors {active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-card text-foreground hover:bg-muted'}"
      onclick={() => onChange(chip.value)}
    >
      {chip.label}
    </button>
  {/each}
</div>
```

### Step 3: Create `quiz-session-row.svelte`

```svelte
<script lang="ts">
  import { page } from "$app/state";
  import {
    formatSessionTimestamp,
    sessionStatusLabel,
  } from "$lib/utils/quiz-session";
  import type { ListQuizSessionsResponse } from "$lib/schemas/quiz-session";
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { ArrowRight01Icon } from "$lib/components/features/icons";

  interface Props {
    session: ListQuizSessionsResponse;
  }
  let { session }: Props = $props();

  const target = $derived(
    session.status === "ACTIVE"
      ? `/session/${page.params.studySetId}/quiz/${session.id}/`
      : `/session/${page.params.studySetId}/quiz/${session.id}/results/`
  );

  const score = $derived(
    session.score !== null && session.totalQuestions
      ? `${session.score}/${session.totalQuestions}`
      : "—"
  );
</script>

<a
  href={target}
  class="flex items-center gap-3 border-b px-1 py-3 transition-colors hover:bg-muted/50"
>
  <span
    class="rounded-full px-2 py-0.5 text-xs font-medium {session.status ===
    'ACTIVE'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-emerald-100 text-emerald-700'}"
  >
    {sessionStatusLabel(session.status)}
  </span>
  <span class="flex-1 truncate text-sm text-foreground">
    {session.lastQuestionText ?? "—"}
  </span>
  <span class="text-xs text-muted-foreground">
    {formatSessionTimestamp(session.createdAt.getTime())}
  </span>
  <span class="w-20 text-right text-sm tabular-nums text-muted-foreground">
    {score}
  </span>
  <HugeiconsIcon icon={ArrowRight01Icon} class="size-4 text-muted-foreground" />
</a>
```

### Step 4: Create `quiz-session-empty.svelte`

```svelte
<script lang="ts">
  import { page } from "$app/state";
  import Button from "$lib/components/ui/button/button.svelte";
</script>

<div
  class="flex flex-col items-center gap-3 rounded-4xl border bg-card p-6 text-card-foreground shadow-xs"
>
  <p class="text-sm text-muted-foreground">Belum ada quiz di sini</p>
  <Button variant="outline" href="/study/{page.params.studySetId}/quiz/create/">
    Buat quiz
  </Button>
</div>
```

### Step 5: Create `quiz-session-card.svelte`

```svelte
<script lang="ts">
  import { page } from "$app/state";
  import Button from "$lib/components/ui/button/button.svelte";
  import {
    formatSessionTimestamp,
    sessionStatusLabel,
  } from "$lib/utils/quiz-session";
  import type { ListQuizSessionsResponse } from "$lib/schemas/quiz-session";
  import type { Snippet } from "svelte";

  interface ActiveProps {
    mode: "active";
    session: ListQuizSessionsResponse;
  }
  interface StartProps {
    mode: "start";
    children: Snippet;
  }
  type Props = ActiveProps | StartProps;
  let props: Props = $props();
</script>

<div class="rounded-4xl border bg-card p-1.5 shadow-xs">
  <div class="rounded-[calc(2rem-0.375rem)] bg-background/50 p-5">
    {#if props.mode === "active"}
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <span
            class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
          >
            {sessionStatusLabel(props.session.status)}
          </span>
        </div>
        <div>
          <p class="text-sm font-medium">Sesi Aktif</p>
          <p class="truncate text-xs text-muted-foreground">
            {props.session.lastQuestionText
              ? `Pertanyaan terakhir: ${props.session.lastQuestionText}`
              : "Belum ada yang dijawab"}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            {formatSessionTimestamp(props.session.createdAt.getTime())}
          </p>
        </div>
        <Button
          href="/session/{page.params.studySetId}/quiz/{props.session.id}/"
        >
          Lanjutkan
        </Button>
      </div>
    {:else}
      {@render props.children()}
    {/if}
  </div>
</div>
```

### Step 6: Create the hub `+page.server.ts`

Delete the placeholder content of `src/routes/(app)/session/[studySetId]/quiz/+page.server.ts` (if any) and replace with:

```typescript
import { orpc } from "$lib/orpc.server";
import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getHubStub } from "$lib/server/services/quiz-session/quiz-session.utils";

type StatusFilter = "all" | "active" | "completed";

export const load: PageServerLoad = async (event) => {
  const stubFilter = event.url.searchParams.get("filter");
  if (stubFilter) {
    const stub = getHubStub(stubFilter);
    if (stub === null) {
      error(400, { message: "Unknown dev stub filter" });
    }
    if (stubFilter === "500") {
      throw new Error("DEV_STUB_500");
    }
    return {
      ...stub,
      scope: { chapterId: event.url.searchParams.get("chapter") },
      statusFilter:
        (event.url.searchParams.get("status") as StatusFilter | null) ?? "all",
    };
  }

  const chapterId = event.url.searchParams.get("chapter") ?? null;
  const statusFilter: StatusFilter =
    (event.url.searchParams.get("status") as StatusFilter | null) ?? "all";

  const [
    activeSessions,
    recentSessions,
    allCount,
    activeCount,
    completedCount,
    totalScope,
  ] = await Promise.all([
    orpc.quizSession.list({
      studySetId: event.params.studySetId,
      status: "ACTIVE",
    }),
    orpc.quizSession.list({
      chapterId: chapterId ?? undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      studySetId: event.params.studySetId,
      limit: 5,
    }),
    orpc.quizSession.list({
      studySetId: event.params.studySetId,
    }),
    orpc.quizSession.list({
      status: "ACTIVE",
      studySetId: event.params.studySetId,
    }),
    orpc.quizSession.list({
      status: "COMPLETED",
      studySetId: event.params.studySetId,
    }),
    orpc.quizSession.countInScope({
      chapterId: chapterId ?? undefined,
      studySetId: event.params.studySetId,
    }),
  ]);

  const chapterQuizCounts: Record<string, number> = {};
  await Promise.all(
    (await event.parent()).chapters.map(async (c) => {
      const { count } = await orpc.quizSession.countInScope({
        chapterId: c.id,
        studySetId: event.params.studySetId,
      });
      chapterQuizCounts[c.id] = count;
    })
  );

  return {
    activeSessions,
    chapterQuizCounts,
    recentCounts: {
      active: activeCount.length,
      all: allCount.length,
      completed: completedCount.length,
    },
    recentSessions,
    scope: { chapterId },
    statusFilter,
    totalScopeCount: totalScope.count,
  };
};

export const actions: Actions = {
  createSession: async (event) => {
    const formData = await event.request.formData();
    const chapterId = formData.get("chapterId");
    try {
      const session = await orpc.quizSession.create({
        chapterId:
          typeof chapterId === "string" && chapterId ? chapterId : undefined,
        studySetId: event.params.studySetId,
      });
      throw redirect(
        303,
        `/session/${event.params.studySetId}/quiz/${session.id}/`
      );
    } catch (err) {
      if (isRedirect(err)) throw err;
      return fail(500, {
        message: (err as Error).message ?? "Gagal membuat sesi",
      });
    }
  },
};

function isRedirect(err: unknown): err is Response {
  return (
    err instanceof Response && [301, 302, 303, 307, 308].includes(err.status)
  );
}
```

(Verify the exact argument shape of `orpc.quizSession.list` and `orpc.quizSession.create` against `quiz-session.list.ts` and `commands/quiz-session.create.ts` before committing — the field names may differ slightly from what's shown above.)

### Step 7: Create the hub `+page.svelte`

Delete the placeholder content of `src/routes/(app)/session/[studySetId]/quiz/+page.svelte` and replace with:

```svelte
<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import { page } from "$app/state";
  import { enhance } from "$app/forms";
  import { onMount } from "svelte";

  import QuizSessionCard from "$lib/components/features/quiz-session/quiz-session-card.svelte";
  import ChapterScopePicker from "$lib/components/features/quiz-session/chapter-scope-picker.svelte";
  import QuizSessionListFilter from "$lib/components/features/quiz-session/quiz-session-list-filter.svelte";
  import QuizSessionRow from "$lib/components/features/quiz-session/quiz-session-row.svelte";
  import QuizSessionEmpty from "$lib/components/features/quiz-session/quiz-session-empty.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }
  let { data }: Props = $props();

  let chapters = $derived(data.chapters);

  function handleChapterPick(chapterId: string | null) {
    const url = new URL(page.url);
    if (chapterId) {
      url.searchParams.set("chapter", chapterId);
    } else {
      url.searchParams.delete("chapter");
    }
    goto(url, { keepFocus: true, noScroll: true });
  }

  function handleStatusFilter(value: "all" | "active" | "completed") {
    const url = new URL(page.url);
    url.searchParams.set("status", value);
    goto(url, { keepFocus: true, noScroll: true });
  }

  const startDisabled = $derived(data.totalScopeCount === 0);
</script>

<div class="flex flex-col gap-6">
  {#if data.activeSessions.length > 0}
    <QuizSessionCard mode="active" session={data.activeSessions[0]!} />
  {/if}

  {#if data.totalScopeCount > 0}
    <QuizSessionCard mode="start">
      <div class="flex flex-col gap-4">
        <h2 class="text-base font-semibold">Mulai Sesi Baru</h2>
        <ChapterScopePicker
          value={data.scope.chapterId}
          {chapters}
          counts={{
            all: data.totalScopeCount,
            byChapter: data.chapterQuizCounts,
          }}
          onChange={handleChapterPick}
        />
        <form
          method="POST"
          action="?/createSession"
          use:enhance={() => ({ update: () => invalidateAll() })}
        >
          <input
            type="hidden"
            name="chapterId"
            value={data.scope.chapterId ?? ""}
          />
          <Button type="submit" disabled={startDisabled}>Mulai</Button>
        </form>
      </div>
    </QuizSessionCard>
  {:else}
    <QuizSessionEmpty />
  {/if}

  {#if data.recentSessions.length > 0}
    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-medium text-muted-foreground">Sesi Sebelumnya</h3>
      <QuizSessionListFilter
        value={data.statusFilter}
        counts={data.recentCounts}
        onChange={handleStatusFilter}
      />
      <div class="rounded-2xl border bg-card px-4 shadow-xs">
        {#each data.recentSessions as session (session.id)}
          <QuizSessionRow {session} />
        {/each}
      </div>
    </section>
  {/if}
</div>
```

### Step 8: Verify with dev server + dev stubs

```bash
pnpm dev
```

Smoke-test all three hub stubs:

- `http://localhost:5173/session/<id>/quiz/?filter=empty` → only Card B with chapter picker + Mulai (and 0 recent sessions)
- `http://localhost:5173/session/<id>/quiz/?filter=active` → Card A (Lanjutkan) + Card B + 1 recent session (Aktif)
- `http://localhost:5173/session/<id>/quiz/?filter=500` → crashes with the 500 error

Then test the real data path (no `?filter=…`) with a seeded study set that has at least 1 chapter + 1 quiz. Click a chapter chip, then a status filter chip — both should update the URL and the visible list.

### Step 9: Lint, format, typecheck

```bash
rtk pnpm run format
rtk pnpm run lint:agent
rtk pnpm run check
```

Expected: all green.

### Step 10: Commit

```bash
git add src/lib/components/features/quiz-session/ \
        'src/routes/(app)/session/[studySetId]/quiz/+page.svelte' \
        'src/routes/(app)/session/[studySetId]/quiz/+page.server.ts'
git commit -m "feat(quiz-session): build hub page with cards, picker, and filter"
```

---

## Task 6: Taking — components, page, server

> **Required sub-skills** (load BEFORE writing any Svelte code): `design-taste-frontend` and `high-end-visual-design`. Fetch the shadcn-svelte docs for `Button` and `Sheet` (`$lib/components/ui/sheet/`) — verify the `bind:open` pattern and `side="bottom"` API against the current shadcn-svelte version. Read the Svelte 5 sections on `$state`, `$derived`, `$derived.by`, `$effect`, `$bindable`, snippets, and callback props. Run `svelte_svelte-autofixer` on every `.svelte` file and iterate until clean. The progress-pills `chapterColorById` lookup and the 4-state pill design are the highest-risk visual artifacts in this task — design skills must inform both the chapter-color application (per Q14) and the diagonal-stripe `repeating-linear-gradient` pattern. See "Required Skills (Mandatory)" at the top of this plan for the full workflow.

**Files:**

- Create: `src/lib/components/features/quiz-session/progress-pills.svelte`
- Create: `src/lib/components/features/quiz-session/option-row.svelte`
- Create: `src/lib/components/features/quiz-session/question-card.svelte`
- Create: `src/lib/components/features/quiz-session/complete-session-sheet.svelte`
- Create: `src/routes/(app)/session/[studySetId]/quiz/[sessionId]/+page.server.ts`
- Create: `src/routes/(app)/session/[studySetId]/quiz/[sessionId]/+page.svelte`

> **Read first:** the spec section "Taking Page" — pay special attention to "Local state", "Auto-save (direct oRPC, per-type timing)", and "Edge cases".

### Step 1: Create `option-row.svelte`

```svelte
<script lang="ts">
  import { HugeiconsIcon } from "@hugeicons/svelte";
  import { Tick02Icon } from "$lib/components/features/icons";

  type Option = {
    id: string;
    optionText: string;
  };
  interface Props {
    option: Option;
    index: number;
    selected: boolean;
    multi: boolean;
    onToggle: (id: string) => void;
  }
  let { option, index, selected, multi, onToggle }: Props = $props();

  const letter = $derived(String.fromCharCode(65 + index));
</script>

<button
  type="button"
  class="flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors {selected
    ? 'border-primary bg-primary/5'
    : 'border-border bg-card hover:bg-muted/50'}"
  onclick={() => onToggle(option.id)}
>
  <span
    class="flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium {selected
      ? 'border-primary bg-primary text-primary-foreground'
      : 'border-border bg-background'}"
  >
    {#if selected && !multi}
      <HugeiconsIcon icon={Tick02Icon} class="size-4" />
    {:else}
      {letter}
    {/if}
  </span>
  <span class="flex-1 text-sm">{option.optionText}</span>
  {#if multi}
    <span
      class="flex size-5 shrink-0 items-center justify-center rounded border {selected
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border'}"
    >
      {#if selected}
        <HugeiconsIcon icon={Tick02Icon} class="size-3" />
      {/if}
    </span>
  {/if}
</button>
```

### Step 2: Create `progress-pills.svelte`

```svelte
<script lang="ts">
  import {
    answerStateForPill,
    type AnswerState,
  } from "$lib/utils/quiz-session";
  import type { QuizSessionQuestionItem } from "$lib/schemas/quiz-session";

  interface Props {
    questions: QuizSessionQuestionItem[];
    currentIndex: number;
    localAnswers: Record<string, string[]>;
    visited: Set<string>;
    chapterColorById: Record<string, string | null>;
    onSelect: (index: number) => void;
  }
  let {
    questions,
    currentIndex,
    localAnswers,
    visited,
    chapterColorById,
    onSelect,
  }: Props = $props();

  function classFor(state: AnswerState, chapterColor: string | null): string {
    if (state === "answered") {
      return chapterColor ? `bg-[${chapterColor}]` : "bg-primary";
    }
    if (state === "visited-unanswered") {
      return "bg-[repeating-linear-gradient(45deg,theme(colors.muted),theme(colors.muted)_4px,transparent_4px,transparent_8px)]";
    }
    return "bg-muted";
  }
</script>

<div
  class="sticky top-[calc(theme(spacing.16))] z-10 -mx-6 flex gap-1 bg-background/80 px-6 py-3 backdrop-blur"
  role="tablist"
  aria-label="Progres soal"
>
  {#each questions as q, i (q.id)}
    {@const state = answerStateForPill(
      localAnswers[q.id] ?? null,
      i === currentIndex,
      visited.has(q.id)
    )}
    {@const color = q.chapterId
      ? (chapterColorById[q.chapterId] ?? null)
      : null}
    <button
      type="button"
      class="h-1.5 flex-1 rounded-full transition-all {classFor(
        state,
        color
      )} {state === 'current' ? 'ring-2 ring-offset-2 ring-foreground' : ''}"
      aria-label="Soal {i + 1}"
      aria-current={state === "current" ? "step" : undefined}
      onclick={() => onSelect(i)}
    ></button>
  {/each}
</div>
```

### Step 3: Create `question-card.svelte`

```svelte
<script lang="ts">
  import type { QuizSessionQuestionItem } from "$lib/schemas/quiz-session";
  import OptionRow from "./option-row.svelte";

  interface Props {
    question: QuizSessionQuestionItem;
    onChange: (selectedOptionIds: string[]) => void;
  }
  let { question, onChange }: Props = $props();

  let selected: string[] = $state(question.currentAnswer ?? []);
  let fitbText: string = $state(
    question.type === "FILL_IN_THE_BLANK" && question.currentAnswer ? "" : ""
  );

  const isAnswered = $derived(
    question.type === "FILL_IN_THE_BLANK"
      ? fitbText.trim().length > 0
      : selected.length > 0
  );

  function pickSingle(id: string) {
    selected = [id];
    onChange([id]);
  }
  function toggleMulti(id: string) {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    selected = next;
    onChange(next);
  }
  function pickFitb(text: string) {
    fitbText = text;
    onChange([text]);
  }

  const typeLabel = $derived(
    question.type === "MULTIPLE_CHOICE"
      ? "Pilihan Ganda"
      : question.type === "MULTIPLE_SELECT"
        ? "Pilihan Ganda Kompleks"
        : "Isian"
  );
</script>

<div class="flex flex-col gap-4 rounded-4xl border bg-card p-1.5 shadow-xs">
  <div class="rounded-[calc(2rem-0.375rem)] bg-background/50 p-5">
    <div class="flex flex-col gap-4">
      <span
        class="self-start rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
      >
        {typeLabel}
      </span>
      <p class="text-base font-medium leading-snug">
        {question.questionText}
      </p>
      <div class="flex flex-col gap-2">
        {#if question.type === "MULTIPLE_CHOICE"}
          {#each question.options as opt, i (opt.id)}
            <OptionRow
              option={opt}
              index={i}
              selected={selected[0] === opt.id}
              multi={false}
              onToggle={pickSingle}
            />
          {/each}
        {:else if question.type === "MULTIPLE_SELECT"}
          <p class="text-xs text-muted-foreground">Tandai semua yang benar</p>
          {#each question.options as opt, i (opt.id)}
            <OptionRow
              option={opt}
              index={i}
              selected={selected.includes(opt.id)}
              multi={true}
              onToggle={toggleMulti}
            />
          {/each}
        {:else}
          <input
            type="text"
            class="w-full rounded-2xl border bg-background px-4 py-3 text-lg outline-none focus:border-primary"
            placeholder="Ketik jawaban…"
            autofocus
            oninput={(e) =>
              pickFitb((e.currentTarget as HTMLInputElement).value)}
          />
        {/if}
      </div>
    </div>
  </div>
</div>
```

### Step 4: Create `complete-session-sheet.svelte`

```svelte
<script lang="ts">
  import Button from "$lib/components/ui/button/button.svelte";
  import * as Sheet from "$lib/components/ui/sheet/index.js";

  interface Props {
    open: boolean;
    unansweredCount: number;
    onConfirm: () => void;
  }
  let { open = $bindable(), unansweredCount, onConfirm }: Props = $props();
</script>

<Sheet.Root bind:open>
  <Sheet.Content side="bottom" class="rounded-t-2xl">
    <div class="flex flex-col gap-4 p-6">
      <Sheet.Header>
        <Sheet.Title>Selesaikan sesi?</Sheet.Title>
      </Sheet.Header>
      {#if unansweredCount > 0}
        <p class="text-sm text-muted-foreground">
          {unansweredCount} soal belum dijawab dan akan dihitung salah.
        </p>
      {/if}
      <div class="flex flex-col gap-2">
        <Button onclick={onConfirm}>Selesaikan</Button>
        <Button variant="ghost" onclick={() => (open = false)}>Kembali</Button>
      </div>
    </div>
  </Sheet.Content>
</Sheet.Root>
```

(Verify the Sheet import path — `src/lib/components/ui/sheet/index.js` — and the `bind:open` pattern against the existing `Sheet` usage in the codebase before committing.)

### Step 5: Create the taking `+page.server.ts`

Create `src/routes/(app)/session/[studySetId]/quiz/[sessionId]/+page.server.ts`:

```typescript
import { orpc } from "$lib/orpc.server";
import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { getTakingStub } from "$lib/server/services/quiz-session/quiz-session.utils";

export const load: PageServerLoad = async (event) => {
  const stubFilter = event.url.searchParams.get("filter");
  if (stubFilter) {
    const stub = getTakingStub(stubFilter);
    if (stub === null) {
      error(400, { message: "Unknown dev stub filter" });
    }
    const session = await orpc.quizSession.get({
      sessionId: event.params.sessionId,
    });
    return { questions: stub, session };
  }

  const session = await orpc.quizSession.get({
    sessionId: event.params.sessionId,
  });
  if (session.status === "COMPLETED") {
    throw redirect(
      303,
      `/session/${event.params.studySetId}/quiz/${event.params.sessionId}/results/`
    );
  }
  const questions = await orpc.quizSession.getQuestions({
    sessionId: event.params.sessionId,
  });
  return { questions, session };
};

export const actions: Actions = {
  completeSession: async (event) => {
    try {
      await orpc.quizSession.complete({
        sessionId: event.params.sessionId,
      });
      throw redirect(
        303,
        `/session/${event.params.studySetId}/quiz/${event.params.sessionId}/results/`
      );
    } catch (err) {
      if (isRedirect(err)) throw err;
      return fail(500, { message: "Gagal menyelesaikan sesi" });
    }
  },
};

function isRedirect(err: unknown): err is Response {
  return (
    err instanceof Response && [301, 302, 303, 307, 308].includes(err.status)
  );
}
```

### Step 6: Create the taking `+page.svelte`

Create `src/routes/(app)/session/[studySetId]/quiz/[sessionId]/+page.svelte`:

```svelte
<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import { onDestroy } from "svelte";
  import { toast } from "svelte-sonner";

  import { orpc } from "$lib/orpc";
  import type { QuizSessionQuestionItem } from "$lib/schemas/quiz-session";

  import ProgressPills from "$lib/components/features/quiz-session/progress-pills.svelte";
  import QuestionCard from "$lib/components/features/quiz-session/question-card.svelte";
  import CompleteSessionSheet from "$lib/components/features/quiz-session/complete-session-sheet.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }
  let { data }: Props = $props();

  let currentIndex = $state(0);
  let localAnswers: Record<string, string[]> = $state({});
  let visited: Set<string> = $state(new Set());
  let debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  let sheetOpen = $state(false);
  let isCompleting = $state(false);

  // Seed from server data (one-time on mount; subsequent loads are sticky).
  $effect(() => {
    for (const q of data.questions) {
      if (!(q.id in localAnswers)) {
        localAnswers[q.id] = q.currentAnswer ?? [];
      }
      visited.add(q.id);
    }
  });

  onDestroy(() => {
    for (const handle of Object.values(debounceTimers)) clearTimeout(handle);
  });

  const currentQuestion: QuizSessionQuestionItem = $derived(
    data.questions[currentIndex]!
  );

  const chapterColorById = $derived(
    Object.fromEntries(
      (data.chapters ?? []).map((c) => [c.id, c.colorHex ?? null])
    )
  );

  const isAnswered = $derived.by(() => {
    const ans = localAnswers[currentQuestion.id] ?? [];
    if (currentQuestion.type === "FILL_IN_THE_BLANK") {
      return ans.some((x) => x.trim().length > 0);
    }
    if (currentQuestion.type === "MULTIPLE_CHOICE") return ans.length === 1;
    return ans.length >= 1;
  });

  const unansweredCount = $derived(
    data.questions.filter((q) => {
      const a = localAnswers[q.id] ?? [];
      if (q.type === "FILL_IN_THE_BLANK")
        return a.every((x) => x.trim().length === 0);
      if (q.type === "MULTIPLE_CHOICE") return a.length !== 1;
      return a.length === 0;
    }).length
  );

  function fitbMatch(
    text: string,
    options: QuizSessionQuestionItem["options"]
  ): string[] {
    const t = text.trim().toLowerCase();
    if (!t) return [];
    const target = options[0];
    if (target && target.optionText.trim().toLowerCase() === t) {
      return [target.id];
    }
    return [];
  }

  function dispatchAutoSave(
    sessionQuizId: string,
    raw: string[],
    type: QuizSessionQuestionItem["type"],
    mode: "debounced" | "immediate"
  ) {
    // Optimistic local update — keep the raw text for FITB display.
    localAnswers[sessionQuizId] = raw;

    if (type === "FILL_IN_THE_BLANK") {
      if (mode !== "immediate") return;
    } else {
      if (mode === "debounced") {
        clearTimeout(debounceTimers[sessionQuizId]!);
        debounceTimers[sessionQuizId] = setTimeout(
          () => sendSubmitAnswer(sessionQuizId, raw),
          300
        );
        return;
      }
    }

    const q = data.questions.find((x) => x.id === sessionQuizId);
    if (!q) return;
    const payload =
      type === "FILL_IN_THE_BLANK" ? fitbMatch(raw[0] ?? "", q.options) : raw;
    sendSubmitAnswer(sessionQuizId, payload);
  }

  async function sendSubmitAnswer(
    sessionQuizId: string,
    selectedOptionIds: string[]
  ) {
    try {
      await orpc.quizSession.submitAnswer({
        selectedOptionIds,
        sessionId: data.session.id,
        sessionQuizId,
      });
    } catch (err) {
      const original = data.questions.find((q) => q.id === sessionQuizId);
      if (original) localAnswers[sessionQuizId] = original.currentAnswer ?? [];
      toast.error("Gagal menyimpan jawaban. Coba lagi.");
    }
  }

  function goNext() {
    if (currentIndex < data.questions.length - 1) currentIndex += 1;
  }
  function goPrev() {
    if (currentIndex > 0) currentIndex -= 1;
  }
  function setIndex(i: number) {
    currentIndex = i;
    visited.add(data.questions[i]!.id);
  }

  function flushBeforeComplete() {
    for (const handle of Object.values(debounceTimers)) clearTimeout(handle);
    debounceTimers = {};
    for (const q of data.questions) {
      const raw = localAnswers[q.id] ?? [];
      if (q.type === "FILL_IN_THE_BLANK") {
        const payload = fitbMatch(raw[0] ?? "", q.options);
        if (payload.length > 0) {
          void orpc.quizSession.submitAnswer({
            selectedOptionIds: payload,
            sessionId: data.session.id,
            sessionQuizId: q.id,
          });
        }
      } else if (raw.length > 0) {
        void orpc.quizSession.submitAnswer({
          selectedOptionIds: raw,
          sessionId: data.session.id,
          sessionQuizId: q.id,
        });
      }
    }
  }

  function openSheet() {
    flushBeforeComplete();
    sheetOpen = true;
  }

  async function handleComplete() {
    isCompleting = true;
    try {
      await orpc.quizSession.complete({ sessionId: data.session.id });
      await goto(
        `/session/${data.session.studySetId}/quiz/${data.session.id}/results/`
      );
    } catch (err) {
      toast.error("Gagal menyelesaikan sesi.");
      sheetOpen = false;
    } finally {
      isCompleting = false;
    }
  }
</script>

<ProgressPills
  questions={data.questions}
  {currentIndex}
  {localAnswers}
  {visited}
  {chapterColorById}
  onSelect={setIndex}
/>

<QuestionCard
  question={currentQuestion}
  onChange={(ids) => {
    const type = currentQuestion.type;
    if (type === "FILL_IN_THE_BLANK") {
      // Fire on blur OR before navigation. The card calls onChange on every
      // keystroke; the actual submit happens on blur via dispatchAutoSave.
      // For now, store the raw text and flush at Lanjut / Selesai.
      localAnswers[currentQuestion.id] = ids;
    } else {
      dispatchAutoSave(currentQuestion.id, ids, type, "debounced");
    }
  }}
/>

<div class="mt-4 flex items-center justify-between gap-2">
  {#if currentIndex > 0}
    <Button variant="outline" onclick={goPrev}>Sebelumnya</Button>
  {:else}
    <span></span>
  {/if}
  {#if currentIndex < data.questions.length - 1}
    <Button onclick={goNext} disabled={!isAnswered}>Selanjutnya</Button>
  {:else}
    <Button onclick={openSheet} disabled={!isAnswered}>Selesai</Button>
  {/if}
</div>

<CompleteSessionSheet
  bind:open={sheetOpen}
  {unansweredCount}
  onConfirm={handleComplete}
/>
```

(If your project uses a different import path for `Sheet` (e.g., `$lib/components/ui/sheet`), use the existing convention.)

(For FITB blur-handling: this skeleton calls `onChange` on every keystroke but only flushes on `Selesai`. To get the "blur" trigger working without rewriting the card, add an `on:blur` handler on the FITB `<input>` that calls `dispatchAutoSave(currentQuestion.id, [fitbText], 'FILL_IN_THE_BLANK', 'immediate')` — extend the `QuestionCard` to forward the blur event, or move the FITB input out of `QuestionCard` and inline it on this page if the project prefers that pattern.)

### Step 7: Verify with dev server + dev stubs

```bash
pnpm dev
```

- `http://localhost:5173/session/<id>/quiz/<sessionId>/?filter=mc` → progress pill shows 1 segment, question is MC, clicking options updates the pill to "Answered" and triggers a `submitAnswer` (visible in devtools network tab)
- `http://localhost:5173/session/<id>/quiz/<sessionId>/?filter=ms` → MS, multi-select
- `http://localhost:5173/session/<id>/quiz/<sessionId>/?filter=fitb` → FITB text input
- Click "Selesai" → sheet opens with the unanswered warning; "Selesaikan" redirects to `/results/`
- Refresh the page mid-quiz → progress pills and answer state are restored from server

### Step 8: Lint, format, typecheck

```bash
rtk pnpm run format
rtk pnpm run lint:agent
rtk pnpm run check
```

Expected: all green.

### Step 9: Commit

```bash
git add src/lib/components/features/quiz-session/progress-pills.svelte \
        src/lib/components/features/quiz-session/option-row.svelte \
        src/lib/components/features/quiz-session/question-card.svelte \
        src/lib/components/features/quiz-session/complete-session-sheet.svelte \
        'src/routes/(app)/session/[studySetId]/quiz/[sessionId]/+page.svelte' \
        'src/routes/(app)/session/[studySetId]/quiz/[sessionId]/+page.server.ts'
git commit -m "feat(quiz-session): build taking page with clickable pills and direct oRPC auto-save"
```

---

## Task 7: Results — components, page, server

> **Required sub-skills** (load BEFORE writing any Svelte code): `design-taste-frontend` and `high-end-visual-design`. Fetch the shadcn-svelte docs for `Button` if used. Read the Svelte 5 sections on `$state`, `$derived`, `$props`, snippets, and callback props. Run `svelte_svelte-autofixer` on every `.svelte` file and iterate until clean. The results hero (massive score with `tweenedScore` count-up + `cubic-bezier(0.16, 1, 0.3, 1)` easing), the Penjelasan block (expanded by default — no click-to-expand per Q17), and the chapter analysis chips (informational only, no per-chapter CTAs per Q15) are the highest-risk visual artifacts in this task — design skills must inform typography, the count-up tween, and the card hierarchy. The `tweenedScore` utility already short-circuits under `prefers-reduced-motion`, but verify the `tweenedScore` Svelte motion API is current in your Svelte version. See "Required Skills (Mandatory)" at the top of this plan for the full workflow.

**Files:**

- Create: `src/lib/components/features/quiz-session/results-hero.svelte`
- Create: `src/lib/components/features/quiz-session/failing-chapter-row.svelte`
- Create: `src/lib/components/features/quiz-session/incorrect-question-card.svelte`
- Create: `src/routes/(app)/session/[studySetId]/quiz/[sessionId]/results/+page.server.ts`
- Create: `src/routes/(app)/session/[studySetId]/quiz/[sessionId]/results/+page.svelte`

> **Read first:** the spec section "Results Page" for the data shape and composition.

### Step 1: Create `results-hero.svelte`

```svelte
<script lang="ts">
  import { tweenedScore, scoreToCopy } from "$lib/utils/quiz-session";

  interface Props {
    score: number;
    total: number;
  }
  let { score, total }: Props = $props();

  const tweened = tweenedScore(score, 1200);
</script>

<div
  class="flex flex-col items-center gap-2 rounded-4xl border bg-card p-1.5 shadow-xs"
>
  <div
    class="flex w-full flex-col items-center gap-1 rounded-[calc(2rem-0.375rem)] bg-background/50 p-8"
  >
    <p
      class="text-7xl font-semibold leading-none tracking-tighter tabular-nums md:text-8xl"
    >
      {$tweened}
    </p>
    <p class="text-sm text-muted-foreground">{score} dari {total} benar</p>
    <p class="mt-2 text-base font-medium">{scoreToCopy(score)}</p>
  </div>
</div>
```

### Step 2: Create `failing-chapter-row.svelte`

```svelte
<script lang="ts">
  interface Props {
    chapters: Record<string, string>;
    scores: Record<string, { correct: number; total: number }>;
    studySetId: string;
  }
  let { chapters, scores, studySetId }: Props = $props();
</script>

<div class="flex flex-wrap gap-2">
  {#each Object.entries(chapters) as [id, title] (id)}
    {@const wrong = (scores[id]?.total ?? 0) - (scores[id]?.correct ?? 0)}
    <a
      href="/study/{studySetId}/?chapter={id}"
      class="rounded-full border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-muted"
    >
      {title} · {wrong} salah
    </a>
  {/each}
</div>
```

### Step 3: Create `incorrect-question-card.svelte`

```svelte
<script lang="ts">
  import type { QuizSessionQuestionItem } from "$lib/schemas/quiz-session";

  interface Props {
    question: QuizSessionQuestionItem;
  }
  let { question }: Props = $props();

  const correctOptions = $derived(question.options.filter((o) => o.isCorrect));
  const userOptions = $derived(
    question.currentAnswer
      ? question.options.filter((o) => question.currentAnswer!.includes(o.id))
      : []
  );
  const explanation = $derived(
    correctOptions.find((o) => o.explanation)?.explanation ?? null
  );

  const typeLabel = $derived(
    question.type === "MULTIPLE_CHOICE"
      ? "Pilihan Ganda"
      : question.type === "MULTIPLE_SELECT"
        ? "Pilihan Ganda Kompleks"
        : "Isian"
  );
</script>

<article
  class="flex flex-col gap-3 rounded-4xl border border-l-4 border-l-primary/20 bg-card p-1.5 shadow-xs"
>
  <div
    class="flex flex-col gap-3 rounded-[calc(2rem-0.375rem)] bg-background/50 p-5"
  >
    <span
      class="self-start rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
    >
      {typeLabel}
    </span>
    <p class="text-sm font-medium">{question.questionText}</p>

    {#if question.type !== "FILL_IN_THE_BLANK"}
      <div class="flex flex-col gap-2">
        <p class="text-xs font-medium text-muted-foreground">Jawaban kamu</p>
        {#if userOptions.length === 0}
          <p class="text-sm text-muted-foreground">(tidak dijawab)</p>
        {:else}
          {#each userOptions as opt (opt.id)}
            <p class="text-sm">✕ {opt.optionText}</p>
          {/each}
        {/if}
      </div>
      <div class="flex flex-col gap-2">
        <p class="text-xs font-medium text-muted-foreground">Jawaban benar</p>
        {#each correctOptions as opt (opt.id)}
          <p class="text-sm">✓ {opt.optionText}</p>
        {/each}
      </div>
    {:else}
      <div class="flex flex-col gap-2">
        <p class="text-xs font-medium text-muted-foreground">Jawaban benar</p>
        <p class="text-sm">{correctOptions[0]?.optionText ?? ""}</p>
      </div>
    {/if}

    {#if explanation}
      <div class="flex flex-col gap-1 border-t pt-3">
        <p class="text-xs font-medium text-muted-foreground">Penjelasan</p>
        <p class="text-sm">{explanation}</p>
      </div>
    {/if}
  </div>
</article>
```

### Step 4: Create the results `+page.server.ts`

Create `src/routes/(app)/session/[studySetId]/quiz/[sessionId]/results/+page.server.ts`:

```typescript
import { error, redirect } from "@sveltejs/kit";
import { orpc } from "$lib/orpc.server";
import { getResultsStub } from "$lib/server/services/quiz-session/quiz-session.utils";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
  const stubFilter = event.url.searchParams.get("filter");
  if (stubFilter) {
    const stub = getResultsStub(stubFilter);
    if (stub === null) {
      error(400, { message: "Unknown dev stub filter" });
    }
    const session = await orpc.quizSession.get({
      sessionId: event.params.sessionId,
    });
    const parentData = await event.parent();
    const chapters = parentData.chapters;
    const failingChapterTitles = Object.fromEntries(
      stub.failingChapterIds.map((id) => [
        id,
        chapters.find((c: { id: string }) => c.id === id)?.title ?? id,
      ])
    );
    return { results: stub, session, failingChapterTitles, chapterScores: {} };
  }

  const session = await orpc.quizSession.get({
    sessionId: event.params.sessionId,
  });
  if (session.status !== "COMPLETED") {
    throw redirect(
      303,
      `/session/${event.params.studySetId}/quiz/${event.params.sessionId}/`
    );
  }
  const results = await orpc.quizSession.getResults({
    sessionId: event.params.sessionId,
  });
  const parentData = await event.parent();
  const chapters = parentData.chapters;

  const failingChapterTitles = Object.fromEntries(
    results.failingChapterIds.map((id) => [
      id,
      chapters.find((c: { id: string }) => c.id === id)?.title ?? id,
    ])
  );

  // Per-chapter { correct, total } derived from the incorrectQuestions
  // + the session's totalQuestions. For now, the server's getResults
  // does not return a per-chapter breakdown; the page composes a minimal
  // map of "wrong count per failing chapter" from incorrectQuestions.
  const chapterScores: Record<string, { correct: number; total: number }> = {};
  for (const id of results.failingChapterIds) {
    const wrong = results.incorrectQuestions.filter(
      (q) => q.chapterId === id
    ).length;
    chapterScores[id] = { correct: 0, total: wrong };
  }

  return { results, session, failingChapterTitles, chapterScores };
};
```

(If the backend's `getResults` later exposes a per-chapter score breakdown, replace the `chapterScores` derivation with the server-provided map.)

### Step 5: Create the results `+page.svelte`

Create `src/routes/(app)/session/[studySetId]/quiz/[sessionId]/results/+page.svelte`:

```svelte
<script lang="ts">
  import ResultsHero from "$lib/components/features/quiz-session/results-hero.svelte";
  import FailingChapterRow from "$lib/components/features/quiz-session/failing-chapter-row.svelte";
  import IncorrectQuestionCard from "$lib/components/features/quiz-session/incorrect-question-card.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import { page } from "$app/state";
  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }
  let { data }: Props = $props();

  const retryHref = $derived(
    data.session.chapterId
      ? `/session/${page.params.studySetId}/quiz/?chapter=${data.session.chapterId}`
      : `/session/${page.params.studySetId}/quiz/`
  );
  const hubHref = $derived(`/session/${page.params.studySetId}/quiz/`);
</script>

<div class="flex flex-col gap-6">
  <ResultsHero score={data.results.score} total={data.results.totalQuestions} />

  {#if data.results.failingChapterIds.length > 0}
    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-medium text-muted-foreground">
        Chapter yang perlu diulang
      </h3>
      <FailingChapterRow
        chapters={data.failingChapterTitles}
        scores={data.chapterScores}
        studySetId={page.params.studySetId}
      />
    </section>
  {/if}

  {#if data.results.incorrectQuestions.length > 0}
    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-medium text-muted-foreground">Pembahasan</h3>
      {#each data.results.incorrectQuestions as q (q.id)}
        <IncorrectQuestionCard question={q} />
      {/each}
    </section>
  {/if}

  <footer class="flex flex-col gap-2 pt-4">
    <Button href={retryHref}>Coba sesi baru</Button>
    <Button variant="ghost" href={hubHref}>Kembali ke hub</Button>
  </footer>
</div>
```

### Step 6: Verify with dev server + dev stubs

```bash
pnpm dev
```

- `http://localhost:5173/session/<id>/quiz/<sessionId>/results/?filter=perfect` → score 100, no chapter analysis, no incorrect cards
- `http://localhost:5173/session/<id>/quiz/<sessionId>/results/?filter=partial` → score 75, 1 chapter chip, 1 incorrect card
- `http://localhost:5173/session/<id>/quiz/<sessionId>/results/?filter=zero` → score 0, 3 chapter chips, 1+ incorrect card
- Then run the full real flow: hub → start session → answer questions → Selesai → results page renders with real data

### Step 7: Lint, format, typecheck

```bash
rtk pnpm run format
rtk pnpm run lint:agent
rtk pnpm run check
```

Expected: all green.

### Step 8: Commit

```bash
git add src/lib/components/features/quiz-session/results-hero.svelte \
        src/lib/components/features/quiz-session/failing-chapter-row.svelte \
        src/lib/components/features/quiz-session/incorrect-question-card.svelte \
        'src/routes/(app)/session/[studySetId]/quiz/[sessionId]/results/+page.svelte' \
        'src/routes/(app)/session/[studySetId]/quiz/[sessionId]/results/+page.server.ts'
git commit -m "feat(quiz-session): build results page with hero, chapter analysis, and review"
```

---

## Self-Review

**1. Spec coverage**

| Spec section                                                                            | Covered in task                 |
| --------------------------------------------------------------------------------------- | ------------------------------- |
| Hub: Card A (active)                                                                    | Task 5                          |
| Hub: Card B (start) + chapter picker                                                    | Task 5                          |
| Hub: recent-sessions list + status filter                                               | Task 5                          |
| Hub: empty state                                                                        | Task 5                          |
| Hub: ?/createSession action                                                             | Task 5                          |
| Taking: progress pills (4 states, clickable)                                            | Task 6                          |
| Taking: question card (MC / MS / FITB)                                                  | Task 6                          |
| Taking: action bar (Sebelumnya / Selanjutnya / Selesai)                                 | Task 6                          |
| Taking: confirmation sheet                                                              | Task 6                          |
| Taking: direct oRPC auto-save, per-type timing                                          | Task 6                          |
| Taking: ?/completeSession action                                                        | Task 6                          |
| Results: hero with count-up + scoreToCopy                                               | Task 7                          |
| Results: failing-chapter row (informational)                                            | Task 7                          |
| Results: incorrect-question cards (Penjelasan expanded by default)                      | Task 7                          |
| Results: footer CTAs                                                                    | Task 7                          |
| Shared layout + session-header                                                          | Task 4                          |
| Backend `countInScope` query                                                            | Task 1                          |
| Frontend utilities + unit tests                                                         | Task 2                          |
| Dev stubs (hub / taking / results filters)                                              | Task 3                          |
| Out of scope: FITB refactor, pagination, share, timer, bookmark, beforeunload, tab sync | Logged in spec; not implemented |

**2. Placeholder scan**

The plan contains no "TBD", "TODO", "implement later", or "similar to" shortcuts. Every code step shows the full code to write. The few spots marked "verify against existing pattern" point to specific files in the codebase (not vague "follow conventions") and are scoping the engineer's check, not skipping the work.

**3. Type consistency**

- `localAnswers: Record<sessionQuizId, string[]>` is consistent across `progress-pills.svelte` (consumes), `question-card.svelte` (writes via `onChange`), and the taking page (owns).
- `answerStateForPill` takes `(localAnswer, isCurrent, isVisited)` — consistent in the test file, the utility file, and the consumer (`progress-pills.svelte`).
- `scoreToCopy(score: number): string` returns one of the 4 spec'd labels; the test file's `it.each` uses the same threshold boundaries the spec documents.
- `formatSessionTimestamp(timestampMs, nowMs?)` signature is consistent in the test and the implementation; the optional `nowMs` makes the test deterministic.
- `chapterColorById: Record<string, string | null>` matches what the taking page constructs from `data.chapters` and what `progress-pills.svelte` reads.
- `orpc.quizSession.{list, create, get, getQuestions, getQuestions, complete, submitAnswer, countInScope}` is the procedure name set; verify each call against the router (Task 1 adds `countInScope`, the others exist).

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-06-15-quiz-session-ui.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
