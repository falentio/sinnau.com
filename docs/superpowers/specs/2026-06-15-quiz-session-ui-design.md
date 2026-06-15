# Quiz Session UI Design

**Date:** 2026-06-15
**Status:** Approved

## Goal

Build the three frontend pages for the quiz-session domain — **hub**, **taking**, and **results** — on top of the existing quiz-session service, guard, repository, router, and schemas. The backend is complete; this spec covers the UI surface only, plus one new backend query (`countInScope`) that the hub needs to render chapter counts.

## Context

The quiz-session service (`src/lib/server/services/quiz-session/`) is fully implemented: `createSession`, `submitAnswer`, `completeSession`, `getSession`, `getQuestions`, `getResults`, `listSessions`, `adminDeleteExpiredSessions`. A placeholder `+page.svelte` exists at `src/routes/(app)/session/[studySetId]/quiz/+page.svelte` with the message "Sesi quiz belum tersedia. Backend belum diimplementasikan." This spec replaces that placeholder and adds the two new pages.

The existing flashcard session at `src/routes/(app)/session/[studySetId]/flashcard/+page.svelte` is the visual reference for the "session is outside the study-set layout" pattern (no study-set header, just a slim back-button header).

The design system uses shadcn-svelte + Tailwind v4, `rounded-4xl bg-card shadow-xs` cards, `max-w-2xl mx-auto` page containers, hugeicons line icons, Indonesian-language UI strings. The high-end-visual-design principles (double-bezel cards, motion choreography, GPU-safe animations, `prefers-reduced-motion` fallbacks) apply on top of this system for the primary-action cards (Mulai, Lanjutkan, results hero) without re-shipping the whole design language.

## Approved Direction

Three new routes, one new layout, twelve new feature components, one new backend query. The hub is a combined dashboard (resume-active-session card + start-new-session card with inline chapter picker + recent-sessions list). The taking page is one-question-per-screen with highlight-only, deferred-feedback selection. The results page is a hero score + chapter analysis (when applicable) + incorrect-question review.

## URL Structure & Layout

```
src/routes/(app)/session/[studySetId]/quiz/
├── +layout.svelte                                     ← NEW: shared session header
├── +layout.server.ts                                  ← NEW: loads studySet + chapters once
├── +page.svelte                                       ← REPLACE placeholder: hub
├── [sessionId]/
│   ├── +page.svelte                                   ← NEW: taking
│   └── results/
│       └── +page.svelte                               ← NEW: results
```

The layout renders a slim session header (`<session-header>`) with a "Kembali" button and the study-set title. The "Kembali" target is `/study/[studySetId]/quiz/` from the hub, and the hub from taking & results.

The `+layout.server.ts` loads `{ studySet, chapters }` once for the whole subtree via `Promise.all([client.studySet.get(...), client.chapter.list(...)])`. No re-fetching on child pages.

## Hub Page (`/session/[studySetId]/quiz/`)

### Data loaded by `+page.server.ts`

```ts
{
  activeSessions:   QuizSession[]                       // filtered to status === 'ACTIVE'
  recentSessions:   ListQuizSessionsResponse[]          // top 5, sorted by createdAt DESC
  chapterQuizCounts: Record<string, number>             // { [chapterId]: count }, missing chapters = 0
  totalScopeCount:  number                              // count in current scope (chapter or all)
  scope:            { chapterId: string | null }        // derived from ?chapter= URL param
}
```

Loading uses `Promise.all` for the count queries — one per chapter plus one for the "all" scope. `depends('quiz-session:hub:scope:' + (scope.chapterId ?? 'all'))` for cache invalidation when the chapter picker changes.

### Composition (top to bottom)

**1. Active-session card** (`<quiz-session-card mode="active" />`) — only rendered when `activeSessions.length > 0`. Shows the most recent active session: title line "Sesi Aktif", subline "Pertanyaan terakhir: {lastQuestionText ?? 'Belum ada yang dijawab'}" truncated to ~40 chars, timestamp ("1 jam lalu"), and a primary "Lanjutkan" button that navigates to the taking page. The progress count is intentionally not shown here — `ListQuizSessionsResponse` does not include `answeredCount`, and adding an extra `getQuestions` round-trip per card just to display the count isn't worth it. The progress pills on the taking page show the count for free.

**2. Start-new-session card** (`<quiz-session-card mode="start" />`) — always rendered (replaced by `quiz-session-empty` when `totalScopeCount === 0`). Contains:

- Title "Mulai Sesi Baru"
- `<chapter-scope-picker>` — horizontal chip row, first chip "Semua ({totalScopeCount})", then one chip per chapter with the title and count. Active chip uses the existing `quiz-filter-bar` styling. Picking a chip calls `goto(?chapter=…)` which re-runs the load.
- "Mulai" button (primary pill) — submits a form action `?/createSession` with `{ chapterId }`. Disabled when `totalScopeCount === 0`. On success the action returns `redirect` to `/session/[studySetId]/quiz/[newSessionId]/`.

**3. Recent sessions section** — header "Sesi Sebelumnya" (no eyebrow label per anti-slop rule). Body is a list of `<quiz-session-row>` items, max 5. Each row shows: status badge ("Aktif" / "Selesai"), truncated `lastQuestionText` or "—" if null, `createdAt` formatted, and the score for completed sessions ("80/100" or "—"). Clicking a row navigates to the taking page if active, results if completed. Hidden entirely when `recentSessions.length === 0`.

**4. Empty state** — `<quiz-session-empty>` replaces the start card when `totalScopeCount === 0` (and the picker is also hidden). Shows "Belum ada quiz di sini" with a "Buat quiz" link to `/study/[studySetId]/quiz/create/`.

### Visual treatment

The two primary cards use the **double-bezel pattern** from the high-end-visual-design playbook: outer wrapper `bg-card border rounded-4xl p-1.5`, inner core `bg-background/50 rounded-[calc(2rem-0.375rem)]`. Session rows use the existing standard card aesthetic (`divide-y` between rows, no card container) — they're secondary navigation, the existing look is right.

## Taking Page (`/session/[studySetId]/quiz/[sessionId]/`)

### Data loaded by `+page.server.ts`

```ts
{
  session:       QuizSession                            // client.quizSession.get
  questions:     QuizSessionQuestionItem[]              // client.quizSession.getQuestions
  answeredCount: number                                 // derived: questions.filter(q => q.currentAnswer !== null).length
}
```

`depends('quiz-session:session:' + sessionId)`. The `submitAnswer` and `completeSession` form actions re-run this load. If `session.status === 'COMPLETED'`, the page server-side redirects to `/results`.

### Composition

**1. Progress indicator** (`<progress-pills>`) — N pill segments in a single horizontal row above the question card. `h-1.5 rounded-full bg-muted` for empty, `bg-primary` for answered, `bg-primary/50` with a subtle pulse for the current question. The pulse is a CSS `@keyframes` gated by `@media (prefers-reduced-motion: no-preference)`. On mobile, the pills are `sticky top-[calc(theme(spacing.16))]` (sticky directly below the layout's session-header, which is `h-16`); on desktop they're static (the page never scrolls past the question card on desktop).

**2. Question card** (`<question-card>`) — the main content. Three variants by `quiz.type`:

- **MULTIPLE_CHOICE** — vertical list of `<option-row>` (letter chip + option text). Click row → set selected. Click another row → replace. Selected row: `border-primary bg-primary/5` and filled radio. "Lanjut" requires exactly 1 selected.
- **MULTIPLE_SELECT** — same row layout with checkbox icon and "Tandai semua yang benar" helper text. Each selected row stacks. "Lanjut" requires ≥ 1 selected.
- **FILL_IN_THE_BLANK** — single large text input (`text-lg`), `autoFocus` on mount, placeholder "Ketik jawaban…". "Lanjut" requires non-empty trimmed input.

All variants share the double-bezel outer card, a type badge top-left ("Pilihan Ganda" / "Pilihan Ganda Kompleks" / "Isian"), and no question index label (the progress pills already say that).

**3. Action bar** (in-card at the bottom of the question card) — "Sebelumnya" and "Selanjutnya" buttons, plus "Selesai" on the last question. "Sebelumnya" is hidden on the first question, "Selanjutnya" is hidden on the last. All three are disabled until the current question is answered (FITB: non-empty trimmed; MC: exactly 1; MS: ≥ 1). Navigation is **client-side state** (`let index = $state(0)` in the page), not URL — the URL stays constant, browser back goes to the hub.

**4. Confirmation sheet** (`<complete-session-sheet>`) — triggered by "Selesai". Bottom sheet (shadcn-svelte `Sheet`) with title "Selesaikan sesi?", body showing "X soal belum dijawab dan akan dihitung salah." when `answeredCount < totalQuestions`, and two buttons: "Kembali" (dismiss) and "Selesaikan" (primary, calls the `?/completeSession` action).

### Auto-save

Selection triggers a 300ms-debounced form action `?/submitAnswer` with `{ sessionQuizId, selectedOptionIds }`. The page does an optimistic local `selected` state update before the action returns. On action error, the page reverts and shows a sonner toast. The action revalidates the load, so the progress pills update with the new answered count on success.

### Cross-device resume

`getQuestions` returns `currentAnswer` per question. On page load, the progress pills are pre-filled. The user picks up exactly where they left off — no special resume flow needed, just a fresh load.

### Edge cases

| Scenario                             | Handling                                                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Unauthenticated                      | oRPC interceptor → SvelteKit `error(401)` → login redirect (existing)                                       |
| Session not found                    | oRPC `NOT_FOUND` → SvelteKit `error(404)` → global `+error.svelte` (existing)                               |
| Session already COMPLETED            | Server-side `redirect(303, …/results)` in the taking page load                                              |
| Submitting to COMPLETED session      | Server-side check in `submitAnswer` returns `SESSION_ALREADY_COMPLETED` → sonner toast "Sesi sudah selesai" |
| Invalid option IDs                   | oRPC `VALIDATION_FAILED` → sonner toast with the message                                                    |
| Network failure on `submitAnswer`    | Caught in form action, returned as `{ success: false, message }` → sonner toast                             |
| Network failure on `completeSession` | Same — toast, sheet stays open for retry                                                                    |
| Page refresh mid-session             | `currentAnswer` restores progress, user resumes                                                             |

## Results Page (`/session/[studySetId]/quiz/[sessionId]/results/`)

### Data loaded by `+page.server.ts`

```ts
{
  session: QuizSession;
  results: QuizSessionResults;
  failingChapterTitles: Record<string, string>; // derived: chapters + failingChapterIds
}
```

If `session.status !== 'COMPLETED'`, the page server-side redirects to the taking page. The `failingChapterTitles` lookup happens in the load function — no extra round-trip per chapter.

### Composition

**1. Hero card** (`<results-hero>`) — double-bezel card. Massive score in `text-7xl md:text-8xl font-semibold tabular-nums tracking-tighter leading-none` (`tabular-nums` prevents digit reflow). Count-up animation 0 → final value over 1.2s using a Svelte tween with `cubic-bezier(0.16, 1, 0.3, 1)`, gated by `prefers-reduced-motion` (skips to final value). One-line summary "X dari Y benar" below the score. Conditional copy line based on score:

- `score >= 80`: "Bagus sekali! Lanjut ke chapter berikutnya."
- `score >= 50`: "Cukup. Pelajari pembahasan di bawah untuk memperbaikinya."
- `score < 50`: "Jangan menyerah. Tinjau chapter yang perlu diulang dan coba lagi."

The hero stays neutral — no green/red, no confetti, no color-shifting score. Only the primary CTA color appears.

**2. Failing-chapter row** (`<failing-chapter-row>`) — section header "Chapter yang perlu diulang" (plain text, no eyebrow). Chip pills, one per chapterId in `failingChapterIds`, showing `{title} · {N} salah`. Clicking a chip navigates to `/study/[studySetId]/?chapter={chapterId}`. Hidden when `failingChapterIds.length === 0` (which is always the case for chapter-scoped sessions per the SPECS — `failingChapterIds` is `[]` when `session.chapterId !== null`).

**3. Incorrect-question cards** (`<incorrect-question-card>`) — one per `results.incorrectQuestions`. Each card:

- Double-bezel outer + `border-l-4 border-primary/20` accent stripe
- Type badge
- Question text
- For MC/MS: "Jawaban kamu" list with `✕` next to the user's selected option(s), "Jawaban benar" list with `✓` next to the correct option(s), "Penjelasan" section if the correct option has an `explanation`
- For FITB: "Jawaban benar: {options[0].optionText}" with "Penjelasan" section if any. No "Jawaban kamu" line for FITB (see the FITB v1 compatibility note below).
- Hidden entirely when `results.incorrectQuestions.length === 0` (perfect score). The hero copy changes to "Sempurna! Skor kamu 100." in that case.

**4. Footer CTAs** — both link to `/session/[studySetId]/quiz/` (the hub):

- "Coba sesi baru" (primary) — same chapter chip is pre-picked from the URL, so the user can tap Mulai again to retry the same scope
- "Kembali ke hub" (ghost) — same destination, different intent framing (user wants to switch scope or stop)

## Components

All new components live under `$lib/components/features/quiz-session/`:

| Component                        | Responsibility                                                                                                                                                                                                                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session-header.svelte`          | Slim header: back button + study-set title                                                                                                                                                                                                                                                            |
| `quiz-session-card.svelte`       | The "Lanjutkan" / "Mulai" card, double-bezel, two `mode` props                                                                                                                                                                                                                                        |
| `chapter-scope-picker.svelte`    | Horizontal chip row, controlled component — parent owns the `pickedChapterId: string \| null` state and passes it as a `value` prop. Picker calls the `onChange: (chapterId: string \| null) => void` callback when a chip is tapped. Parent's callback does `goto(?chapter=…)` to trigger a re-load. |
| `quiz-session-row.svelte`        | Single past-session row, clickable                                                                                                                                                                                                                                                                    |
| `quiz-session-empty.svelte`      | Empty state for 0-quiz scope                                                                                                                                                                                                                                                                          |
| `question-card.svelte`           | The taking card, three variants by `quiz.type`                                                                                                                                                                                                                                                        |
| `option-row.svelte`              | Single option row (radio/checkbox/text-input variant)                                                                                                                                                                                                                                                 |
| `progress-pills.svelte`          | N pill segments with filled/half-filled/empty states                                                                                                                                                                                                                                                  |
| `complete-session-sheet.svelte`  | Bottom sheet for the Selesai confirmation                                                                                                                                                                                                                                                             |
| `results-hero.svelte`            | Massive score with count-up animation                                                                                                                                                                                                                                                                 |
| `failing-chapter-row.svelte`     | Chip list of failing chapters                                                                                                                                                                                                                                                                         |
| `incorrect-question-card.svelte` | Wrong/right/explanation review card, three variants by `quiz.type`                                                                                                                                                                                                                                    |

### Utilities (`$lib/utils/quiz-session.ts`)

- `formatSessionTimestamp(ms: number): string` — relative time formatting ("1 jam lalu", "Kemarin", "12 Mei")
- `scoreToCopy(score: number): string` — returns the conditional hero copy
- `sessionStatusLabel(status): 'Aktif' | 'Selesai'`
- `tweenedScore(target: number, durationMs: number)` — Svelte tweened store, gated by `prefers-reduced-motion`

### Reuse

- shadcn-svelte `Button`, `Badge`, `Sheet`, plus the existing `Toaster` mounted in `(app)/+layout.svelte`
- All icons from `$lib/components/features/icons` (no new icons needed)
- `quiz-filter-bar.svelte` _style_ for `chapter-scope-picker.svelte`'s chip rendering
- `study-set-item.svelte` _rhythm_ for `quiz-session-row.svelte`'s `divide-y` pattern

## State Management

| State                         | Where                           | Lifetime                                    | Tool                     |
| ----------------------------- | ------------------------------- | ------------------------------------------- | ------------------------ |
| Current question index        | taking page `+page.svelte`      | ephemeral, resets on refresh                | `$state(0)` rune         |
| Selected options (optimistic) | `question-card.svelte`          | per-question, replaced when `index` changes | `$state` rune            |
| Sheet open state              | `complete-session-sheet.svelte` | ephemeral                                   | `$bindable` prop         |
| Submitting in-flight          | `question-card.svelte`          | ephemeral                                   | `$state(false)`          |
| Action error message          | page `+page.svelte`             | ephemeral, surfaces as toast                | `$state<string \| null>` |

No global stores. No URL state for transient UI. All chapter-picker state lives in the URL (`?chapter=…`) so it's shareable and persists across reloads.

## Data Flow & Backend Additions

### New backend query: `quizSession.countInScope`

**Schema** (`src/lib/schemas/quiz-session.ts`):

```ts
export const countQuizSessionInScopeInputSchema = v.object({
  chapterId: v.optional(chapterIdSchema),
  studySetId: studySetIdSchema,
});

export const countQuizSessionInScopeOutputSchema = v.object({
  count: v.number(),
});
```

**Service method** (`quiz-session.service.ts`):

```ts
async countInScope(
  input: CountQuizSessionInScopeInput,
  userId: string | null | undefined,
): Promise<{ count: number }> {
  const ownerId = this.guard.requireUser(userId);
  await this.guard.assertStudySetVisibleOrNotFound(input.studySetId, ownerId);
  return { count: await this.repo.countQuizzesInScope(input.studySetId, input.chapterId) };
}
```

**Router** (`quiz-session.router.ts`): register as `countInScope` alongside the existing procedures.

**Query file** (`queries/quiz-session.count-in-scope.ts`): thin oRPC procedure, mirrors `quiz-session.list.ts` shape. Errors: `UNAUTHORIZED`, `NOT_FOUND`.

No Drizzle changes — `countQuizzesInScope` already exists on the repository.

### Form actions (per page)

| Route  | Action              | Input                                  | Success                                                | Failure (toast)                           |
| ------ | ------------------- | -------------------------------------- | ------------------------------------------------------ | ----------------------------------------- |
| Hub    | `?/createSession`   | `{ chapterId: string \| null }`        | `redirect(303, '/session/[studySetId]/quiz/[newId]/')` | `{ message: err.message }`                |
| Taking | `?/submitAnswer`    | `{ sessionQuizId, selectedOptionIds }` | `{ ok: true }`                                         | `{ message: 'Gagal menyimpan jawaban' }`  |
| Taking | `?/completeSession` | `{}`                                   | `redirect(303, '…/results')`                           | `{ message: 'Gagal menyelesaikan sesi' }` |

Each action's `try/catch` translates `ORPCError` → form-level `{ success: false, message }`. Network errors and unexpected exceptions are caught with the same wrapper, returning a generic Indonesian-language message and logging the original server-side.

The page's `$effect` watches `form?.message` and fires `toast.error(form.message)` on change.

## Error Handling (Consolidated)

| Scenario                                      | Surface                                                 |
| --------------------------------------------- | ------------------------------------------------------- |
| Unauthenticated                               | SvelteKit `error(401)` → login redirect                 |
| Study set invisible                           | SvelteKit `error(404)` → global `+error.svelte`         |
| Chapter doesn't belong to study set           | SvelteKit `error(400)` → global `+error.svelte`         |
| Session not found / not owned                 | SvelteKit `error(404)` → global `+error.svelte`         |
| `SESSION_ALREADY_COMPLETED` from submitAnswer | sonner toast                                            |
| `VALIDATION_FAILED` from submitAnswer         | sonner toast                                            |
| Network failure (action returns false)        | sonner toast                                            |
| Initial page load network failure             | SvelteKit `+error.svelte` at the route level with retry |
| Inactive session → results URL                | server-side `redirect(303)` in results load             |
| TTL cleanup (90 days)                         | session deep-links 404, handled by global error         |

## Testing

### Backend

- `quiz-session.service.test.ts` — add a new `describe.concurrent('countInScope', ...)` block with the standard four cases: `UNAUTHORIZED` (no `requireUser`), `NOT_FOUND` (study set invisible), happy path returns `{ count }`, chapterId filtering works. Uses the existing `setupService()` mock factory and `captureError` helper.
- `quiz-session.guard.test.ts` — unchanged.
- `quiz-session.repository.drizzle.test.ts` — unchanged; `countQuizzesInScope` is already covered indirectly through existing methods.

### Frontend

No Svelte component tests for v1. The project has no Svelte test harness yet, and adding one is out of scope. Component behavior is verified by manual smoke test against the dev stubs.

### Dev stubs (mirroring `study/[studySetId]/quiz/+page.server.ts`)

| Route   | Stub filter       | Effect                                                              |
| ------- | ----------------- | ------------------------------------------------------------------- |
| Hub     | `?filter=empty`   | `recentSessions: []`, single Mulai card                             |
| Hub     | `?filter=active`  | Card A visible with mock active session (answeredCount=7, total=20) |
| Hub     | `?filter=500`     | Throws via `client.unimplemented()`                                 |
| Taking  | `?filter=mc`      | First question is a MULTIPLE_CHOICE                                 |
| Taking  | `?filter=ms`      | First question is a MULTIPLE_SELECT                                 |
| Taking  | `?filter=fitb`    | First question is a FILL_IN_THE_BLANK                               |
| Results | `?filter=perfect` | score=100, no incorrectQuestions, no failingChapterIds              |
| Results | `?filter=partial` | score=75, 2 incorrectQuestions, 1 failingChapterId                  |
| Results | `?filter=zero`    | score=0, all questions incorrect, 3 failingChapterIds               |

The implementation uses the same `VALID_FILTERS` / `DEV_STUB_FILTERS` pattern (with stub fixtures colocated in `src/lib/server/services/quiz-session/quiz-session.utils.ts` for consistency with `quiz.utils.ts`).

## FITB v1 Compatibility Note

The backend's `submitAnswer` requires `selectedOptionIds: string[]` (option IDs), and `scoreAnswer` compares option IDs, not text. For FILL_IN_THE_BLANK, the quiz is modeled as a single-option quiz with `options[0].isCorrect === true`. The v1 UI:

1. Renders a text input. "Lanjut" requires non-empty trimmed input.
2. On "Lanjut", the client does `trim().toLowerCase()` on the typed text and on `options[0].optionText`. If they match: submit `selectedOptionIds: [options[0].id]`. Otherwise: submit `selectedOptionIds: []`.
3. The results page's `incorrect-question-card` for FITB shows the **correct text** (`options[0].optionText`) under "Jawaban benar" and any `explanation`. It does **not** render a "Jawaban kamu" line because we only store the option ID, not the user's typed string.

A proper FITB refactor is deferred. The likely shape: store the user's typed string in a new column on `quiz_session_answer` (e.g. `submittedText: text | null`) and have FITB scoring compare `submittedText` to `options[0].optionText` server-side. This refactor is **out of scope for this spec** — it's logged below.

## Out of Scope / Deferred

- **FITB refactor** — proper text comparison with stored `submittedText`, or a multi-acceptable-answers model. Tracked as a future spec.
- **Pagination on `listSessions`** — capped at 5 in the hub UI; backend already supports full list.
- **Re-opening a completed session** — SPECS explicitly defers this; UI does not expose it.
- **Sharing results** — no share button in v1.
- **Per-question timer / countdown** — not in the SPECS.
- **Question bookmarking / "flag for review"** — not in the SPECS.
- **Review-before-submit screen** — `incorrect-question-card` is built with a `mode` prop reserved for this but not exposed in v1.
- **Svelte component test harness** — added separately if/when the project needs it.

## Files Touched

**New (frontend):**

- `src/routes/(app)/session/[studySetId]/quiz/+layout.svelte`
- `src/routes/(app)/session/[studySetId]/quiz/+layout.server.ts`
- `src/routes/(app)/session/[studySetId]/quiz/[sessionId]/+page.svelte`
- `src/routes/(app)/session/[studySetId]/quiz/[sessionId]/results/+page.svelte`
- `src/lib/components/features/quiz-session/session-header.svelte`
- `src/lib/components/features/quiz-session/quiz-session-card.svelte`
- `src/lib/components/features/quiz-session/chapter-scope-picker.svelte`
- `src/lib/components/features/quiz-session/quiz-session-row.svelte`
- `src/lib/components/features/quiz-session/quiz-session-empty.svelte`
- `src/lib/components/features/quiz-session/question-card.svelte`
- `src/lib/components/features/quiz-session/option-row.svelte`
- `src/lib/components/features/quiz-session/progress-pills.svelte`
- `src/lib/components/features/quiz-session/complete-session-sheet.svelte`
- `src/lib/components/features/quiz-session/results-hero.svelte`
- `src/lib/components/features/quiz-session/failing-chapter-row.svelte`
- `src/lib/components/features/quiz-session/incorrect-question-card.svelte`
- `src/lib/utils/quiz-session.ts`

**New (backend):**

- `src/lib/server/services/quiz-session/queries/quiz-session.count-in-scope.ts`

**Modified:**

- `src/routes/(app)/session/[studySetId]/quiz/+page.svelte` (replace placeholder)
- `src/routes/(app)/session/[studySetId]/quiz/+page.server.ts` (replace placeholder with real load)
- `src/lib/schemas/quiz-session.ts` (add input/output schemas and types for `countInScope`)
- `src/lib/server/services/quiz-session/quiz-session.service.ts` (add `countInScope` method)
- `src/lib/server/services/quiz-session/quiz-session.router.ts` (register `countInScope`)
- `src/lib/server/services/quiz-session/quiz-session.service.test.ts` (add `countInScope` describe block)
- `src/lib/server/services/quiz-session/quiz-session.utils.ts` (new — dev stub fixtures, separate from `quiz-session.testing.ts` which is for vitest mocks)
- `package.json` — no new deps expected; if `svelte/transition` `fly` is needed, it's already part of Svelte
