# FSRS Service — Follow-up Questions v3

> Follow-ups from answered v2 questions.
> Key pivot: "available" now means previously-reviewed cards due for re-review (excludes never-reviewed cards). Session tracks new cards.

---

## 1. Session `remainingCards`: new cards only, or new + due for re-review?

**Reason:** Answer #2 says `remainingCard should be manually setted by application layer`. Answer #5 confirms the snapshot is "never reviewed" flashcards at session creation. But answer #11 says due cards are part of the session flow. If the session progresses through new cards first, then due cards, what does `remainingCards` actually count during the session?

**Common approaches:**

- **A. `remainingCards` tracks new cards only.** Decremented only when a never-reviewed card gets its first review. Due-for-re-review cards are tracked separately (maybe `dueCardsCount`). The session auto-completes when `remainingCards` reaches 0, but due cards may still exist. This means the session can complete while cards are still due.

- **B. `remainingCards` tracks new + due cards combined.** At session start, `remainingCards = newCardCount + dueCardCount`. Decremented for any review. Auto-completes at 0. Simpler counter but can't distinguish "new" from "due" progress.

- **C. `remainingCards` starts as new cards, transitions to due cards when new cards hit 0.** The counter is "what cards are left to review in the current phase." When new cards exhaust, `remainingCards` is recomputed to `dueCardsCount`. The client sees the counter reset, which may be confusing.

**Recommendation:** Approach B — combined counter. Simplest for the application layer to manage manually. The session doesn't distinguish new from due; it just presents cards in order (new first, then due) and counts down. The client can infer phase from whether the returned cards have a `flashcard_state` or not.

**Answer**

Apporach B

---

## 2. Session: How does `StartSession` on an already-completed session behave?

**Reason:** Answer #3 says "One session per study set per user, on any status." A user who completed a session on a study set cannot create a second one without resolving the existing completed session. We need to define the behavior.

**Common approaches:**

- **A. `StartSession` overwrites a completed session.** Calling start on a study set with a completed session creates a new session (new `id`, new `startedAt`, new snapshot). The old completed session is deleted or marked as superseded. Cleanest UX: "start" always works.

- **B. `StartSession` returns the existing completed session.** The client sees `status: 'completed'` and must explicitly call `ResetSession` or `DeleteSession` first. More explicit but requires the client to handle two cases.

- **C. `StartSession` fails for completed sessions.** Returns an error like `SESSION_EXISTS`. The client must call `ResetSession` or a separate `ReopenSession` command. Most explicit, but adds friction.

**Recommendation:** Approach A. Overwrite on start. The old session is soft-deleted (status overwritten or archived). A `StartSession` on any study set should always succeed and return a fresh active session. The "one per user per study set" constraint is enforced by making `StartSession` upsert behavior (INSERT OR REPLACE on `(userId, studySetId)`).

**Answer**

Approach B

---

## 3. "Available" query: What exact shape should `GetStudySetsWithAvailableCards` return?

**Reason:** Answer #8 redefines "available" as: cards ever reviewed AND cards waiting to be reviewed again (due <= now). Never-reviewed cards are excluded. This query powers the dashboard. We need to pin down the return shape.

**Common approaches:**

- **A. Study set list with due counts.** Returns `{ studySetId, slug, title, visibility, ownerId, dueCount }` for each accessible study set where `COUNT(flashcard_state WHERE userId = me AND due <= now) > 0`. Lightweight for a dashboard. Shows only study sets that actually have cards needing review.

- **B. Study set list with full breakdown.** Returns due count + new count + total, even for study sets with zero due cards. More informative but heavier query. A study set with 50 new cards and 0 due cards would appear, just with `dueCount: 0`.

- **C. All accessible study sets, annotated with session status.** Returns study set + active session progress if one exists + due counts. Combines the dashboard view with session context in one query.

**Recommendation:** Approach A for the initial query. Add approach C (session annotation) as a secondary query or composite response. The dashboard surface is likely: "3 study sets have cards to review [dueCount: 5, 2, 8]" — and separately "You have 2 active sessions."

**Answer**

GetStudySetsWithAvailableCards would return:

- 10 latest (order by last reviewed at) entries
- each entry would contain studySet: StudySet, and session: Session, card need to be reviewed

---

## 4. How do users discover never-reviewed (new) content?

**Reason:** Answer #8 explicitly excludes never-reviewed cards from the "available" query. The session tracks new cards, but a user must first find a study set and start a session. Where does the user see "this study set has 50 new cards you haven't touched"?

**Common approaches:**

- **A. Study set detail page shows new/total counts.** When viewing a study set (`GetStudySet` from the study-set service), the response includes `newCardCount` and `totalFlashcards` — computed by the FSRS service or joined inline. This is the natural discovery point: "this study set has 30 cards, you've reviewed 10, 20 are new."

- **B. Separate `GetStudySetsWithNewCards` query.** A dedicated dashboard query analogous to the "available" query, but for new content. Returns study sets where the user has never-reviewed flashcards.

- **C. The session `StartSession` response includes the preview.** `StartSession` returns `{ session, newCardCount, dueCardCount }` so the client can show "You'll review 20 new cards and 5 due cards" before fetchings cards via `GetSessionCards`.

**Recommendation:** Approach C baked into the session response. When `StartSession` snapshots the study set, it counts new vs due and includes those counts in the session metadata. For dashboard-level discovery, use approach B as a separate query — or augment the study-set service's `GetStudySets` with a `includeFlashcardCounts` option that joins through the FSRS service.

**ANswer**

Approach C.

---

## 5. `StartSession` returns only metadata (#4 answer B) — what metadata exactly?

**Reason:** Answer #4 says Approach B: `StartSession` returns session metadata only, no cards. But we need to define what metadata the client receives to decide whether to proceed with `GetSessionCards`.

**Proposed metadata:**

```typescript
interface StartSessionResponse {
  session: {
    id: UUID;
    userId: UUID;
    studySetId: UUID;
    status: "active";
    totalCards: number; // snapshot of total flashcards in study set
    newCardsCount: number; // never-reviewed cards in this session
    dueCardsCount: number; // previously-reviewed cards due <= now
    remainingCards: number; // newCardsCount + dueCardsCount (manually set)
    completedCards: number; // 0 at start
    startedAt: number;
    lastReviewedAt?: number;
    completedAt?: null;
  };
}
```

**Questions:**

- Should `StartSession` also include the first card or just counts? Answer #4 says metadata only.
- Should the session include study-set-level info (title, slug) or should the client fetch that from the study-set service separately?

**Recommendation:** Metadata only (as answered). Include `studySetTitle` and `studySetSlug` in the session response to save a round-trip to the study-set service — the client almost always needs these to render the session header.

**ANswer**

Metadata only, remove totalCards, remove remainingCards, remove newCardsCount

---

## 6. `GetSessionCards`: What is the return shape and ordering?

**Reason:** Answer #12 says "GetSessionCards not need to be paginated." If all session cards are returned in one response, the shape needs to handle potentially large study sets.

**Common approaches:**

- **A. Flat list of all session cards.** Returns all cards in one array, ordered new-first-then-due. Simple. For a study set with 200 cards, this is 200 card objects in one JSON response — acceptable for most use cases.

- **B. Capped list with continuation.** Returns up to N cards (e.g., 100). If more exist, the client calls again with an offset. The "no pagination" answer suggests this is not wanted, but worth confirming for large sets.

- **C. Grouped by phase.** Returns `{ newCards: [...], dueCards: [...] }` as two separate arrays. Helps the client render a divider or different UI for the two phases.

**Recommendation:** Approach A with optional approach C grouping. Return all cards in a flat array ordered by phase (new first, then due). Include `newCardCount` and `dueCardCount` so the client knows where the boundary is. For very large study sets, the response size is bounded by the study set's flashcard count, which is already limited by the flashcard create limits.

**ANswer**

approach A

---

## 7. `GetSessionCards`: What does each card object include?

**Reason:** The session card needs content from the flashcard service (front, back, hint) and state from the FSRS service (state, due, stability, etc.). We need to define the combined shape.

**Proposed per-card shape:**

```typescript
interface SessionCard {
  flashcardId: UUID;
  chapterId?: UUID;
  front: string;
  back: string;
  hint?: string;
  state: {
    state: "new" | "learning" | "review" | "relearning"; // 'new' if no flashcard_state row
    due: number | null; // null for new cards
    stability: number | null;
    difficulty: number | null;
    reps: number | null;
    lapses: number | null;
    lastReview: number | null;
  };
}
```

**Questions:**

- Should the FSRS service fetch flashcard content itself (cross-service join), or should the client stitch them together from two separate queries?
- Should `state` include the projected next intervals for each rating (Again/Hard/Good/Easy) so the UI can show them without calling `preview()` client-side?

**Recommendation:** The FSRS service fetches flashcard content in its repository query (JOIN `flashcard` table). This is a single SQL query and avoids the client doing N+1 stitching. Include projected intervals via ts-fsrs's `preview()` in the card state so the rating buttons can show "Lupa (1m), Sulit (10m), Cukup (1d), Mudah (3d)" dynamically.

**ANswer**

Session Card { flashcardId: string, state: State, previewState: Record<Rating, State> }
we dont need flashcard data

---

## 8. Session: What happens when the study set owner adds new flashcards during an active session?

**Reason:** Answer #5 confirms the session snapshots flashcard IDs at creation time. If the owner adds new flashcards after session start, those new flashcards are not in the snapshot. The user completes the session without seeing them. Is this the desired behavior?

**Common approaches:**

- **A. Snapshot is immutable.** New flashcards after session start are invisible to the session. The user must start a new session (which abandons/completes the current one) to see the new cards. Predictable and simple.

- **B. `GetSessionCards` includes new flashcards dynamically.** The query joins flashcards in the study set excluding those already reviewed in this session's `review_log`. The `totalCards` count becomes stale, but the actual card list is always current. The counter in the session row becomes inaccurate.

- **C. Session detects changes and updates itself.** When `GetSessionCards` runs, it compares the current flashcard set against the snapshot. If new flashcards exist, it appends them to the session and updates `totalCards` and `remainingCards`. Complex, but avoids stale sessions.

**Recommendation:** Approach A. Immutable snapshot. The session's `totalCards` is labeled as "at session start" in documentation. If the user wants fresh content, they call `ResetSession` or `StartSession` (which overwrites the old one). This keeps the session model simple and predictable.

**ANswer**

We remove the snapshot totalCards

---

## 9. `ReviewFlashcard` within a session: What does the response include?

**Reason:** Answer #9 says explicit `sessionId` in the review command. The response needs to give the client enough information to update the UI: the new card state (next due date), and updated session progress.

**Proposed response:**

```typescript
interface ReviewFlashcardResponse {
  flashcardId: UUID;
  newState: {
    state: "new" | "learning" | "review" | "relearning";
    due: number;
    stability: number;
    difficulty: number;
    reps: number;
    lapses: number;
    lastReview: number;
  };
  session: {
    completedCards: number;
    remainingCards: number;
    status: "active" | "completed";
  };
}
```

**Questions:**

- Should the response include the `scheduled_days` (next interval) from ts-fsrs for the UI to display "Next review: 3 days"?
- If the review causes `remainingCards` to reach 0 and the session auto-completes, should the response include completion metadata (`completedAt`)?

**Recommendation:** Include `scheduledDays` (the interval until next due) and `nextDueDate` (ISO string) for UI convenience. If the session auto-completes on this review, include `completedAt` in the session object. The client can use `status === 'completed'` to show a "Session complete!" screen.

**ANswer**

Exclude scheduledDays and nextDueDate

---

## 10. Is the `available` query the same as `GetStudySetsWithAvailableCards`, or a different endpoint?

**Reason:** Answer #8 redefined "available." We need to name and solidify this query. It was originally question #6 from v1 ("List of study set with available cards today") and question #8 from v2.

**Final specification confirmation:**

- **Name:** `GetStudySetsWithDueCards`
- **Returns:** Accessible study sets that have at least one `flashcard_state` row for this user where `due <= now`.
- **Shape per study set:** `{ studySetId, slug, title, visibility, dueCount }`.
- **Ordering:** By `dueCount` descending (most urgent first), then by study set `updatedAt` descending.
- **Excludes:** Study sets with no `flashcard_state` rows for the user (never reviewed anything there).
- **Question:** Should this query also return the active session ID if one exists for the study set, so the client can deep-link "Continue reviewing"?

**Recommendation:** Yes. Add `activeSessionId` to the response when an active session exists. This lets the dashboard show "Biology: 5 cards due — [Continue session]" without the client doing a second query.

**ANswer**

Order by last session.lastreviewedat and then dueCount
shape: { studySet: StudySet, session: Session }

---

## 11. `review_log`: What unique constraint?

**Reason:** Answer #10 confirmed `id` as PK and JSON state columns. But we need to prevent duplicate review logs for the same flashcard within a session.

**Common approaches:**

- **A. Unique on `(userId, flashcardId, sessionId)`.** A user can only review a flashcard once per session. If they review it again (e.g., in the due-for-re-review phase), it must be in a different session.

- **B. No constraint — append-only.** Multiple reviews of the same card in the same session are allowed. Useful if the user re-rates a card. The latest review wins for `flashcard_state` purposes. Risk of confusion if the client accidentally sends duplicate reviews.

- **C. Unique on `(userId, flashcardId, sessionId)` but upsert on conflict.** If a duplicate review arrives, the old `review_log` row is updated with the new rating and new state snapshots. Handles accidental retries gracefully.

**Recommendation:** Approach C. Unique constraint on `(userId, flashcardId, sessionId)`. If the same card is reviewed again in the same session, upsert the review log and recalculate `flashcard_state`. This handles the edge case where a user changes their rating or the client retries.

**Answer**

Appproach C

---

## 12. Should `flashcard_state` also have a uniqueness constraint?

**Reason:** With lazy creation (#2 answer: lazy) and per-user-per-flashcard semantics, the pair `(userId, flashcardId)` should be unique.

**Recommendation:** Unique index on `(userId, flashcardId)`. This is already implied by the design but should be explicit. The review command can use INSERT OR REPLACE (upsert) semantics.

**No decision needed — just confirming.**

**Answer**

correct

---

## 13. Service boundary: Should the FSRS service own `GetSessionCards`' flashcard content fetch?

**Reason:** The FSRS service needs flashcard content (front, back, hint) to return session cards. This requires reading from the `flashcard` table, which is owned by the flashcard service. We need to decide whether the FSRS repository reads flashcards directly or calls the flashcard service's repository/query.

**Common approaches:**

- **A. FSRS repository reads `flashcard` table directly.** In Drizzle, this is a simple JOIN. No cross-service dependency. But it means the FSRS domain knows about flashcard columns. If the flashcard schema changes, FSRS may need updates.

- **B. FSRS service calls the flashcard service's `GetFlashcards` query.** Clean domain separation. FSRS only stores states and sessions; it delegates content reads. But adds in-process dependency and an extra round of object construction.

- **C. FSRS stores a denormalized copy of flashcard IDs only.** `GetSessionCards` returns only `flashcardId` + `state`. The client is responsible for fetching flashcard content separately from the flashcard service. Easiest domain separation but worst UX (N+1 client fetches).

**Recommendation:** Approach A. In a monorepo with shared Drizzle schema, the FSRS repository can JOIN the `flashcard` table directly. The flashcard table is stable and the FSRS service only reads `front`, `back`, `hint`, `chapterId`, `id`. This is the same pattern the study-set service already uses (it directly reads `flashcard` for cascade deletion).

**Answer**

Approach C, client already have all Flashcard

---

## 14. Do we need a `DueCardsCount` in the session, separate from `remainingCards`?

**Reason:** Answer #2 says `remainingCard should be manually setted by application layer`. Answer #11 says the session returns new cards first, then due cards. The combined counter from recommendation #1 works for session progress, but the client may want to show "3 new + 2 due" as separate badges.

**Question:** Should `review_session` store both `newCardsRemaining` and `dueCardsRemaining` as separate columns, or is `remainingCards` sufficient and the breakdown is computed live?

**Recommendation:** Store both as separate columns. `newCardsCount` and `dueCardsCount` are snapshotted at session start. The review command decrements the appropriate counter based on whether the card had a prior `flashcard_state`. This gives the client precise progress without computing it from the review_log.

**Answer**

Store both
