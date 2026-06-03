# FSRS Service — Design Questions

> Source: initial requirements (1 flashcard state per flashcard per user, authorization from StudySet, queries for "available today")

---

## 1. Database Schema: What columns does `flashcard_state` need?

**Reason:** ts-fsrs `Card` carries `state` (New/Learning/Review/Relearning), `due`, `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `reps`, `lapses`, `learning_steps`, and `last_review`. Some fields are deprecated in ts-fsrs v5 (`elapsed_days`). We must decide what to persist for queryability (especially `due`) versus what can be recomputed at review time.

**Common approaches:**

- **A. Individual columns for all fields.** Each Card field gets its own SQL column. Makes `due` directly queryable for "available today" queries. The trade-off is that migrations are needed whenever ts-fsrs adds or removes fields.

- **B. Key columns plus a JSON catch-all.** Store `due`, `state`, `stability`, `difficulty` as individual columns for querying, and serialize the rest into a JSON column for forward-compatibility. The JSON column can't be queried in D1/SQLite, but it absorbs future field changes without migrations.

- **C. Full state as a single JSON blob.** Simplest schema — one `state_json` text column. Version-proof and no migrations needed. But you cannot run `WHERE due <= now` in SQL, which is the entire point of the "available today" query. D1 has no computed columns or JSON index support.

**Recommendation:** Approach A (individual columns). Store `state`, `due`, `stability`, `difficulty`, `scheduled_days`, `reps`, `lapses`, `last_review` as typed SQL columns. The `due` column is the linchpin of every query in this service. The ts-fsrs v5 schema is stable enough that field-level migrations will be rare.

**Answer**

Approach A

---

## 2. Card State Lifecycle: Eager or lazy creation?

**Reason:** When `CreateFlashcards` creates new flashcards, we must decide whether to also insert `flashcard_state` rows at that moment, or defer creation until the user first reviews the card. This shapes the "available today" query and storage costs.

**Common approaches:**

- **A. Eager creation.** Insert a `flashcard_state` row per user per flashcard at creation time. The "available today" query is a straightforward `WHERE due <= now`. The downside is N×M rows (flashcards × users with access) — most of which may never be reviewed. For a study set with 100 flashcards and 10 users, that's 1,000 rows for one study set.

- **B. Lazy creation.** No row exists until the user submits a first review. For unreviewed cards, the absence of a row implies "new." The "available today" query must UNION: flashcards without any `flashcard_state` row (treated as New) plus flashcards whose `due <= now`.

**Recommendation:** Approach B (lazy). This is consistent with ts-fsrs's own design: `createEmptyCard()` returns an in-memory object — you don't persist until there's a reason. The query complexity from the UNION is modest, and we avoid the storage bloat problem entirely.

**Answer**

Lazy, cuz we also permit the user to start flashcard session from other user studyset

---

## 3. What is an "FSRS Session"?

**Reason:** "Handling fsrs session" is listed as the service's main responsibility. We need to define whether a session is an explicit entity (with its own lifecycle) or just the implicit collection of due cards at any moment.

**Common approaches:**

- **A. Implicit session.** No session entity or table. The "session" is simply the set of cards due for review right now, recomputed each query. Each review is a standalone operation with no grouping. Simpler, fewer tables, no session lifecycle to manage. Downside: no way to track "completed a study session" for streaks or analytics.

- **B. Explicit session entity.** A `review_session` table with `id`, `userId`, `studySetId`, `startedAt`, `completedAt`, `cardsReviewed`, `cardsRemaining`. Starting a session creates a row; completing it marks the row as done. All reviews link to a session. Enables streaks, analytics, and "resume session." Adds complexity and another entity to manage.

**Recommendation:** Approach A for MVP. An implicit session provides the core value (review cards, get next due dates) without the overhead. An explicit session can be layered on later if analytics or streaks become a requirement. The queries and review command are session-agnostic by design.

**Answer**

Approach B, cardRemaining are card never reviewed (not card need to be reviewed again). propose reasonable and useful column for session

---

## 4. Authorization: Per-study-set or per-flashcard?

**Reason:** You said "follow authorization from study set." The flashcard SPECS states "Flashcards inherit visibility from their parent StudySet." For FSRS queries we must decide whether to guard at the study set level or at each individual flashcard.

**Common approaches:**

- **A. Study-set-level guard.** Before running any FSRS query or command, verify the user can access the target study set (owner, or public visibility). Once verified, all flashcards and card states within that study set are accessible. The SQL query joins through `study_set` to filter by `ownerId` or `visibility = 'PUBLIC'` in one pass.

- **B. Flashcard-level guard.** Check each flashcard individually. This is slower (N queries) and unnecessary since flashcards don't have their own visibility — they inherit it.

**Recommendation:** Approach A. Reuse the existing `StudySetGuard` pattern but add a lighter `canAccess(studySetId, userId)` method that doesn't throw (returns boolean), for query contexts where throwing is inappropriate. The repository queries join `flashcard_state` → `flashcard` → `study_set` and filter by ownership/visibility in a single SQL statement.

**Answer**

Approach A

---

## 5. "Available Flashcard Today" Query: What exactly should it return?

**Reason:** The phrase "available today" has several interpretations. Should it include new (never-reviewed) cards? Overdue cards? Cards due exactly within today's 24-hour window? Should it filter by study set? Should there be a result limit?

**Common approaches:**

- **Which cards to include:**
  - A. Only cards where `due <= now` OR `card_state IS NULL` (new). This is the most useful definition — it surfaces everything the user can review right now.
  - B. Only cards where `due` falls within the calendar day (00:00–23:59 server time). Cards overdue from yesterday are excluded, which creates a backlog problem.
  - C. Only cards where `due <= now`. Excludes new (never-reviewed) cards, which means users must find new content through a different mechanism.

- **Which study sets:**
  - A. All study sets the user can access (owned private + visible public).
  - B. Only owned study sets. Would hide cards from public study sets the user is studying.

- **Return shape:**
  - A. Flat list of cards with their current state, ordered by `due` ascending (nulls first = new cards first). Client can group as needed.
  - B. Grouped by study set → chapter → card. More convenient for UI but couples the query to a specific display structure.

- **Limit:**
  - A. No limit — return all due cards.
  - B. Configurable limit (e.g., 50 cards). Prevents overwhelming responses when a user returns after months away.

**Recommendation:** Cards where `card_state IS NULL OR due <= now`, across all accessible study sets, ordered by `due ASC` (nulls first), with a configurable limit defaulting to 50. Flat list for simplicity — grouping is the client's responsibility.

**Answer**

nvm, remove this query

---

## 6. "List of Study Set with Available Cards Today": What shape?

**Reason:** The complementary query should tell the user which study sets have cards to review, likely for a dashboard or study-set picker UI. We need to decide what data accompanies each study set.

**Common approaches:**

- **A. Minimal — counts only.** Returns `{ studySetId, title, slug, newCount, dueCount }`. Cheap to compute, enough for a badge ("3 sets have cards ready").

- **B. With status and total.** Adds `totalFlashcards` so the UI can show progress ("5 of 20 cards ready"). Slightly more expensive SQL (needs a COUNT on flashcard table), but useful for building a dashboard.

- **C. Embedded cards.** Returns full card data nested inside each study set. This is essentially the "available flashcards" query pre-grouped. Over-fetches for a list view.

**Recommendation:** Approach B. `newCount`, `dueCount`, and `totalFlashcards` alongside study set metadata. This lets the dashboard show "Biology: 12 new, 3 due, 45 total" without another round-trip. The user clicks through to fetch the actual cards via the "available flashcards" query scoped to that study set.

**Answer**

Approach B

---

## 7. Review Command: What input and output?

**Reason:** A review action takes the user's rating for a specific flashcard, feeds it into ts-fsrs, and persists the updated state. We need to define the command schema and behavior.

**Proposed input:**

```typescript
interface ReviewFlashcardCommand {
	flashcardId: UUID;
	rating: 'again' | 'hard' | 'good' | 'easy'; // maps to ts-fsrs Rating 1–4
}
```

The handler flow: (1) assert the user can access the flashcard's study set, (2) load current `flashcard_state` or `createEmptyCard()` if first review, (3) call `fsrs.review(card, rating)`, (4) upsert `flashcard_state`, (5) return the new state including the next `due` date.

**Additional design decisions:**

- Should the command accept a `reviewedAt` timestamp for offline sync or testing, or always use `new Date()`?
- Should the response include a rating-preview (projected intervals for Again/Hard/Good/Easy), or just the updated state?

**Recommendation:** Always use `new Date()` server-side — no client-provided timestamps. Return only the updated `flashcard_state`. The client can compute rating previews itself using ts-fsrs's `preview()` method if needed, avoiding server round-trips for speculative "what if I rate this Hard?" queries.

**Answer**

your proposed input are correct,
no need to accept reviewdAt

---

## 8. Rating Labels: ts-fsrs dynamic intervals vs flashcard SPECS static intervals

**Reason:** The flashcard SPECS defines four static interval labels: Lupa (1 jam), Sulit (6 jam), Cukup (1 hari), Mudah (3 hari). ts-fsrs computes intervals dynamically based on the card's full history — a new card might get `Again=1m, Hard=10m, Good=1d, Easy=3d`, while a mature card might get `Again=1d, Hard=7d, Good=30d, Easy=90d`. The SPECS also explicitly says: "The rating UI scope excludes saving ratings, implementing spaced-repetition logic."

**Common approaches:**

- **A. Full ts-fsrs scheduling.** Use the library's algorithm for all interval computations. The UI labels (Lupa/Sulit/Cukup/Mudah) map to `Again=1 / Hard=2 / Good=3 / Easy=4`. Intervals shown in the UI come from ts-fsrs's `preview()`, not hardcoded constants. This is the whole reason to use FSRS.

- **B. Fixed intervals from flashcard SPECS.** Store fixed intervals per card, ignore ts-fsrs scheduling entirely. Defeats the purpose of installing ts-fsrs and provides inferior retention scheduling.

**Recommendation:** Approach A. Use ts-fsrs's dynamic scheduling. The static intervals in the flashcard SPECS were preliminary UI design placeholders. The rating _labels_ (Lupa/Sulit/Cukup/Mudah) remain usable in the UI; only the intervals become dynamic.

**Answer**

Remove the interval from the flashcard SPECS.md
we will use full ts-fsrs scheduling

---

## 9. FSRS Parameters: Global defaults or configurable?

**Reason:** ts-fsrs's `generatorParameters()` provides sensible defaults (`request_retention: 0.9`, `maximum_interval: 36500` days, a 19-element weight vector `w`). Some apps allow per-user tuning of `request_retention` (e.g., 0.85 for "I want fewer reviews" or 0.95 for "I want higher retention"). We need to decide the initial scope.

**Common approaches:**

- **A. Global defaults.** Hardcode `generatorParameters()` in the service. Every user gets the same scheduling behavior. Simple, no configuration storage needed. Works for the vast majority of users.

- **B. Per-user parameters.** Store `request_retention` and optionally `w` per user in a `user_fsrs_config` table. Users can adjust their desired retention rate. Adds a config entity and UI surface.

**Recommendation:** Approach A for MVP. The default parameters are research-backed and work well. If and when users ask for retention tuning, we can add per-user parameters later — the review command would read parameters before constructing the `fsrs()` instance.

**Answer**

Per user parameters, but for now we dont need to give the ability to tune the parameter, this is future feature

---

## 10. Cascade Behavior: What happens when a flashcard or study set is deleted?

**Reason:** When `DeleteFlashcards` removes flashcards, or `DeleteStudySet` cascade-deletes them, any existing `flashcard_state` rows become orphaned. D1/SQLite does not support foreign-key `ON DELETE CASCADE`, so we must implement cleanup at the application layer.

**Common approaches:**

- **A. Application-level cascade.** The delete operation explicitly deletes `flashcard_state` rows in the same request. For `DeleteFlashcards`, the handler calls the FSRS repository to remove states by flashcard IDs. For `DeleteStudySet`, the handler first collects all flashcard IDs in the study set, then deletes states, then proceeds with the cascade. Atomic via D1 batch or transaction.

- **B. Periodic cleanup job.** A scheduled Worker runs periodically to delete `flashcard_state` rows whose `flashcardId` no longer exists. Simpler code but introduces a window where orphaned rows accumulate and inflate counts.

- **C. Ignore orphans.** Queries always LEFT JOIN to `flashcard` and filter out rows where the flashcard no longer exists. Adds complexity to every query.

**Recommendation:** Approach A. Add a `deleteStatesByFlashcardIds(ids)` method to the FSRS repository. The flashcard and study-set delete handlers coordinate with the FSRS service to clean up states. This is consistent with the existing application-level cascade pattern in `deleteStudySet`.

**Answer**

cascade
we support cascade https://developers.cloudflare.com/d1/sql-api/foreign-keys/

---

## 11. How do users discover study sets with unreviewed/new flashcards?

**Reason:** The "list of study set with available card for today" query needs to surface study sets where the user has never reviewed any cards (all 50 flashcards are new). Should these study sets appear in the list with `newCount: 50, dueCount: 0`, or should we only show study sets where the user has already started reviewing?

**Common approaches:**

- **A. All accessible study sets with any flashcards.** LEFT JOIN from `study_set` through `flashcard` to `flashcard_state`. Count where `card_state IS NULL` (new) and where `card_state.due <= now` (due). A study set with 50 unreviewed cards shows `newCount: 50, dueCount: 0`. This is the primary entry point for users to discover and start new content.

- **B. Only study sets with existing card_state rows.** Exclude study sets where the user hasn't reviewed anything yet. Requires users to find new content through some other mechanism (e.g., browsing all study sets). Creates a "cold start" problem.

**Recommendation:** Approach A. The whole point of the "available today" query is to help users find content to study. Excluding unreviewed study sets hides the very content users need to discover.

**Answer**

Approach B, but we have session now, so point to that record instead

---

## 12. Should we track review history (a `review_log` table)?

**Reason:** ts-fsrs supports re-scheduling from history via `FSRSHistory[]`. If we ever change FSRS parameters, we could replay the full review history to reschedule every card under the new parameters. A log also enables analytics (cards reviewed per day, accuracy trends). The question is whether to build this now or defer it.

**Common approaches:**

- **A. Current state only.** Store only the latest `flashcard_state` per user per flashcard. No history means parameter changes only affect future reviews, not past ones. Cheapest option — one row per user per flashcard.

- **B. Append-only review log.** Each review inserts a row into `review_log` with `flashcardId`, `userId`, `rating`, `previousState` (or snapshot of key fields), `newState`, and `reviewedAt`. The current state is still queryable from `flashcard_state` (updated in-place). The log exists purely for analytics and future re-scheduling.

**Recommendation:** Approach B, but defer implementation. MVP starts with current state only (one table). When analytics or re-parameterization become concrete requirements, add the `review_log` table as an append-only insert — it doesn't change any existing query or command behavior. The marginal cost per review is one extra INSERT.

**Answer**

Yes, approach B

---

## 13. What happens when a user reviews a flashcard from a public study set they don't own?

**Reason:** The authorization model says public study sets are accessible to all authenticated users. If a user reviews flashcards from someone else's public study set, do we create `flashcard_state` rows for that user? Does the owner's own card state remain independent?

**Confirmation:** Based on the requirement "1 flashcard state per flashcard per user," this is already answered — each user gets their own state. A public study set with one flashcard would have N `flashcard_state` rows (one per user who reviewed it). The `flashcard_state` table's composite unique key is `(userId, flashcardId)`.

**Question:** Should there be any cross-user visibility of card states? For example, can the study set owner see how other users are progressing?

**Recommendation:** No. Card states are private per user. The queries in this service always filter by `userId`.

**Answer**

No crossuser visibility

---

## 14. Should this service expose a batch-review endpoint?

**Reason:** Users typically review multiple flashcards in one sitting. Reviewing one card at a time (one HTTP request per card) could be chatty. A batch endpoint would accept multiple `{ flashcardId, rating }` pairs and return all updated states.

**Common approaches:**

- **A. Single review per request.** `POST /api/fsrs/review` accepts one flashcard review. Simple, idempotent, easy to reason about. N reviews = N requests.

- **B. Batch review.** Accept `{ reviews: [{ flashcardId, rating }] }`. All-or-nothing transaction — if any flashcard is not accessible, the entire batch fails. Reduces round-trips for the client.

**Recommendation:** Approach A for MVP. Match the existing pattern in the flashcard service (single-item commands). The network overhead of individual requests is acceptable for a study session where reviews are human-paced (seconds between cards). If this becomes a performance issue, batch can be added later without breaking the single-review endpoint.

**Answer**

no batch review
