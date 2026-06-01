# FSRS Service - Additional Proposals After Long-Lived Session Clarification

Sources reviewed:

- `src/lib/services/fsrs/SPECS.md`
- `docs/superpowers/specs/2026-05-26-fsrs-service-improvement-proposals-after-spec-review.md`
- User clarification: FSRS sessions are long-lived per-actor StudySet state containers, can review a flashcard more than once, and are not per review run or per day.

This document contains additional proposals found during a second pass after the long-lived session clarification. Answer each section before changing `src/lib/services/fsrs/SPECS.md`.

---

## 1. Remove session-boundary membership from the model

### Current spec

The current FSRS spec uses `session.startedAt` as a stable selection boundary. Cards created after `startedAt` are excluded from that session, and cards that become due after `startedAt` wait for a later session.

### Concern

That model treats a session as a review run. The clarified model treats a session as long-lived user state for one StudySet, so a `startedAt` boundary should not decide which cards belong forever.

### Improvement

Use live StudySet membership and live FSRS state instead of session-boundary membership.

### Recommendation

Remove the `session.startedAt` selection boundary from `GetSessionCards` and `ReviewFlashcard`.

`GetSessionCards` should compute the current worklist from the StudySet's current flashcards:

- `NEW`: current StudySet flashcards with no `FlashcardState` for the authenticated user.
- `DUE`: current StudySet flashcards with `FlashcardState.due <= now` for the authenticated user.

No `review_session_card` membership table is needed for the clarified model.

### Answer

---

## 2. Allow repeated review logs for the same flashcard and session

### Current spec

The current FSRS spec prevents duplicate review logs for `(sessionId, flashcardId)` and exposes `CARD_ALREADY_REVIEWED_IN_SESSION`.

### Concern

Repeated reviews are valid in a long-lived session. A flashcard can be reviewed, become due again, and be reviewed again under the same session.

### Improvement

Make `ReviewLog` a true append-only event stream for the long-lived session.

### Recommendation

Remove the unique constraint or service guard on `(sessionId, flashcardId)`.

Keep indexes on `review_log(sessionId, flashcardId, reviewedAt)` and `review_log(userId, flashcardId, reviewedAt)` for history lookup.

Remove `CARD_ALREADY_REVIEWED_IN_SESSION` from errors unless a separate idempotency feature is added later.

### Answer

---

## 3. Replace `ResetSession` with explicit deletion or restart semantics

### Current spec

`ResetSession` abandons an active session and creates a new active session row.

### Concern

That behavior only makes sense for per-run sessions. A long-lived session should not be abandoned and recreated just to continue studying. It exists until deleted manually or considered complete.

### Improvement

Choose one lifecycle command for long-lived sessions.

### Recommendation

Replace `ResetSession` with `DeleteSession(sessionId)` or `DeleteSession(studySetId)` if manual deletion is required.

Deleting a session should define whether it also deletes the user's `FlashcardState` and `ReviewLog` for that StudySet, or only deletes the session container. Recommendation: delete the session container and related review logs, but keep `FlashcardState` unless the user explicitly chooses a stronger reset-all-progress command.

### Answer

---

## 4. Make completion a derived state unless terminal completion is final

### Current spec

Sessions have `ACTIVE`, `COMPLETED`, and `ABANDONED` statuses. A session can become completed when stored counters reach zero.

### Concern

In FSRS, a StudySet can be complete now and become due later. A terminal `COMPLETED` status can become stale unless it is allowed to reopen automatically.

### Improvement

Define whether completion is terminal or derived.

### Recommendation

Use a derived `isComplete` field in responses instead of storing terminal completion for the MVP.

`isComplete` is true when the StudySet has no new flashcards for the user and no due flashcard states at the query time. The session row remains available for future due cards.

If a persisted status is required, allow `COMPLETED` to transition back to `ACTIVE` when new cards are added or due cards appear.

### Answer

---

## 5. Define review eligibility by current time, not session start time

### Current spec

Session card eligibility uses `due <= session.startedAt`. Dashboard due-card discovery uses `due <= now`.

### Concern

Long-lived sessions should use current availability. A card that becomes due while the session exists should be reviewable in that same session.

### Improvement

Use a single reference time for session review eligibility.

### Recommendation

For `GetSessionCards` and `ReviewFlashcard`, define due eligibility as `FlashcardState.due <= now`, where `now` is server time at query/command execution.

`startedAt` can remain as metadata for when the long-lived session was created, but it should not filter card eligibility.

### Answer

---

## 6. Decide whether `ReviewSession` should be renamed

### Current spec

The entity is named `ReviewSession`, with commands like `StartSession` and `ResetSession`.

### Concern

The word "session" usually implies a time-bounded review run. The clarified model is long-lived actor state for one user and one StudySet, which can accept repeated reviews over time.

### Improvement

Make the name match the lifecycle, or explicitly define that this project's "session" is not a review run.

### Recommendation

Either rename the entity to something like `StudySetReviewState` / `FsrsStudySetSession`, or keep `ReviewSession` but add a clear definition:

`ReviewSession` is a long-lived per-user StudySet FSRS container. It is not a per-day or per-review-run session. It groups the user's review logs and current scheduling state for that StudySet until the session is manually deleted or reaches the chosen completion lifecycle.

If the name stays `ReviewSession`, rename `StartSession` to `GetOrCreateSession` in service internals or document that `StartSession` is get-or-create, not a new run starter.

### Answer
