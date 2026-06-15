# Quiz Session Service Specs

Source specs:

- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-specs.md`
- `src/lib/server/services/quiz/SPECS.md`

## Domain Boundary

Quiz Session tracks a user's attempt at answering quizzes scoped by a filter (`studySetId` + optional `chapterId`). On creation, quizzes matching the filter are deep-copied into a session-scoped snapshot (`quiz_session_quiz` + `quiz_session_quiz_option` tables). All subsequent operations (answer submission, scoring, results) work against this frozen copy — original quiz edits or deletions do not affect in-progress or completed sessions.

Quiz Session is responsible for:

- session creation with studySet/chapter filters, deep-copying quizzes into a session-scoped snapshot
- answer submission (upsert per session-quiz, cross-device sync)
- answer validation (option IDs must belong to the session's quiz copy)
- session completion with immutable sealed results
- live-scored `getResults` on ACTIVE sessions and stored-snapshot `getResults` on COMPLETED sessions
- returning incorrect questions with full options for review
- failing chapter analysis (top 3 by incorrect count) for studySet-scoped sessions
- listing user sessions scoped by studySet
- admin deletion of expired sessions (90-day TTL) including cascade cleanup

Quiz Session is not responsible for:

- quiz creation, updates, or option management (delegated to quiz domain)
- generating quiz content or selecting questions (done once at creation via quiz repository)
- studySet or chapter lifecycle management
- spaced repetition scheduling
- multi-user session sharing (each session is personal to its creator)
- anonymous/public quiz-taking (sessions require authentication)

## Architecture Decisions (from grill)

1. **QuizSessionService** depends on `QuizSessionRepository`, `QuizSessionGuard`, and `QuizRepository`.
2. **QuizSessionGuard** handles all validation — auth/visibility (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`) plus business validation (`VALIDATION_FAILED`). Guard depends on `QuizSessionRepository`, `StudySetGuard`, and `ChapterRepository`.
3. **QuizSessionDrizzleRepository** takes only a DB instance. Repository touches both `quiz_session*` and `quiz*` tables directly.
4. **Repository returns sorted, service shuffles** — repo returns data sorted by `position` ASC. Service calls `new Rng(sessionId).shuffle(data)`.
5. **Full validation on every submitAnswer** — fetch session quiz + options each time, no caching.
6. **Scoring + failing chapter analysis** extracted to `quiz-session.scoring.ts` utility.
7. **`QuizSessionQuestionItem`** = `QuizWithOptions & { currentAnswer: string[] | null }` defined in quiz-session types.
8. **Chapter validation on creation** uses `ChapterRepository` (exported from `chapter/index.ts`), not `ChapterGuard`.
9. **Frozen snapshot** — quizzes are deep-copied at session creation. No dynamic resolution. Original quiz edits/deletions never affect sessions.
10. **Copy-on-create, immutable** — `quiz_session_quiz` + `quiz_session_quiz_option` tables hold the session's immutable quiz data.

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

interface QuizSessionQuiz {
  id: string;
  sessionId: string;
  originalQuizId: string | null;
  questionText: string;
  type: QuizType;
  chapterId: string | null;
  position: number;
}

interface QuizSessionQuizOption {
  id: string;
  sessionQuizId: string;
  optionText: string;
  isCorrect: boolean;
  explanation: string | null;
  position: number;
}

interface QuizSessionAnswer {
  id: string;
  sessionId: string;
  sessionQuizId: string;
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
- `quizCount` is computed at creation time as the number of quizzes copied into the session snapshot.
- `score` is `null` until completion, then set to `Math.round(correctCount / totalQuestions * 100)` (integer 0–100).
- `totalQuestions` is `null` until completion, then set to `quizCount` (the number of quizzes in the snapshot).
- `correctCount` is `null` until completion.
- `incorrectQuizIds` is `null` until completion, then set to an array of `quizSessionQuiz.id` values that were answered incorrectly or unanswered.
- `failingChapterIds` is `null` until completion, then set to the top 3 chapter IDs with the most incorrect answers (computed only for chapter-filtered sessions; empty `[]` when session has no `chapterId` filter, empty if only unassigned quizzes).
- `lastQuestionText` is a denormalized copy of the most recently answered quiz's `questionText` from `quizSessionQuiz`. Set on each `submitAnswer`.
- `lastAnsweredAt` is a Unix timestamp in milliseconds set on each `submitAnswer`.
- `createdAt`, `completedAt`, and `updatedAt` are Unix timestamps in milliseconds.
- `completedAt` is set on completion.
- Unknown fields are ignored for all request payloads.

## QuizSessionQuiz Field Rules

- `id` is server-generated with `generateId("qsg")`; clients never provide IDs.
- `sessionId` references the parent `QuizSession`. Cascade-deleted with the session.
- `originalQuizId` references the source `quiz.id`. Set to `NULL` via FK `ON DELETE SET NULL` if the original quiz is deleted — the session copy data (`questionText`, `type`, `chapterId`) is preserved.
- `questionText`, `type`, `chapterId` are deep-copied from the original quiz at creation time. Immutable after creation.
- `position` is the insertion order (0-based). Used for deterministic pre-shuffle ordering (by `position` ASC, not original `quiz.id`).

## QuizSessionQuizOption Field Rules

- `id` is server-generated with `generateId("qso")`; clients never provide IDs.
- `sessionQuizId` references the parent `QuizSessionQuiz`. Cascade-deleted with the session quiz.
- `optionText`, `isCorrect`, `explanation` are deep-copied from the original quiz option at creation time. Immutable after creation.
- `position` preserves the original option ordering.

## QuizSessionAnswer Field Rules

- `id` is server-generated with `generateId("qsa")`; clients never provide IDs.
- `sessionId` is required and must reference an existing QuizSession owned by the authenticated user.
- `sessionQuizId` is required on submission. References a `quiz_session_quiz.id` that belongs to the session (validated by the guard).
- `selectedOptionIds` is an array of `quiz_session_quiz_option.id` values. Empty array (`[]`) means the user submitted without selecting anything — treated as incorrect.
- `(sessionId, sessionQuizId)` has a unique constraint — a user can only have one answer per quiz per session. Re-submissions upsert (overwrite) the existing answer.
- `createdAt` and `updatedAt` are Unix timestamps in milliseconds.

## Session Creation (Frozen Snapshot)

On `createSession`:

1. Guard validates studySet visibility via `studySetGuard.assertStudySetVisibleByIdOrNotFound`.
2. If `chapterId` provided, guard validates chapter belongs to studySet via `ChapterRepository.findChapterById(chapterId)` — rejects with `VALIDATION_FAILED` if `ch.studySetId !== studySetId`.
3. Service calls `quizRepo.findQuizzesByStudySetId(studySetId)` to get all quizzes with options.
4. If `chapterId` is set, filters quizzes to only those with matching `chapterId`.
5. Creates `QuizSession` row with `quizCount` = number of matching quizzes.
6. For each matching quiz, deep-copies into `quiz_session_quiz` + `quiz_session_quiz_option` rows.

## Question Set Resolution (Frozen)

The set of quizzes for a session is the frozen snapshot — not dynamically resolved.

- `getQuestions` fetches from `quiz_session_quiz` + `quiz_session_quiz_option` (ordered by `position` ASC), then shuffles using `Rng(sessionId)` as seed.
- New quizzes added to the studySet after session creation do NOT appear in existing sessions.
- Quizzes deleted from the original quiz table do NOT affect the session — the session copy is preserved (with `originalQuizId` set to NULL if FK ON DELETE SET NULL fires).
- Same seed → same order across devices and calls.

## Scoring

- **Correct**: For MULTIPLE_CHOICE and FILL_IN_THE_BLANK, the single correct option ID matches exactly. For MULTIPLE_SELECT, the set of selected option IDs matches the set of correct option IDs exactly (no missing, no extra).
- **Incorrect**: Any answer that does not match the correct set, including empty `[]` submissions.
- **Unanswered**: Quizzes in the session snapshot with no `quiz_session_answer` row. Counted as incorrect in scoring, shown with `selectedOptionIds: null`.
- **Empty session completion**: If zero answers exist, score = 0, totalQuestions = quizCount, correctCount = 0.
- **Score formula**: `Math.round(correctCount / totalQuestions * 100)`.

## Failing Chapter Analysis

Only computed for sessions with a `chapterId` filter:

1. Collect all incorrect `quizSessionQuiz.id` values.
2. Look up each quiz's `chapterId` from the `quiz_session_quiz` table.
3. Group by `chapterId`, count incorrects per chapter.
4. Sort descending by count, take top 3.
5. Exclude `null` chapterId (unassigned quizzes).

For studySet-scoped sessions (no chapterId filter), `failingChapterIds` is always `[]`.

## Completion

`complete` transitions the session from ACTIVE to COMPLETED. Calling `complete` on an already-COMPLETED session is idempotent (returns current state, no error).

On completion, the service:

1. Fetches all answers for the session.
2. Fetches all quizzes in the session snapshot (with options).
3. Scores each answer against the copied correct options.
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
- Deep-copies matching quizzes + options into the session snapshot.
- `quizCount` is set to the number of quizzes copied.
- Returns `QuizSession` with embedded `quizCount`.

### SubmitAnswer

```typescript
interface SubmitAnswerCommand {
  sessionId: string;
  sessionQuizId: string;
  selectedOptionIds: string[];
}
```

- Upserts an answer for the given session-quiz within the session.
- Validates `sessionQuizId` belongs to the session (guard checks `quiz_session_quiz.sessionId === sessionId`). Rejects with `VALIDATION_FAILED` if not.
- Validates all `selectedOptionIds` reference options belonging to the session-quiz (guard checks `quiz_session_quiz_option.sessionQuizId === sessionQuizId`). Rejects with `VALIDATION_FAILED` if any ID is invalid.
- Rejects with `SESSION_ALREADY_COMPLETED` if the session is COMPLETED.
- On success, also updates `lastAnsweredAt` and `lastQuestionText` on the session row.
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
- Computes score, totalQuestions, correctCount, incorrectQuizIds, failingChapterIds using the session's frozen quiz data.
- Writes results columns to the session row.
- Returns `QuizSession` with populated results.

### AdminDeleteExpiredSessions

```typescript
interface AdminDeleteExpiredSessionsCommand {
  // no input — deletes all sessions past TTL
}
```

- Deletes all sessions where `createdAt < Date.now() - QUIZ_SESSION_TTL_MS` (90 days).
- Cascade-deletes all associated `quiz_session_quiz`, `quiz_session_quiz_option`, and `quiz_session_answer` rows. No orphaned cleanup needed — all child rows cascade cleanly.
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

- Fetches all quizzes from the frozen session snapshot (`quiz_session_quiz` + `quiz_session_quiz_option`).
- Sorts by `position` ASC, then shuffles using `Rng(sessionId)`.
- Returns `QuizSessionQuestionItem[]` (session quiz with options + `currentAnswer: string[] | null`).
- `currentAnswer` is `null` if no answer has been submitted for that quiz; `[]` if an empty submission exists; the stored `selectedOptionIds` otherwise.
- Empty session returns `[]`.
- No pagination (v1: all quizzes returned).

### GetQuizSessionResults

```typescript
interface GetQuizSessionResultsQuery {
  sessionId: string;
}
```

- On ACTIVE sessions: computes live score from current answers and session-quiz snapshot. Returns `totalQuestions` = quizCount, unanswered quizzes shown as incorrect with `selectedOptionIds: null`.
- On COMPLETED sessions: returns the stored immutable snapshot.
- Returns `{ score, totalQuestions, correctCount, incorrectQuestions: QuizSessionQuestionItem[], failingChapterIds: string[] }`.
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
- FK cascades:
  - `quiz_session_quiz.sessionId` → `quiz_session.id`: `ON DELETE CASCADE`
  - `quiz_session_quiz_option.sessionQuizId` → `quiz_session_quiz.id`: `ON DELETE CASCADE`
  - `quiz_session_quiz.originalQuizId` → `quiz.id`: `ON DELETE SET NULL`
  - `quiz_session_answer.sessionId` → `quiz_session.id`: `ON DELETE CASCADE`
  - `quiz_session_answer.sessionQuizId` → `quiz_session_quiz.id`: `ON DELETE CASCADE`
  - `quiz_session.userId` → `user.id`: `ON DELETE CASCADE`
  - `quiz_session.chapterId` → `chapter.id`: `ON DELETE SET NULL`
  - `quiz_session.studySetId` → `studySet.id`: `ON DELETE CASCADE`
- Indexes:
  - `quiz_session`: `userId`, `studySetId`, `status`, `createdAt`
  - `quiz_session_quiz`: `sessionId`, `originalQuizId`
  - `quiz_session_quiz_option`: `sessionQuizId`
  - `quiz_session_answer`: `sessionId`, `(sessionId, sessionQuizId)` (unique)
- Unique constraint on `quiz_session_answer(sessionId, sessionQuizId)`.

## Errors

- `UNAUTHORIZED`: missing authenticated user.
- `FORBIDDEN`: authenticated user cannot view the studySet for session creation.
- `NOT_FOUND`: session, studySet, chapter, or quiz not found or not visible to the user.
- `VALIDATION_FAILED`: invalid input payload, chapter does not belong to studySet, session-quiz not in session, option IDs do not belong to the session-quiz.
- `SESSION_ALREADY_COMPLETED`: attempt to submit an answer to a completed session.

## Dependency Wiring

Following decisions from the grill:

```
QuizSessionService(repo: QuizSessionRepository, guard: QuizSessionGuard, quizRepo: QuizRepository)
QuizSessionGuard(repo: QuizSessionRepository, studySetGuard: StudySetGuard, chapterRepo: ChapterRepository)
QuizSessionDrizzleRepository()

index.ts:
  const quizRepo = new QuizDrizzleRepository()
  const chapterRepo = new ChapterDrizzleRepository()
  const quizSessionRepo = new QuizSessionDrizzleRepository()
  export const quizSessionGuard = new QuizSessionGuard(quizSessionRepo, studySetGuard, chapterRepo)
  export const quizSessionService = new QuizSessionService(quizSessionRepo, quizSessionGuard, quizRepo)
```

- `ChapterRepository` must be exported from `chapter/index.ts`.
- Guard handles all validation (auth + business), throws `UNAUTHORIZED | FORBIDDEN | NOT_FOUND | VALIDATION_FAILED | SESSION_ALREADY_COMPLETED`.
- Service orchestrates, calls guard for all validation, delegates to repos.
- Scoring logic lives in `quiz-session.scoring.ts` utility.

## ID Prefixes

| Entity                | Prefix | Generator           |
| --------------------- | ------ | ------------------- |
| QuizSession           | `qse`  | `generateId("qse")` |
| QuizSessionQuiz       | `qsg`  | `generateId("qsg")` |
| QuizSessionQuizOption | `qso`  | `generateId("qso")` |
| QuizSessionAnswer     | `qsa`  | `generateId("qsa")` |

Validated via `createPrefixedIdSchema("qse")` / etc. in schemas.

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
