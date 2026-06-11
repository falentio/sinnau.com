# Quiz Session Service Specs

Source specs:

- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-specs.md`
- `src/lib/server/services/quiz/SPECS.md`
- `src/lib/server/services/quiz-session/SPECS_QUESTIONS.md`
- `src/lib/server/services/quiz-session/SPECS_QUESTIONS_FOLLOWUP.md`
- `src/lib/server/services/quiz-session/SPECS_QUESTIONS_CRITIQUE.md`
- `src/lib/server/services/quiz-session/SPECS_QUESTIONS_CRITIQUE2.md`
- `src/lib/server/services/quiz-session/SPECS_REGRESSIONS.md`
- `src/lib/server/services/quiz-session/SPECS_REGRESSIONS_FINAL.md`

## Domain Boundary

Quiz Session tracks a user's attempt at answering quizzes scoped by a filter (`studySetId` + optional `chapterId`). It records per-quiz answers, computes a score on completion, and provides results with incorrect questions and failing chapter analysis.

Quiz Session is responsible for:

- session creation with studySet/chapter filters
- answer submission (upsert per quiz within a session, cross-device sync)
- answer validation (option IDs must belong to the quiz, quiz must be in scope)
- session completion with immutable sealed results
- live-scored `getResults` on ACTIVE sessions and stored-snapshot `getResults` on COMPLETED sessions
- returning incorrect questions with full options for review
- failing chapter analysis (top 3 by incorrect count) for studySet-scoped sessions
- listing user sessions scoped by studySet
- admin deletion of expired sessions (90-day TTL) including orphaned answer cleanup

Quiz Session is not responsible for:

- quiz creation, updates, or option management (delegated to quiz domain)
- generating quiz content or selecting questions (dynamic resolution queries the quiz repository)
- studySet or chapter lifecycle management
- spaced repetition scheduling
- multi-user session sharing (each session is personal to its creator)
- anonymous/public quiz-taking (sessions require authentication)

## Entities

```typescript
type QuizSessionStatus = "ACTIVE" | "COMPLETED";

interface QuizSession {
  id: string;
  userId: string;
  studySetId: string;
  chapterId: string | null;
  status: QuizSessionStatus;
  quizCount: number;
  score: number | null;
  totalQuestions: number | null;
  correctCount: number | null;
  incorrectQuizIds: string[] | null;
  failingChapterIds: string[] | null;
  lastQuestionText: string | null;
  lastAnsweredAt: number | null;
  createdAt: number;
  completedAt: number | null;
  updatedAt: number;
}

interface QuizSessionAnswer {
  id: string;
  sessionId: string;
  quizId: string | null;
  selectedOptionIds: string[];
  createdAt: number;
  updatedAt: number;
}
```

## QuizSession Field Rules

- `id` is server-generated with `generateId("qse")`; clients never provide IDs.
- `userId` is inferred from auth context and is never client-provided.
- `studySetId` is required and must reference a StudySet visible to the authenticated user.
- `chapterId` is optional; when provided must reference a Chapter that belongs to the given `studySetId`.
- `status` is `"ACTIVE"` on creation, transitions to `"COMPLETED"` on completion. Immutable after COMPLETED.
- `quizCount` is populated at creation as a point-in-time snapshot of quizzes in scope.
- `score` is `null` until completion, then set to `Math.round(correctCount / totalQuestions * 100)` (integer 0–100).
- `totalQuestions` is `null` until completion, then set to the number of quizzes in scope at completion time.
- `correctCount` is `null` until completion.
- `incorrectQuizIds` is `null` until completion, then set to an array of quiz IDs that were answered incorrectly or unanswered.
- `failingChapterIds` is `null` until completion, then set to the top 3 chapter IDs with the most incorrect answers (empty `[]` when session has a `chapterId` filter, empty if only unassigned quizzes).
- `lastQuestionText` is a denormalized copy of the most recently answered quiz's `questionText`. Set on each `submitAnswer`.
- `lastAnsweredAt` is a Unix timestamp in milliseconds set on each `submitAnswer`.
- `createdAt`, `completedAt`, and `updatedAt` are Unix timestamps in milliseconds.
- `completedAt` is set on completion.
- Unknown fields are ignored for all QuizSession and QuizSessionAnswer request payloads.

## QuizSessionAnswer Field Rules

- `id` is server-generated with `generateId("qsa")`; clients never provide IDs.
- `sessionId` is required and must reference an existing QuizSession owned by the authenticated user.
- `quizId` is required on submission; may become `null` if the referenced quiz is deleted (FK `ON DELETE SET NULL`).
- `selectedOptionIds` is an array of quiz option IDs. Empty array (`[]`) means the user submitted without selecting anything — treated as incorrect.
- `(sessionId, quizId)` has a unique constraint — a user can only have one answer per quiz per session. Re-submissions upsert (overwrite) the existing answer.
- `createdAt` and `updatedAt` are Unix timestamps in milliseconds.

## Question Set Resolution (Dynamic)

The set of quizzes for a session is resolved dynamically on each call — not frozen at creation time.

- Quizzes added to the scope after session creation appear in `getQuestions`.
- Quizzes deleted from the scope disappear from `getQuestions`. Their answer rows get `quizId = NULL` (FK SET NULL).
- `getQuestions` sorts quizzes by `id` ascending (deterministic), then shuffles using `Rng(sessionId)` as seed. Same seed → same order across devices and calls.
- Orphaned answers (`quizId IS NULL`) are skipped during live scoring and do not count toward any total.

## Scoring

- **Correct**: For MULTIPLE_CHOICE and FILL_IN_THE_BLANK, the single correct option ID matches exactly. For MULTIPLE_SELECT, the set of selected option IDs matches the set of correct option IDs exactly (no missing, no extra).
- **Incorrect**: Any answer that does not match the correct set, including empty `[]` submissions.
- **Unanswered**: Quizzes in scope with no `quiz_session_answer` row. Counted as incorrect in scoring, shown with `selectedOptionIds: null`.
- **Empty session completion**: If zero answers exist, score = 0, totalQuestions = quizzes in scope, correctCount = 0.
- **Score formula**: `Math.round(correctCount / totalQuestions * 100)`.

## Failing Chapter Analysis

Only computed for sessions without a `chapterId` filter:

1. Collect all incorrect quiz IDs.
2. Look up each quiz's `chapterId`.
3. Group by `chapterId`, count incorrects per chapter.
4. Sort descending by count, take top 3.
5. Exclude `null` chapterId (unassigned quizzes).

For chapter-filtered sessions, `failingChapterIds` is always `[]`.

## Completion

`complete` transitions the session from ACTIVE to COMPLETED. Calling `complete` on an already-COMPLETED session is idempotent (returns current state, no error).

On completion, the service:

1. Fetches all answers for the session.
2. Fetches all quizzes in scope (current scope at completion time).
3. Scores each answer against the correct options.
4. Computes failing chapter analysis (if applicable).
5. Writes `score`, `totalQuestions`, `correctCount`, `incorrectQuizIds`, `failingChapterIds`, `completedAt` to the session row.
6. Sets `status = COMPLETED`.

After completion:

- `submitAnswer` rejects with `SESSION_ALREADY_COMPLETED`.
- `getResults` on COMPLETED returns the stored snapshot (immutable).

## Visibility And Authorization

- All QuizSession and QuizSessionAnswer commands require authentication.
- Session creation: any authenticated user who can see the studySet (via `studySetGuard.assertStudySetVisibleByIdOrNotFound`) can create a session. The studySet does not need to be owned by the user.
- Session view/mutation: only the session owner (`userId`) can view, submit answers to, complete, or get results for a session. Other users (including the studySet owner) receive `NOT_FOUND`.
- `listSessions` is scoped to a `studySetId` and returns only sessions owned by the authenticated user.
- Quiz answers inherit visibility through the session: the session owner can see all their own answers.
- Non-owner access attempts return `NOT_FOUND` to prevent leaking existence.
- Multiple concurrent ACTIVE sessions on the same scope are allowed (no uniqueness constraint).

## QuizSession Commands

### CreateQuizSession

```typescript
interface CreateQuizSessionCommand {
  studySetId: string;
  chapterId?: string;
}
```

- Creates a quiz session with the given filter.
- Required: `studySetId` must be visible to the authenticated user.
- When `chapterId` is provided: validates the chapter belongs to `studySetId`. Rejects with `VALIDATION_FAILED` if mismatched.
- `quizCount` is computed at creation time by counting quizzes matching the filter.
- Returns `QuizSession` with embedded `quizCount`.

### SubmitAnswer

```typescript
interface SubmitAnswerCommand {
  sessionId: string;
  quizId: string;
  selectedOptionIds: string[];
}
```

- Upserts an answer for the given quiz within the session.
- Validates the quiz belongs in the session's scope (`studySetId` match, and if session has `chapterId`, the quiz's `chapterId` must match). Rejects with `VALIDATION_FAILED` if outside scope.
- Validates all `selectedOptionIds` reference options belonging to the quiz. Rejects with `VALIDATION_FAILED` if any ID is invalid.
- Rejects with `SESSION_ALREADY_COMPLETED` if the session is COMPLETED.
- On success, also updates `lastAnsweredAt` and `lastQuestionText` on the session row (two writes: answer upsert + session update).
- Last-write-wins: re-submissions overwrite previous answers (cross-device sync).
- Empty `selectedOptionIds` (`[]`) is a valid submission treated as incorrect.
- Returns `QuizSessionAnswer`.

### CompleteQuizSession

```typescript
interface CompleteQuizSessionCommand {
  sessionId: string;
}
```

- Transitions session from ACTIVE to COMPLETED and snapshots results.
- Idempotent: calling on an already-COMPLETED session returns the stored results without error.
- Computes score, totalQuestions, correctCount, incorrectQuizIds, failingChapterIds.
- Writes results columns to the session row.
- Returns `QuizSession` with populated results.

### AdminDeleteExpiredSessions

```typescript
interface AdminDeleteExpiredSessionsCommand {
  // no input — deletes all sessions past TTL
}
```

- Deletes all sessions where `createdAt < Date.now() - QUIZ_SESSION_TTL_MS` (90 days).
- Cascade-deletes all associated answer rows.
- Also deletes orphaned answer rows where `quizId IS NULL` (cleanup from quiz deletions).
- Admin-only procedure.
- Returns `{ deletedCount: number }`.

## Queries

### GetQuizSession

```typescript
interface GetQuizSessionQuery {
  sessionId: string;
}
```

- Returns the session if the authenticated user is the session owner.
- Returns `NOT_FOUND` for non-owners or non-existent sessions.

### GetQuizSessionQuestions

```typescript
interface GetQuizSessionQuestionsQuery {
  sessionId: string;
}
```

- Resolves quizzes in scope dynamically (current state of the quiz table).
- Sorts quizzes by `id` ascending, then shuffles using `Rng(sessionId)`.
- Returns full `QuizWithOptions` (including `isCorrect` on options) plus `currentAnswer: string[] | null` per quiz.
- `currentAnswer` is `null` if no answer has been submitted for that quiz; `[]` if an empty submission exists; the stored `selectedOptionIds` otherwise.
- Empty scope returns `[]`.
- No pagination (v1: all quizzes returned).

### GetQuizSessionResults

```typescript
interface GetQuizSessionResultsQuery {
  sessionId: string;
}
```

- On ACTIVE sessions: computes live score from current answers and current scope. Returns `totalQuestions` = current scope count, unanswered quizzes shown as incorrect with `selectedOptionIds: null`.
- On COMPLETED sessions: returns the stored immutable snapshot.
- Returns `{ score, totalQuestions, correctCount, incorrectQuestions: QuizWithOptions & { selectedOptionIds: string[] | null }[], failingChapterIds: string[] }`.
- `incorrectQuestions` includes full quiz data with options (`isCorrect` included) so the client can render a review UI in one round-trip.

### ListQuizSessions

```typescript
interface ListQuizSessionsQuery {
  studySetId: string;
}
```

- Returns all sessions owned by the authenticated user for the given studySet.
- Sorted by `createdAt` descending.
- Response includes `id`, `status`, `score`, `totalQuestions`, `lastQuestionText`, `lastAnsweredAt`, `quizCount`, `createdAt`, `completedAt`.
- StudySet-scoped only for v1 (no global list across all studySets).
- No pagination in v1.

## Persistence

- Use standard Drizzle schema definitions.
- Store `status` as an uppercase string and validate allowed values in TypeScript/Valibot.
- Store `incorrectQuizIds` and `failingChapterIds` as JSON text columns.
- Quiz FK on `quiz_session_answer`: `ON DELETE SET NULL`.
- Session FK on `quiz_session_answer`: `ON DELETE CASCADE`.
- User FK on `quiz_session`: `ON DELETE CASCADE`.
- Chapter FK on `quiz_session`: `ON DELETE SET NULL`.
- StudySet FK on `quiz_session`: `ON DELETE CASCADE`.
- Index `userId`, `studySetId`, `status`, `createdAt` on `quiz_session`.
- Index `sessionId` on `quiz_session_answer`.
- Unique constraint on `quiz_session_answer(sessionId, quizId)`.

## Errors

- `UNAUTHORIZED`: missing authenticated user.
- `FORBIDDEN`: authenticated user cannot view the studySet for session creation.
- `NOT_FOUND`: session, studySet, chapter, or quiz not found or not visible to the user.
- `VALIDATION_FAILED`: invalid input payload, chapter does not belong to studySet, quiz not in session scope, option IDs do not belong to the quiz.
- `SESSION_ALREADY_COMPLETED`: attempt to submit an answer to a completed session.

## ID Prefixes

- QuizSession: `qse_` (generated via `generateId("qse")`)
- QuizSessionAnswer: `qsa_` (generated via `generateId("qsa")`)
- Validated via `createPrefixedIdSchema("qse")` / `createPrefixedIdSchema("qsa")` in schemas.

## Constants

| Constant                            | Value                              | Description                      |
| ----------------------------------- | ---------------------------------- | -------------------------------- |
| `QUIZ_SESSION_TTL_MS`               | `7776000000`                       | 90 days in milliseconds          |
| `QUIZ_SESSION_STATUSES`             | `["ACTIVE", "COMPLETED"] as const` | Allowed status values            |
| `QUIZ_SESSION_MAX_FAILING_CHAPTERS` | `3`                                | Max chapters in failing analysis |

## Deferred Or Out Of Scope

- Pagination for `getQuestions` and `listSessions`.
- Session titles or names (identified by creation timestamp only).
- Re-opening completed sessions.
- Global session list across all studySets.
- Concurrent session limits or auto-resume.
- Answer versioning or conflict detection (last-write-wins).
- Partial scoring (all-or-nothing per question).
- Session sharing or multi-user collaboration.
