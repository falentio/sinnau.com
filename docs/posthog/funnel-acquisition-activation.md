# Funnel: Acquisition → Activation

## Steps

1. **`user signed up`** — user creates account via email sign-up form
2. **`study_set created`** or **`quiz_session started`** or **`flashcard_session started`** — user creates study content or starts a study session

## Events

### Step 1: `user signed up`

- **File:** `src/lib/components/sign-up-form.svelte:82`
- **Trigger:** `authClient.signUp.email()` succeeds (no error)
- **Properties:** `method` (`"email"`)

### Step 2: `study_set created`

**Manual path:**
- **File:** `src/routes/(app)/study/new/+page.svelte:31`
- **Trigger:** `client.studySet.create()` succeeds
- **Properties:** `method` (`"manual"`), `study_set_id`, `visibility`

**AI generate path:**
- **File:** `src/routes/(app)/study/generate/+page.svelte:49`
- **Trigger:** `client.generate.create()` succeeds
- **Properties:** `method` (`"ai_generate"`), `extraction_type`, `generate_id`, `language_style`, `visibility`

### Alternative Step 2: `quiz_session started`

- **File:** `src/lib/components/features/quiz-session/new-session-form.ts:25`
- **Trigger:** `client.quizSession.create()` succeeds
- **Properties:** `has_chapter_filter`, `session_id`, `study_set_id`

### Alternative Step 2: `flashcard_session started`

- **File:** `src/routes/(app)/session/[studySetId]/flashcard/[sessionId]/+page.svelte:65`
- **Trigger:** `$effect` fires when `total > 0` and not yet tracked
- **Properties:** `session_id`, `study_set_id`, `total_cards`

## PostHog Configuration

Create a funnel in PostHog with:
- **Step 1:** `user signed up`
- **Step 2:** Event sequence matching `study_set created` OR `quiz_session started` OR `flashcard_session started`

Use `person_profiles: identified_only` to correlate via `posthog.identify()`.
