# Generate Service Specs

Source specs:

- `src/lib/server/infras/generate/generate.ts` — the existing `generate()` function and `GenerationStorage` contract that the pipeline composes.
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-specs.md` (and v2..v7) — referenced by `study-set/SPECS.md` for the chapter / quiz / flashcard / study-set-content rules that the finalization transaction must respect.

## Domain Boundary

GenerateService is the entry point for AI-assisted content generation from a PDF. It owns the `generate` row lifecycle and the orchestration of: PDF parsing, LLM chunk processing, and the finalization transaction that materializes the generated content into `chapter`, `quiz`, `quiz_option`, and `flashcard` tables.

GenerateService is responsible for:

- accepting a `multipart/form-data` PDF and producing a `(generateId, studySetId)` pair
- owning the `generate` row state machine: `CREATED → ONGOING → COMPLETED | PARTIAL_COMPLETED | FAILED`
- staging per-chunk results in `generate_chunk_result` (the single source of truth for chunk progress; there is no in-memory accumulator)
- the finalization transaction that writes generated content into `chapter`, `quiz`, `quiz_option`, `flashcard` and sets `generate.status` to `COMPLETED` or `PARTIAL_COMPLETED` **after** finalization commits
- reporting the generation outcome via the `status` field on the poll endpoint (no separate error code or error message columns)
- the short-poll query that aggregates row state + per-chunk `index/kind` summaries for the client UI
- startup recovery that marks all `CREATED` and `ONGOING` rows as `FAILED` on server boot

GenerateService is not responsible for:

- the LLM prompt, chunking algorithm, or `GenerationStorage` semantics — those live in `src/lib/server/infras/generate/` (`generate.ts`, `chunk.ts`, `language-style.ts`) and are composed by the pipeline
- slug generation or study-set visibility rules — those are delegated to `studySetService`
- chapter / quiz / flashcard content validation beyond slug-uniqueness deduping
- public discovery or history listings (the `generate` row is not directly listable; visibility of its poll endpoint follows the underlying study set)
- ownership transfer or retry of failed generations
- rate limiting, per-user concurrency caps (beyond the in-memory gate), or job persistence across restarts
- observability or metrics (deferred to future version)

## Deployment Model

- **Single-instance SQLite.** No distributed concurrency, no rolling deploys.
- Concurrency gating is in-memory at the service layer (no database-level unique index).
- `waitUntil` uses `$lib/server/utils/background-jobs.ts`.

## Entity

### `generate`

```typescript
interface Generate {
  id: string; // prefixed, e.g. "gen_<nanoid>"
  ownerId: string; // FK → user.id
  studySetId: string; // FK → study_set.id. Never nulled once created.
  status: "CREATED" | "ONGOING" | "COMPLETED" | "PARTIAL_COMPLETED" | "FAILED";
  startedAt: number; // Unix ms
  completedAt?: number; // Unix ms
  createdAt: number; // Unix ms
  updatedAt: number; // Unix ms
}
```

### `generate_input` (1:1 table)

```typescript
interface GenerateInput {
  id: string; // prefixed, e.g. "ginp_<nanoid>"
  generateId: string; // FK → generate.id, ON DELETE CASCADE. UNIQUE.
  input: string; // truncated liteparse output (max 500k chars)
  isInputTruncated: boolean; // true when the parsed text exceeded the 500k-char limit
}
```

### `generate_chunk_result` (staging table)

```typescript
interface GenerateChunkResult {
  id: string; // prefixed, e.g. "gcr_<nanoid>"
  generateId: string; // FK → generate.id, ON DELETE CASCADE
  index: number; // chunk index
  kind: "success" | "failure";
  payload: string; // JSON-serialized SuccessRecord | FailureRecord
  createdAt: number;
}
```

## Field Rules

### `generate`

- `id` is server-generated with `crypto.randomUUID()` wrapped in a `gen_` prefix via `generateId(GENERATE_ID_PREFIX)`. Clients never provide IDs.
- `ownerId` is inferred from auth context; never client-provided.
- `studySetId` is the `id` of the freshly inserted `study_set` (one per generate, not reused). It is **never nulled on failure** once the study set has been created. The study set is created only after `parseLiteparse` succeeds; on later failure it retains whatever content the finalization transaction committed before the failure.
- `status` is one of `CREATED`, `ONGOING`, `COMPLETED`, `PARTIAL_COMPLETED`, `FAILED`.
  - `CREATED` — row inserted, pipeline not yet started.
  - `ONGOING` — pipeline is executing (LLM chunks being processed).
  - `COMPLETED` — 100% of chunks produced valid output. Finalization committed, content inserted.
  - `PARTIAL_COMPLETED` — at least 1 but less than 100% of chunks produced valid output. Finalization committed with whatever content succeeded. Study set is usable with partial content.
  - `FAILED` — 0 valid chunks produced, or pipeline threw before any valid chunk, or finalization failed, or server restarted mid-generation.
- `startedAt` is set at `insertGenerate` (status=CREATED). It is the request time, not the LLM-start time.
- `completedAt` is set on transition to `COMPLETED`, `PARTIAL_COMPLETED`, or `FAILED`.
- `createdAt` and `updatedAt` are managed by Drizzle defaults and `$onUpdate`.

### `generate_input`

- `id` is server-generated with the `ginp_` prefix.
- `generateId` references `generate.id` with `ON DELETE CASCADE` and a `UNIQUE` constraint (one-to-one).
- `input` is the liteparse output after truncation. The raw parsed text is capped at `GENERATE_INPUT_MAX_CHARS` (500,000 **characters**, not bytes); anything beyond that is discarded before storage. Text is stored in a separate table to avoid bloating the `generate` row with data the poll endpoint never needs.
- `isInputTruncated` is `true` when truncation occurred. It is exposed in the poll response so the client can warn the user that the PDF was too long.

### `generate_chunk_result`

- `id` is server-generated with the `gcr_` prefix.
- `generateId` references `generate.id` with `ON DELETE CASCADE`. Deleting a generate row removes all of its chunk results.
- `index` is the chunk's position in the LLM loop. Deduplication is enforced at write time: the Drizzle impl deletes any existing rows for `(generateId, index)` before inserting the new row, wrapped in a transaction. At any given time there is at most one row per `(generateId, index)`.
- `kind` is `"success"` (the chunk's `SuccessRecord`) or `"failure"` (the chunk's `FailureRecord`).
- `payload` is the JSON-serialized `SuccessRecord` or `FailureRecord` from `src/lib/server/infras/generate/generate.ts`. Both types are already JSON-serializable; the `languageModelUsage` is reconstructed on read.

## Status Semantics

The status is determined by counting valid chunks from the LLM output:

| Valid chunks / Total chunks | Status                                                                     |
| --------------------------- | -------------------------------------------------------------------------- |
| 0 valid                     | `FAILED`                                                                   |
| 1–99% valid                 | `PARTIAL_COMPLETED` — finalizeTransaction runs with successful chunks only |
| 100% valid                  | `COMPLETED` — finalizeTransaction runs with all chunks                     |

A chunk is "valid" if and only if the LLM returned a response that passed the `SuccessRecord` schema validation. Chunks that threw, timed out, or returned schema-invalid output are not valid.

Status is set **after** `finalizeTransaction` commits. If finalization fails, the row stays in its current status until startup recovery marks it `FAILED`. A `FAILED` finalization is a dead generation — the user must retry.

## Pipeline Stages

The pipeline is an injected `GenerationPipeline` with four stages, each of which is a constructor parameter. The service never calls LLM or DB code directly — it composes the pipeline from the defaults wired in `index.ts`. The `GenerationPipeline` interface and related types live in `generate.pipeline.ts`.

```typescript
type ParseLiteparseFn = (input: { pdf: File }) => Promise<{ text: string }>;
type RunLLMFn = (input: {
  pdfText: string;
  languageStyle: string;
  extractionType: string;
  storage: GenerationStorage;
}) => Promise<{ totalChunkCount: number; successCount: number }>;
type FinalizeTransactionFn = (input: {
  generateId: string;
  ownerId: string;
  studySetId: string;
  successfulChunks: SuccessRecord[];
}) => Promise<void>;
```

Default implementations:

- `parseLiteparse` lives in `generate.pipeline.defaults.ts`. It buffers the `File` and calls `liteparseClient.parse(...)`. On a non-`ok` result it throws an `Error` with the liteparse failure kind; the service maps it to `ORPCError('LITEPARSE_FAILED')`.
- `runLLM` lives in `generate.pipeline.defaults.ts`. It calls `generate()` from `src/lib/server/infras/generate/generate.ts` with `defaultModel` from `$lib/server/infras/ai.ts`. Returns `totalChunkCount` (expected chunks from the planning phase) and `successCount` (chunks that passed `SuccessRecord` schema validation).
- `finalizeTransaction` is `finalizeGenerateInTransaction` from `generate.repository.drizzle.ts`. It inserts chapters, quizzes, quiz options, and flashcards for successful chunks only. Inserts are batched per table (chapters in one transaction, quizzes in one transaction, flashcards+options in one transaction). It does **not** set `generate.status` — the service sets status after all batch transactions commit.

The `GenerationStorage` passed to `runLLM` is built by the pipeline from the repo:

```typescript
const storage: GenerationStorage = {
  appendChunkResult: (record) => repo.appendChunkResult({ generateId, record }),
  loadChunkResults: () => repo.loadChunkResults(generateId),
};
```

The pipeline's `appendChunkResult` impl uses dedupe-on-write: delete existing rows for `(generateId, index)`, then insert the new row, wrapped in a single transaction. At any given time there is at most one row per `(generateId, index)`.

## GenerateRepository

```typescript
export interface GenerateRepository {
  insertGenerate(
    row: Omit<Generate, "createdAt" | "updatedAt">
  ): Promise<Generate>;
  updateGenerateStatus(
    id: string,
    status: Generate["status"]
  ): Promise<Generate | null>;
  findGenerateById(id: string): Promise<Generate | null>;
  finalizeStuckAsFailed(reason: string): Promise<number>;
  insertGenerateInput(row: Omit<GenerateInput, "id">): Promise<GenerateInput>;
  findGenerateInputByGenerateId(
    generateId: string
  ): Promise<GenerateInput | null>;
  appendChunkResult(params: {
    generateId: string;
    record: ChunkRecord;
  }): Promise<void>;
  loadChunkResults(generateId: string): Promise<GenerateChunkResult[]>;
  findChunkSummaries(
    generateId: string,
    since: number | null,
    limit: number,
    cutoffMs: number
  ): Promise<ChunkSummary[]>;
  deleteOldChunks(olderThanDays: number): Promise<number>;
}
```

The repository wraps both `generate` and `generate_input` storage. It is injected at the `GenerateService` constructor (no defaults). The Drizzle implementation wraps every public method in try-catch per `src/lib/server/AGENTS.md`.

## Commands

### CreateGenerate

```typescript
interface CreateGenerateCommand {
  pdf: File;
  title: string;
  description?: string;
  visibility?: "PUBLIC" | "PRIVATE"; // defaults to STUDY_SET_DEFAULT_VISIBILITY
  languageStyle?: string; // validated by ^[a-z-]+$, max length 32
  extractionType?: "normal" | "exhaustive"; // defaults to "normal"
}
```

Flow:

1. `requireOwner` — throws `UNAUTHORIZED` if `ownerId` is falsy.
2. **In-memory concurrency gate** — the service rejects the request immediately if the owner already has an active generation. Only one concurrent generation per user. Rejection is a transport-level error (not a persisted `errorCode`).
3. `pipeline.parseLiteparse(input.pdf)` — **blocking**, must complete before any DB write. Throws are caught and re-thrown as `ORPCError('LITEPARSE_FAILED')`.
4. `studySetService.createStudySet({ title, description, visibility, files: [pdf.name] }, owner)` — reuses slug generation and visibility defaults.
5. `repo.insertGenerate({ ..., status: "CREATED" })` — returns the new row.
6. `repo.insertGenerateInput({ generateId, input: truncatedPdfText, isInputTruncated })` — stores the parsed text in the 1:1 table.
7. `waitUntil(pipeline.run({ generateId, ownerId, studySetId, pdfText, languageStyle, extractionType }))` — fire-and-forget via `$lib/server/utils/background-jobs.ts`. Lost on server restart (startup recovery handles stuck rows).
8. Return `{ generateId, studySetId }`.

The `waitUntil` callback runs the rest of the lifecycle:

```
run({ generateId, ownerId, studySetId, pdfText, languageStyle, extractionType })
├── repo.updateGenerateStatus(generateId, "ONGOING")          ← retried up to 3 times on failure
├── runLLM({ pdfText, languageStyle, extractionType, storage })
│   └── for each chunk:
│       └── appendChunkResult({ generateId, record })          ← delete-before-insert per index, in transaction
├── if successCount === 0:
│   └── repo.updateGenerateStatus(generateId, "FAILED")
│       completeAt = now
├── else:
│   ├── finalizeTransaction({ generateId, ownerId, studySetId, successfulChunks })
│   │   └── for each table batch (chapters, quizzes, flashcards+options):
│   │       └── db.transaction → insert rows for successful chunks only
│   └── repo.updateGenerateStatus(generateId, successCount === totalChunkCount ? "COMPLETED" : "PARTIAL_COMPLETED")
│       completeAt = now
```

If `runLLM` throws an exception before producing any valid chunks, the row is marked `FAILED`. If `runLLM` throws after some valid chunks were written, the success count is evaluated: 0 valid → `FAILED`, ≥1 valid → `PARTIAL_COMPLETED` after finalization.

If `finalizeTransaction` fails, the row stays in its current status. Startup recovery will mark it `FAILED`. This is a dead generation — the user must retry.

Returns:

```typescript
{
  generateId: string;
  studySetId: string;
}
```

Errors:

- `UNAUTHORIZED` — missing auth (guard).
- `LITEPARSE_FAILED` — liteparse returned a non-`ok` result.
- `STUDY_SET_SLUG_CONFLICT` — slug generation exhausted retries.
- `INTERNAL_SERVER_ERROR` — unexpected Drizzle/DB failure during the synchronous insert path.

## Router and Schemas

Schemas live in `src/lib/schemas/generate.ts` and share constants with the service via `src/lib/schemas/generate.constant.ts`.

### Input schemas

- `createGenerateInputSchema` — `pdf` (File, max 30 MB, validated at Valibot layer), `title` (reuses study-set trimmed title rules), `description` (optional), `visibility` (optional, defaults to `STUDY_SET_DEFAULT_VISIBILITY`), `languageStyle` (optional, `^[a-z-]+$`, max length 32), `extractionType` (optional, `normal` or `exhaustive`).
- `checkGenerateContentInputSchema` — `id` (generate id), `since` (optional Unix-ms cursor from previous poll).
- `deleteOldChunksInputSchema` — `olderThanDays` (optional positive integer, defaults to `CHUNK_CLEANUP_AGE_DAYS`).

### Output schemas

- `createGenerateOutputSchema` — `{ generateId, studySetId }`.
- `checkGenerateContentOutputSchema` — `{ status, studySetId, isInputTruncated, chunks[], maxCreatedAt }`. `chunks` is capped at `CHUNK_POLL_LIMIT` items; each item has `index`, `kind`, and `payload`. `isInputTruncated` is read from `generate_input`.
- `deleteOldChunksOutputSchema` — `{ deletedCount }`.

### Router shape

```
generateRouter
├── create → generateCreate
├── check → generateCheck
└── admin
    └── cleanupChunks → generateAdminCleanupChunks
```

## Constants

`src/lib/schemas/generate.constant.ts`:

```typescript
export const GENERATE_ID_PREFIX = "gen_";
export const GENERATE_INPUT_ID_PREFIX = "ginp_";
export const GENERATE_CHUNK_RESULT_ID_PREFIX = "gcr_";
export const GENERATE_INPUT_MAX_CHARS = 500_000;
export const GENERATE_LANGUAGE_STYLE_MAX_LENGTH = 32;
export const CHUNK_POLL_LIMIT = 3;
export const CHUNK_CLEANUP_AGE_DAYS = 30;
export const GENERATE_CHUNK_QUERY_CUTOFF_MS = 4 * 60 * 60 * 1000; // 4 hours
export const GENERATE_MAX_DURATION_MS = 20 * 60 * 1000; // 20 minutes
```

Note: `GENERATE_ERROR_CODES` has been removed. Error classification uses server-side logging only; the client receives only the `status` field.

## Queries

### CheckGenerateContent

```typescript
interface CheckGenerateContentQuery {
  id: string; // generateId
  since?: number; // Unix ms. Server-provided cursor: the max createdAt from the previous poll response's chunks.
}
```

Reads the `generate` row, the `generate_input` row (for `isInputTruncated`), and a `findChunkSummaries(generateId, since, limit=3)` aggregate. Authorization is delegated to `studySetGuard.assertStudySetVisibleByIdOrNotFound(row.studySetId, userId)` — the poll endpoint respects the underlying study set's visibility rules (public/private/deleted). A non-owner reading a private study set receives `NOT_FOUND`, not `FORBIDDEN`. The poll endpoint is protected (requires authenticated user).

Chunk results are only returned for generations whose first chunk is newer than `GENERATE_CHUNK_QUERY_CUTOFF_MS` (4 hours). Older chunks are omitted from the response even if they still exist in `generate_chunk_result`; the client still receives the terminal `status` and `studySetId`. Chunks are disposable after 4 hours — after that window, clients navigate to the study set using `studySetId`. Chunks are retained for future analytics.

**`since` is server-driven.** The client does not generate its own timestamps. Each poll response includes the maximum `createdAt` across the returned chunks. The client echoes that value back as `since` on the next poll:

- **First poll (no `since`):** the first 3 chunks (by `createdAt` ascending) are returned.
- **Subsequent polls:** `since` = the `maxCreatedAt` from the previous response. Returns at most 3 chunks with `createdAt > since`.
- **Multiple polls per generation:** the client repeats until `status` is terminal (`COMPLETED`, `PARTIAL_COMPLETED`, or `FAILED`) **and** no more chunks remain (empty `chunks` array).

Chunks are returned in `createdAt` ascending order, capped at 3 per response. Clients must not assume that returning fewer than 3 chunks means all chunks have been fetched; the terminal condition is `status` terminal + no more chunks.

Returns:

```typescript
{
  status: "CREATED" | "ONGOING" | "COMPLETED" | "PARTIAL_COMPLETED" | "FAILED";
  studySetId: string;
  isInputTruncated: boolean;
  chunks: Array<{
    index: number;
    kind: "success" | "failure";
    payload: SuccessRecord | FailureRecord; // parsed from generate_chunk_result.payload JSON
  }>;
  maxCreatedAt: number | null; // Unix ms. The max createdAt across returned chunks. Client echoes as `since` on next poll.
}
```

The `chunks` array is the latest row per `index` (deduplication is enforced at write time; `findChunkSummaries` returns the only row per index), ordered by `index` ascending. The `payload` is the parsed `SuccessRecord` or `FailureRecord` from `src/lib/server/infras/generate/generate.ts`. The `languageModelUsage` field within `SuccessRecord.tokenUsage` is reconstructed on read (it is stored as JSON, not the `LanguageModelUsage` class instance). The `reasoning` field (not `resoning`) captures reasoning token usage.

If `chunks` is empty, `maxCreatedAt` is `null` — the client should reuse the previous poll's `since` (no progress means no cursor advancement). Chunk payloads allow progressive content rendering before finalization; the client still fetches final content from the study set endpoint for authoritative data (deduped, normalized).

Errors:

- `UNAUTHORIZED` — missing auth (guard).
- `NOT_FOUND` — row missing or user cannot see the underlying study set.
- `INTERNAL_SERVER_ERROR` — unexpected DB failure.

## Visibility and Authorization

- `createGenerate` requires an authenticated user. The generated `study_set` and `generate` row are owned by that user.
- `checkGenerateContent` requires an authenticated user. The poll response is readable iff the caller can read the underlying study set:
  - **Public study set:** any authenticated user.
  - **Private study set:** the owner only.
  - **Soft-deleted study set:** the owner + users with a `study_set_visit` row. Other users receive `NOT_FOUND`.

## Persistence

- `generate`, `generate_input`, and `generate_chunk_result` use standard Drizzle definitions in `src/lib/server/infras/db/schema/generate.ts`.
- Indexes:
  - `generate`: `(ownerId)`, `(studySetId)`, `(status)`.
  - `generate_input`: `(generateId)` UNIQUE.
  - `generate_chunk_result`: `(generateId)`, `(generateId, index)`.
- `generate_chunk_result` has **no** unique constraint on `(generateId, index)` — the deduplicate-on-write strategy (delete-before-insert in a transaction) enforces at-most-one-row-per-index.
- `generate_input.input` is `text` (no length cap in SQLite). The 500k character limit is enforced at the application level before insertion.
- Foreign keys cascade on `generate` delete (cleanup for both `generate_input` and `generate_chunk_result`).

## Startup Recovery

When the server starts, all `generate` rows stuck at `status = CREATED` or `status = ONGOING` are finalized to `FAILED`:

```
Server boot
├── repo.finalizeStuckAsFailed(reason: "Server restarted during generation")
│   └── UPDATE generate SET status = 'FAILED', completed_at = now
│       WHERE status IN ('CREATED', 'ONGOING')
```

No chunk results are cleaned up — they stay in `generate_chunk_result` for potential future retry. The `generate` row is visible in the poll response as `FAILED`. The in-memory concurrency gate is reset (process restart), so the user can re-upload immediately.

## Admin Cleanup

### DeleteOldChunks

```typescript
interface DeleteOldChunksCommand {
  olderThanDays?: number; // defaults to CHUNK_CLEANUP_AGE_DAYS (30)
}
```

Deletes `generate_chunk_result` rows whose `createdAt` is older than `olderThanDays` days. Only gated behind `adminProcedure`. Returns `{ deletedCount: number }`.

The cleanup does **not** filter by `generate.status`. Generations are expected to finish within 20 minutes, and the 4-hour chunk query cutoff means no ONGOING generation's chunks are visible to clients after that window. The 30-day default makes overlap with active generations impossible in practice.

This is a maintenance command — no automated cron. Chunk data accumulates until an admin runs it or v2 adds a scheduler.

## Deferred or Out of Scope

- **Retry of failed generations.** A `generate.adminRetry` command could call `pipeline.run` on an existing `FAILED` row, but the v1 client UX does not support it. The `GenerationPipeline` shape is intentionally retry-friendly, so this can be added in v1.1 without refactoring.
- **Per-user rate limiting.** Deferred. The in-memory concurrency gate prevents parallel uploads; rate limiting (e.g. N uploads per day) is a separate concern deferred to v2.
- **Job persistence across restarts.** The current `waitUntil` queue is in-memory. v2 may move to a real job queue; the pipeline's `run` method is already a clean seam.
- **`study_set_content` insert at finalization.** v1 skips writing a `study_set_content` row from the finalization transaction. The existing `chapter` service handles study-set-content population on a separate flow (user adds/edits chapters, then content is generated). Adding a generation-time insert is a v1.1 item.
- **Generation history UI.** Deferred to v2.
- **PDF streaming.** The entire PDF is buffered in memory before liteparse. v1 accepts this for the expected document sizes; v2 may stream. The 30 MB size limit is enforced at the Valibot schema layer.
- **Cross-chunk deduplication at content level.** The pipeline deduplicates chapter slugs within a study set (the unique constraint on `chapter.studySetId, lower(slug)` forces this) but does not deduplicate conceptually-equivalent chapters/flashcards emitted by different chunks.
- **LLM API timeout and retry.** Deferred to v1.1.
- **Observability and metrics.** Generation duration, LLM latency, chunk failure rates, and error rate alerting are deferred to a future version.
- **Partial-failure threshold (success ratio).** Replaced by the three-status model: 0% = FAILED, 1–99% = PARTIAL_COMPLETED, 100% = COMPLETED.
- **errorCode and errorMessage columns.** Removed entirely. Error classification uses server-side logging only. The client receives only the `status` field.
- **`GENERATE_ERROR_CODES`.** Removed. No longer needed since the poll response has no `errorCode` field.
- **`studySetName` denormalization.** Removed. The `generate` row stores only `studySetId`. The client fetches the canonical study set name via the study set service.

## Changelog (from grilling session)

This spec incorporates the following decisions made during design review:

- **3-status model** replaces success-ratio threshold. FAILED (0 valid chunks), PARTIAL_COMPLETED (1–99% valid), COMPLETED (100% valid). Status set after finalization.
- **`generate_input` 1:1 table** extracts `input` and `isInputTruncated` from the `generate` row.
- **`studySetName` removed** from `generate` — only `studySetId` FK remains.
- **`errorCode` and `errorMessage` dropped** from the `generate` row and all poll responses. Error classification uses server-side logging.
- **`GENERATE_ERROR_CODES` removed** from constants. `CONCURRENCY_LIMIT` handled as transport-level rejection.
- **In-memory concurrency gate** at service layer (replaces DB-level unique index). Per-owner, rejects duplicate immediately.
- **Dedupe-on-write** for chunk results: delete-before-insert per `(generateId, index)` in a transaction.
- **Poll response** returns `{ status, studySetId, isInputTruncated, chunks[], maxCreatedAt }`.
- **Startup recovery** marks `CREATED` and `ONGOING` rows to `FAILED` on boot.
- **Finalization batched per table** (chapters, quizzes, flashcards+options in separate transactions).
- **`languageStyle` max length 32** added to schema.
- **`tokenUsageSchema.reasoning`** fixed (was `resoning`).
- **`GENERATE_STUDY_SET_NAME_MAX_LENGTH` removed** (constant unused).
- **Single-instance SQLite** deployment model.
- **`waitUntil`** references `$lib/server/utils/background-jobs.ts`.
