# FSRS Service — Follow-up Questions

> Follow-ups from answered questions in `2026-05-25-fsrs-service-questions.md`.
> Key pivot: explicit session entity replaces the standalone "available flashcards today" query.

---

## 1. Session: When is a session created?

**Reason:** With the explicit session entity (#3), we must decide the trigger for session creation. The session replaces the standalone "available today" query (#5 removed), so session creation is now the primary entry point for reviewing.

**Common approaches:**

- **A. Created on "start review" action.** The client explicitly calls a `StartSession` command with a `studySetId`. The server creates the session, snapshots the "never reviewed" flashcards as `cardsRemaining`, and returns the session with the first batch of cards. Gives the server a clean moment to compute and snapshot state. Requires a new endpoint.

- **B. Created implicitly on first review.** If no active session exists for this user + study set, the first `reviewFlashcard` call auto-creates a session. The session's `cardsRemaining` is the set of all flashcards in the study set minus the one just reviewed. Simpler for the client, but the first review has no session context to return — the UI needs the session info before reviewing.

- **C. Created when user opens the study set.** Any navigation to a study set's review page triggers session creation (or resume of an existing active session). Sessions exist eagerly even if the user never actually reviews a card.

**Recommendation:** Approach A (`StartSession` command). A dedicated command lets the server atomically snapshot which flashcards are "never reviewed" at session start. The client gets back the session + a page of cards to review in one response. This is also the natural place to validate that the user can access the study set.

**Answer**

Approach A

---

## 2. Session: What columns does the `review_session` table need?

**Reason:** Answer #3 says "propose reasonable and useful column for session." We need to define the schema. The user clarified that `cardsRemaining` tracks cards never reviewed (not cards due for re-review), and answer #11 says study-set discovery now points to session records.

**Common minimal schema:**

```typescript
interface ReviewSession {
	id: UUID;
	userId: UUID;
	studySetId: UUID;
	status: 'active' | 'completed' | 'abandoned';
	totalCards: number; // snapshot of total flashcards in study set at session start
	completedCards: number; // cards reviewed at least once in this session
	remainingCards: number; // totalCards - completedCards (live-computed or stored)
	startedAt: number; // Unix ms
	completedAt?: number; // set when status = 'completed'
}
```

**Additional columns worth considering:**

- `lastReviewedAt` — when the most recent review in this session happened; useful for "continue session" ordering.
- `reviewLog` — JSON array of `{ flashcardId, rating, reviewedAt }` for quick session summary, or rely on the separate `review_log` table.
- `currentBatchIndex` — if cards are paginated within a session, tracks which batch the user is on.

**Questions:**

- Should `remainingCards` be a stored counter (incremented/decremented) or computed live from the `review_log` table?
- Is `status` needed, or do we just hard-delete completed sessions?
- Should sessions be scoped to one study set, or can a session span multiple study sets?

**Recommendation:** Start with the minimal schema above. Compute `remainingCards` live as `totalCards - COUNT(review_log WHERE sessionId = ...)` to avoid counter drift. Scope sessions to one study set per session (simpler lifecycle, matches the existing study-set-centric navigation). Add `lastReviewedAt` for "continue session" ordering.

**Answer**

add last reviewed at
review log should separate table
no currentBatchIndex
remainingCard should be manually setted by application layer
status needed
one session per study set per user

---

## 3. Session: Can a user have multiple active sessions?

**Reason:** If sessions are per-study-set, a user reviewing flashcards across 3 study sets would have 3 active sessions simultaneously. The session table needs a uniqueness constraint and the "list study sets with available cards" query (#6) needs to handle this.

**Common approaches:**

- **A. One active session per user per study set.** Unique constraint on `(userId, studySetId)` where `status = 'active'`. Starting a new session for the same study set either resumes the existing session or requires completing/abandoning the old one. Simplest mental model.

- **B. Multiple sessions per study set.** A user could start fresh sessions on the same study set without completing the previous one. Old sessions accumulate as abandoned. Allows "start over" but creates clutter.

- **C. One active session per user globally.** Starting a session on study set B auto-completes the session on study set A. Forces single-focus studying but is overly restrictive.

**Recommendation:** Approach A. One active session per user per study set. A `StartSession` command on a study set with an existing active session returns the existing session (resume). A separate `ResetSession` command abandons the current session and creates a fresh one.

**ANswer**

One session per study set per user, on any status.

---

## 4. Session: What does `StartSession` return?

**Reason:** Since query #5 ("available flashcards today") is removed, the session must provide the flashcards the user should review. The client needs both session metadata and the actual flashcards to display.

**Common approaches:**

- **A. Session metadata + first batch of cards.** Returns `{ session, cards: FlashcardWithState[] }` where cards are the first N cards in the session. The client paginates by calling a separate query with `sessionId + offset`. Good UX: one request to start and see cards.

- **B. Session metadata only.** Returns just the session object. The client then calls a separate `GetSessionCards` query to fetch cards. Cleaner separation of concerns but two round-trips to start reviewing.

- **C. Session + all cards.** Returns the session with all flashcards embedded. Simple but doesn't scale for large study sets (100+ cards).

**Recommendation:** Approach A. Return session + first batch (default 20 cards). The session response includes pagination info (`totalCards`, `returnedCards`, `hasMore`). The client fetches subsequent batches via a `GetSessionCards(sessionId, page)` query. The batch of cards should include the card content (front/back/hint) from the flashcard service, plus the FSRS state (or null for new cards) from this service.

**ANswer**

Approach B

---

## 5. Session: How does the session determine which cards are "remaining/never reviewed"?

**Reason:** The user said "cardsRemaining are card never reviewed (not card need to be reviewed again)." We need to define how the session knows which cards have never been reviewed by this user.

**Common approaches:**

- **A. Snapshot at session creation.** When `StartSession` is called, collect all flashcard IDs for the study set. Mark all as remaining. As reviews happen, decrement. This is a simple set difference: all flashcards in the study set minus cards that have at least one `flashcard_state` or `review_log` row for this user.

- **B. Live computation against `flashcard_state`.** "Never reviewed" = flashcards without a `flashcard_state` row for this user. This is always accurate but means `remainingCards` changes if the study set owner adds new flashcards mid-session.

- **C. Live computation against `review_log` within the session.** The session only tracks cards reviewed _within this session_. A card is "remaining" if it has no `review_log` row with this `sessionId`. Simultaneous sessions could cause double-counting.

**Recommendation:** Approach A for the initial count, but use `review_log` scoped to `sessionId` for tracking per-session progress. The `totalCards` is a snapshot — if the owner adds flashcards after session start, they won't appear in the current session. If the client wants fresh cards, they call `ResetSession`.

**ANswer**

Approach A

---

## 6. Session: What happens when a session completes?

**Reason:** Sessions need a defined end state. The user said `cardsRemaining` tracks never-reviewed cards — when `cardsRemaining` reaches 0, the session is "done."

**Common approaches:**

- **A. Auto-complete when remaining hits 0.** The last review that brings remaining to 0 also sets `status = 'completed'` and `completedAt = now()`. The client sees `remainingCards: 0, status: 'completed'` in the response.

- **B. Explicit `CompleteSession` command.** The client decides when the session is done, even if cards remain. The user might stop early. Supports "I'm done for now" with remaining cards.

- **C. No completion — sessions are immortal.** Sessions stay active forever. The client detects `remainingCards === 0` and hides the "continue" button. Simpler but can't distinguish "completed" from "abandoned" for analytics.

**Recommendation:** Hybrid of A and B. Auto-complete when `remainingCards` reaches 0. Also expose a `CompleteSession` (or `AbandonSession`) command for the user to explicitly finish early. Both set `completedAt`.

**ANswer**

Approach Approach A and Approach B

---

## 7. Session: Multiple users reviewing the same public study set — do sessions collide?

**Reason:** Answer #2 says "we also permit the user to start flashcard session from other user studyset." If user A and user B both start sessions on the same public study set, each gets their own independent session. This is already answered by the per-user nature of `flashcard_state`. But for sessions specifically, we need to confirm independence.

**Confirmation:** The `review_session` table includes `userId`. The unique constraint for active sessions is `(userId, studySetId)`. Two users reviewing the same study set have two completely independent sessions, each with their own `flashcard_state` and `review_log` rows. No collision.

**No decision needed — just confirming the design.**

**ANswer**

You are correct

---

## 8. Query "List of study sets with available cards today" — what does "available" mean now?

**Reason:** Answer #6 says "Approach B" (with status and total), and answer #11 says "Approach B, but we have session now, so point to that record instead." With sessions as the organizing concept, "available" needs redefinition.

**Common interpretations with sessions:**

- **A. Study sets with an active session.** Return study sets where the user has an active session (`status = 'active'`). "Available" means "you have an ongoing session here." Shows `remainingCards` from the session.

- **B. Study sets with an active session OR unreviewed flashcards.** If the user has no session on a study set but there are flashcards they haven't reviewed (no `flashcard_state` rows), include it with `newCount: N`. This is the discovery path for new content.

- **C. All accessible study sets, annotated with session status.** Every study set the user can access gets a badge: active session with `remainingCards`, completed session, or no session with `totalFlashcards`. The most informative but heaviest query.

**Recommendation:** Approach B. The query serves as the user's dashboard. Study sets with active sessions appear first (prioritized by `lastReviewedAt`). Study sets with unreviewed flashcards but no session appear next. Study sets where the user has reviewed everything appear last (or are filtered out). This gives the user a clear "where should I study next?" view.

**ANswer**

Available mean:

- card ever reviewed
- card waiting to be reviewed again
- exclude the card that never reviewed

---

## 9. Review Command within a session: Does the review command link to a session?

**Reason:** With explicit sessions (#3) and a `review_log` table (#12), each review should be traceable to a session. The review command needs to know which session the review belongs to.

**Common approaches:**

- **A. `sessionId` in the review command.** `{ flashcardId, rating, sessionId }`. The server validates that the session is active and belongs to the user, then records the review linked to that session. Clear audit trail. Requires the client to carry session context.

- **B. Session inferred server-side.** The server looks up the user's active session for the flashcard's study set. Implicit, but fails if the user has multiple active sessions (which Approach A in question #3 prevents anyway — only one per study set). The review command stays `{ flashcardId, rating }` as originally proposed.

- **C. No session link in review.** The `review_log` records `flashcardId`, `userId`, `rating`, `reviewedAt` without a `sessionId`. Session progress (`completedCards`) is tracked via a separate counter on the session row. Simpler but can't answer "which session was this review part of?"

**Recommendation:** Approach A. Explicit `sessionId` in the review command. This makes the session the primary grouping mechanism for reviews. The response can include updated session progress (`completedCards`, `remainingCards`). If the client wants a session-less review (e.g., quick review from a flashcard detail page), that's a separate endpoint or a session is auto-created.

**ANswer**

Approach A

---

## 10. `review_log` table: What columns?

**Reason:** Answer #12 says "Yes, approach B" for the review log. We need to define the schema now since both the session and review command depend on it.

**Proposed schema:**

```typescript
interface ReviewLog {
	id: UUID;
	userId: UUID;
	flashcardId: UUID;
	sessionId: UUID; // links to review_session
	rating: 'again' | 'hard' | 'good' | 'easy';
	previousState: {
		// snapshot of flashcard_state before this review
		state: string;
		due: string;
		stability: number;
		difficulty: number;
		reps: number;
		lapses: number;
	};
	newState: {
		// snapshot after this review
		state: string;
		due: string;
		stability: number;
		difficulty: number;
		reps: number;
		lapses: number;
	};
	reviewedAt: number; // Unix ms
}
```

**Questions:**

- Should `previousState` and `newState` be JSON columns or individual columns?
- Is `id` needed, or is `(userId, flashcardId, reviewedAt)` a sufficient natural key?
- Should we track the `elapsed_days` / `scheduled_days` values from ts-fsrs for debugging/re-scheduling?

**Recommendation:** JSON columns for `previousState` and `newState` — they're immutable audit data, not queried. Keep `id` as primary key for simplicity. Store `scheduled_days` inside the JSON blob. Add `elapsed_days` (time since previous review) for debugging re-scheduling accuracy.

**ANswer**

You are correct, state are stored as json, id needed, no need elapsed_days, scheduled days

---

## 11. Resuming a session: What happens to "due" cards within an active session?

**Reason:** With lazy card_state creation (#2), a session's "remaining" cards are those never reviewed. But ts-fsrs will also produce due cards — cards the user reviewed earlier that are now due for re-review. The user said `cardsRemaining` tracks "never reviewed" cards, not due-for-re-review cards. So how are due cards surfaced?

**Common approaches:**

- **A. Due cards are part of the session flow.** The session returns cards in order: first all "never reviewed" (new) cards, then cards that are `due <= now` for re-review. The session only completes when both new and due cards are exhausted. `cardsRemaining` tracks new cards; a separate `dueCardsCount` tracks re-review cards.

- **B. Due cards are outside the session.** The session only handles first-time reviews. Due-for-re-review cards are surfaced through a separate query — but query #5 was removed. This creates a gap: how does the user find due cards?

- **C. Due cards create a new implicit session.** When new cards are exhausted, the session auto-transitions to "review mode" and starts showing due cards. The `status` remains `'active'` but a `phase` field changes from `'learning'` to `'reviewing'`.

**Recommendation:** Approach A. Rename `cardsRemaining` to `newCardsRemaining` and add `dueCardsCount`. The session returns new cards first, then due cards. This gives the user a single linear flow: "learn new content, then review what you've learned." The session completes when both counts reach zero.

**ANswer**

Approach A

---

## 12. What queries does the FSRS service expose, given the revised design?

**Reason:** Query #5 was removed. The explicit session (#3) and review log (#12) change the query surface. We should enumerate the final list of queries.

**Queries:**

1. `GetSession(sessionId)` — returns session metadata + progress.
2. `GetSessionCards(sessionId, page?)` — returns paginated flashcards with their FSRS state for the session. New cards first, then due cards.
3. `GetStudySetsWithSessions` — the "dashboard" query from #6/#11. Returns study sets annotated with session status and counts.

**Commands:**

1. `StartSession(studySetId)` — creates or resumes a session for the user on the given study set.
2. `ReviewFlashcard(flashcardId, rating, sessionId)` — reviews one card within a session.
3. `CompleteSession(sessionId)` — explicitly finishes a session early.
4. `ResetSession(studySetId)` — abandons current session and starts fresh (optional).

**Question:** Should there be a `GetFlashcardState(flashcardId)` query for fetching a single card's FSRS state outside of a session context (e.g., on a flashcard detail page)?

**Recommendation:** Yes. A lightweight `GetFlashcardState(flashcardId)` query returns the user's FSRS state for one card (or null if never reviewed). Useful for detail pages showing "Next review: 3 days" without creating a session.

**ANswer**

All queries and commands are correct
GetSessionCards not need to be paginated
no need getflashcardstate(flashcardid)

---

## 13. Is the `flashcard_state` table still needed if we have `review_log`?

**Reason:** Answer #1 approved individual columns for `flashcard_state`, and answer #12 approved the `review_log`. With both tables, we need to clarify their relationship: is `flashcard_state` the source of truth for current scheduling, or can it be derived from `review_log`?

**Common approaches:**

- **A. `flashcard_state` is the current state (mutable).** The review command upserts `flashcard_state` with the latest ts-fsrs output. `review_log` is append-only history, never queried for current state. Fast queries (single row lookup per card). Risk of drift if a bug corrupts `flashcard_state` but `review_log` is correct.

- **B. `review_log` is the source of truth; `flashcard_state` is a materialized view.** The current state is computed from the latest `review_log` row per flashcard. `flashcard_state` can be dropped entirely and replaced with a view or computed column. Always consistent but slower queries (aggregate per card).

- **C. Both exist; `review_log` is the authority for rescheduling.** `flashcard_state` is the fast query path. If parameters change, reschedule by replaying `review_log` and rewriting `flashcard_state`. The standard pattern for FSRS apps.

**Recommendation:** Approach C. `flashcard_state` is the operational table for queries. `review_log` is the audit trail for analytics and future re-scheduling. The review command writes to both atomically (D1 batch). This is the most common pattern in FSRS implementations (Anki, fsrs4remnote, etc.).

**ANswer**

Yes, both still exists
