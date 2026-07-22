# Funnel: Study Session Completion

Two parallel session types share a common pattern: start → complete. Answers are tracked via `session_id` correlation.

## Quiz Path

### Step 1: `quiz_session started`

- **File:** `src/lib/components/features/quiz-session/new-session-form.ts:25`
- **Trigger:** `client.quizSession.create()` succeeds
- **Properties:** `has_chapter_filter`, `session_id`, `study_set_id`

### Step 2: `quiz_session completed`

- **File:** `src/routes/(app)/session/[studySetId]/quiz/[sessionId]/+page.svelte:139`
- **Trigger:** `client.quizSession.complete()` succeeds
- **Properties:** `question_count`, `session_id`, `study_set_id`, `unanswered_count`

## Flashcard Path

### Step 1: `flashcard_session started`

- **File:** `src/routes/(app)/session/[studySetId]/flashcard/[sessionId]/+page.svelte:65`
- **Trigger:** `$effect` fires once when `total > 0` and `hasTrackedStart` is false
- **Properties:** `session_id`, `study_set_id`, `total_cards`

### Step 2: `flashcard_session completed`

- **File:** `src/routes/(app)/session/[studySetId]/flashcard/[sessionId]/+page.svelte:78`
- **Trigger:** `$effect` fires when `isComplete` becomes true
- **Properties:** `cards_reviewed`, `rating_distribution`, `session_id`, `study_set_id`

## PostHog Configuration

**Quiz funnel:**

- **Step 1:** `quiz_session started`
- **Step 2:** `quiz_session completed`

**Flashcard funnel:**

- **Step 1:** `flashcard_session started`
- **Step 2:** `flashcard_session completed`

**Combined "any session" funnel:**

- **Step 1:** Event sequence matching `quiz_session started` OR `flashcard_session started`
- **Step 2:** Event sequence matching `quiz_session completed` OR `flashcard_session completed`

Correlate with `session_id`. Use `person_profiles: identified_only` for user-level conversion rates.

## Key Metrics

- **Quiz completion rate:** `quiz_session completed` / `quiz_session started`
- **Flashcard completion rate:** `flashcard_session completed` / `flashcard_session started`
- **Quiz unanswered rate:** `unanswered_count` / `question_count` per completed session
- **Flashcard rating distribution:** Breakdown by `Again`, `Hard`, `Good`, `Easy` in `rating_distribution`
