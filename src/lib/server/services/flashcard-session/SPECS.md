# Flashcard Session Service Specs

## Domain Boundary

Flashcard Session tracks a user's spaced-repetition review progress against a study set using FSRS (Free Spaced Repetition Scheduler). Sessions are persistent per-(user, studySet) envelopes — they never "complete" or terminate. Content is always live-queried from the flashcard table; there is no frozen snapshot.

Flashcard Session is responsible for:

- idempotent get-or-create session per (user, studySet) pair
- submitting a review rating (Again/Hard/Good/Easy) against a flashcard, computing the next FSRS state, and storing the pre-review Card snapshot for algorithm replay
- returning the review queue (overdue → due-today → new) and a 7-day due-in-future forecast
- listing reviews (history) for a study set
- listing the user's own sessions
- admin listing of sessions filtered by userId and/or studySetId
- admin cleanup of sessions and reviews past 90-day TTL

Flashcard Session is not responsible for:

- flashcard creation, updates, or content management (delegated to flashcard domain)
- study set lifecycle management
- generating flashcard content
- multi-user session sharing (each session is personal to the user)
- anonymous review (sessions require authentication)
- quiz/quiz-session functionality (separate domain)

## Architecture Decisions

1. **FlashcardSessionService** depends on `FlashcardSessionRepository` and `FlashcardSessionGuard`.
2. **FlashcardSessionGuard** handles all validation — auth/visibility (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`) plus business validation (`VALIDATION_FAILED`). Guard depends on `FlashcardSessionRepository`, `StudySetGuard`, and `FlashcardRepository`.
3. **FlashcardSessionDrizzleRepository** takes only a DB instance. Repository touches `flashcard_session`, `flashcard_session_review`, `flashcard_state`, and `flashcard` tables. Bucket classification (overdue/due-today/new) happens in the repo via a single joined query.
4. **Daily new-card limit**: new cards are capped at `newCardsPerDay` (default 20, max 100). The count is derived from `flashcard_state.introduced_at` set on first review, with a UTC-midnight day boundary.
5. **Due-in-7-days forecast**: cards due within `now+24h < due <= now+7d` are aggregated as per-day counts (7 entries, zero-filled) instead of fetching all future card content.
6. **Atomic submitReview** — `insertReview` and `upsertState` run inside a single `dbInstance.transaction(...)`. `updateSessionTouch` runs after the transaction commits (touching the session timestamp is non-critical and stays outside the unit-of-work).
7. **No snapshot** — flashcards are always live-queried. Edits are reflected immediately on the next `getReviewQueue` call.
8. **FSRS state on `flashcard_state` table** — per-(userId, flashcardId) composite PK. Survives session boundaries.
9. **Review row stores pre-review Card snapshot** — exposed via `flashcardSessionReviewSchema` (nine pre-snapshot fields) so clients can render state transitions and future FSRS weight tuning can replay reviews.
10. **Last-write-wins for flashcard_state** — concurrent submits both store their review; later `upsertState` overwrites.

## Entities

```typescript
interface FlashcardSession {
  id: string;
  userId: string;
  studySetId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FlashcardCardState {
  userId: string; // composite PK
  flashcardId: string; // composite PK
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: "New" | "Learning" | "Review" | "Relearning";
  lastReview: Date | null;
  learningSteps: number;
  introducedAt: Date | null; // set on first review, NULL meaning "introduced before tracking"
  updatedAt: Date;
}
```

## Review Queue Bucketing

Bucketing is performed in the repository via a single LEFT JOIN query (flashcard ← flashcard_state):

1. **Overdue**: State exists, `state !== "New"`, `due < now`
2. **Due-today**: State exists, `state !== "New"`, `now <= due <= now + 24h`
3. **New**: No state or state is "New". Capped at `newCardsPerDay` minus cards introduced today. `newLimitReached: true` signals unseen cards exist.
4. **Due-in-7-days**: `Array<{ date: string; count: number }>` with 7 zero-filled entries. Cards beyond 7 days are dropped.

Sorted: overdue/due-today by `due ASC`, new by `flashcard.createdAt ASC`.

## Daily New-Card Limit

- `flashcard_state.introduced_at` is set once on first `upsertState`, preserved unchanged on subsequent reviews.
- Day boundary is UTC midnight. Count: `COUNT(*) WHERE introduced_at >= utc_midnight AND userId = ? AND studySetId = ?` (joined through flashcard).
- Cap is soft — only counts reviewed cards. Unreviewed slots free up on next queue refresh.
- `newLimitReached: boolean` on `BucketedQueue` signals whether unreviewed cards were excluded.

## Visibility and Authorization

- All commands require authentication.
- Session creation: any authenticated user who can see the study set can get-or-create a session.
- Session view/mutation: only the session owner. Non-owners get `NOT_FOUND`.
- `listSessions` returns only sessions owned by the authenticated user.
- Admin `listSessions` returns sessions for any user, optionally filtered.

## Router Structure

```
flashcardSessionRouter
  session:
    get          ← GetFlashcardSession
    getOrCreate  ← GetOrCreateFlashcardSession
    list         ← ListSessions (user)
  review:
    submit       ← SubmitReview
    list         ← ListReviews
  queue:
    get          ← GetReviewQueue
  admin:
    listSessions ← AdminListSessions
    deleteExpired ← DeleteExpired
```

## Persistence

- FK cascades:
  - `flashcard_session.userId` → `user.id`: `ON DELETE CASCADE`
  - `flashcard_session.studySetId` → `study_set.id`: `ON DELETE CASCADE`
  - `flashcard_session_review.sessionId` → `flashcard_session.id`: `ON DELETE CASCADE`
  - `flashcard_session_review.flashcardId` → `flashcard.id`: `ON DELETE CASCADE`
  - `flashcard_state.userId` → `user.id`: `ON DELETE CASCADE`
  - `flashcard_state.flashcardId` → `flashcard.id`: `ON DELETE CASCADE`
- Unique constraints:
  - `flashcard_session(userId, studySetId)`
  - `flashcard_state(userId, flashcardId)` — composite PK

## Repository Interface

```typescript
interface FlashcardSessionRepository {
  findSessionById(id: string): Promise<FlashcardSession | null>;
  findSessionByUserAndStudySet(
    userId: string,
    studySetId: string
  ): Promise<FlashcardSession | null>;
  listSessionsForUser(userId: string): Promise<FlashcardSession[]>;
  listSessionsForAdmin(params: {
    userId?: string;
    studySetId?: string;
  }): Promise<FlashcardSession[]>;

  getOrCreateSession(row): Promise<FlashcardSession>;
  updateSessionTouch(
    id: string,
    userId: string
  ): Promise<FlashcardSession | null>;
  deleteExpiredSessions(beforeTimestamp: number): Promise<number>;

  findFlashcardsForQueue(params: {
    userId: string;
    studySetId: string;
    now: number;
    horizonMs: number;
    dueIn7DaysMs: number;
  }): Promise<{
    overdue: QueueFlashcardWithState[];
    dueToday: QueueFlashcardWithState[];
    new: QueueFlashcardWithState[];
    dueIn7Days: DueIn7DaysItem[];
  }>;

  countIntroducedToday(
    userId: string,
    studySetId: string,
    since: Date
  ): Promise<number>;

  findStateByKey(
    userId: string,
    flashcardId: string
  ): Promise<FlashcardCardState | null>;
  upsertState(row: FlashcardCardState): Promise<FlashcardCardState>;
  listReviewsByStudySet(params: {
    studySetId: string;
    userId: string;
    limit: number;
  }): Promise<FlashcardSessionReview[]>;
  insertReviewWithState(params: {
    review: Omit<FlashcardSessionReview, "id">;
    state: FlashcardCardState;
  }): Promise<{
    review: FlashcardSessionReview;
    state: FlashcardCardState;
  }>;
}
```

## Service-to-Repo Mapping

| Service method       | Repo calls                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `getOrCreateSession` | `getOrCreateSession` (atomic `INSERT … ON CONFLICT DO NOTHING` + re-SELECT)                      |
| `submitReview`       | `findStateByKey` → (FSRS compute) → `insertReviewWithState` (transaction) → `updateSessionTouch` |
| `getSession`         | `findSessionById` (after guard owner check)                                                      |
| `getReviewQueue`     | `findFlashcardsForQueue` + `countIntroducedToday` (daily cap)                                    |
| `listReviews`        | `listReviewsByStudySet`                                                                          |
| `listSessions`       | `listSessionsForUser`                                                                            |
| `adminListSessions`  | `listSessionsForAdmin`                                                                           |
| `adminDeleteExpired` | `deleteExpiredSessions`                                                                          |

## Constants

| Constant                                      | Value                                           |
| --------------------------------------------- | ----------------------------------------------- |
| `FLASHCARD_SESSION_TTL_MS`                    | `7_776_000_000` (90 days)                       |
| `FLASHCARD_SESSION_REVIEW_HORIZON_MS`         | `86_400_000` (24h)                              |
| `FLASHCARD_SESSION_DUE_IN_7_DAYS_MS`          | `604_800_000` (7 days)                          |
| `FLASHCARD_SESSION_NEW_CARDS_PER_DAY_DEFAULT` | `20`                                            |
| `FLASHCARD_SESSION_NEW_CARDS_PER_DAY_MAX`     | `100`                                           |
| `FLASHCARD_SESSION_BUCKETS`                   | `["overdue","due-today","new","due-in-7-days"]` |

## Errors

- `UNAUTHORIZED`: missing authenticated user.
- `NOT_FOUND`: session, study set, flashcard not found or not visible.
- `VALIDATION_FAILED`: invalid input, flashcard does not belong to session's study set.

> **Note on visibility:** `FORBIDDEN` is intentionally not raised. Visibility failures on study sets collapse to `NOT_FOUND` so the API does not leak the existence of a study set the caller cannot see. Once a session exists, the session owner may continue submitting reviews against the session even if the underlying study set is later soft-deleted.
