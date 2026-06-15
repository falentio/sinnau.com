# Quiz Session UI Design

**Date:** 2026-06-15
**Status:** Approved (updated)
**Last updated:** 2026-06-15

## Goal

Build the three frontend pages for the quiz-session domain — **hub**, **taking**, and **results** — on top of the existing quiz-session service, guard, repository, router, and schemas. The backend is complete; this spec covers the UI surface only, plus one new backend query (`countInScope`) that the hub needs to render chapter counts.

## Context

The quiz-session service (`src/lib/server/services/quiz-session/`) is fully implemented: `createSession`, `submitAnswer`, `completeSession`, `getSession`, `getQuestions`, `getResults`, `listSessions`, `adminDeleteExpiredSessions`. A placeholder `+page.svelte` exists at `src/routes/(app)/session/[studySetId]/quiz/+page.svelte` with the message "Sesi quiz belum tersedia. Backend belum diimplementasikan." This spec replaces that placeholder and adds the two new pages.

The existing flashcard session at `src/routes/(app)/session/[studySetId]/flashcard/+page.svelte` is the visual reference for the "session is outside the study-set layout" pattern (no study-set header, just a slim back-button header).

The design system uses shadcn-svelte + Tailwind v4, `rounded-4xl bg-card shadow-xs` cards, `max-w-2xl mx-auto` page containers, hugeicons line icons, Indonesian-language UI strings. The high-end-visual-design principles (double-bezel cards, motion choreography, GPU-safe animations, `prefers-reduced-motion` fallbacks) apply on top of this system for the primary-action cards (Mulai, Lanjutkan, results hero) without re-shipping the whole design language.

## Approved Direction

Three new routes, one new layout, thirteen new feature components, one new backend query. The hub is a combined dashboard (resume-active-session card + start-new-session card with inline chapter picker + recent-sessions list with status filter). The taking page is one-question-per-screen with highlight-only, deferred-feedback selection, clickable progress pills, and client-side direct-oRPC auto-save (per-type timing). The results page is a hero score + chapter analysis (informational, when applicable) + incorrect-question review.

**Motion choreography (Q16):** static. The question card swaps content instantly on navigation — no `fly` or `fade` transition. No SvelteKit page transitions between hub/taking/results. The only choreographed motions are the count-up on the results hero (1.2s tween) and the pulse on the current progress pill (CSS keyframes). All gated by `prefers-reduced-motion`. The progress pills are the visual feedback for question-change events.

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
  activeSessions:      QuizSession[]                  // filtered to status === 'ACTIVE' (Card A)
  recentSessions:      QuizSession[]                  // ALL sessions (active + completed), top 5, createdAt DESC
  recentCounts:        { all: number; active: number; completed: number }  // for filter chip badges
  chapterQuizCounts:   Record<string, number>         // { [chapterId]: count }, missing chapters = 0
  totalScopeCount:     number                         // count in current scope (chapter or all)
  scope:               { chapterId: string | null }   // derived from ?chapter= URL param
  statusFilter:        'all' | 'active' | 'completed' // derived from ?status= URL param, default 'all'
}
```

Loading uses `Promise.all` for the count queries — one per chapter plus one for the "all" scope, and three list counts (all/active/completed) for the filter chip badges. `depends('quiz-session:hub:scope:' + (scope.chapterId ?? 'all'))` for cache invalidation when the chapter picker changes.

### Composition (top to bottom)

**1. Active-session card** (`<quiz-session-card mode="active" />`) — only rendered when `activeSessions.length > 0`. Shows the most recent active session: title line "Sesi Aktif", subline "Pertanyaan terakhir: {lastQuestionText ?? 'Belum ada yang dijawab'}" truncated to ~40 chars, timestamp ("1 jam lalu"), and a primary "Lanjutkan" button that navigates to the taking page. The progress count is intentionally not shown here — `ListQuizSessionsResponse` does not include `answeredCount`, and adding an extra `getQuestions` round-trip per card just to display the count isn't worth it. The progress pills on the taking page show the count for free. (If multiple active sessions exist, only the most recent gets Card A; older actives are surfaced in the recent-sessions list under the "Aktif" filter.)

**2. Start-new-session card** (`<quiz-session-card mode="start" />`) — always rendered (replaced by `quiz-session-empty` when `totalScopeCount === 0`). Contains:

- Title "Mulai Sesi Baru"
- `<chapter-scope-picker>` — horizontal chip row, first chip "Semua ({totalScopeCount})", then one chip per chapter with the title and count. Active chip uses the existing `quiz-filter-bar` styling. Picking a chip calls `goto(?chapter=…)` which re-runs the load.
- "Mulai" button (primary pill) — submits a form action `?/createSession` with `{ chapterId }`. Disabled when `totalScopeCount === 0`. On success the action returns `redirect` to `/session/[studySetId]/quiz/[newSessionId]/`.

**3. Recent sessions section** — header "Sesi Sebelumnya" (no eyebrow label per anti-slop rule). Above the list, a `<quiz-session-list-filter>` chip group:

```
[Semua (N+M)]  [Aktif (N)]  [Selesai (M)]
```

- Default selected chip: "Semua".
- Active chip is rendered with the same chip styling as the chapter picker (consistent with the app's filter-bar pattern).
- Each chip's count is a parenthetical number from `recentCounts`.
- The filter is controlled — clicking a chip calls `goto(?status=…)` (preserving `?chapter=…` if present), which re-runs the load.
- The selected chip is read from `data.statusFilter` and rendered with the active style.

Body is a list of `<quiz-session-row>` items, max 5. Each row shows: status badge ("Aktif" / "Selesai"), truncated `lastQuestionText` or "—" if null, `createdAt` formatted, and the score for completed sessions ("80/100" or "—"). Clicking a row navigates to the taking page if active, results if completed. Hidden entirely when `recentSessions.length === 0`. The list is filtered server-side based on `?status=`, so URL is the source of truth and refreshable/shareable.

**4. Empty state** — `<quiz-session-empty>` replaces the start card when `totalScopeCount === 0` (and the picker is also hidden). Shows "Belum ada quiz di sini" with a "Buat quiz" link to `/study/[studySetId]/quiz/create/`.

### Visual treatment

The two primary cards use the **double-bezel pattern** from the high-end-visual-design playbook: outer wrapper `bg-card border rounded-4xl p-1.5`, inner core `bg-background/50 rounded-[calc(2rem-0.375rem)]`. Session rows use the existing standard card aesthetic (`divide-y` between rows, no card container) — they're secondary navigation, the existing look is right. The list-filter chip group uses the standard `quiz-filter-bar` styling.

## Taking Page (`/session/[studySetId]/quiz/[sessionId]/`)

### Data loaded by `+page.server.ts`

```ts
{
  session:    QuizSession                            // client.quizSession.get
  questions:  QuizSessionQuestionItem[]              // client.quizSession.getQuestions
}
```

`depends('quiz-session:session:' + sessionId)`. The `completeSession` form action re-runs this load. If `session.status === 'COMPLETED'`, the page server-side redirects to `/results`.

### Local state (the page's source of truth during the session)

```ts
let currentIndex: number = $state(0);
let localAnswers: Record<sessionQuizId, string[]> = $state({});
let debounceTimers: Record<sessionQuizId, ReturnType<typeof setTimeout>> = {};
let submittingFor: sessionQuizId | null = $state(null);
```

`localAnswers` is **the canonical answer map** for the page. The progress pills, the question card's initial values, and the action bar's enabled/disabled state all derive from it. `currentIndex` controls which question is rendered. `debounceTimers` holds the per-question debounce handles for MC/MS clicks. `submittingFor` is reserved for future loading-state display (v1 doesn't need it but the slot is there).

**Initialization.** On mount, an `$effect` watches `data.questions` and seeds `localAnswers` from each question's `currentAnswer` (the server's last-known answer). The effect does _not_ re-seed on subsequent data updates — local state is sticky once initialized, the server load is only the bootstrap.

### Composition

**1. Progress indicator** (`<progress-pills>`) — N pill segments in a single horizontal row above the question card. **Clickable** — tapping a pill sets `currentIndex` to that pill's index. Four visual states per pill:

| State              | Visual                                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Unvisited          | `bg-muted` (empty outline)                                                                                                                    |
| Visited-unanswered | `bg-[repeating-linear-gradient(45deg,theme(colors.muted),theme(colors.muted)_4px,transparent_4px,transparent_8px)]` (diagonal stripe pattern) |
| Answered           | `bg-primary` (solid fill — chapter accent color where applicable, see note)                                                                   |
| Current            | Any of the above + `ring-2 ring-offset-2 ring-foreground`                                                                                     |

The diagonal-stripe pattern for "Visited-unanswered" is implemented as a `bg-[repeating-linear-gradient(...)]` Tailwind arbitrary value token. The ring for "Current" is `ring-2 ring-offset-2 ring-foreground` and is applied on top of whatever state the pill is in. Chapter accent color for the "Answered" state comes from the question's chapter (looked up via `data.chapters.find((c) => c.id === question.chapterId)?.colorHex` from the layout load) — when no chapter accent is available, default to `bg-primary`. The pulse animation on "Current" is a CSS `@keyframes` gated by `@media (prefers-reduced-motion: no-preference)`. On mobile, the pills are `sticky top-[calc(theme(spacing.16))]` (sticky directly below the layout's session-header, which is `h-16`); on desktop they're static (the page never scrolls past the question card on desktop).

**2. Question card** (`<question-card>`) — the main content. Three variants by `quiz.type`:

- **MULTIPLE_CHOICE** — vertical list of `<option-row>` (letter chip + option text). Click row → set selected. Click another row → replace. Selected row: `border-primary bg-primary/5` and filled radio. "Lanjut" requires exactly 1 selected.
- **MULTIPLE_SELECT** — same row layout with checkbox icon and "Tandai semua yang benar" helper text. Each selected row stacks. "Lanjut" requires ≥ 1 selected.
- **FILL_IN_THE_BLANK** — single large text input (`text-lg`), `autoFocus` on mount, placeholder "Ketik jawaban…". "Lanjut" requires non-empty trimmed input.

All variants share the double-bezel outer card, a type badge top-left ("Pilihan Ganda" / "Pilihan Ganda Kompleks" / "Isian"), and no question index label (the progress pills already say that).

The card receives a `$bindable` callback prop `onChange: (selectedOptionIds: string[]) => void`. The page wires this to the auto-save dispatcher (see below). The card's local "selected" state is initialized from `localAnswers[sessionQuizId]` and the card calls `onChange` whenever the user makes a selection (after the local state update).

**3. Action bar** (in-card at the bottom of the question card) — "Sebelumnya" and "Selanjutnya" buttons, plus "Selesai" on the last question. "Sebelumnya" is hidden on the first question, "Selanjutnya" is hidden on the last. All three are disabled until the current question is answered (FITB: non-empty trimmed; MC: exactly 1; MS: ≥ 1). Navigation is **client-side state** (`let currentIndex = $state(0)` in the page), not URL — the URL stays constant, browser back goes to the hub.

**4. Confirmation sheet** (`<complete-session-sheet>`) — triggered by "Selesai". Bottom sheet (shadcn-svelte `Sheet`) with title "Selesaikan sesi?", body showing "X soal belum dijawab dan akan dihitung salah." when `answeredCount < totalQuestions` (where `answeredCount` is computed from `localAnswers` in `$derived`), and two buttons: "Kembali" (dismiss) and "Selesaikan" (primary, calls the `?/completeSession` action).

### Auto-save (direct oRPC, per-type timing)

Auto-save is **not** a SvelteKit form action. The page calls the oRPC procedure directly so the load isn't revalidated on every click (debounced 300ms per click for MC/MS, or on blur/Lanjut for FITB).

```ts
// in the page's <script>
import { orpc } from "$lib/orpc";
import { toast } from "svelte-sonner";

function dispatchAutoSave(
  sessionQuizId: string,
  selectedOptionIds: string[],
  questionType: "MULTIPLE_CHOICE" | "MULTIPLE_SELECT" | "FILL_IN_THE_BLANK",
  mode: "debounced" | "immediate"
) {
  // 1. Optimistic update — always.
  localAnswers[sessionQuizId] = selectedOptionIds;

  if (questionType === "FILL_IN_THE_BLANK") {
    // FITB: no debounce. The card calls dispatchAutoSave with mode='immediate'
    // on the input's `blur` event, OR right before "Lanjut" navigates.
    if (mode !== "immediate") return;
  } else {
    // MC / MS: debounce 300ms per click. Cancel any in-flight timer.
    if (mode === "debounced") {
      clearTimeout(debounceTimers[sessionQuizId]);
      debounceTimers[sessionQuizId] = setTimeout(() => {
        sendSubmitAnswer(sessionQuizId, selectedOptionIds);
      }, 300);
      return;
    }
  }

  sendSubmitAnswer(sessionQuizId, selectedOptionIds);
}

async function sendSubmitAnswer(
  sessionQuizId: string,
  selectedOptionIds: string[]
) {
  try {
    await orpc.quizSession.submitAnswer({ sessionQuizId, selectedOptionIds });
  } catch (err) {
    // Revert the optimistic update and toast.
    const original = data.questions.find(
      (q) => q.sessionQuizId === sessionQuizId
    );
    if (original) localAnswers[sessionQuizId] = original.currentAnswer ?? [];
    toast.error("Gagal menyimpan jawaban. Coba lagi.");
  }
}
```

**Per-type timing summary:**

| Question type     | Trigger for `submitAnswer`                                             |
| ----------------- | ---------------------------------------------------------------------- |
| MULTIPLE_CHOICE   | Debounced 300ms per click                                              |
| MULTIPLE_SELECT   | Debounced 300ms per click                                              |
| FILL_IN_THE_BLANK | Immediate on input `blur`, or immediate right before "Lanjut" advances |

**FITB client-side match.** Before calling `submitAnswer` for FITB, the page does the `trim().toLowerCase()` comparison described in the "FITB v1 Compatibility Note" section — sending `[options[0].id]` on match, `[]` on miss. The match happens in the `sendSubmitAnswer` path, _not_ in `dispatchAutoSave`, so the user's typed string is preserved in `localAnswers` for display on the question card.

**Progress pill state derivation.** Pills are purely a function of `localAnswers` + `currentIndex`. There is no server round-trip on navigation — clicking "Lanjut" only mutates `currentIndex`, and the next question's pill becomes "Current" while the previous question's pill becomes "Visited-unanswered" (if unanswered) or stays "Answered" (if answered). The pills also reflect the most recent auto-save success: a question is "Answered" only when `localAnswers[sessionQuizId].length > 0` (or for MC, exactly 1; for MS, ≥ 1). If a save fails, the optimistic update is reverted, so the pill also reverts.

### Cross-device resume

`getQuestions` returns `currentAnswer` per question. On page load, `localAnswers` is seeded from `data.questions`, the progress pills are pre-filled, and the user picks up exactly where they left off — no special resume flow needed, just a fresh load. Any pending debounced timer from a previous tab is not transferred (a fresh load clears `debounceTimers`); a partially-saved answer is preserved by the server.

### Edge cases

| Scenario                              | Handling                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unauthenticated                       | oRPC interceptor → SvelteKit `error(401)` → login redirect (existing)                                                                                                                                                                                                                                                                     |
| Session not found                     | oRPC `NOT_FOUND` → SvelteKit `error(404)` → global `+error.svelte` (existing)                                                                                                                                                                                                                                                             |
| Session already COMPLETED             | Server-side `redirect(303, …/results)` in the taking page load                                                                                                                                                                                                                                                                            |
| Submitting to COMPLETED session       | Server-side check in `submitAnswer` returns `SESSION_ALREADY_COMPLETED` → sonner toast "Sesi sudah selesai"                                                                                                                                                                                                                               |
| Invalid option IDs                    | oRPC `VALIDATION_FAILED` → sonner toast with the message                                                                                                                                                                                                                                                                                  |
| Network failure on `submitAnswer`     | Caught in `sendSubmitAnswer`'s `try/catch`, optimistic update reverted, sonner toast                                                                                                                                                                                                                                                      |
| Network failure on `completeSession`  | Caught in the form action, returned as `{ success: false, message }` → sonner toast, sheet stays open                                                                                                                                                                                                                                     |
| Page refresh mid-session              | `localAnswers` is re-seeded from `data.questions`, user resumes, clickable pills let them jump back to any question                                                                                                                                                                                                                       |
| In-flight debounced save + page leave | The pending `setTimeout` is cleared on `$effect` cleanup, so the unsaved optimistic update is canceled. On next page load, `localAnswers` is re-seeded from `data.questions` (the server's last-saved state), so the user resumes at whatever the server has. No data corruption; the worst case is losing the most recent unsaved click. |

## Results Page (`/session/[studySetId]/quiz/[sessionId]/results/`)

### Data loaded by `+page.server.ts`

```ts
{
  session: QuizSession;
  results: QuizSessionResults;
  failingChapterTitles: Record<string, string>; // derived: chapters + failingChapterIds
  chapterScores: Record<string, { correct: number; total: number }>; // derived for the analysis section
}
```

If `session.status !== 'COMPLETED'`, the page server-side redirects to the taking page. The `failingChapterTitles` and `chapterScores` lookup happens in the load function — no extra round-trip per chapter.

### Composition

**1. Hero card** (`<results-hero>`) — double-bezel card. Massive score in `text-7xl md:text-8xl font-semibold tabular-nums tracking-tighter leading-none` (`tabular-nums` prevents digit reflow). Count-up animation 0 → final value over 1.2s using a Svelte tween with `cubic-bezier(0.16, 1, 0.3, 1)`, gated by `prefers-reduced-motion` (skips to final value). One-line summary "X dari Y benar" below the score. Conditional copy line based on score (see `scoreToCopy` thresholds in the Utilities section):

- `score === 100`: "Sempurna"
- `score >= 90 && score <= 99`: "Bagus sekali"
- `score >= 75 && score <= 89`: "Hebat"
- `score < 75`: "Coba lagi"

The hero stays neutral — no green/red, no confetti, no color-shifting score. Only the primary CTA color appears.

**2. Failing-chapter row** (`<failing-chapter-row>`) — section header "Chapter yang perlu diulang" (plain text, no eyebrow). Chip pills, one per chapterId in `failingChapterIds`, showing `{title} · {N} salah`. Clicking a chip navigates to `/study/[studySetId]/?chapter={chapterId}`. Hidden when `failingChapterIds.length === 0` (which is always the case for chapter-scoped sessions per the SPECS — `failingChapterIds` is `[]` when `session.chapterId !== null`). The section is **informational only** — no CTAs, no per-chapter "Ulangi" actions (YAGNI for v1; user navigates back to the hub to retry).

**3. Incorrect-question cards** (`<incorrect-question-card>`) — one per `results.incorrectQuestions`. Each card:

- Double-bezel outer + `border-l-4 border-primary/20` accent stripe
- Type badge
- Question text
- For MC/MS: "Jawaban kamu" list with `✕` next to the user's selected option(s), "Jawaban benar" list with `✓` next to the correct option(s), "Penjelasan" section (Q17: **expanded by default**, no click-to-expand) if the correct option has an `explanation`
- For FITB: "Jawaban benar: {options[0].optionText}" with "Penjelasan" section (expanded by default) if any. No "Jawaban kamu" line for FITB (see the FITB v1 compatibility note below).
- Hidden entirely when `results.incorrectQuestions.length === 0` (perfect score). The hero copy changes to "Sempurna" in that case.

**4. Footer CTAs** — both link to `/session/[studySetId]/quiz/` (the hub):

- "Coba sesi baru" (primary) — same chapter chip is pre-picked from the URL, so the user can tap Mulai again to retry the same scope
- "Kembali ke hub" (ghost) — same destination, different intent framing (user wants to switch scope or stop)

## Components

All new components live under `$lib/components/features/quiz-session/`:

| Component                         | Responsibility                                                                                                                                                                                                                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session-header.svelte`           | Slim header: back button + study-set title                                                                                                                                                                                                                                                            |
| `quiz-session-card.svelte`        | The "Lanjutkan" / "Mulai" card, double-bezel, two `mode` props                                                                                                                                                                                                                                        |
| `chapter-scope-picker.svelte`     | Horizontal chip row, controlled component — parent owns the `pickedChapterId: string \| null` state and passes it as a `value` prop. Picker calls the `onChange: (chapterId: string \| null) => void` callback when a chip is tapped. Parent's callback does `goto(?chapter=…)` to trigger a re-load. |
| `quiz-session-list-filter.svelte` | Three-chip filter (`[Semua] [Aktif] [Selesai]`) above the recent-sessions list. Controlled component, same callback pattern as the chapter-scope-picker. Parent's callback does `goto(?status=…)`.                                                                                                    |
| `quiz-session-row.svelte`         | Single past-session row, clickable                                                                                                                                                                                                                                                                    |
| `quiz-session-empty.svelte`       | Empty state for 0-quiz scope                                                                                                                                                                                                                                                                          |
| `question-card.svelte`            | The taking card, three variants by `quiz.type`, `$bindable` `onChange` callback for auto-save                                                                                                                                                                                                         |
| `option-row.svelte`               | Single option row (radio/checkbox/text-input variant)                                                                                                                                                                                                                                                 |
| `progress-pills.svelte`           | N pill segments, four visual states (Unvisited / Visited-unanswered / Answered / Current), clickable (callback `onSelect: (index: number) => void`)                                                                                                                                                   |
| `complete-session-sheet.svelte`   | Bottom sheet for the Selesai confirmation                                                                                                                                                                                                                                                             |
| `results-hero.svelte`             | Massive score with count-up animation, score-copy line from `scoreToCopy`                                                                                                                                                                                                                             |
| `failing-chapter-row.svelte`      | Chip list of failing chapters (informational only)                                                                                                                                                                                                                                                    |
| `incorrect-question-card.svelte`  | Wrong/right/explanation review card, three variants by `quiz.type`                                                                                                                                                                                                                                    |

### Utilities (`$lib/utils/quiz-session.ts`)

- `formatSessionTimestamp(ms: number): string` — relative time formatting ("1 jam lalu", "Kemarin", "12 Mei")
- `scoreToCopy(score: number): string` — returns the conditional hero copy label per the thresholds in the Results Page section. Thresholds are `{100: 'Sempurna', 90: 'Bagus sekali', 75: 'Hebat', 0: 'Coba lagi'}`.
- `sessionStatusLabel(status): 'Aktif' | 'Selesai'`
- `tweenedScore(target: number, durationMs: number)` — Svelte tweened store, gated by `prefers-reduced-motion`
- `answerStateForPill(question, localAnswer, isCurrent): 'unvisited' | 'visited-unanswered' | 'answered' | 'current'` — pure function, used by `progress-pills.svelte` to derive the four pill states. Keeps the pill state logic in one testable place rather than scattered across the taking page.

### Reuse

- shadcn-svelte `Button`, `Badge`, `Sheet`, plus the existing `Toaster` mounted in `(app)/+layout.svelte`
- All icons from `$lib/components/features/icons` (no new icons needed)
- `quiz-filter-bar.svelte` _style_ for `chapter-scope-picker.svelte` and `quiz-session-list-filter.svelte` chip rendering
- `study-set-item.svelte` _rhythm_ for `quiz-session-row.svelte`'s `divide-y` pattern

## State Management

| State                           | Where                           | Lifetime                                   | Tool                                 |
| ------------------------------- | ------------------------------- | ------------------------------------------ | ------------------------------------ |
| Current question index          | taking page `+page.svelte`      | ephemeral, resets on refresh               | `$state(0)` rune                     |
| Local answers (canonical)       | taking page `+page.svelte`      | seeded from `data.questions`, sticky after | `$state<Record<string, string[]>>`   |
| Per-question debounce timers    | taking page `+page.svelte`      | cleared on `$effect` cleanup               | plain `Record<…, setTimeout handle>` |
| Submitting in-flight (reserved) | taking page `+page.svelte`      | ephemeral                                  | `$state<string \| null>`             |
| Sheet open state                | `complete-session-sheet.svelte` | ephemeral                                  | `$bindable` prop                     |
| Action error message            | page `+page.svelte`             | ephemeral, surfaces as toast               | `$state<string \| null>`             |

No global stores. No URL state for transient UI. The chapter picker and the list filter both live in the URL (`?chapter=…`, `?status=…`) so they're shareable and persist across reloads. The taking page's `currentIndex` is **not** in the URL (clickable pills mutate it freely, no round-trip on every click).

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

| Route  | Action              | Input                           | Success                                                | Failure (toast)                           |
| ------ | ------------------- | ------------------------------- | ------------------------------------------------------ | ----------------------------------------- |
| Hub    | `?/createSession`   | `{ chapterId: string \| null }` | `redirect(303, '/session/[studySetId]/quiz/[newId]/')` | `{ message: err.message }`                |
| Taking | `?/completeSession` | `{}`                            | `redirect(303, '…/results')`                           | `{ message: 'Gagal menyelesaikan sesi' }` |

`?/submitAnswer` is **not** a form action — see the Auto-save section above. The page calls `orpc.quizSession.submitAnswer(...)` directly with try/catch and optimistic local state, so the load isn't revalidated on every click. This is what makes per-type debounce work without thrashing the page load.

Each form action's `try/catch` translates `ORPCError` → form-level `{ success: false, message }`. Network errors and unexpected exceptions are caught with the same wrapper, returning a generic Indonesian-language message and logging the original server-side. The page's `$effect` watches `form?.message` and fires `toast.error(form.message)` on change.

## Error Handling (Consolidated)

| Scenario                                      | Surface                                                 |
| --------------------------------------------- | ------------------------------------------------------- |
| Unauthenticated                               | SvelteKit `error(401)` → login redirect                 |
| Study set invisible                           | SvelteKit `error(404)` → global `+error.svelte`         |
| Chapter doesn't belong to study set           | SvelteKit `error(400)` → global `+error.svelte`         |
| Session not found / not owned                 | SvelteKit `error(404)` → global `+error.svelte`         |
| `SESSION_ALREADY_COMPLETED` from submitAnswer | sonner toast (caught client-side in `sendSubmitAnswer`) |
| `VALIDATION_FAILED` from submitAnswer         | sonner toast (caught client-side in `sendSubmitAnswer`) |
| Network failure on `submitAnswer`             | sonner toast, optimistic update reverted                |
| Network failure on `completeSession`          | sonner toast, sheet stays open for retry                |
| Initial page load network failure             | SvelteKit `+error.svelte` at the route level with retry |
| Inactive session → results URL                | server-side `redirect(303)` in results load             |
| TTL cleanup (90 days)                         | session deep-links 404, handled by global error         |

## Testing

### Backend

- `quiz-session.service.test.ts` — add a new `describe.concurrent('countInScope', ...)` block with the standard four cases: `UNAUTHORIZED` (no `requireUser`), `NOT_FOUND` (study set invisible), happy path returns `{ count }`, chapterId filtering works. Uses the existing `setupService()` mock factory and `captureError` helper.
- `quiz-session.guard.test.ts` — unchanged.
- `quiz-session.repository.drizzle.test.ts` — unchanged; `countQuizzesInScope` is already covered indirectly through existing methods.

### Frontend

No Svelte component tests for v1. The project has no Svelte test harness yet, and adding one is out of scope. Svelte component behavior is verified by manual smoke test against the dev stubs.

The pure function `answerStateForPill` in `$lib/utils/quiz-session.ts` is a candidate for a unit test — it has no DOM, no runes, no side effects, just `question + localAnswer + isCurrent → 'unvisited' | 'visited-unanswered' | 'answered' | 'current'`. A small `quiz-session.utils.test.ts` block (10–15 cases) is included in v1 to lock down the pill state logic. This is a plain Vitest unit test on a pure function, not a Svelte component test, so it doesn't need a component harness.

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
2. On blur (or on "Lanjut"), the client does `trim().toLowerCase()` on the typed text and on `options[0].optionText`. If they match: submit `selectedOptionIds: [options[0].id]`. Otherwise: submit `selectedOptionIds: []`.
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
- **Tab sync / multi-device live updates** — no cross-tab or cross-device subscription. Each device has its own `localAnswers`; the server is the merge point on next save.
- **`beforeunload` warning** — no native browser warning when the user closes the tab mid-session. The local state is lost on close, but the server's `currentAnswer` per question persists, so a fresh load restores progress.
- **Older active sessions surfaced in the UI** — Card A always shows the _most recent_ active session. If multiple actives exist (allowed by the backend), older ones are accessible only via the recent-sessions list under the "Aktif" filter. Surfacing multiple Card A's is out of scope.

## Files Touched

**New (frontend):**

- `src/routes/(app)/session/[studySetId]/quiz/+layout.svelte`
- `src/routes/(app)/session/[studySetId]/quiz/+layout.server.ts`
- `src/routes/(app)/session/[studySetId]/quiz/[sessionId]/+page.svelte`
- `src/routes/(app)/session/[studySetId]/quiz/[sessionId]/results/+page.svelte`
- `src/lib/components/features/quiz-session/session-header.svelte`
- `src/lib/components/features/quiz-session/quiz-session-card.svelte`
- `src/lib/components/features/quiz-session/chapter-scope-picker.svelte`
- `src/lib/components/features/quiz-session/quiz-session-list-filter.svelte`
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

## Changelog

### 2026-06-15 — Q9–Q15 deltas

- **Q9 — Auto-save architecture (direct oRPC, per-type timing):** removed `?/submitAnswer` form action. The taking page calls `orpc.quizSession.submitAnswer(...)` directly with try/catch and optimistic `localAnswers` state, so the load isn't revalidated on every click. Per-type timing: MC/MS debounced 300ms per click, FITB immediate on input blur or right before "Lanjut". Form-action table trimmed to `?/createSession` and `?/completeSession` only.
- **Q10 — Clickable progress pills:** pills are now interactive — tapping a pill sets `currentIndex` to that pill's index. Solves the "page refresh resets to Q1" problem because the user can jump back to any question at any time. No URL state for `currentIndex` (would re-trigger load on every click).
- **Q11 — Recent-sessions list shows all sessions + filter:** user chose option B (all sessions in the list) plus a filter. Added a three-chip filter `[Semua (N+M)] [Aktif (N)] [Selesai (M)]` above the list, with the count badges driven by `recentCounts`. Filter state in URL as `?status=all|active|completed`, default `all`.
- **Q12 — Filter UI = 3 chips, default "Semua":** used the recommended option (A) — three chips rendered in the existing `quiz-filter-bar` chip style, with "Semua" as the default. URL is source of truth via `?status=…`.
- **Q13 — Score copy thresholds {100, 90–99, 75–89, 0–74}:** `scoreToCopy` thresholds changed. Labels: `100 = Sempurna`, `90–99 = Bagus sekali`, `75–89 = Hebat`, `0–74 = Coba lagi`. The chapter analysis section's visibility logic (`failingChapterIds.length > 0`) is unchanged — independent of the score thresholds.
- **Q14 — 4-state progress pills:** pill visual states expanded from 2 (filled/empty + current highlight) to 4 (Unvisited outline / Visited-unanswered diagonal-stripe / Answered solid filled with chapter accent / Current with `ring-2 ring-offset-2 ring-foreground` border). Implementation lives in a pure function `answerStateForPill` in `$lib/utils/quiz-session.ts` so the state logic is testable.
- **Q15 — Chapter analysis section is informational only:** no per-chapter "Ulangi" CTAs in the failing-chapter section. The section just lists chapter titles + "N salah" counts, with chips that navigate to the study set filtered by chapter. YAGNI for v1 — user can navigate back to the hub to retry.
- **Q16 — Motion choreography is static:** no question-change or page transitions. The question card swaps instantly, no SvelteKit page transitions between hub/taking/results. Only the count-up on the results hero and the pulse on the current pill are choreographed. The progress pills' active-index change is the visual feedback for question-change events.
- **Q17 — Penjelasan section is expanded by default:** no click-to-expand. The user came to the results page to learn what they got wrong and why — hiding the explanation behind a tap is a tax on the primary review flow. "Show, don't hide" per the high-end-visual-design playbook.
- **Component count:** 12 → 13 (added `quiz-session-list-filter.svelte`).
- **Test surface:** added a small `quiz-session.utils.test.ts` block (10–15 cases) to lock down the `answerStateForPill` pure function. The rest of the frontend remains dev-stub-verified.
- **Out of scope additions:** tab sync, `beforeunload` warning, multiple-Actives-as-multiple-Card-A's. Each logged in the "Out of Scope / Deferred" section.
