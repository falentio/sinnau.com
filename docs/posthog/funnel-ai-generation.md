# Funnel: AI Generation Pipeline

## Steps

1. **`study_set created`** (via `method: "ai_generate"`) + **`generation started`** — user submits PDF/input for AI generation
2. **`generation completed`** — generation finishes successfully
3. **`generation failed`** — generation fails or partially succeeds (exit path)

## Events

### Step 1a: `study_set created` (AI path)

- **File:** `src/routes/(app)/study/generate/+page.svelte:49`
- **Trigger:** `client.generate.create()` succeeds
- **Properties:** `method` (`"ai_generate"`), `extraction_type`, `generate_id`, `language_style`, `visibility`

### Step 1b: `generation started`

- **File:** `src/routes/(app)/study/generate/+page.svelte:56`
- **Trigger:** Same success callback, immediately after `study_set created`
- **Properties:** `extraction_type`, `generate_id`, `language_style`

### Step 2: `generation completed`

- **File:** `src/routes/(app)/generate/[genId]/waiting-room/+page.svelte:83`
- **Trigger:** Polling loop returns `status === "COMPLETED"`
- **Properties:** `generate_id`, `status` (`"COMPLETED"`), `study_set_id`

### Exit Step: `generation failed`

- **File:** `src/routes/(app)/generate/[genId]/waiting-room/+page.svelte:93`
- **Trigger:** Polling loop returns `status === "FAILED"` or `"PARTIAL_COMPLETED"`
- **Properties:** `generate_id`, `status` (`"FAILED" | "PARTIAL_COMPLETED"`), `study_set_id`

## PostHog Configuration

Create a funnel in PostHog with:

- **Step 1:** `generation started`
- **Step 2:** `generation completed`

To measure failure rate, compare Step 1 count against `generation failed` count.

Use `generate_id` as the correlation key between started, completed, and failed events.
