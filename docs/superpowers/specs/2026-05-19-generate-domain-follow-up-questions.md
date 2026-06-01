# Generate Domain Follow-Up Questions

This document captures second-pass clarification questions for the Generate service/domain after the first question set was answered.

Source context:

- `docs/superpowers/specs/2026-05-19-generate-domain-questions.md`
- `src/lib/services/generate/generate.ts`
- `src/lib/services/study-set/SPECS.md`

---

### 1. How should Generate keep failure history when the StudySet is deleted?

#### Question

If generation fails after the StudySet and Generate record are created, and the failed StudySet should be deleted, how should the Generate record keep its relationship to the failed workflow?

#### Reason And Explanation

The first answers choose creating the StudySet and Generate record atomically, with Generate pointing to an existing StudySet. They also choose deleting the StudySet on generation failure. Those two choices conflict if `generate.studySetId` has a required foreign key to `study_set.id`.

The domain needs a clear persistence rule so failed Generate records can remain useful for analytics and debugging without breaking referential integrity.

#### Common Approach

**Approach A: Make `generate.studySetId` nullable**

- On successful creation, Generate starts with a StudySet ID.
- On failure cleanup, delete the StudySet and set `generate.studySetId` to `null`.
- Keeps failed Generate records while avoiding invalid foreign keys.

**Approach B: Soft-delete failed StudySets**

- Keep the StudySet row and mark it deleted or hidden.
- `generate.studySetId` remains required and valid.
- Requires StudySet domain support for hidden/deleted records.

**Approach C: Keep `studySetId` as a plain string without foreign key enforcement**

- Failed Generate records can keep the deleted StudySet ID.
- Avoids nullable fields and soft delete.
- Weakens database integrity and can create dangling references.

#### Recommended Approach

Choose **Approach A** for the first version. Keep failed Generate history, delete the user-facing StudySet, and set `generate.studySetId` to `null` during failure cleanup. Store `studySetName` on Generate so failed records remain understandable after the StudySet is removed.

#### Answer

Approach A
---

### 2. When exactly should `opts.onNewContent` run after moving it out of tool execution?

#### Question

After moving `opts.onNewContent` to run after inference is done, should it run after each chunk finishes or only once after the entire `generateStudySet` call finishes?

#### Reason And Explanation

The first answers say temporary generated content should be stored as a JSON column of stringified content and that `opts.onNewContent` will move to after inference is done. The polling requirement depends on when this callback runs.

If it runs once after the whole generation finishes, short polling cannot show progressive generated content during generation. If it runs after each chunk, the client can receive incremental results while still avoiding duplicate callback payloads from repeated tool calls inside a chunk.

#### Common Approach

**Approach A: Call `onNewContent` after each chunk completes**

- Polling receives one event per completed chunk.
- Avoids duplicate events from multiple tool calls inside the same chunk.
- Preserves near-realtime progress at chunk granularity.

**Approach B: Call `onNewContent` only once after all chunks complete**

- Simplest callback behavior.
- Polling only receives content after generation is already complete.
- Does not meet the near-realtime content preview goal.

**Approach C: Call `onNewContent` after every successful permanent persistence step**

- Polling reflects content that is already stored permanently.
- Tightly couples temporary polling events to final persistence.
- Less useful if permanent persistence only happens after full success.

#### Recommended Approach

Choose **Approach A**. Move `onNewContent` so it runs once after each chunk inference completes, using that chunk's new generated content as the JSON payload. This keeps polling useful without storing repeated cumulative tool-call payloads.

#### Answer

onNewContent would be callled after each chunk successfully processed

---

### 3. Which analytical fields should be stored as columns?

#### Question

Since final analytics should be stored as columns rather than a JSON result blob, what exact columns should the Generate domain store?

#### Reason And Explanation

The first answers choose storing each analytical data point as columns, not a JSON column, and also choose not to retain original input. `GenerateQuizResult` contains nested result content, overall usage, stop reason, progress, and per-chunk metrics. The implementation needs a concrete column list to avoid either missing useful analytics or accidentally storing source/generated content that should not be retained as analytics.

This also affects whether a separate per-chunk table is enough to replace the raw final JSON for future analysis.

#### Common Approach

**Approach A: Store only aggregate analytical columns on `generate` or `generate_result`**

- Columns include usage totals, chunk counts, generated counts, stop reason, input length, and duration.
- Simple schema and easy dashboard queries.
- Loses per-chunk distribution data.

**Approach B: Store aggregate columns plus one per-chunk analytics table**

- Aggregate table stores workflow-level metrics.
- Per-chunk table stores chunk index, token usage, generated counts, step count, correlated chapter count, and chunk input length.
- Matches the earlier answer requesting an additional per-chunk table.

**Approach C: Store fully normalized analytical rows for chapters, quizzes, flashcards, and chunks**

- Maximum analytical flexibility without JSON.
- Duplicates permanent domain content and increases schema complexity.

#### Recommended Approach

Choose **Approach B**. Store aggregate metrics as columns and add a per-chunk analytics table. Do not store original input text or generated study content in analytics; generated content should live in temporary polling events and permanent domain tables.

Suggested aggregate columns:

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

Suggested per-chunk columns:

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

#### Answer

Yes, it correct, use approach B

---

### 4. Is best-effort background generation with `waitUntil()` acceptable for v1?

#### Question

When using `getRequestEvent().platform.ctx.waitUntil()` to run generation in the background, is best-effort execution acceptable for the first version, with no durable retry or recovery mechanism?

#### Reason And Explanation

The first answers choose background generation using Cloudflare Workers `waitUntil()`. This fits the polling UX because the start command can return quickly with a Generate ID. However, `waitUntil()` is not the same as a durable job queue. If generation crashes, the Worker is terminated, or a deployment interrupts execution, the Generate record may remain `ONGOING` unless the domain has timeout/recovery logic.

The spec needs to define whether that operational risk is acceptable for v1 or whether the domain must include stale-job cleanup and failure marking.

#### Common Approach

**Approach A: Accept best-effort `waitUntil()` for v1**

- Fastest implementation.
- Works for normal successful requests.
- Some interrupted jobs may require manual or scheduled cleanup.

**Approach B: Use `waitUntil()` plus stale ongoing cleanup**

- Background execution remains simple.
- A cleanup command marks old `ONGOING` records as `FAILED` after a timeout.
- Does not retry work, but avoids stuck records.

**Approach C: Use a durable queue/workflow before launch**

- Stronger reliability and retry story.
- More infrastructure and implementation scope.

#### Recommended Approach

Choose **Approach B**. Use `waitUntil()` for v1, but add an admin-only cleanup command that marks stale `ONGOING` Generate records as `FAILED` after a configured timeout. This keeps the first version small while preventing permanently stuck generation records.

#### Answer

APproach A, the failed state update should be handled using catch + rethrow

---

### 5. How should timestamp polling and duplicate delivery work together?

#### Question

If polling uses `lastPollingDate` but delivery is at-least-once with stable event IDs, what exact query and response contract should the polling endpoint use?

#### Reason And Explanation

The first answers choose timestamp polling and at-least-once duplicate handling with stable IDs. Timestamp-only polling can miss events if two rows share the same timestamp and the client sends back that exact timestamp. Stable event IDs help clients dedupe repeated events, but they do not prevent missing same-timestamp rows unless the server query accounts for it.

The domain should define whether polling intentionally allows duplicate rows to avoid missed rows, and what cursor the client should store after each response.

#### Common Approach

**Approach A: Query `createdAt > lastPollingDate` and return stable event IDs**

- Simple and matches timestamp-only polling.
- Can miss same-timestamp events in edge cases.

**Approach B: Query `createdAt >= lastPollingDate` and rely on client event ID dedupe**

- Avoids missing same-timestamp events.
- Can intentionally redeliver the last batch.
- Requires client dedupe by event ID.

**Approach C: Query by timestamp plus event ID tie-breaker**

- Most precise.
- More complex than the chosen timestamp-only decision.

#### Recommended Approach

Choose **Approach B**. Poll with `createdAt >= lastPollingDate`, return stable event IDs, and require the client to dedupe by event ID. The response should include `serverPollingDate` generated by the server, and the client should use that value as the next `lastPollingDate` rather than its local clock.

#### Answer

delivery to clienat are atLeastOnceDelivery and we deduplicate content on client
approach B are correct

