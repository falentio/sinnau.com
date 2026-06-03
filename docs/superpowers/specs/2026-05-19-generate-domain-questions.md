# Generate Domain Questions

This document captures clarification questions for the new Generate service/domain under `src/lib/services/generate/`.

Current agreed direction:

- Input is `{ input: string, studySetName: string }`.
- The service creates a StudySet using `studySetName`.
- The service creates a Generate record to track state such as ongoing and complete.
- The service calls `generateStudySet` with the given input.
- Generated incremental content from `opts.onNewContent` is stored in a temporary table.
- When generation finishes, the complete `generateStudySet` result is stored for analytical purposes.
- The client uses short polling with the last polling date to query newly generated content and feel near-realtime.
- Quota consumption wiring is deferred.

Source context:

- `src/lib/services/generate/generate.ts`
- `src/lib/services/study-set/SPECS.md`
- `src/lib/services/chapter/SPECS.md`
- `src/lib/services/quiz/SPECS.md`
- `src/lib/services/flashcard/SPECS.md`
- `src/lib/services/rate-limiter/SPECS.md`

---

### 1. What is the public command boundary for generation?

#### Question

Should the domain expose one command such as `CreateGenerateStudySet` that accepts `{ input, studySetName }`, creates the StudySet, starts generation, stores incremental content, and returns a Generate record ID?

#### Reason And Explanation

The agreed flow spans multiple domains: StudySet creation, Generate state tracking, AI generation, temporary generated content storage, and final analytical storage. A clear command boundary prevents UI/routes from manually orchestrating those steps and makes the workflow testable as one domain use case.

Without this boundary, generation logic can leak into route handlers, making it harder to centralize status transitions, failure handling, and future quota consumption.

#### Common Approach

**Approach A: Single orchestration command**

- `CreateGenerateStudySet` owns the whole generation workflow.
- The route calls one command and polls by `generateId`.
- Best for consistent state transitions and future quota wiring.

**Approach B: Split commands for each step**

- Route calls StudySet create, Generate create, AI generation, and persistence separately.
- Gives more control to callers.
- Increases duplication and partial-failure risk.

**Approach C: Keep `generateStudySet` as the direct public API**

- Minimal change to existing code.
- Does not model Generate records, polling, or persistence as first-class domain concerns.

#### Recommended Approach

Choose **Approach A**. Create one orchestration command for this use case and keep `generateStudySet` as the lower-level AI extraction function. This keeps route code thin and gives the Generate domain a clear place to add deferred quota consumption later.

#### Answer

approach A

---

### 2. When should the StudySet be created relative to the Generate record?

#### Question

Should the StudySet be created before the Generate record, or should the Generate record be created first and later linked to the StudySet?

#### Reason And Explanation

The flow says to create the StudySet using `studySetName`, then create the Generate record. The exact order affects failure handling. If StudySet creation succeeds but Generate record creation fails, an empty StudySet may remain. If Generate is created first, it needs a nullable or pending `studySetId`.

This matters because Generate records need to represent failed starts cleanly without creating orphaned user-facing content.

#### Common Approach

**Approach A: Create StudySet first, then Generate in one transaction**

- Ensures the Generate record always points at an existing StudySet.
- Avoids nullable `studySetId`.
- Requires repository support for transactional creation.

**Approach B: Create Generate first with nullable `studySetId`**

- Can record failures before StudySet creation.
- Adds more states and nullable relationship rules.

**Approach C: Create StudySet first without transaction and clean up on failure**

- Simpler if transaction support is awkward.
- Risks orphaned StudySets if cleanup fails.

#### Recommended Approach

Choose **Approach A** if the current database layer can support it. Create the StudySet and Generate record atomically before starting AI generation. If transactions are difficult with the current D1/Drizzle setup, choose Approach C only with explicit cleanup and tests for failed Generate record creation.

#### Answer

Approach A

---

### 3. What statuses should a Generate record support?

#### Question

Which Generate states are required for the first version?

#### Reason And Explanation

The agreed states mention complete and ongoing, but practical polling and failure handling need at least one failed terminal state. The status enum controls what the client renders and what retry or cleanup behavior can exist later.

If the status model is too small, errors may be represented only by missing content or logs. If it is too large, the first implementation becomes harder to test and reason about.

#### Common Approach

**Approach A: Minimal three-state enum**

- `ONGOING`, `COMPLETED`, `FAILED`.
- Covers active polling, successful finish, and failed finish.
- Keeps first implementation simple.

**Approach B: Detailed lifecycle enum**

- Example: `PENDING`, `CREATING_STUDY_SET`, `GENERATING`, `PERSISTING`, `COMPLETED`, `FAILED`, `CANCELLED`.
- Useful for detailed operations and debugging.
- More transitions and UI states to define.

**Approach C: Boolean fields only**

- Example: `isComplete`, `errorMessage`.
- Simple initially.
- Becomes ambiguous as more states are added.

#### Recommended Approach

Choose **Approach A**. Use `ONGOING`, `COMPLETED`, and `FAILED` for the first version. Add `errorMessage` and timestamps to support debugging without expanding the state machine too early.

#### Answer

APPROACH A

---

### 4. What should be stored in the Generate record versus related tables?

#### Question

Which fields belong on the main Generate record, and which should be stored in temporary content and analytical result tables?

#### Reason And Explanation

The Generate record tracks workflow state, while temporary content supports polling and the full result supports analytics. Mixing all data into one table can make polling queries heavy and make analytical payloads awkward to retain.

Clear table responsibilities also make cleanup rules easier because temporary polling data likely has a different lifetime than analytical results.

#### Common Approach

**Approach A: Three-table model**

- `generate`: metadata and state.
- `generate_content`: temporary incremental content events for polling.
- `generate_result`: final full `GenerateQuizResult` snapshot for analytics.

**Approach B: Store everything on `generate` as JSON fields**

- Fewer tables.
- Polling requires reading or filtering growing JSON blobs.
- Harder to expire temporary content independently.

**Approach C: Store only final domain entities and no generation artifacts**

- Smallest persistence model.
- Does not meet the analytical storage requirement.
- Does not support polling from temporary content.

#### Recommended Approach

Choose **Approach A**. Keep `generate` small and queryable, append polling events to `generate_content`, and store the full final result in `generate_result` for analytics.

#### Answer

APPROACH A, with additional per chunk table

---

### 5. What exact shape should temporary generated content use?

#### Question

Should each `opts.onNewContent` callback be stored as one append-only event containing arrays of generated chapters, quizzes, and flashcards, or should each generated item be normalized into separate rows?

#### Reason And Explanation

`generateStudySet` currently calls `opts.onNewContent(newContent)` with arrays for the current chunk/tool execution. The polling model needs to return new content since the last polling date. The storage shape determines how easy it is to preserve callback order, query new events, and later convert generated items into permanent chapter/quiz/flashcard rows.

The callback currently passes the whole `newContent` object for the chunk each time, which may include previously submitted items for that same chunk. That detail must be clarified to avoid duplicate temporary content.

#### Common Approach

**Approach A: Store each callback as an append-only event JSON payload**

- Each event has `id`, `generateId`, `createdAt`, and `payload`.
- Preserves the generation stream as received.
- Polling is simple with `createdAt > lastPollingDate`.

**Approach B: Normalize temporary rows per item**

- Separate temporary rows for chapters, quizzes, flashcards, and options.
- Easier for item-level dedupe and direct UI rendering.
- More schema and mapping work before domain specs are final.

**Approach C: Update one mutable temporary aggregate row**

- Easy to read current full preview.
- Polling for only new content becomes harder.

#### Recommended Approach

Choose **Approach A** for the first version, but adjust the callback usage or storage logic so each event stores only newly added items, not the cumulative `newContent` for the current chunk. If the existing generator continues sending cumulative chunk content, the Generate domain should calculate a delta before inserting the event.

#### Answer

I move the opts.onNewContent to after the infernece done
we only need to store it as json column of stringified content

---

### 6. What polling cursor should the client use?

#### Question

Should short polling use `lastPollingDate`, an event ID cursor, or both?

#### Reason And Explanation

The current decision says polling uses the last polling date. Timestamp cursors are easy to understand, but they can miss events when multiple events share the same timestamp precision or when client/server clocks differ. Event ID cursors are usually safer but require returning a cursor from the server.

This choice affects the query contract and determines whether polling is strictly reliable or only best-effort.

#### Common Approach

**Approach A: Timestamp cursor only**

- Input: `{ generateId, lastPollingDate }`.
- Query: `createdAt > lastPollingDate`.
- Simple and matches the current decision.

**Approach B: Monotonic event cursor only**

- Input: `{ generateId, afterEventId }` or `{ afterSequence }`.
- Avoids timestamp precision issues.
- Requires event ordering field.

**Approach C: Timestamp plus event ID tie-breaker**

- Input: `{ generateId, lastPollingDate, lastEventId }`.
- Most robust.
- More complex client contract.

#### Recommended Approach

Choose **Approach B** if the team is open to slightly changing the current decision. Use an auto-increment sequence or sortable generated content ID as the polling cursor, while still returning `createdAt` for display and debugging. If the requirement must remain `lastPollingDate`, use **Approach C** to avoid missing same-timestamp events.

#### Answer

APproach A

---

### 7. When are generated chapters, quizzes, and flashcards persisted as permanent study content?

#### Question

Should generated content become permanent StudySet child records during generation, only after `generateStudySet` finishes, or only after user confirmation?

#### Reason And Explanation

The flow says to create a StudySet first and store generated content temporarily via `opts.onNewContent`. It does not yet define when the temporary generated content becomes real Chapter, Quiz, QuizOption, and Flashcard rows.

This is the most important user-facing behavior question. If content is permanent during generation, partial failed generations leave visible study content. If content is permanent only after success, polling preview data and final study-set content can be separated cleanly.

#### Common Approach

**Approach A: Persist permanent content only after successful generation**

- Temporary content powers polling.
- On success, final result is transformed into StudySet child entities.
- Failed generations can leave the StudySet empty or marked failed without partial content.

**Approach B: Persist permanent content incrementally during generation**

- StudySet becomes usable sooner.
- Requires careful rollback or partial-content rules on failure.

**Approach C: Require user confirmation before permanent persistence**

- Lets users review generated content first.
- Adds a new confirmation workflow and more states.

#### Recommended Approach

Choose **Approach A** for the first version. Use temporary content for realtime-ish UI, then create permanent chapters, quizzes, quiz options, and flashcards after `generateStudySet` returns successfully.

#### Answer

Approach A

---

### 8. How should generated chapter slugs map to permanent chapter IDs?

#### Question

How should quizzes and flashcards that reference `chapterSlug` be linked to permanent Chapter records?

#### Reason And Explanation

`generateStudySet` emits generated chapters with `slug` and emits quizzes/flashcards with `chapterSlug`. Existing Chapter, Quiz, and Flashcard services use prefixed IDs and `chapterId`, not slugs. The Generate domain must define the mapping before it can persist permanent content.

This mapping also affects duplicate chapter handling and error behavior when generated content references a missing chapter slug.

#### Common Approach

**Approach A: Build an in-memory slug-to-ID map during final persistence**

- Create all generated chapters first.
- Map each generated `chapter.slug` to the created Chapter ID.
- Create quizzes and flashcards using mapped IDs.

**Approach B: Store generated slugs as permanent chapter slugs**

- Keeps AI slug visible in persistence.
- Conflicts with existing chapter schema if chapters do not own slugs.

**Approach C: Infer chapters for orphaned items automatically**

- Attempts to recover from invalid generated references.
- Can silently attach content to the wrong chapter.

#### Recommended Approach

Choose **Approach A**. Treat generated chapter slugs as temporary correlation keys only. If a quiz or flashcard references a missing `chapterSlug`, mark the generation as `FAILED` or skip the invalid item according to a separately defined validation policy.

#### Answer

Approach A

---

### 9. What should happen when generation fails after the StudySet and Generate record exist?

#### Question

Should failure keep the StudySet, delete the StudySet, or keep it only when some content was successfully persisted?

#### Reason And Explanation

AI calls, validation, storage, or final persistence can fail after the StudySet and Generate record are created. The user experience and data cleanup rules need to be explicit. Otherwise failures can leave empty StudySets or temporary data with unclear ownership.

This also determines whether failed Generate records are useful for analytics and support debugging.

#### Common Approach

**Approach A: Keep StudySet and mark Generate as `FAILED`**

- Preserves failure context and analytics.
- May show an empty StudySet unless UI hides failed-generation StudySets.

**Approach B: Delete StudySet on failure and keep failed Generate record**

- Avoids empty user-facing StudySets.
- Generate record needs to tolerate a deleted or nullable StudySet reference.

**Approach C: Keep StudySet only if permanent content exists**

- Balances cleanup and partial success.
- Requires defining partial content behavior.

#### Recommended Approach

Choose **Approach A** only if the UI can hide or clearly label StudySets whose active generation failed. Otherwise choose **Approach B** for a cleaner user experience. For the first version, prefer **Approach B** if permanent content is only created after successful generation.

#### Answer

Approach B

---

### 10. What exact final analytical result should be stored?

#### Question

Should analytical storage keep the full `GenerateQuizResult` returned by `generateStudySet`, selected metrics only, or both?

#### Reason And Explanation

The requirement says every `generateStudySet` result should be stored for analytical purposes. The current result includes generated content, chunks, token usage, progress metrics, stop reason, and per-chunk metrics. Storing everything is useful but may duplicate permanent content and can retain original input chunks.

This question affects storage size, privacy, and future analytics flexibility.

#### Common Approach

**Approach A: Store full raw `GenerateQuizResult` JSON**

- Meets the requirement literally.
- Maximum flexibility for future analytics.
- May store large chunk content and generated text duplicates.

**Approach B: Store selected analytical metrics only**

- Smaller and safer.
- Cannot answer future questions that need omitted fields.

**Approach C: Store both raw JSON and extracted indexed metrics**

- Raw JSON preserves full result.
- Indexed columns make common analytics queries efficient.
- More storage and schema work.

#### Recommended Approach

Choose **Approach C**. Store the full result JSON for now and also copy key metrics into columns: `chunkCount`, `chunkProcessed`, `stopReason`, token usage fields, generated counts, and duration. This satisfies analytics without making every query parse JSON.

#### Answer

Store all each analytical data as column, not JSON column

---

### 11. Should the original user input be retained?

#### Question

Should the Generate domain store the original `input`, a hash of it, a truncated preview, or none of it?

#### Reason And Explanation

The final `GenerateQuizResult` currently stores chunk content under `result.chunks[].content`, which effectively retains the source input. That can be useful for debugging quality and analytics, but it may also retain sensitive uploaded or pasted learning material.

This needs a deliberate product/privacy decision before implementing analytical storage.

#### Common Approach

**Approach A: Store full input/chunks**

- Best for debugging and generation quality analysis.
- Highest privacy and storage cost.

**Approach B: Store hash, length, and optional short preview**

- Supports dedupe and basic diagnostics.
- Does not preserve full source material.

**Approach C: Store no input-derived content**

- Safest for privacy.
- Reduces analytical usefulness and makes debugging harder.

#### Recommended Approach

Choose **Approach B** unless there is an explicit product requirement to retain full source input. If full raw `GenerateQuizResult` is stored, redact or omit `result.chunks[].content` and store `inputCharsLength` plus a content hash instead.

#### Answer

Approach C

---

### 12. How should duplicate polling delivery be handled?

#### Question

If a client polls with an old cursor or retries after a network error, should the server return duplicate generated content events, and should the client dedupe them?

#### Reason And Explanation

Short polling is naturally retry-heavy. The contract must define whether delivery is at-least-once or exactly-once. Exactly-once delivery is difficult and unnecessary for most polling UIs, but the client needs stable IDs to merge repeated events safely.

Without this rule, duplicate rendered chapters/quizzes/flashcards can appear during generation.

#### Common Approach

**Approach A: At-least-once delivery with stable event IDs**

- Server returns all events after the cursor.
- Client dedupes by event ID.
- Simple and robust.

**Approach B: Server tracks per-client delivery state**

- Avoids duplicates per client.
- Adds session/client complexity and state cleanup.

**Approach C: Accept duplicate UI entries temporarily**

- Simplest implementation.
- Poor user experience and harder debugging.

#### Recommended Approach

Choose **Approach A**. Return stable generated content event IDs and a next cursor from every polling response. The client should dedupe events by ID.

#### Answer

APproach A

---

### 13. What authorization rules apply to Generate commands and polling?

#### Question

Who can start generation and who can poll generated content for a Generate record?

#### Reason And Explanation

StudySet commands require authentication and ownership. Generate creates a StudySet and stores temporary generated content that may include source-derived material. Polling must not allow another authenticated user to read someone else's generated content by guessing a `generateId`.

#### Common Approach

**Approach A: Owner-only Generate records**

- `ownerId` is inferred from auth context.
- Start, poll, and final read require the same owner.
- Matches existing owned StudySet behavior.

**Approach B: Inherit access from StudySet visibility**

- Public StudySet could imply public Generate content.
- Risky because temporary generated content and analytics may include sensitive source text.

**Approach C: Allow polling by opaque token**

- Useful for unauthenticated or cross-device flows.
- Not needed if app routes are authenticated.

#### Recommended Approach

Choose **Approach A**. Generate records and temporary content should be owner-only regardless of StudySet visibility.

#### Answer

Approach A, create guard on the study set domain to check ownership
for generating, we only need authenticated user, cuz the studyset not exists yet

---

### 14. What validation should apply to `{ input, studySetName }`?

#### Question

What are the exact validation limits for `input` and `studySetName`?

#### Reason And Explanation

`studySetName` must be valid for StudySet creation, and `input` feeds an AI call that may be expensive and time-consuming. The generator already chunks content and stops at an input token limit, but command-level validation should reject empty or clearly excessive input before creating records.

This is also important while quota consumption is deferred, because validation is the first line of cost control.

#### Common Approach

**Approach A: Reuse StudySet title validation and define explicit input length bounds**

- `studySetName` follows StudySet title rules.
- `input` is trimmed, non-empty, and capped by character length.
- Simple and consistent.

**Approach B: Let `generateStudySet` handle input limits only**

- Less validation code.
- Can create records before discovering invalid or useless input.

**Approach C: Validate by estimated token count before starting**

- More directly controls AI cost.
- Requires tokenizer or approximation.

#### Recommended Approach

Choose **Approach A**. Reuse StudySet title rules for `studySetName`, require non-empty trimmed `input`, and define a maximum character length in the Generate spec. Keep token-budget stop behavior inside `generateStudySet` as a safety net.

#### Answer

Approach A, maximum input length are 1e6

---

### 15. How should deferred quota consumption be represented now?

#### Question

Should the Generate domain include a placeholder integration point for future quota consumption, or should all quota references be omitted until later?

#### Reason And Explanation

The current decision explicitly defers consumption logic. However, the Generate command boundary should not be designed in a way that makes quota hard to add later. A small placeholder boundary can make future integration predictable without implementing consumption now.

#### Common Approach

**Approach A: Define a no-op quota hook in the Generate service interface**

- Keeps the orchestration sequence ready for consume/refund later.
- Tests can assert quota is not consumed in the current version.
- Adds a little abstraction before it is used.

**Approach B: Omit quota entirely for now**

- Smallest first implementation.
- Future change may touch command flow and tests more broadly.

**Approach C: Implement quota consumption now but disable it**

- Most future-proof.
- Violates the decision to defer consumption wiring.

#### Recommended Approach

Choose **Approach B** for implementation, but document the future insertion point in the Generate spec: quota will be checked/consumed before generation starts and refunded or finalized according to the rate-limiter domain rules. Do not add runtime no-op quota code yet.

#### Answer

Approach B

---

### 16. What cleanup policy should temporary generated content follow?

#### Question

How long should temporary generated content events remain after generation completes or fails?

#### Reason And Explanation

Temporary content exists to support short polling and near-realtime UI. After the client has moved to the permanent StudySet content or the generation failed, these events may no longer be needed. Keeping them forever duplicates data and increases storage use.

The cleanup policy must not delete content too early for clients that refresh or reconnect shortly after completion.

#### Common Approach

**Approach A: Keep temporary events for a short retention window**

- Example: 24 hours after terminal status.
- Supports reloads and debugging shortly after generation.
- Requires cleanup job or lazy cleanup.

**Approach B: Delete temporary events immediately after final persistence**

- Minimizes duplication.
- Client reload after completion cannot replay final generation stream.

**Approach C: Keep temporary events forever**

- Simplest operationally.
- Duplicates final result and permanent content indefinitely.

#### Recommended Approach

Choose **Approach A**. Keep temporary generated content for a defined short window, such as 24 hours after `COMPLETED` or `FAILED`, then clean it up. The analytical `generate_result` table remains the long-term record.

#### Answer

We cleanup using admin only command, that delete the event older than 7 days (age are parameter, default to 7 days, and only accept multiplied by day)

---

### 17. How should concurrent generation requests from the same user be handled?

#### Question

Can a user start multiple Generate workflows at the same time?

#### Reason And Explanation

AI generation may be expensive and long-running. Without quota consumption in the first version, concurrency rules become especially important for cost control and predictable UI behavior. The domain should define whether concurrent jobs are allowed and how the UI identifies each active generation.

#### Common Approach

**Approach A: Allow multiple concurrent generations**

- Flexible for power users.
- Higher cost and more load.
- Requires robust per-generate polling.

**Approach B: Allow one ongoing generation per user**

- Simple cost and UX control while quota is deferred.
- User must wait for completion or failure before starting another.

**Approach C: Allow one ongoing generation per StudySet**

- Useful if generating into existing StudySets.
- Current flow creates a new StudySet each time, so it does not limit same-user load.

#### Recommended Approach

Choose **Approach B** for the first version while quota consumption is deferred. Enforce at most one `ONGOING` Generate record per owner, then revisit after quota consumption and queueing decisions are implemented.

#### Answer

Approach B, reject if ther are ongoing generation

---

### 18. Should generation run synchronously inside the request or as a background job?

#### Question

Should `CreateGenerateStudySet` wait for `generateStudySet` to finish before returning, or return immediately and run generation asynchronously?

#### Reason And Explanation

The polling model implies the client should receive a Generate ID quickly and poll while generation continues. If the command waits for the full AI generation, polling is less useful and HTTP request timeouts become more likely.

This decision depends on available runtime support for background tasks or durable execution.

#### Common Approach

**Approach A: Return immediately and run generation in the background**

- Best matches polling UX.
- Requires a reliable background execution mechanism.

**Approach B: Run synchronously but stream/store temporary events during the request**

- Simpler if no background runner exists.
- Client may not receive the Generate ID until too late unless the command returns before finishing.

**Approach C: Use a queue/durable workflow**

- Most reliable for long jobs and retries.
- More infrastructure than the first version may need.

#### Recommended Approach

Choose **Approach A** if the app has a reliable runtime primitive for background work. If not, explicitly document that the first version is synchronous and polling only observes progress after the request starts through a route-specific mechanism. Do not pretend polling is realtime unless generation actually continues after the start response returns.

#### Answer

Approach A
use `getRequestEvent().platform.ctx.waitUntil()` from cloudflare workers, to make it run in background
