# FSRS Service Specs

Source specs:

- `docs/superpowers/specs/2026-05-25-fsrs-service-questions.md`
- `docs/superpowers/specs/2026-05-25-fsrs-service-questions-v2.md`
- `docs/superpowers/specs/2026-05-25-fsrs-service-questions-v3.md`
- `docs/superpowers/specs/2026-05-25-fsrs-service-improvement-proposals-after-v3.md`
- `docs/superpowers/specs/2026-05-25-fsrs-service-questions-v4.md`
- `docs/superpowers/specs/2026-05-26-fsrs-service-improvement-proposals-after-spec-review.md`
- `docs/superpowers/specs/2026-05-26-fsrs-service-additional-proposals-after-membership-review.md`

## Domain Boundary

FSRS owns per-user spaced repetition state for flashcards.

FSRS is responsible for:

- per-user flashcard scheduling state
- long-lived review sessions scoped to one user and one StudySet
- grouping review logs and current scheduling state for that user-StudySet pair
- review submission and ts-fsrs state transitions
- review history logging
- due-card dashboard queries
- FSRS rating previews for session cards

FSRS is not responsible for:

- flashcard content storage or validation
- study set visibility storage
- public study set discovery/search
- flashcard creation, updates, or deletion commands
- rendering flashcard UI
- cross-user analytics or owner visibility into other users' progress
- user-facing FSRS parameter tuning for the MVP

Flashcard owns authorable content. FSRS owns per-user learning state, sessions, due dates, previews, and review history. FSRS returns flashcard IDs and scheduling state only; consumers fetch flashcard content from the Flashcard service.

## ID Prefixes

FSRS IDs use the project prefixed ID generator, not raw UUIDs.

```typescript
type ReviewSessionId = `frs_${string}`;
type FlashcardStateId = `fst_${string}`;
type ReviewLogId = `frl_${string}`;
```

Recommended `ID_PREFIX` entries:

- `FSRS_SESSION: 'frs'`
- `FLASHCARD_STATE: 'fst'`
- `REVIEW_LOG: 'frl'`

## Entity: FlashcardState

One `FlashcardState` exists per flashcard per user after the user's first review of that flashcard.

```typescript
type FsrsState = 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING';

interface FlashcardState {
	id: FlashcardStateId;
	userId: UserId;
	flashcardId: FlashcardId;
	state: FsrsState;
	due: number;
	stability: number;
	difficulty: number;
	scheduledDays: number;
	learningSteps: number;
	reps: number;
	lapses: number;
	lastReview?: number;
	fsrsPreset: string;
	createdAt: number;
	updatedAt: number;
}
```

### FlashcardState Field Rules

- `id` is server-generated with the project prefixed ID generator.
- `userId` is inferred from auth context and is never client-provided.
- `flashcardId` references a flashcard visible to the authenticated user through its parent StudySet.
- `(userId, flashcardId)` is unique.
- `state` is stored and returned as uppercase string enum.
- `due`, `lastReview`, `createdAt`, and `updatedAt` are Unix timestamps in milliseconds in service responses.
- Internally, ts-fsrs may use `Date` objects; the service converts at the boundary.
- Persist all non-deprecated fields needed to reconstruct a ts-fsrs card.
- Do not persist deprecated ts-fsrs `elapsed_days` fields.
- `fsrsPreset` defaults to the current global preset, such as `default-v1`.

## Entity: ReviewSession

`ReviewSession` is a long-lived per-user StudySet FSRS container. It is not a per-day session, per-review-run session, or immutable selection snapshot.

One `ReviewSession` exists per user per StudySet after the user starts studying that StudySet through FSRS. It groups that user's review logs and scheduling state for the StudySet until manually deleted.

```typescript
interface ReviewSession {
	id: ReviewSessionId;
	userId: UserId;
	studySetId: StudySetId;
	fsrsPreset: string;
	startedAt: number;
	lastReviewedAt?: number;
	createdAt: number;
	updatedAt: number;
}
```

### ReviewSession Field Rules

- `id` is server-generated with the project prefixed ID generator.
- `userId` is inferred from auth context and is never client-provided.
- `studySetId` references the StudySet being studied.
- Sessions are scoped to one StudySet.
- Exactly one session may exist for a `(userId, studySetId)` pair.
- `fsrsPreset` is the preset used for reviews accepted through this session.
- `startedAt` is the time the long-lived session was first created.
- `startedAt` is metadata only; it does not filter card eligibility.
- `lastReviewedAt` is updated after each successful review.
- Stored card counters are not kept on the session.
- No `status`, `completedAt`, `newCardsRemaining`, `dueCardsRemaining`, aggregate `remainingCards`, `totalCards`, or `currentBatchIndex` is stored.

## Entity: ReviewLog

`ReviewLog` is append-only review history for reviews accepted through a long-lived session.

```typescript
type FsrsRating = 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';

interface ReviewLogStateSnapshot {
	state: FsrsState;
	due: number;
	stability: number;
	difficulty: number;
	learningSteps: number;
	reps: number;
	lapses: number;
	lastReview?: number;
}

interface ReviewLog {
	id: ReviewLogId;
	userId: UserId;
	flashcardId: FlashcardId;
	sessionId: ReviewSessionId;
	rating: FsrsRating;
	previousState: ReviewLogStateSnapshot | null;
	newState: ReviewLogStateSnapshot;
	reviewedAt: number;
	fsrsPreset: string;
	createdAt: number;
}
```

### ReviewLog Field Rules

- `id` is server-generated with the project prefixed ID generator.
- `userId` is inferred from auth context and is never client-provided.
- `sessionId` references the session that accepted the review.
- `flashcardId` references the reviewed flashcard.
- `rating` is stored and returned as uppercase string enum.
- `previousState` and `newState` are JSON snapshots.
- `previousState` is `null` when no persisted `FlashcardState` existed before the review.
- `previousState` and `newState` do not include deprecated `elapsed_days` fields.
- `previousState` and `newState` do not need to include `scheduledDays`.
- `reviewedAt` and `createdAt` are Unix timestamps in milliseconds in service responses.
- `fsrsPreset` is copied from the session at review time.
- Review logs are append-only during normal review operation. They are not updated or overwritten.
- Repeated reviews for the same `(sessionId, flashcardId)` are allowed.
- No idempotency key is required for the MVP.
- Without idempotency keys, each accepted `ReviewFlashcard` call is a real review event and may advance FSRS state; clients must prevent accidental double submission.

## Service Response Types

### FsrsCardState

Public service responses use a UI-focused card-state shape.

```typescript
interface FsrsCardState {
	state: FsrsState;
	due: number | null;
	reps: number;
	lapses: number;
	lastReview?: number;
}
```

- `due` is `null` for a never-reviewed card previewed from ts-fsrs's empty card state when applicable.
- `stability`, `difficulty`, `scheduledDays`, and `learningSteps` are persisted but not returned in public service response state.

### ReviewSessionProgress

Session progress is computed live from current StudySet flashcards and `FlashcardState` rows.

```typescript
interface ReviewSessionProgress {
	newCardsCount: number;
	dueCardsCount: number;
	isComplete: boolean;
}

interface ReviewSessionWithProgress {
	session: ReviewSession;
	progress: ReviewSessionProgress;
}
```

- `newCardsCount` is the count of current StudySet flashcards with no `FlashcardState` for the user.
- `dueCardsCount` is the count of current StudySet flashcards with `FlashcardState.due <= now` for the user.
- `isComplete` is true when both `newCardsCount` and `dueCardsCount` are `0` at query time.
- `isComplete` is derived, not terminal. It may become false later if flashcards are added or existing cards become due again.

### SessionCard

```typescript
interface SessionCard {
	flashcardId: FlashcardId;
	kind: 'NEW' | 'DUE';
	state: FsrsCardState;
	previewState: Record<FsrsRating, FsrsCardState>;
}
```

- `kind` explains why the card is included in the current live worklist.
- `NEW` means the user has no `FlashcardState` for the flashcard.
- `DUE` means the user has a `FlashcardState` and `due <= now` at query time.
- FSRS does not return `front`, `back`, `hint`, `chapterId`, or other flashcard content in `SessionCard`.
- Consumers fetch flashcard content from the Flashcard service.

## Authorization

- All FSRS commands and queries require authentication.
- FSRS access follows the parent StudySet's current visibility rules.
- Private StudySets are accessible only to the owner.
- Public StudySets are accessible to authenticated users by direct access.
- Public StudySets are not globally listed merely because they are public.
- FSRS state is private per user.
- There is no cross-user visibility of card states, sessions, or review logs.
- StudySet owners cannot view other users' FSRS progress through this service.
- If a public StudySet becomes private after a non-owner starts a session, that user's FSRS rows remain stored, but commands and queries are blocked unless access is restored.

## Live Worklist Rules

A session uses the StudySet's current flashcards and the user's current `FlashcardState` rows. There is no session-card membership snapshot and no `startedAt` eligibility boundary.

New cards in a session are current flashcards that:

- belong to the session's StudySet
- have no `FlashcardState` for the authenticated user

Due cards in a session are current flashcards that:

- belong to the session's StudySet
- have a `FlashcardState` for the authenticated user
- have `due <= now` using server time at query or command execution

Cards created after the session was created can appear as `NEW` in the same long-lived session. Cards that become due after the session was created can appear as `DUE` in the same long-lived session.

`GetSessionCards` returns only the current live worklist. It does not return previously reviewed cards that are not currently due. If history or summaries are needed, add a separate review-log query later.

`ReviewFlashcard` may accept multiple reviews for the same flashcard through the same session over time, as long as the flashcard is currently reviewable when the command runs.

## Commands

### StartSession

```typescript
interface StartSessionCommand {
	studySetId: StudySetId;
}
```

- Gets or creates the long-lived session for the authenticated user and StudySet.
- Requires current access to the StudySet.
- If a session already exists for `(userId, studySetId)`, returns that session.
- If no session exists, creates a new session with the current global `fsrsPreset`.
- Sets `startedAt` and `createdAt` to the current server time for a newly created session.
- Does not store new-card or due-card counters.
- Returns `{ success: true, data: { session, progress } }`.
- Does not return cards. Use `GetSessionCards` after starting a session.

### DeleteSession

```typescript
interface DeleteSessionCommand {
	sessionId: ReviewSessionId;
}
```

- Manually deletes one long-lived session for the authenticated user.
- Requires the session to belong to the authenticated user.
- Requires current access to the StudySet.
- Deletes `ReviewLog` rows for the session.
- Deletes `FlashcardState` rows for the authenticated user and current flashcards in the session's StudySet, resetting that user's FSRS progress for the StudySet.
- Returns `{ success: true }`.

### ReviewFlashcard

```typescript
interface ReviewFlashcardCommand {
	sessionId: ReviewSessionId;
	flashcardId: FlashcardId;
	rating: FsrsRating;
}
```

- Reviews one flashcard through one long-lived session.
- Requires current access to the session's StudySet.
- Requires the session to belong to the authenticated user.
- Requires the flashcard to belong to the session's StudySet.
- Requires the flashcard to be currently reviewable: `NEW` or `due <= now`.
- Repeated reviews for the same `(sessionId, flashcardId)` are allowed when the card is currently reviewable again.
- Does not accept client-provided `reviewedAt`.
- Does not accept an idempotency key for the MVP.
- Loads the current `FlashcardState`, or creates an in-memory empty ts-fsrs card when the user has never reviewed the flashcard.
- Uses ts-fsrs to apply the rating and compute the next state.
- Upserts `FlashcardState` for `(userId, flashcardId)`.
- Inserts one append-only `ReviewLog`.
- Updates `lastReviewedAt` and `updatedAt` on the session to the current server time.
- Returns `{ success: true, data: { flashcardId, state, session, progress } }`.

The returned `state` uses the public `FsrsCardState` shape. It does not include `scheduledDays` or `nextDueDate` aliases.

All writes in `ReviewFlashcard` must be atomic. `FlashcardState`, `ReviewLog`, and `ReviewSession` updates must either all persist or all fail.

## Queries

### GetSession

```typescript
interface GetSessionQuery {
	sessionId: ReviewSessionId;
}
```

- Fetches one session owned by the authenticated user.
- Requires current access to the session's StudySet.
- Computes progress live from current flashcards and `FlashcardState` rows.
- Returns `{ success: true, data: { session, progress } }`.

### GetSessions

```typescript
interface GetSessionsQuery {
	isComplete?: boolean;
}
```

- Returns sessions owned by the authenticated user.
- Returns only sessions whose StudySets are currently accessible to the authenticated user.
- Computes progress live for each returned session.
- When `isComplete` is provided, filters by the derived progress value.
- Ordered by `lastReviewedAt` descending, falling back to `startedAt` descending.
- Returns `{ success: true, data: Array<{ studySet: StudySet; session: ReviewSession; progress: ReviewSessionProgress }> }`.

### GetSessionCards

```typescript
interface GetSessionCardsQuery {
	sessionId: ReviewSessionId;
}
```

- Returns the current live worklist for the session.
- Requires the session to belong to the authenticated user.
- Requires current access to the session's StudySet.
- Does not paginate.
- Has no hard maximum result size for the MVP.
- Returns `NEW` cards before `DUE` cards.
- Orders `NEW` cards by flashcard creation date ascending.
- Orders `DUE` cards by due date ascending.
- Does not return flashcard content.
- Includes `previewState` for each rating.
- Returns `{ success: true, data: SessionCard[] }`.

### GetStudySetsWithDueCards

```typescript
interface GetStudySetsWithDueCardsQuery {}
```

- Returns up to 10 StudySets with due cards for the authenticated user.
- A due card is a current StudySet flashcard with a `FlashcardState` for the user where `due <= now`.
- Never-reviewed cards are excluded.
- Includes only StudySets currently accessible to the authenticated user.
- Includes only entries with at least one due card.
- Includes only StudySets where the authenticated user has an FSRS session.
- Ordered by `session.lastReviewedAt` descending first, then due card count descending.
- If `session.lastReviewedAt` is absent, falls back to `session.startedAt`.
- Returns `{ success: true, data: Array<{ studySet: StudySet; session: ReviewSession; dueCardsCount: number }> }`.

## FSRS Scheduling Rules

- Use ts-fsrs for scheduling.
- Rating labels map to ts-fsrs ratings as follows: `AGAIN`, `HARD`, `GOOD`, `EASY`.
- UI labels may render these as Lupa, Sulit, Cukup, and Mudah.
- Interval values are generated by ts-fsrs, not hardcoded in Flashcard specs.
- For never-reviewed cards, create an in-memory empty ts-fsrs card for preview/review.
- Persist the next card state after review in `FlashcardState`.
- Generate `previewState` using the current card state and server time.
- Use the session's `fsrsPreset` for reviews accepted through that session.
- Per-user FSRS parameter tuning is deferred.

## Persistence

- Use standard Drizzle schema definitions backed by D1.
- Tables: `flashcard_state`, `review_session`, and `review_log`.
- Use `integer(..., { mode: 'timestamp_ms' })` for persisted Date fields.
- Use `real` for `stability` and `difficulty`.
- Use `integer` for counters and enum-independent numeric fields.
- Use `text(..., { enum })` for uppercase state and rating values.
- Use `text(..., { mode: 'json' })` for review-log snapshots.
- `flashcard_state.userId` references `user.id`.
- `flashcard_state.flashcardId` references `flashcard.id` with cascade delete.
- `review_session.userId` references `user.id`.
- `review_session.studySetId` references `study_set.id` with cascade delete.
- `review_log.userId` references `user.id`.
- `review_log.flashcardId` references `flashcard.id` with cascade delete.
- `review_log.sessionId` references `review_session.id` with cascade delete.
- Review logs are append-only during normal review operation, but are deleted by parent cascade or `DeleteSession` cleanup.
- Unique constraint on `flashcard_state(userId, flashcardId)`.
- Unique constraint on `review_session(userId, studySetId)`.
- No unique constraint on `review_log(sessionId, flashcardId)` because repeated reviews are allowed.
- Index `flashcard_state(userId, due)` for due-card queries.
- Index `flashcard_state(flashcardId)` for cascade and lookup.
- Index `review_session(userId, studySetId)` for start/resume flows.
- Index `review_session(userId, lastReviewedAt)` for session listing.
- Index `review_log(sessionId, flashcardId, reviewedAt)` and `review_log(userId, flashcardId, reviewedAt)` for validation and history lookup.

## Validation

- Use Valibot schemas with `import * as v from 'valibot'`.
- Use `prefixedIdValidator(...)` for FSRS IDs.
- Use `v.picklist` for FSRS state and rating enums.
- Use server time for `reviewedAt` and due eligibility; clients cannot provide review timestamps.
- Convert internal `Date` values to Unix timestamps in milliseconds at service response boundaries.
- Unknown fields are ignored by request payload schemas unless the existing command pattern changes.

## Errors

- `VALIDATION_FAILED`: invalid ID, rating, state, request payload, or delete request.
- `UNAUTHORIZED`: missing authenticated user.
- `FORBIDDEN`: authenticated user cannot access the StudySet, session, or flashcard.
- `NOT_FOUND`: session, StudySet, or flashcard does not exist or is not visible to the user.
- `CARD_NOT_IN_SESSION`: flashcard does not belong to the session's StudySet.
- `CARD_NOT_REVIEWABLE`: flashcard belongs to the session's StudySet but is neither `NEW` nor due at server time.
- `FSRS_STATE_CONFLICT`: persisted FSRS state cannot be reconstructed or conflicts with expected invariants.

## Testing

- Test `StartSession` creates a session and returns an existing session for the same `(userId, studySetId)`.
- Test `StartSession` enforces current StudySet access.
- Test one session per `(userId, studySetId)` with a database-level unique constraint.
- Test `GetSession` and `GetSessions` compute live `newCardsCount`, `dueCardsCount`, and `isComplete`.
- Test `GetSessionCards` returns `NEW` and `DUE` cards from the live worklist.
- Test `GetSessionCards` excludes reviewed cards that are not currently due.
- Test `ReviewFlashcard` creates the first `FlashcardState` for a new card.
- Test `ReviewFlashcard` accepts repeated reviews for the same flashcard after it becomes due again.
- Test `ReviewFlashcard` rejects a flashcard from another StudySet.
- Test `ReviewFlashcard` rejects a reviewed flashcard that is not currently due.
- Test `ReviewFlashcard` writes `FlashcardState`, `ReviewLog`, and session `lastReviewedAt` atomically.
- Test `DeleteSession` deletes the session, review logs, and StudySet-scoped FSRS states for the authenticated user.
- Test public-to-private StudySet visibility changes block existing FSRS commands and queries.
- Test `GetStudySetsWithDueCards` excludes never-reviewed cards and includes only currently accessible StudySets with sessions.
- Test preview generation for all four ratings.

## Deferred Or Out Of Scope

- Batch review is not supported.
- Idempotency keys are not supported for MVP.
- Client-provided review timestamps are not supported.
- Offline review sync is not supported.
- `GetFlashcardState(flashcardId)` is not supported.
- Pagination for `GetSessionCards` is not supported.
- Returning flashcard content from FSRS queries is not supported.
- Cross-user progress analytics are not supported.
- StudySet owner analytics for other users are not supported.
- User-facing FSRS parameter tuning is deferred.
- Replaying review logs to reschedule old cards is deferred.
