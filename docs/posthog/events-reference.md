# Events Reference

All 14 custom events emitted from `src/lib/analytics/events.ts`. Each event is gated on the client (`browser` guard or Svelte `$effect`). PostHog SDK queues events before init, so events fire regardless of load order.

---

## User Lifecycle

### `user signed up`

Fires after successful `authClient.signUp.email()`.

| Property | Type      | Description      |
| -------- | --------- | ---------------- |
| `method` | `"email"` | Auth method used |

**Source:** `src/lib/components/sign-up-form.svelte:82`

---

## Study Set Creation

### `study_set created`

Fires after a study set is created, either manually or via AI generation.

**Manual path** (`src/routes/(app)/study/new/+page.svelte:31`):

| Property       | Type                    | Description          |
| -------------- | ----------------------- | -------------------- |
| `method`       | `"manual"`              | Creation method      |
| `study_set_id` | `string`                | Created study set ID |
| `visibility`   | `"PUBLIC" \| "PRIVATE"` | Visibility setting   |

**AI generate path** (`src/routes/(app)/study/generate/+page.svelte:49`):

| Property          | Type                    | Description                                  |
| ----------------- | ----------------------- | -------------------------------------------- |
| `method`          | `"ai_generate"`         | Creation method                              |
| `extraction_type` | `string`                | PDF extraction type (`normal`, `exhaustive`) |
| `generate_id`     | `string`                | Linked generation ID                         |
| `language_style`  | `string`                | Language style key                           |
| `visibility`      | `"PUBLIC" \| "PRIVATE"` | Visibility setting                           |

---

## AI Generation Pipeline

### `generation started`

Fires alongside `study_set created` on the AI generate path.

| Property          | Type     | Description         |
| ----------------- | -------- | ------------------- |
| `extraction_type` | `string` | PDF extraction type |
| `generate_id`     | `string` | Generation ID       |
| `language_style`  | `string` | Language style key  |

**Source:** `src/routes/(app)/study/generate/+page.svelte:56`

### `generation completed`

Fires when the waiting room poll returns status `COMPLETED`.

| Property       | Type          | Description            |
| -------------- | ------------- | ---------------------- |
| `generate_id`  | `string`      | Generation ID          |
| `status`       | `"COMPLETED"` | Terminal status        |
| `study_set_id` | `string`      | Resulting study set ID |

**Source:** `src/routes/(app)/generate/[genId]/waiting-room/+page.svelte:83`

### `generation failed`

Fires when the waiting room poll returns status `FAILED` or `PARTIAL_COMPLETED`.

| Property       | Type                              | Description                              |
| -------------- | --------------------------------- | ---------------------------------------- |
| `generate_id`  | `string`                          | Generation ID                            |
| `status`       | `"FAILED" \| "PARTIAL_COMPLETED"` | Failure status                           |
| `study_set_id` | `string`                          | Study set ID (partial results may exist) |

**Source:** `src/routes/(app)/generate/[genId]/waiting-room/+page.svelte:93`

---

## Study Sessions

### `quiz_session started`

Fires after successful `client.quizSession.create()`.

| Property             | Type      | Description                          |
| -------------------- | --------- | ------------------------------------ |
| `has_chapter_filter` | `boolean` | Whether a chapter filter was applied |
| `session_id`         | `string`  | Created session ID                   |
| `study_set_id`       | `string`  | Parent study set ID                  |

**Source:** `src/lib/components/features/quiz-session/new-session-form.ts:25`

### `quiz_session completed`

Fires after successful `client.quizSession.complete()`.

| Property           | Type     | Description                |
| ------------------ | -------- | -------------------------- |
| `question_count`   | `number` | Total questions in session |
| `session_id`       | `string` | Session ID                 |
| `study_set_id`     | `string` | Parent study set ID        |
| `unanswered_count` | `number` | Questions left unanswered  |

**Source:** `src/routes/(app)/session/[studySetId]/quiz/[sessionId]/+page.svelte:139`

### `flashcard_session started`

Fires once via `$effect` when cards are loaded and total > 0.

| Property       | Type     | Description            |
| -------------- | -------- | ---------------------- |
| `session_id`   | `string` | Session ID             |
| `study_set_id` | `string` | Parent study set ID    |
| `total_cards`  | `number` | Cards in session queue |

**Source:** `src/routes/(app)/session/[studySetId]/flashcard/[sessionId]/+page.svelte:65`

### `flashcard_session completed`

Fires via `$effect` when all cards have been reviewed.

| Property              | Type                     | Description                                        |
| --------------------- | ------------------------ | -------------------------------------------------- |
| `cards_reviewed`      | `number`                 | Cards rated                                        |
| `rating_distribution` | `Record<string, number>` | Count per rating (`Again`, `Hard`, `Good`, `Easy`) |
| `session_id`          | `string`                 | Session ID                                         |
| `study_set_id`        | `string`                 | Parent study set ID                                |

**Source:** `src/routes/(app)/session/[studySetId]/flashcard/[sessionId]/+page.svelte:78`

---

## Subscription / Checkout

### `plan checkout started`

Fires after successful `client.plan.checkout()`.

| Property          | Type                            | Description       |
| ----------------- | ------------------------------- | ----------------- |
| `duration_months` | `1 \| 6 \| 12`                  | Plan duration     |
| `order_id`        | `string`                        | Midtrans order ID |
| `plan_key`        | `"LITE" \| "PLUS" \| "PREMIUM"` | Plan tier         |

**Source:** `src/routes/(app)/subs/plans/+page.svelte:67`

### `plan checkout completed`

Fires once when the order status transitions to `PAID` (polled or manually verified). Guarded against duplicates with `hasTrackedPaid`.

| Property          | Type     | Description       |
| ----------------- | -------- | ----------------- |
| `duration_months` | `number` | Plan duration     |
| `gross_amount`    | `number` | Amount in IDR     |
| `order_id`        | `string` | Midtrans order ID |
| `plan_key`        | `string` | Plan tier key     |

**Source:** `src/routes/(app)/subs/checkout/[orderId]/+page.svelte`

### `plan checkout expired`

Fires once when the order status transitions to `EXPIRED`. Guarded with `hasTrackedExpired`.

| Property          | Type     | Description       |
| ----------------- | -------- | ----------------- |
| `duration_months` | `number` | Plan duration     |
| `order_id`        | `string` | Midtrans order ID |
| `plan_key`        | `string` | Plan tier key     |

**Source:** `src/routes/(app)/subs/checkout/[orderId]/+page.svelte`

---

## Affiliate

### `affiliate link copied`

Fires after `navigator.clipboard.writeText()` succeeds.

| Property | Type     | Description           |
| -------- | -------- | --------------------- |
| `slug`   | `string` | Referral profile slug |

**Source:** `src/routes/(app)/affiliate/+page.svelte:42`

---

## Discovery

### `discover searched`

Fires after successful `client.studySetSearch.search()`.

| Property        | Type     | Description                 |
| --------------- | -------- | --------------------------- |
| `query_length`  | `number` | Trimmed query string length |
| `results_count` | `number` | Number of results returned  |

**Source:** `src/routes/(app)/discover/+page.svelte:114`

---

## Person Properties

Set via `posthog.identify()` in `src/lib/hooks/auth.svelte.ts:72`:

| Property   | Type      | Description        |
| ---------- | --------- | ------------------ |
| `email`    | `string`  | User email         |
| `is_admin` | `boolean` | `role === "admin"` |
| `name`     | `string`  | Display name       |

Reset via `posthog.reset()` on sign-out.
