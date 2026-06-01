# Generate Service Specs

Source specs:

- `docs/superpowers/specs/2026-05-19-generate-domain-questions.md`
- `docs/superpowers/specs/2026-05-19-generate-domain-follow-up-questions.md`
- `src/lib/services/generate/generate.ts`
- `src/lib/services/study-set/SPECS.md`
- `src/lib/services/chapter/SPECS.md`
- `src/lib/services/quiz/SPECS.md`
- `src/lib/services/flashcard/SPECS.md`
- `src/lib/services/rate-limiter/SPECS.md`

## Domain Boundary

Generate orchestrates AI creation of StudySet content.

Generate is responsible for:

- accepting generation input `{ input, studySetName }`
- creating the target StudySet using `studySetName`
- creating and updating Generate workflow records
- running `generateStudySet` in the background
- storing per-chunk temporary generated content for polling
- persisting final generated chapters, quizzes, quiz options, and flashcards after successful generation
- storing final analytical metrics as columns
- storing per-chunk analytical metrics as columns
- exposing short polling for generated content events
- cleaning up old temporary generated content events through an admin-only command

Generate is not responsible for:

- AI prompt design beyond using `generateStudySet`
- enforcing generation quota in the first version
- billing, plans, or subscription state
- editing generated content after it becomes normal StudySet content
- public discovery or sharing rules for generated content
- durable job retry or queueing in the first version

## Entities

```typescript
type GenerateStatus = 'CREATED' | 'ONGOING' | 'COMPLETED' | 'FAILED';
type GenerateStopReason = 'completed' | 'input_token_limit';

interface Generate {
	id: UUID;
	ownerId: UUID;
	studySetId?: UUID;
	studySetName: string;
	input: string;
	workflowId?: string;
	status: GenerateStatus;
	errorMessage?: string;
	startedAt: Date;
	completedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}

interface GenerateContentEvent {
	id: UUID;
	generateId: UUID;
	content: string;
	createdAt: Date;
}

interface GenerateResult {
	id: UUID;
	generateId: UUID;
	startedAt: Date;
	completedAt: Date;
	durationMs: number;
	stopReason: GenerateStopReason;
	chunkCount: number;
	chunkProcessed: number;
	processedChunkProgress: number;
	inputCharsLength: number;
	inputCharsLengthPerThousandTokens: number;
	totalInputTokens: number;
	totalOutputTokens: number;
	totalReasoningTokens: number;
	totalCachedTokens: number;
	generatedChapterCount: number;
	generatedQuizCount: number;
	generatedFlashcardCount: number;
	createdAt: Date;
}

interface GenerateChunkResult {
	id: UUID;
	generateId: UUID;
	chunkIndex: number;
	inputCharsLength: number;
	inputTokens: number;
	outputTokens: number;
	reasoningTokens: number;
	cachedTokens: number;
	steps: number;
	generatedChapterCount: number;
	generatedQuizCount: number;
	generatedFlashcardCount: number;
	correlatedChapterCount: number;
	createdAt: Date;
}
```

## Workflow

- `CreateGenerateStudySet` is the public orchestration command.
- The command validates `{ input, studySetName }` before creating records.
- The command rejects the request when the authenticated user already has an `ONGOING` Generate record.
- StudySet and Generate records are created atomically before AI generation starts.
- The StudySet title is `studySetName`.
- The Generate record starts with `status: 'ONGOING'`.
- The command returns quickly with the Generate record and StudySet ID.
- AI generation runs in the background using `getRequestEvent().platform.ctx.waitUntil()`.
- The background task calls `generateStudySet` with the given input.
- `opts.onNewContent` is called after each chunk is successfully processed.
- Each `onNewContent` callback stores one temporary generated content event.
- Permanent StudySet child records are created only after `generateStudySet` returns successfully.
- On success, final analytical result rows are stored and Generate is marked `COMPLETED`.
- On failure, Generate is marked `FAILED`, the error message is stored, and the failed StudySet is deleted.
- Failure handling must use `catch`, update the failed state, clean up the StudySet, then rethrow for observability.
- Background generation is best-effort in v1; no durable retry or recovery mechanism is required.

## Status Rules

- `CREATED` means the generate record exists but generation has not started yet.
- `ONGOING` means background generation has started or is expected to start.
- `COMPLETED` means permanent StudySet content and analytical rows were persisted successfully.
- `FAILED` means generation, temporary storage, final persistence, or cleanup failed.
- Non-terminal statuses are `CREATED` and `ONGOING`.
- Terminal statuses are `COMPLETED` and `FAILED`.
- `errorMessage` is set only for `FAILED` records.
- `completedAt` is set for both `COMPLETED` and `FAILED` records.

## Input Validation

- `studySetName` follows StudySet title rules.
- `input` is trimmed for validation.
- `input` must be non-empty after trim.
- `input` has a maximum length of `1_000_000` characters.
- Unknown fields are ignored by request payload schemas unless the existing command pattern changes.

## Authorization

- All Generate commands and queries require authentication unless explicitly marked admin-only.
- `ownerId` is inferred from auth context and is never client-provided.
- Starting generation only requires an authenticated user because the StudySet does not exist yet.
- Polling and Generate reads are owner-only.
- Generate records and temporary content remain owner-only regardless of StudySet visibility.
- StudySet domain guards are used when checking ownership for existing StudySet-related access.
- Admin cleanup commands require an admin role or permission.

## Commands

### CreateGenerateStudySet

```typescript
interface CreateGenerateStudySetCommand {
	input: string;
	studySetName: string;
}
```

- Requires authentication.
- Validates `studySetName` using StudySet title rules.
- Validates `input` as non-empty and at most `1_000_000` characters.
- Rejects when the authenticated user already has an `ONGOING` Generate record.
- Creates the StudySet and Generate record atomically.
- Starts background generation with `getRequestEvent().platform.ctx.waitUntil()`.
- Returns `{ success: true, data: { generate: Generate; studySetId: UUID } }`.
- Does not consume or check quota in the first version.

### CreateGenerateStudySetV2

```typescript
interface CreateGenerateStudySetV2Command {
	input: string;
	studySetName: string;
}
```

- Requires authentication.
- Uses the same validation schema as CreateGenerateStudySet.
- Rejects when the authenticated user has a `CREATED` or `ONGOING` Generate record.
- Creates the StudySet and Generate record with `status: 'CREATED'`.
- Stores `input` on the Generate record.
- Does **not** start background generation.
- Returns `{ success: true, data: { generate: Generate; studySetId: UUID } }`.

### RunGenerateStudySet

```typescript
interface RunGenerateStudySetCommand {
	generateId?: UUID;
	studySetId?: UUID;
}
```

- Requires authentication.
- Accepts exactly one of `generateId` or `studySetId` (generateId takes precedence).
- Rejects when neither or both are provided.
- Returns `NOT_FOUND` when the generate record does not exist or is not owned by the user.
- If status is not `CREATED`, returns the current generate record as-is (no-op).
- If status is `CREATED`, transitions to `ONGOING` and runs generation synchronously.
- On generation success, the record is `COMPLETED` and permanent content is persisted.
- On generation failure, the record is `FAILED`, the StudySet is deleted, and the error is rethrown.
- Returns `{ success: true, data: { generate: Generate } }`.

### CreateGenerateStudySetV3

```typescript
interface CreateGenerateStudySetV3Command {
	input: string;
	studySetName: string;
}
```

- Requires authentication.
- Uses the same validation schema as V1/V2.
- Rejects when the authenticated user has a `CREATED` or `ONGOING` Generate record.
- Creates the StudySet and Generate record with `status: 'CREATED'`.
- Stores `input` on the Generate record.
- Triggers the Upstash Workflow at `/api/workflows/generate` via `Client.trigger`.
- Stores the returned `workflowRunId` on the Generate record via `setWorkflowId`.
- Returns immediately — all generation executes asynchronously in the workflow.
- Returns `{ success: true, data: { generate: Generate; studySetId: UUID } }`.

### CleanupGenerateContentEvents

```typescript
interface CleanupGenerateContentEventsCommand {
	olderThanDays?: number;
}
```

- Requires admin authorization.
- Deletes temporary generated content events older than the configured age.
- `olderThanDays` defaults to `7`.
- `olderThanDays` must be a positive integer day count.
- The accepted cleanup age must be expressed in whole days only.
- Returns `{ success: true, deletedCount: number }`.

## Queries

### PollGenerateContent

```typescript
interface PollGenerateContentQuery {
	generateId?: UUID;
	studySetId?: UUID;
	lastPollingDate: Date;
}
```

- Requires authentication.
- Accepts exactly one of `generateId` or `studySetId`.
- Rejects requests that provide both identifiers.
- Rejects requests that provide neither identifier.
- When `studySetId` is provided, resolves the authenticated user's Generate record for that StudySet before polling.
- Returns only content events owned by the authenticated user.
- Uses at-least-once delivery.
- Queries events with `createdAt >= lastPollingDate`.
- Returns stable event IDs so the client can deduplicate repeated content.
- Returns a server-generated `serverPollingDate` for the client to use as the next `lastPollingDate`.
- Does not use the client local clock as the next polling cursor.
- Returns Generate status with the polling response.
- Returns `{ success: true, data: { generate: Generate; events: GenerateContentEvent[]; serverPollingDate: Date } }`.

### GetGenerate

```typescript
interface GetGenerateQuery {
	id: UUID;
}
```

- Requires authentication.
- Returns only Generate records owned by the authenticated user.
- Returns `{ success: true, data: Generate }`.

## Temporary Content Events

- Temporary generated content is stored in a separate table from Generate metadata.
- One event is inserted after each chunk is successfully processed.
- Each event stores the generated chunk content as a stringified JSON payload in `content`.
- The payload contains the generated chapters, quizzes, and flashcards for that processed chunk.
- The payload does not need normalized temporary rows for chapters, quizzes, or flashcards in the first version.
- Temporary content events support short polling and near-realtime UI preview.
- Temporary content events are retained until admin cleanup deletes old rows.
- Default cleanup retention is 7 days.

## Permanent Content Persistence

- Generated content becomes permanent only after `generateStudySet` finishes successfully.
- Permanent content is created from the final `GenerateQuizResult`.
- Create all generated chapters first.
- Treat generated chapter slugs as temporary correlation keys only.
- Build an in-memory generated `chapter.slug` to permanent `chapter.id` map.
- Create quizzes and flashcards using mapped permanent chapter IDs.
- Create quiz options with their parent quiz records.
- Generated chapter slugs are not stored as permanent Chapter slugs.
- If final content references a missing generated `chapterSlug`, generation fails.
- Failed generation does not keep partial permanent StudySet content.

## Failure Handling

- If generation fails after the StudySet and Generate record exist, delete the failed StudySet.
- Keep the failed Generate record for history and analytics/debugging.
- `generate.studySetId` is nullable.
- On failure cleanup, set `generate.studySetId` to `null` after deleting the StudySet.
- Store `studySetName` on Generate so failed records remain understandable after StudySet deletion.
- Mark Generate as `FAILED` and store `errorMessage`.
- Set `completedAt` when marking failure.
- Re-throw the caught error after updating failed state and cleanup.

## Analytical Storage

- Store analytical data as columns, not as a raw JSON `GenerateQuizResult` blob.
- Do not store original user input text for analytics.
- Do not store input chunks for analytics.
- Do not store generated study content in analytical result rows.
- Generated study content lives in temporary content events and permanent domain tables.
- Store workflow-level metrics in `generate_result`.
- Store per-chunk metrics in `generate_chunk_result`.

### Aggregate Analytical Columns

- `generateId`
- `startedAt`
- `completedAt`
- `durationMs`
- `stopReason`
- `chunkCount`
- `chunkProcessed`
- `processedChunkProgress`
- `inputCharsLength`
- `inputCharsLengthPerThousandTokens`
- `totalInputTokens`
- `totalOutputTokens`
- `totalReasoningTokens`
- `totalCachedTokens`
- `generatedChapterCount`
- `generatedQuizCount`
- `generatedFlashcardCount`

### Per-Chunk Analytical Columns

- `generateId`
- `chunkIndex`
- `inputCharsLength`
- `inputTokens`
- `outputTokens`
- `reasoningTokens`
- `cachedTokens`
- `steps`
- `generatedChapterCount`
- `generatedQuizCount`
- `generatedFlashcardCount`
- `correlatedChapterCount`

## Polling And Delivery Rules

- Polling is timestamp-based using `lastPollingDate`.
- Event delivery is at least once.
- The server may redeliver events already seen by the client.
- Clients must deduplicate content events by stable event ID.
- The server returns `serverPollingDate` on every polling response.
- The client uses `serverPollingDate` as the next `lastPollingDate`.
- The query uses `createdAt >= lastPollingDate` to avoid missing same-timestamp events.

## Concurrency Rules

- A user can have at most one non-terminal Generate record (status `CREATED` or `ONGOING`).
- `CreateGenerateStudySet` rejects when the authenticated user already has an `ONGOING` generation.
- `CreateGenerateStudySetV2` rejects when the authenticated user has a `CREATED` or `ONGOING` generation.
- `RunGenerateStudySet` transitions `CREATED` → `ONGOING` before running.
- The first version does not queue generation requests.
- The user can start another generation after the existing one becomes `COMPLETED` or `FAILED`.

## Quota Rules

- Quota consumption is deferred in the first version.
- Generate must not call Rate Limiter consume or refund commands yet.
- Do not add runtime no-op quota hooks for the first version.
- Future quota integration should occur before background generation starts.
- Future quota refund/finalization should follow Rate Limiter service rules.

## Persistence

- Use standard Drizzle schema definitions backed by D1.
- Add `generate` for workflow metadata and status.
- Add `generate_content` for temporary per-chunk polling events.
- Add `generate_result` for aggregate analytical metrics.
- Add `generate_chunk_result` for per-chunk analytical metrics.
- Reference `user.id` from `generate.ownerId` with cascade behavior matching existing service conventions.
- `generate.studySetId` is nullable to preserve failed Generate records after failed StudySet cleanup.
- Index `generate.ownerId` and `generate.status` for ownership checks and ongoing-generation rejection.
- Index `generate_content.generateId` and `generate_content.createdAt` for polling.
- Index `generate_content.createdAt` for admin cleanup.
- Unique index on `generate_content(generate_id, chunk_index)` for chunk deduplication.
- `generate.workflowId` is nullable and stores the QStash workflow run ID for V3 records.
- Enforce one ongoing generation per user with repository logic or a database constraint if supported.

## Errors

- `VALIDATION_FAILED`: invalid input, studySetName, generate ID, polling date, cleanup age, or request payload.
- `UNAUTHORIZED`: missing authenticated user.
- `FORBIDDEN`: authenticated user cannot access the Generate record or caller lacks admin cleanup permission.
- `NOT_FOUND`: Generate record does not exist or is not visible to the authenticated user.
- `GENERATION_IN_PROGRESS`: authenticated user already has an ongoing generation.
- `GENERATION_FAILED`: AI generation or final persistence failed.
- `GENERATED_CONTENT_INVALID`: generated content cannot be mapped or persisted into permanent domain records.

## Testing

- Unit test command/query modules with mocked repositories, auth, StudySet creation, and `generateStudySet`.
- Test validation for empty input, maximum input length, and invalid StudySet names.
- Test rejecting a second ongoing generation for the same user.
- Test `CreateGenerateStudySetV2` creates records with `CREATED` status and no background task.
- Test `CreateGenerateStudySetV2` rejects when user has `CREATED` or `ONGOING` generation.
- Test `RunGenerateStudySet` transitions `CREATED` → `ONGOING` and runs generation.
- Test `RunGenerateStudySet` no-ops for `ONGOING`, `COMPLETED`, and `FAILED` statuses.
- Test `RunGenerateStudySet` looks up by `generateId` and `studySetId`.
- Test atomic StudySet and Generate creation behavior.
- Test background task success marks Generate `COMPLETED` and persists permanent content.
- Test background task failure marks Generate `FAILED`, deletes the StudySet, nulls `studySetId`, and rethrows.
- Test `onNewContent` stores one temporary event per successfully processed chunk.
- Test polling uses `createdAt >= lastPollingDate` and returns stable event IDs.
- Test owner-only polling and Generate reads.
- Test admin-only cleanup deletes events older than the requested whole-day age.
- Test final persistence maps generated chapter slugs to permanent chapter IDs.
- Test invalid missing `chapterSlug` references fail generation.
- Test analytical aggregate and per-chunk columns are populated from `GenerateQuizResult`.
