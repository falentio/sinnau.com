# Waiting Room Design

## Goal

Create a high-end, minimalistic waiting room at `src/routes/(app)/study/[studySetId]/waiting-room/` that polls the `generate.check` endpoint and surfaces generated content as it streams in, without exposing the internal "chunk" concept to users.

## Context

- Generation takes ~15–25 minutes.
- The backend exposes `generate.check` which returns `status`, `studySetId`, `isInputTruncated`, and up to 3 `chunks` per poll, ordered by `createdAt`.
- Each successful chunk contains arrays of `chapter`, `flashcard`, and `quiz` objects.
- The page lives inside the existing study-set layout (`max-w-2xl` centered container).
- On `COMPLETED`, the page auto-redirects to the study set page.

## Design Decisions

### Visual direction: Zen Minimal

- A calm, centered header with a progress ring, status headline, and estimated completion time.
- A vertical stream of generated-item cards below the header.
- Ample whitespace, soft borders, and subtle opacity gradients to keep focus on progress.
- No mention of "chunk" in the UI.

### Content feed

- Items are flattened from incoming chunk payloads in this order per chunk:
  1. Chapters
  2. Flashcards
  3. Quizzes
- New items animate in at the top of the feed.
- The feed retains only the **10 most recent items**; older items fade out.
- Each item card shows:
  - An icon indicating content type (chapter / flashcard / quiz)
  - A concise preview (title, front text, or question text)
  - A subtle secondary line when available (flashcard back, quiz option count)

### Polling strategy

- Poll every 3 seconds while status is `CREATED` or `ONGOING`.
- Use the `since` cursor returned by the server (`maxCreatedAt`) to avoid re-fetching already-seen chunks.
- Stop polling and redirect when `status === 'COMPLETED'`.
- On `FAILED` or `PARTIAL_COMPLETED`, stop polling and show a terminal state with a link to the study set.

### Progress indication

- The progress ring is driven by the ratio of processed chunks to an estimated total.
- Because the backend does not expose `totalChunkCount` in the poll response, the client estimates progress from observed chunks and elapsed time, or keeps the ring in an indeterminate-but-animated state until enough chunks have arrived.
- The ETA is computed from `startedAt` plus a fixed 20-minute estimate, refined as chunks arrive.

### Error handling

- `FAILED`: show a calm error card with "Gagal membuat materi" and a button to return to the study set.
- `PARTIAL_COMPLETED`: show "Sebagian materi berhasil dibuat" and a button to view the study set.
- Network errors: retry with exponential backoff up to a max interval; surface a subtle retrying hint.

### Animations

- New feed items enter with a combined `opacity` (0 → 1) and `translateY` (8px → 0) transition over ~400ms with ease-out.
- Excess items (beyond 10) exit with a fade-out and are removed from the DOM.
- The progress ring uses a smooth CSS transition on the conic gradient or SVG stroke.
- Pulsing dots below the header indicate active generation.

## Components

### `src/routes/(app)/study/[studySetId]/waiting-room/+page.svelte`

The page component owns polling state, derived item feed, and terminal status handling.

Key reactive state:

- `status`: current generation status.
- `items`: flattened list of the latest 10 generated items.
- `since`: cursor for the next poll.
- `isInputTruncated`: boolean surfaced as a subtle warning when true.

### `src/lib/components/features/waiting-room/progress-ring.svelte`

A reusable circular progress indicator. Accepts `progress` (0–1) and renders an SVG ring with animated stroke.

### `src/lib/components/features/waiting-room/generation-item-card.svelte`

Renders a single generated item. Props:

- `type: 'chapter' | 'flashcard' | 'quiz'`
- `title: string`
- `subtitle?: string`

### `src/lib/components/features/waiting-room/feed.svelte`

Animates a list of `GenerationItemCard` with enter/exit transitions using `flip` or keyed `{#each}` transitions.

## Data Flow

1. Page loads with `studySetId` from params.
2. On mount, start the first poll to `generate.check({ id: generateId })`.
3. Append flattened items from the response to the feed, capped at 10.
4. Update `since` to `response.maxCreatedAt`.
5. If status is not terminal, schedule the next poll after 3 seconds.
6. If status is `COMPLETED`, redirect to `/study/[studySetId]`.
7. If status is `FAILED` or `PARTIAL_COMPLETED`, render the terminal state.

## File Changes

- `src/routes/(app)/study/[studySetId]/waiting-room/+page.svelte` — replace stub with full implementation.
- `src/routes/(app)/study/[studySetId]/waiting-room/+page.server.ts` — new file to load the `generateId` for the study set (or fetch initial check state).
- `src/lib/components/features/waiting-room/progress-ring.svelte` — new.
- `src/lib/components/features/waiting-room/generation-item-card.svelte` — new.
- `src/lib/components/features/waiting-room/feed.svelte` — new.

## Open Questions / Deferred

- Whether to fetch the `generateId` via a server load or discover it client-side from the study set. The server-load approach is preferred for SSR-friendliness.
- Exact ETA algorithm; start with a 20-minute fixed estimate and refine later if needed.

## Acceptance Criteria

- [ ] Page polls `generate.check` every 3 seconds while generation is active.
- [ ] Generated chapters, flashcards, and quizzes appear incrementally in the feed.
- [ ] Feed shows at most the 10 most recent items.
- [ ] Page auto-redirects to the study set on `COMPLETED`.
- [ ] Page shows a calm terminal state on `FAILED` and `PARTIAL_COMPLETED`.
- [ ] Animations are smooth and do not cause layout thrash.
- [ ] No "chunk" terminology is visible to the user.
