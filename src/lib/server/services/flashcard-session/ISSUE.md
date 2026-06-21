# Flashcard Session Service — Issue Review

Generated from 3 parallel review agents (data layer/SQL, business logic, architecture/types),
then cross-referenced. Confidence level (⭐⭐⭐ = found by 2+ agents, ⭐ = found by 1 agent).

## CRITICAL

### C1. `deleteExpiredSessions` **cross-product bug** — deletes wrong flashcard_state rows

**Files:** `flashcard-session.repository.drizzle.ts:186-232`  
**Found by:** Agent 2, Agent 3 | **Confidence: ⭐⭐⭐**

The method collects `userIds` and `studySetIds` into **independent** arrays from expired sessions,
then deletes `flashcardState` where `userId IN (allUserIds)` AND `flashcardId IN (allFlashcardsInAllStudySetIds)`.
This produces a **Cartesian product** — it deletes states belonging to different users who happen to share
a study set with someone who has an expired session.

**Example:**

- User A has an expired session on study set X.
- User B has an expired session on study set Y.
- User A also has **active** states on study set Y (belongs to Y but no expired session there).
- User B also has **active** states on study set X.

Result: `userIds = [A, B]`, `studySetIds = [X, Y]`. The DELETE removes **User A's active states on Y**
and **User B's active states on X** — even though neither had an expired session for those pairs.

**Fix:** Delete per `(userId, studySetId)` pair, not per independent arrays. Either correlate via subquery
or iterate exact pairs:

```ts
// Correlated subquery approach
this.dbInstance
  .delete(flashcardState)
  .where(
    sql`(${flashcardState.userId}, ${flashcardState.flashcardId}) IN (
      SELECT fs.user_id, f.id
      FROM ${flashcardSession} fs
      JOIN ${flashcard} f ON f.study_set_id = fs.study_set_id
      WHERE fs.updated_at < ${new Date(beforeTimestamp)}
    )`
  )
  .run();
```

---

### C2. `deleteExpiredSessions` — state + session deletes not atomic

**Files:** `flashcard-session.repository.drizzle.ts:203-222`  
**Found by:** Agent 1, Agent 2 | **Confidence: ⭐⭐⭐**

Three operations outside a transaction: (1) SELECT expired, (2) DELETE `flashcard_state`,
(3) DELETE `flashcard_session`. If the server crashes after (2) but before (3), state rows are
permanently orphaned with no recovery path.

**Fix:** Wrap all three operations in `this.dbInstance.transaction(...)`.

---

### C3. `submitReview` — TOCTOU + last-write-wins corrupts pre-snapshot

**Files:** `flashcard-session.service.ts:190-237`  
**Found by:** Agent 1 | **Confidence: ⭐**

`findStateByKey` → compute FSRS → `upsertState` is not atomic. Two concurrent reviews for the
same flashcard both read the same `existingState`, both compute FSRS next-state from the same
pre-state, and both upsert into `flashcard_state`. The last writer wins — the first writer's FSRS
state transition is silently lost. The review row claims `pre-state = S` (which is true), but the
_state_ stored is S'' (from the second writer), so replaying reviews for FSRS weight tuning
produces wrong results.

**Impact:** Scheduling state (`elapsed_days`, `reps`, `stability`, `due`) is corrupted under
concurrent reviews, producing wrong intervals.

**Fix:** Short-term: document as accepted per SPEC point 10 ("Last-write-wins for flashcard_state").
Long-term: optimistic locking with `ON CONFLICT DO UPDATE WHERE updatedAt = <pre-read timestamp>`.

---

### C4. `updateSessionTouch` is outside the review transaction

**Files:** `flashcard-session.service.ts:239`, `flashcard-session.repository.drizzle.ts:479-516`  
**Found by:** Agent 1 | **Confidence: ⭐**

`submitReview` calls `insertReviewWithState` (a transaction committing review + state upsert),
then after that commits, calls `updateSessionTouch` as a separate write. If `updateSessionTouch`
fails (DB error), the review exists but the session's `updatedAt` is stale — the session could
expire prematurely and `deleteExpiredSessions` would delete its reviews.

Additionally, the return value of `updateSessionTouch` is discarded. If the session was deleted
concurrently, the touch silently does nothing.

**Fix:** Move `updateSessionTouch` inside the `insertReviewWithState` transaction, or at minimum
catch and log the error without propagating the 500 to the client.

---

## HIGH

### H1. `dbStateToCardInput` — string state assigned to numeric `State` enum

**Files:** `flashcard-session.service.ts:58-69`  
**Found by:** Agent 3 | **Confidence: ⭐**

```ts
const dbStateToCardInput = (state: FlashcardCardState): CardInput => ({
  state: state.state, // "New" | "Learning" | "Review" | "Relearning" — string!
});
```

FSRS's `CardInput.state` expects a **numeric** enum (`State.New = 0`, `State.Learning = 1`, etc.).
If FSRS internally checks `typeof state === 'number'`, this produces NaN/undefined scheduling
behavior. TypeScript may not flag this depending on how ts-fsrs defines the enum.

**Fix:** Convert via a lookup:

```ts
const strToState: Record<string, State> = {
  New: State.New,
  Learning: State.Learning,
  Review: State.Review,
  Relearning: State.Relearning,
};
// then: state: strToState[state.state] ?? State.New,
```

---

### H2. `introducedAt ?? now` silently converts sentinel `null` to `now`

**Files:** `flashcard-session.service.ts:212`  
**Found by:** Agent 2 | **Confidence: ⭐**

```ts
const introducedAt = existingState?.introducedAt ?? now;
```

When `existingState` exists but has `introducedAt: null` (sentinel for "introduced before tracking"
per SPEC), `existingState?.introducedAt` evaluates to `null`, then `null ?? now` evaluates to `now`.
The upsert's `COALESCE(introduced_at, excluded.introduced_at)` then replaces the sentinel with `now`,
converting all legacy "pre-tracking" cards to have `introducedAt = now` on first review.

**Fix:** Distinguish "no state at all" from "state with null introducedAt":

```ts
const introducedAt = existingState === null ? now : existingState.introducedAt;
```

---

### H3. Drizzle LEFT JOIN returns `undefined` but type says `null`

**Files:** `flashcard-session.repository.drizzle.ts:247-265`  
**Found by:** Agent 3 | **Confidence: ⭐**

```ts
state: flashcardState,  // LEFT JOIN with no match → Drizzle returns `undefined`
```

`QueueFlashcardWithState.state` is typed as `FlashcardCardState | null`, but Drizzle returns
`undefined` for unmatched LEFT JOIN rows. Runtime is correct (`!st` catches both null and undefined),
but the types are a lie — a future consumer checking `state === null` would miss `undefined`.

**Fix:** Normalize after query: `state: row.state ?? null` or widen the interface.

---

### H4. No pagination — unbounded list queries

**Files:** `flashcard-session.repository.drizzle.ts:81-97, 100-126`  
**Found by:** Agent 1, Agent 2 | **Confidence: ⭐⭐⭐**

`listSessionsForUser` and `listSessionsForAdmin` have no `LIMIT`. Admin call with no filters
returns **every session in the database** — OOM risk for large datasets.

**Fix:** Add `page`/`limit` params (default 20, max 100). Force a hard limit when no filters provided.

---

### H5. `deleteExpiredSessions` may hit SQLite variable limit

**Files:** `flashcard-session.repository.drizzle.ts:203-217`  
**Found by:** Agent 1 | **Confidence: ⭐**

The subquery `SELECT id FROM flashcard WHERE study_set_id IN (1000+ IDs)` feeds into
`inArray(flashcardState.flashcardId, ...)`. SQLite has a default `SQLITE_MAX_VARIABLE_NUMBER`
of 999. With enough expired sessions, the `studySetIds` array alone could exceed this limit.

The state delete and session delete are also sequential without a transaction (see C2).

**Fix:** Use a JOIN-based DELETE pattern (as shown in C1 fix) instead of two `inArray` clauses,
or batch in chunks of 500.

---

### H6. `insertReviewWithState` sync callback — future `async` silently breaks txn

**Files:** `flashcard-session.repository.drizzle.ts:479-516`  
**Found by:** Agent 1 | **Confidence: ⭐**

better-sqlite3's `transaction(fn)` requires a **synchronous** callback. If a future refactor adds
`async`/`await` inside the callback, better-sqlite3 commits the first statement and leaves the
transaction hanging — no rollback, no error.

**Fix:** Add a lint rule banning `async` inside `dbInstance.transaction()` callbacks, or wrap
the callback in a type guard: `type SyncFn<T> = (...args: never[]) => T`.

---

### H7. Guard raises `VALIDATION_FAILED` (convention violation)

**Files:** `flashcard-session.guard.ts:58-68`  
**Found by:** existing

Convention says guards only throw `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`. The
flashcard-to-study-set ownership check is business validation. Domain-specific codes like
`VALIDATION_FAILED` belong in the service layer.

**Fix:** Move `assertFlashcardBelongsToStudySetOrValidationFailed` to the service layer.

---

### H8. Guard depends on `FlashcardRepository` (convention violation)

**Files:** `flashcard-session.guard.ts:5,14-22`  
**Found by:** existing

Convention shows guards depending on sibling _guards_, never on sibling _repositories_. This
mixes persistence awareness into the guard layer.

**Fix:** Remove the `FlashcardRepository` dependency from guard. Move the ownership validation
to service (see H7).

---

### H9. `getOrCreateSession` race under concurrency

**Files:** `flashcard-session.repository.drizzle.ts:128-162`  
**Found by:** Agent 1, existing

`onConflictDoNothing` + fallback re-select has a TOCTOU window: between the insert failing
and the re-select, a concurrent `deleteExpiredSessions` could remove the conflicting row,
causing an unexpected throw.

**Fix:** Retry the INSERT once, or wrap in a transaction with a consistent snapshot read.

---

### H10. `flashcardSessionReviewSchema.flashcardId` is nullable

**Files:** `src/lib/schemas/flashcard-session.ts:79`, `src/lib/server/infras/db/schema/flashcard-session.ts:56`
**Found by:** Agent 2, Agent 3, existing | **Confidence: ⭐⭐⭐**

The input schema requires `flashcardId: flashcardIdSchema` (non-nullable). The service always
passes a valid ID. But the output/DB schemas allow `null` — clients must handle a null flashcardId
in review responses, which shouldn't happen.

**Fix:** Add `.notNull()` to the Drizzle column and use `v.string()` (not `v.nullable(v.string())`)
in the schema. Generate a new migration.

---

## MEDIUM

### M1. `findFlashcardsForQueue` loads ALL flashcards into JS

**Files:** `flashcard-session.repository.drizzle.ts:247-329`  
**Found by:** Agent 1, Agent 2 | **Confidence: ⭐⭐⭐**

The query fetches every flashcard + state row for the study set. Classification into buckets
(overdue/due-today/new/due-in-7-days) is done entirely in JS. The new-card cap (max 100) is
applied _after_ the full dataset is loaded — the cap doesn't reduce DB fetch cost.

The ORDER BY `(flashcardState.due, flashcard.createdAt)` is also wasted — the JS iteration
buckets rows and discards the sort order, but SQLite pays the full sort cost.

**Fix:** Remove the ORDER BY. Push partial filtering into SQL using WHERE clauses for each
bucket, or use UNION ALL with separate targeted queries and appropriate limits.

---

### M2. Missing index on `flashcardState.due`

**Files:** `flashcard-session.repository.drizzle.ts:265`  
**Found by:** Agent 1 | **Confidence: ⭐**

The query sorts by `flashcardState.due` and `flashcard.createdAt`. There is no index on
`flashcardState.due`. For study sets with thousands of cards, this is an in-memory sort
of the entire joined result.

**Fix:** Add index `flashcard_state_due_idx` on `flashcard_state(due)`. Can be partial:
`WHERE due IS NOT NULL`.

---

### M3. `listSessionsForAdmin` with empty filters returns all rows

**Files:** `flashcard-session.repository.drizzle.ts:104-117`  
**Found by:** Agent 1 | **Confidence: ⭐**

Drizzle's `and()` with no arguments returns `undefined`, so `.where(undefined)` omits the
WHERE clause. An admin calling `listSessionsForAdmin({})` returns every session in the DB
with no limit (see H4).

**Fix:** At minimum require one filter or enforce a hard LIMIT (e.g. 1000) when no filters.

---

### M4. `row.back ?? ""` / `row.front ?? ""` masks NOT NULL

**Files:** `flashcard-session.repository.drizzle.ts:277,280`  
**Found by:** Agent 1, Agent 3 | **Confidence: ⭐⭐⭐**

Both columns are `text(...).notNull()` in the schema — they are never null from the query.
The `?? ""` hides a potential future schema change or data corruption bug, suppressing nulls
silently instead of failing loudly.

**Fix:** Remove the `?? ""` fallback. Trust the schema.

---

### M5. `countIntroducedToday` join not fully covered by index

**Files:** `flashcard-session.repository.drizzle.ts:340-349`  
**Found by:** Agent 1 | **Confidence: ⭐**

The query filters by `flashcard.studySetId` (on the joined `flashcard` table). The index
`flashcard_state_userId_introducedAt_idx` covers `(userId, introducedAt)` but the
`studySetId` filter is on `flashcard`, not `flashcard_state`. SQLite joins all matching
states then filters by studySetId — wasteful for users with cards across many study sets.

The composite PK `(userId, flashcardId)` already exists but doesn't help here. Mitigated
if most users have few study sets.

---

### M6. `listSessionsForUser` includes sessions for soft-deleted study sets

**Files:** `flashcard-session.repository.drizzle.ts:81-97`  
**Found by:** Agent 1 | **Confidence: ⭐**

No JOIN or filter against `study_set.deletedAt IS NULL`. Sessions for deleted study sets
appear in the listing, but opening them returns NOT_FOUND from
`assertStudySetVisibleOrNotFound` — confusing UX.

**Fix:** Either filter out sessions whose study set is soft-deleted, or include a
`studySetDeleted` flag in the response.

---

### M7. `computeFsrs` module-level singleton prevents per-user tuning

**Files:** `flashcard-session.service.ts:43`  
**Found by:** Agent 2 | **Confidence: ⭐**

```ts
const computeFsrs = fsrs();
```

If the app ever needs per-user FSRS parameters (custom retention targets, different weights),
the singleton makes this impossible. The `fsrs()` factory accepts optional parameters.

**Fix:** Accept an optional `Fsrs` instance in the service constructor.

---

### M8. `emptyCardAsInput` uses `difficulty: 0`, `stability: 0`, and `preDue: now`

**Files:** `flashcard-session.service.ts:45-56`  
**Found by:** Agent 2, existing

FSRS-5 suggests difficulty ~5 and stability ~0.4 for new cards. Using 0 may cause incorrect
first-review intervals. Additionally, `preDue: now` is misleading for the audit trail — a
new card has no "pre-due" date; it should be `null`.

**Fix:** Verify against ts-fsrs docs; use `fsrs().emptyCard()` if available.

---

### M9. Duplicated array constants across schema files

**Files:** `schema/flashcard-session.ts:16-22`, `flashcard-session.constant.ts:12-26`  
**Found by:** Agent 1 | **Confidence: ⭐**

Both files define identical `FLASHCARD_SESSION_RATINGS` and `FLASHCARD_SESSION_STATES` arrays.
A future developer adding a rating to one but forgetting the other gets either a migration
failure or silently accepts invalid data.

**Fix:** Import constants from `flashcard-session.constant.ts` into the schema file — single
source of truth.

---

### M10. Redundant indexes

**Files:** `src/lib/server/infras/db/schema/flashcard-session.ts:47,76`  
**Found by:** existing

| Index                                    | Why redundant                                                                                      | Fix    |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- | ------ |
| `flashcard_session_userId_idx`           | Unique `(userId, studySetId)` already has `userId` as leading column — SQLite uses leftmost prefix | Remove |
| `flashcard_session_review_sessionId_idx` | Composite `(sessionId, reviewedAt)` already has `sessionId` as leading column                      | Remove |

---

### M11. `listReviewsByStudySet` has no covering index for ORDER BY + LIMIT

**Files:** `flashcard-session.repository.drizzle.ts:457-458`  
**Found by:** existing

Query joins sessions with reviews, sorts by `reviewedAt DESC`, then limits. SQLite must
find all matching sessions, join all their reviews, sort, then take `limit` rows.

**Fix:** Add index on `flashcard_session_review(reviewedAt)` or restructure with subquery.

---

### M12. `upsertState` is dead code

**Files:** `flashcard-session.repository.ts:68`  
**Found by:** Agent 3, existing

Defined on the repository interface but never called by the service. Only exercised in tests.

**Fix:** Remove from the interface and implementation.

---

### M13. `assertFlashcardBelongsToStudySetOrValidationFailed` returns `void`

**Files:** `flashcard-session.guard.ts:58-68`  
**Found by:** existing

Convention says `assert*` methods return the fetched row so the service can reuse it.
This method discards the row after the check.

**Fix:** Return `Flashcard` from the method, or move to the service (see H7).

---

### M14. SPECS.md entity types are stale (`number` vs `Date`)

**Files:** `SPECS.md:42-65`  
**Found by:** Agent 3, existing

Spec defines `createdAt`/`updatedAt`/`due` as `number`, but Drizzle infers `Date`
(via `mode: "timestamp_ms"`) and Valibot uses `v.date()`.

**Fix:** Update SPECS.md to `Date`.

---

### M15. Testing gaps

**Found by:** Agent 2, Agent 3, existing | **Confidence: ⭐⭐**

| Gap                                                        | Details                                                                      |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------- |
| No test for `deleteExpiredSessions` cross-product bug (C1) | Integration test should verify correct state rows deleted across users       |
| No concurrent `submitReview` race test (C3)                | Service tests mock everything — never exercise the actual race               |
| No partial failure test for `deleteExpiredSessions` (C2)   | No test for crash between state-delete and session-delete                    |
| Missing NOT_FOUND propagation tests                        | `getSession` and `listReviews` NOT_FOUND paths not tested at service level   |
| No `dueIn7Days` service-level test                         | Bucket never asserted in service tests, only at repo level                   |
| UTC midnight boundary not tested                           | `countIntroducedToday` test uses static 24h ago, not the actual UTC midnight |
| Guard test mocks bypass type safety                        | `Pick<Flashcard, "id"                                                        | "studySetId">`with`as unknown as` cast |

---

### M16. `captureError` returns `Promise<unknown>` requiring casts at call sites

**Files:** `flashcard-session.testing.ts:146-155`  
**Found by:** Agent 3 | **Confidence: ⭐**

Test code frequently does:

```ts
const error = await captureError(...);
expect(error).toBeInstanceOf(ORPCError);
```

But `error` is typed `unknown`. A generic would be safer.

**Fix:** Use generic: `export const captureError = async <T>(promise: Promise<T>): Promise<Error | null>`

---

## LOW

| #   | File                           | Issue                                                                                                  | Found by     |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------ |
| L1  | `repository.drizzle.ts:83,112` | Synchronous `.all()` without `await` — works with better-sqlite3 but fragile against driver changes    | existing     |
| L2  | `service.ts:158`               | `getOrCreateSession` wastes `generateId()` on every conflict — harmless                                | existing     |
| L3  | `service.ts:37-41`             | Unnecessary `as Grade` casts on `ratingToGrade` — `Rating.Again` is already the right type             | A3, existing |
| L4  | `service.ts:300-307`           | `adminListSessions` service method has no guard — relies solely on middleware                          | A2           |
| L5  | `service.ts:93`                | `newCardToDbState` `last_review` typed as optional `?` but always provided                             | A3           |
| L6  | `service.ts:110`               | Redundant `new Date()` for `updatedAt` — schema has `$onUpdate(() => new Date())`                      | A2           |
| L7  | `guard.test.ts:21-25`          | Hand-rolled partial mock instead of using `createMockFlashcardRepository()`                            | A3           |
| L8  | `guard.test.ts:2`              | Unused imports or format issues                                                                        | A3           |
| L9  | `testing.ts:146-155`           | `captureError` returns `Promise<unknown>` — use generic                                                | A3           |
| L10 | Multiple files                 | Import style inconsistency — mixed `$lib` alias and relative paths                                     | A3           |
| L11 | `study-set/study-set.guard.ts` | Two identical public methods (`assertVisibleByIdOrNotFound` and `assertStudySetVisibleByIdOrNotFound`) | A2           |
| L12 | `repository.drizzle.ts:338`    | Unnecessary `cast(count(*) as integer)` — SQLite `count(*)` already returns INTEGER                    | existing     |
| L13 | —                              | No user-facing `deleteSession` command — users cannot delete their own sessions                        | existing     |

---

## Summary

| Severity     | Count |
| ------------ | ----- |
| **CRITICAL** | 4     |
| **HIGH**     | 10    |
| **MEDIUM**   | 16    |
| **LOW**      | 13    |

### Top 3 Priorities

1. **C1** 🔴 — `deleteExpiredSessions` cross-product bug. Deletes wrong flashcard_state rows.
   Data corruption. Fix immediately.
2. **C2 + C4** 🔴 — Wrap `deleteExpiredSessions` in a transaction; move `updateSessionTouch`
   inside the review transaction. Data integrity.
3. **H1** 🟠 — FSRS string→numeric enum type mismatch. Likely produces wrong scheduling.
   Verify and fix.
