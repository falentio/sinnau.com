# FSRS Service - Follow-up Questions v4

> Follow-ups after accepting `2026-05-25-fsrs-service-improvement-proposals-after-v3.md`.
> Focus: remove remaining ambiguity before writing the final FSRS service spec.

---

## 1. Session reset: how do we distinguish a new run from old review logs?

**Reason:** We accepted one session per user per study set across all statuses. We also accepted append-only `review_log`. If `ResetSession` reuses the same `review_session.id`, old logs with the same `sessionId` will still exist. Then `GetSessionCards` cannot tell whether a card was reviewed in the current run or only in an older run.

**Common approaches:**

- **A. Add `runNumber` to `review_session` and `review_log`.** `ResetSession` increments `runNumber`. `GetSessionCards` excludes logs only where `sessionId` and `runNumber` match the current session. Keeps one session row and preserves append-only logs.

- **B. Delete old review logs on reset.** Keeps one session row and simple queries, but destroys history and conflicts with append-only audit goals.

- **C. Allow multiple session rows historically, but only one active session.** This is the common session-history model, but it conflicts with the answer "one session per study set per user, on any status."

**Recommendation:** Approach A. Add `runNumber` as an integer column to `review_session` and `review_log`. It preserves the one-row session rule and keeps review history intact.

**Answer**

Approach C

---

## 2. `ResetSession`: what exactly should it do?

**Reason:** We accepted `ResetSession` as required. We need the exact mutation rules so implementation is deterministic.

**Common approaches:**

- **A. Full reset and new active run.** Set `status = 'ACTIVE'`, increment `runNumber`, set `startedAt = now`, clear `completedAt`, recompute `newCardsRemaining` and `dueCardsRemaining`, set `completedCards = 0`, and keep `lastReviewedAt` unchanged for ordering history.

- **B. Full reset and clear activity ordering.** Same as A, but also set `lastReviewedAt = null`. This makes the restarted session look brand new.

- **C. Reset only completed/abandoned sessions.** Active sessions cannot be reset unless first completed or abandoned. Safer, but adds extra client flow.

**Recommendation:** Approach A. It is simple, explicit, and keeps dashboard ordering useful by preserving the last activity timestamp until the first review in the new run updates it.

**Answer**

Approach A

---

## 3. Early finish: should it be `COMPLETED` or `ABANDONED`?

**Reason:** We accepted both auto-complete and explicit completion. If a user stops early while counters are still above zero, the session is not truly completed. The status value should communicate that clearly.

**Common approaches:**

- **A. Explicit early finish sets `COMPLETED`.** Simple for the UI. The user said they are done, so the session is done, even if remaining counters are not zero.

- **B. Explicit early finish sets `ABANDONED`.** More accurate analytically. Auto-complete means all cards were reviewed. Abandoned means the user ended the run early.

- **C. Have two commands: `CompleteSession` and `AbandonSession`.** Most expressive, but adds API surface.

**Recommendation:** Approach B. Use `COMPLETED` only when both counters are zero. Use `ABANDONED` when the user ends early. Name the command `CompleteSession` if you prefer UX language, but persist `ABANDONED` when unfinished.

**Answer**

Approach B

---

## 4. Should `ReviewFlashcard` be blocked for completed or abandoned sessions?

**Reason:** The review command requires `sessionId`. If the session is not active, applying a review would reopen or corrupt a completed run unless the behavior is defined.

**Common approaches:**

- **A. Block non-active sessions.** `ReviewFlashcard` requires `status = 'ACTIVE'`. Users must call `ResetSession` to review again.

- **B. Auto-reset completed sessions.** Reviewing in a completed session implicitly starts a new run. Convenient, but hides a large mutation behind a review.

- **C. Allow reviews on completed sessions.** Simplest code but corrupts session semantics and counters.

**Recommendation:** Approach A. Keep session lifecycle explicit. Return `SESSION_NOT_ACTIVE` when the session is completed or abandoned.

**Answer**

Approach A

---

## 5. `GetSessionCards`: should it exclude cards already reviewed in the current run?

**Reason:** After reviewing a card, the client may call `GetSessionCards` again. We need to define whether the reviewed card still appears in the result.

**Common approaches:**

- **A. Exclude cards already reviewed in the current run.** The query returns only cards still remaining in the session. This matches counter behavior.

- **B. Return all cards in the run with a `reviewed` flag.** Useful for review summaries, but heavier and less focused.

- **C. Return all eligible cards regardless of session review logs.** Simple but causes reviewed cards to repeat.

**Recommendation:** Approach A. `GetSessionCards` is for continuing the session, not for summary. Add a separate summary query later if needed.

**Answer**

Approach C

---

## 6. Should `ReviewFlashcard` validate that the card belongs to the current session run?

**Reason:** The client already has flashcards, and `ReviewFlashcard` accepts `flashcardId` plus `sessionId`. Without validation, the client could review any flashcard from the same study set, including cards not selected for the current run.

**Common approaches:**

- **A. Strict validation.** The card must belong to the session's study set, must be eligible at `session.startedAt`, and must not already have a review log for the current `runNumber`.

- **B. Study-set-only validation.** The card only needs to belong to the same study set. Flexible, but counters can become wrong if the card was not part of the session.

- **C. No session-card validation.** Only validate user access. Fast but unsafe.

**Recommendation:** Approach A. Since the session owns progress counters, the command must enforce session membership. Return `CARD_NOT_IN_SESSION` or `CARD_ALREADY_REVIEWED_IN_SESSION` when invalid.

**Answer**

Approach A

---

## 7. Do we need an idempotency key for review submissions?

**Reason:** We accepted append-only review logs. A network retry could submit the same review twice and apply FSRS twice, which would corrupt `flashcard_state`.

**Common approaches:**

- **A. Require `idempotencyKey` in `ReviewFlashcard`.** The client generates a unique key per review attempt. Duplicate keys return the original result without reapplying FSRS.

- **B. Optional `idempotencyKey`.** Retries are safe only when the client provides a key. Simpler adoption, but unsafe clients can still double-submit.

- **C. No idempotency support.** Keep the API minimal. Accept duplicate risk.

**Recommendation:** Approach A. Require `idempotencyKey`. It preserves append-only logs without risking double application of a review.

**Answer**

Approach C

---

## 8. What is the exact `ReviewFlashcardCommand` input?

**Reason:** Earlier we accepted `flashcardId`, `rating`, and explicit `sessionId`. If we accept idempotency, the final input changes.

**Common approaches:**

- **A. Minimal session-aware input.** `{ sessionId, flashcardId, rating }`.

- **B. Idempotent input.** `{ sessionId, flashcardId, rating, idempotencyKey }`.

- **C. Include client metadata.** Add optional fields like device ID or local timestamp. More flexible, but not needed now.

**Recommendation:** Approach B. Do not accept `reviewedAt`; keep server time. Require `idempotencyKey` for retry safety.

**Answer**

No idempotency key

---

## 9. What exact columns should `flashcard_state` store?

**Reason:** We accepted individual columns. The ts-fsrs card includes fields beyond the originally listed core fields, including `learning_steps`. We also decided not to expose `scheduledDays` in the review response, but that does not settle persistence.

**Common approaches:**

- **A. Store only operational query fields.** `state`, `due`, `stability`, `difficulty`, `reps`, `lapses`, `lastReview`. Small table, but may lose information ts-fsrs expects.

- **B. Store all non-deprecated ts-fsrs card fields.** `state`, `due`, `stability`, `difficulty`, `scheduledDays`, `learningSteps`, `reps`, `lapses`, `lastReview`. Best compatibility with ts-fsrs.

- **C. Store core fields plus a JSON backup.** More resilient, but duplicates data.

**Recommendation:** Approach B. Persist all non-deprecated fields needed to reconstruct a ts-fsrs `Card`. Do not persist deprecated `elapsed_days` fields.

**Answer**

Approach B

---

## 10. What exact shape should `FsrsCardState` use in service responses?

**Reason:** `SessionCard` returns `state` and `previewState`. We need a stable response type that is useful for UI but does not leak unnecessary ts-fsrs internals.

**Common approaches:**

- **A. Full persisted state.** Return every persisted state field, including `stability`, `difficulty`, `reps`, `lapses`, `scheduledDays`, and `learningSteps`.

- **B. UI-focused state.** Return `state`, `due`, `reps`, `lapses`, and `lastReview`; omit algorithm internals like `stability` and `difficulty`.

- **C. Raw ts-fsrs card.** Return the library shape directly. Fast to implement, but couples API to ts-fsrs internals.

**Recommendation:** Approach B for public service responses, while repositories still persist the full operational state. The UI needs due/review progress, not stability math.

**Answer**

Approach B

---

## 11. What should `previewState` contain?

**Reason:** `previewState: Record<Rating, State>` was accepted, but "State" could mean full persisted state, UI-focused state, or just the next due date.

**Common approaches:**

- **A. Full preview state.** Each rating maps to the same `FsrsCardState` response shape used for current state.

- **B. Preview interval only.** Each rating maps to `{ due, state }` or `{ due }`. Small and enough for buttons.

- **C. Raw ts-fsrs preview card.** Complete but tightly coupled to the library.

**Recommendation:** Approach A if `FsrsCardState` is UI-focused. It keeps the shape consistent and avoids exposing extra internals.

**Answer**

Approach A

---

## 12. Date representation: `Date`, Unix milliseconds, or ISO strings?

**Reason:** Existing service specs mention Unix timestamps, while current TypeScript code often uses `Date` objects through Drizzle. FSRS has many date fields (`due`, `lastReview`, `startedAt`, `completedAt`, `lastReviewedAt`, `reviewedAt`).

**Common approaches:**

- **A. Unix milliseconds in service responses.** Easy to compare and serialize. Matches existing specs.

- **B. ISO strings in service responses.** Human-readable and JSON-native. Common for APIs.

- **C. `Date` objects inside service types only.** Convenient internally, but remote serialization may vary.

**Recommendation:** Use `Date` internally and Unix milliseconds in service schemas/responses, matching the current domain specs. Document this conversion explicitly.

**Answer**

Approach A

---

## 13. What happens if a public study set becomes private after a user started a session?

**Reason:** Users can start sessions for public study sets they do not own. If the owner later changes visibility to private, the user has an existing session and FSRS state for content they can no longer access.

**Common approaches:**

- **A. Enforce current access on every command/query.** Existing session/state remains in the database, but the user cannot fetch session cards or review until access is restored.

- **B. Preserve access for existing sessions.** Users who started while public can continue. More user-friendly but violates current StudySet visibility semantics.

- **C. Delete or abandon sessions when visibility changes.** Clean but requires cross-service coordination on visibility updates.

**Recommendation:** Approach A. FSRS state is private to the user but content access follows current StudySet visibility. Keep rows, block access.

**Answer**

Approach A

---

## 14. How should session counters handle deleted flashcards?

**Reason:** Flashcard deletion will cascade to `flashcard_state` and `review_log`, but stored session counters may become stale if cards are deleted during an active session.

**Common approaches:**

- **A. Refresh counters lazily.** `GetSession` and `GetSessionCards` recompute counters from live data and update the session row if stale.

- **B. Update counters during flashcard deletion.** The Flashcard or StudySet delete flow calls FSRS cleanup logic to adjust active sessions. More precise, but adds cross-service coupling.

- **C. Accept stale counters until reset.** Simplest, but confusing for users.

**Recommendation:** Approach A. Lazy refresh keeps counters accurate without requiring every delete path to know FSRS session details.

**Answer**

Approach A

---

## 15. Should `GetSessionCards` have a maximum size even without pagination?

**Reason:** We accepted no pagination. A large study set could still produce a large response.

**Common approaches:**

- **A. No limit.** Return all session cards. Simple and follows the accepted decision.

- **B. Hard service limit.** Return at most a configured maximum, such as 500 cards, and fail or truncate beyond that. Prevents very large responses but acts like hidden pagination.

- **C. Limit study-set flashcard count elsewhere.** Keep `GetSessionCards` unpaginated because content creation already constrains size.

**Recommendation:** Approach C if the Flashcard service has or will have a practical maximum per study set. Otherwise use Approach B with a generous hard limit and explicit error.

**Answer**

Approach A;

---

## 16. What error codes should FSRS expose?

**Reason:** The FSRS service will have domain-specific failure cases beyond validation and authorization.

**Common approaches:**

- **A. Reuse generic errors only.** `VALIDATION_FAILED`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`. Minimal but less precise.

- **B. Add FSRS-specific errors.** Examples: `SESSION_NOT_FOUND`, `SESSION_NOT_ACTIVE`, `CARD_NOT_IN_SESSION`, `CARD_ALREADY_REVIEWED_IN_SESSION`, `REVIEW_ALREADY_APPLIED`, `FSRS_STATE_CONFLICT`.

- **C. Hybrid.** Use generic errors for auth/visibility and FSRS-specific errors for session/review invariants.

**Recommendation:** Approach C. Keep auth errors consistent with other services, and add FSRS-specific errors for session lifecycle and idempotency.

**Answer**

Approach C

---

## 17. Should `GetStudySetsWithDueCards` include sessions with no due cards?

**Reason:** The query is limited to 10 latest entries ordered by session activity and due count. It is unclear whether entries with `dueCardsCount = 0` but active sessions should appear.

**Common approaches:**

- **A. Only due cards.** Include only sessions/study sets where `dueCardsCount > 0`. The query name stays literal.

- **B. Due cards first, active sessions second.** Include active sessions even when no due cards exist, but order true due-card entries first.

- **C. All sessions.** This becomes a session dashboard, not a due-card query.

**Recommendation:** Approach A. Keep `GetStudySetsWithDueCards` narrow. If we need a "continue sessions" dashboard, add `GetSessions` separately.

**Answer**

Approach A

---

## 18. Do we need a separate `GetSessions` query?

**Reason:** `GetStudySetsWithDueCards` is due-focused. The user may still need to resume active sessions that contain only new cards and no due cards.

**Common approaches:**

- **A. Add `GetSessions`.** Returns the user's sessions, optionally filtered by status. Useful for "continue learning" UI.

- **B. Reuse `GetStudySetsWithDueCards`.** Simpler API but mixes due review and session management.

- **C. No session listing.** Users reach sessions only from study-set detail pages.

**Recommendation:** Approach A. Add `GetSessions({ status? })` with a default of active sessions. Keep it separate from due-card discovery.

**Answer**

Approach A