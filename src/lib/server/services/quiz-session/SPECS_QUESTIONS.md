# Quiz Session — Specification Questions

> Answer each by replacing `[YOUR ANSWER HERE]` with your decision. Delete the unused approaches after answering.

---

## Q1: Should users be able to create a session without a `chapterId` filter?

**Reason:** The current plan requires `chapterId` on creation, loading _all_ quizzes under a studySet. This affects the `getQuestions` query, scoring scope, and the failing-chapters analysis. Confirming intent prevents over- or under-building the filter system.

**Common approaches:**

1. **Chapter-only** — `chapterId` is required. Users always pick a chapter. Simplest filter, no "global studySet" quiz sessions.
2. **Optional chapter filter** — `chapterId` is optional. Omitted = all quizzes in the studySet. Supports "quiz me on everything" sessions.
3. **Multi-filter from day one** — accept `{ chapterId?, studySetId?:, tagIds?:, ... }`. Future-proof but over-engineered before any usage data exists.

**Recommendation:** Approach (2). The spec already mentions "if chapter not filter, return 3 most failing chapter" — implying chapterId is optional. Also similar to how `Quiz.chapterId` is optional. Approach (1) would make the failing-chapter query meaningless.

**Example:**

```ts
// Session scoped to one chapter
create({ chapterId: "chp_abc123" }); // getQuestions returns quizzes from that chapter only

// Session scoped to entire studySet
create({}); // getQuestions returns ALL quizzes in the studySet
```

**Answer:**

```
[YOUR ANSWER HERE]
```

---

## Q2: When is the question set determined — at session creation or on each `getQuestions` call?

**Reason:** If the question set is frozen at creation time, adding/deleting quizzes in a chapter while a session is active won't affect the session. If resolved dynamically on each call, the session always reflects the current quiz pool. This affects data modeling (do we store `quiz_ids` on the session row?) and user expectations.

**Common approaches:**

1. **Snapshot at creation** — store `quiz_ids: string[]` on the session row. `getQuestions` returns those exact quizzes. Predictable and simple. Stale if quizzes are added/removed mid-session.
2. **Dynamic resolution** — `getQuestions` queries quizzes by the session's filter at call time. Always current. Unpredictable if the user adds quizzes between calls.
3. **Snapshot at first `getQuestions`** — lazy snapshot. First call freezes the set and stores it. Subsequent calls return the same set.

**Recommendation:** Approach (2) — dynamic resolution. The session _is_ the filter. The `Rng.shuffle` with `sessionId` seed ensures the same quizzes appear in the same shuffled order across devices regardless of when they call `getQuestions`. New quizzes added mid-session get included (consistent with "sync across devices" goal). If a quiz is deleted mid-session, it simply disappears from the question pool — the user's answer for it becomes orphaned and ignored during scoring.

**Example:**

```
Session created with chapterId: "chp_A" (chp_A has quizzes [Q1, Q2, Q3])
  → getQuestions → [Q3, Q1, Q2]  (shuffled)

Admin adds Q4 to chp_A
  → getQuestions → [Q1, Q4, Q3, Q2]  (same seed, Q4 inserted)

Admin deletes Q2
  → getQuestions → [Q1, Q4, Q3]
```

**Answer:**

```
[YOUR ANSWER HERE]
```

---

## Q3: Should empty `selectedOptionIds` (user submits no answer) be treated as a genuine answer or as "no attempt"?

**Reason:** A user might click "next" without selecting anything. Does that count as incorrect or is it simply not an answer? Affects scoring (`total` count) and the completion gate (must all questions be answered?).

**Common approaches:**

1. **Empty = no answer recorded** — `[]` is not upserted. The quiz remains unanswered. Completion requires all quizzes in scope to have a non-empty answer. Users cannot "skip" and complete.
2. **Empty = incorrect** — `[]` is upserted as an answer. Always wrong. Completion doesn't gate on emptiness. Users can complete with unanswered questions (they count as wrong).
3. **Empty = skip marker** — `[]` is recorded but flagged as skipped. Completion is allowed. Skipped questions don't count toward total (score = correct / answered).

**Recommendation:** Approach (2). Simplest to reason about. No completion gate means the user can always "finish" the session. An empty submission is a deliberate choice — the user saw the question and chose to submit nothing. This also avoids the complexity of tracking "did you attempt this?" state.

**Example:**

```
Session with 5 quizzes:
  Q1: ["opt_A"] → correct
  Q2: ["opt_B"] → incorrect
  Q3: []        → incorrect (empty = wrong)
  Q4: ["opt_C"] → correct
  Q5: <no submission> → unanswered, not scored

Score: 2/4 = 50%  (Q5 not counted)
```

**Answer:**

```
[YOUR ANSWER HERE]
```

---

## Q4: Should a completed session be re-openable?

**Reason:** A user completes a session, then realizes they misclicked or want to redo it. Should they be able to "un-complete" and continue, or must they create a new session? Affects whether `status` is fully immutable after COMPLETED.

**Common approaches:**

1. **Immutable completion** — once COMPLETED, forever read-only. User must create a new session to retry. Simplest, no concurrency edge cases.
2. **Re-open by admin only** — user cannot undo; admin can (for support).
3. **Re-open by user** — user can un-complete. Answers and results are discarded (recomputed on next completion). Flexible but more complex state machine.

**Recommendation:** Approach (1). Matches the spec's "seal the session to read only mode, so no mutable data for the session." Creating a new session is cheap (no per-session cost). A session is an audit record of one attempt.

**Example:**

```
User completes session → score: 60%
User wants to retry → creates new session → score: 85%
Both sessions exist in history.
```

**Answer:**

```
[YOUR ANSWER HERE]
```

---

## Q5: What is the score precision and representation?

**Reason:** Affects the output schema and client-side display. Integer percentage (0-100) is simplest but loses precision on small question sets. Decimal (float 0.0-1.0 or 0.0-100.0) is more precise but introduces floating-point display concerns.

**Common approaches:**

1. **Integer 0-100** — store as integer, computed as `Math.round(correct / total * 100)`. If 1 of 3 is correct, score = 33.
2. **Float 0.0-100.0** — store as float, display rounded to 1 decimal. If 1 of 3 is correct, score = 33.3.
3. **Ratio (numerator + denominator)** — store `correctCount` and `totalCount` separately. Client computes display format. Most flexible.

**Recommendation:** Approach (3). Already part of the plan (storing `score`, `correctCount`, `total_questions`). The `score` field is pre-computed as `correctCount / totalCount * 100` (integer, rounded) for convenience. The raw counts are also available for clients that want to display "3/5 correct".

**Example:**

```ts
// 3 correct out of 5
{ totalQuestions: 5, correctCount: 3, score: 60 }

// 1 correct out of 3
{ totalQuestions: 3, correctCount: 1, score: 33 }

// all correct
{ totalQuestions: 10, correctCount: 10, score: 100 }
```

**Answer:**

```
[YOUR ANSWER HERE]
```

---

## Q6: For chapter-filtered sessions, should `getResults` still return failing chapter analysis?

**Reason:** If a session is scoped to a single chapter, "top 3 failing chapters" is trivial — there's only one chapter. Should the field return the filtered chapter, be empty, or be omitted entirely? Affects the output schema for results.

**Common approaches:**

1. **Always compute** — even with a chapter filter, return the chapter breakdown. Single-entry array when filtered. Consistent schema, redundant data.
2. **Null when filtered** — return `null` for chapter-filtered sessions. Client checks `null` vs `string[]`. Cleaner signal.
3. **Empty array when filtered** — return `[]`. Client displays "no chapter data" or hides the section. Simplest schema (always `string[]`).

**Recommendation:** Approach (3) — empty array. Keeps the output schema flat (`string[]`, not `string[] | null`). Clients can check `failingChapterIds.length > 0` to decide whether to show the section. No nullable gymnastics.

**Example:**

```ts
// Session on chp_A (FILTERED)
getResults() → { score: 70, incorrectQuizIds: [...], failingChapterIds: [] }

// Session with no filter (entire studySet)
getResults() → { score: 70, incorrectQuizIds: [...], failingChapterIds: ["chp_B", "chp_C", "chp_A"] }
```

**Answer:**

```
[YOUR ANSWER HERE]
```

---

## Q7: Should `getResults` return the incorrect questions with their options (for review), or just the quiz IDs?

**Reason:** The spec says "return which questions are incorrect, returning question with options." This could mean embedding full `QuizWithOptions` in the results, or just returning IDs that the client uses to fetch quiz data separately. Affects response size and client data-fetching patterns.

**Common approaches:**

1. **Full embedding** — results include `incorrectQuestions: QuizWithOptions[]`. Single round-trip for review UI. Larger payload.
2. **IDs only** — results include `incorrectQuizIds: string[]`. Client calls `quiz.get` per ID for display. Smaller payload, N+1 fetches or batched follow-up.
3. **Hybrid** — results include `incorrectQuizIds: string[]`. A separate `getIncorrectQuestions` query accepts a session ID and returns the full objects. Two round-trips but clean separation.

**Recommendation:** Approach (1) — full embedding. The spec explicitly mentions "returning question with options." A quiz session will rarely have more than 50 questions, so payload size isn't a concern. The review UI needs question text + options + which options are correct in a single view.

**Example:**

```ts
getResults() → {
  score: 60,
  totalQuestions: 5,
  correctCount: 3,
  incorrectQuestions: [
    {
      id: "qiz_abc",
      questionText: "What is 2+2?",
      type: "MULTIPLE_CHOICE",
      options: [
        { id: "qzo_x", optionText: "3", isCorrect: false },
        { id: "qzo_y", optionText: "4", isCorrect: true },
      ],
      selectedOptionIds: ["qzo_x"],  // what the user picked
    },
    // ...
  ],
  failingChapterIds: ["chp_B"]
}
```

**Answer:**

```
[YOUR ANSWER HERE]
```

---

## Q8: How should the session results be stored — denormalized on the session row or in a separate `quiz_session_result` table?

**Reason:** Affects DB schema design, migration complexity, and query patterns. Denormalized columns are simpler. A separate table is more normalized and extensible.

**Common approaches:**

1. **Columns on session row** — `score`, `total_questions`, `incorrect_quiz_ids` (JSON), `failing_chapter_ids` (JSON). Single row fetch for `getResults`. Limited extensibility.
2. **Separate `quiz_session_result` table** — one row per session, with the same fields. Normalized boundary. Overkill for a 1:1 relationship.
3. **Separate `quiz_session_question_result` table** — one row per answered question, with `is_correct`, `quiz_id`, `selected_option_ids`. `getResults` aggregates on read. Most normalized, complex scoring on read.

**Recommendation:** Approach (1). The session row IS the result. We have a strict 1:1 relationship (one session → one result), and the data is write-once (at completion time). A separate table adds join complexity with zero benefit. If we later need per-question result history beyond what `quiz_session_answer` provides, we'd revisit.

**Example:**

```sql
-- Approach (1): single row, all results inline
SELECT score, total_questions, incorrect_quiz_ids, failing_chapter_ids
FROM quiz_session WHERE id = ?

-- Approach (3): would need aggregation
SELECT qsr.*, q.question_text, qo.*
FROM quiz_session_question_result qsr
JOIN quiz q ON q.id = qsr.quiz_id
LEFT JOIN quiz_option qo ON qo.quiz_id = q.id
WHERE qsr.session_id = ?
```

**Answer:**

```
[YOUR ANSWER HERE]
```

---

## Q9: Should `submitAnswer` validate that the submitted option IDs actually belong to the quiz?

**Reason:** A client could submit arbitrary option IDs. Should the server reject invalid/mismatched options, or trust the client? Affects data integrity and the scoring pipeline (scoring only uses answers with valid option IDs).

**Common approaches:**

1. **Full validation** — fetch the quiz's options, check that all `selectedOptionIds` are in that set. Reject with `VALIDATION_FAILED` if not. Strictest.
2. **Silent filtering** — accept any IDs, but during scoring only count those that belong to the quiz. Invalid IDs are ignored. Lenient, no client errors.
3. **No validation** — store blindly. Scoring compares sets directly; invalid IDs simply won't match correct IDs (always wrong). Trusts the client but natural penalty for bad data.

**Recommendation:** Approach (1). The server is the source of truth. Validating option ownership is cheap (one query for the quiz's options). Rejecting early prevents silent data corruption and makes debugging easier. This is consistent with how the quiz service validates option mutations against type constraints.

**Example:**

```ts
// Quiz "qiz_A" has options: ["qzo_1" (correct), "qzo_2", "qzo_3"]
submitAnswer({ sessionId: "qse_X", quizId: "qiz_A", selectedOptionIds: ["qzo_99"] })
  → VALIDATION_FAILED: "Option qzo_99 does not belong to quiz qiz_A"

submitAnswer({ sessionId: "qse_X", quizId: "qiz_A", selectedOptionIds: ["qzo_1"] })
  → OK, answer stored
```

**Answer:**

```
[YOUR ANSWER HERE]
```

---

## Q10: What happens when `complete` is called with zero answered quizzes?

**Reason:** A user could create a session, answer nothing, and immediately complete. Is this valid? What's the score — 0, null, or should it be rejected? Affects the completion gate logic.

**Common approaches:**

1. **Reject empty completion** — throw an error if no answers exist. User must answer at least one question.
2. **Allow with score 0** — complete successfully. Score = 0, totalQuestions = quizzesInScope, correctCount = 0. All quizzes marked incorrect.
3. **Allow with null score** — complete successfully. Score = null, meaning "not applicable." Client handles special display.

**Recommendation:** Approach (2). A user might open a session by accident or change their mind. Completing empty is a valid way to "discard" the session (soft close). Score = 0 honestly represents "you got nothing right." Approach (1) would trap users who accidentally created a session.

**Example:**

```ts
// Session has 10 quizzes in scope, zero answers submitted
complete({ sessionId: "qse_X" })
  → { score: 0, totalQuestions: 10, correctCount: 0, incorrectQuestions: [], failingChapterIds: [] }
```

**Answer:**

```
[YOUR ANSWER HERE]
```

---

## Q11: Should `getQuestions` include the user's current answer for each quiz (for resuming mid-session)?

**Reason:** The spec mentions "sync-ed cross device whenever user wanted to change device in mid session." When fetching questions, should the response include the user's previously submitted answer so the UI can restore selection state? Or should that be a separate call?

**Common approaches:**

1. **Include answers in `getQuestions`** — each quiz in the response has an optional `currentAnswer: string[] | null` field. Single round-trip for the full session state.
2. **Separate `getAnswers` query** — client calls `getQuestions` + `getAnswers(sessionId)` to hydrate state. Two round-trips, cleaner separation.
3. **Client-local only** — answers are not returned with questions. Client must track state locally. Cross-device sync means the other device has no prior answers visible in the question view.

**Recommendation:** Approach (1). The "sync across devices" use case is central: user starts on phone, continues on desktop. The desktop needs to see which questions are already answered. Embedding answers in the question response means one call to fully restore session state.

**Example:**

```ts
getQuestions({ sessionId: "qse_X" }) → [
  {
    ...quiz,
    options: [...],
    currentAnswer: ["qzo_3"],  // previously submitted on another device
  },
  {
    ...quiz,
    options: [...],
    currentAnswer: null,        // unanswered
  },
  {
    ...quiz,
    options: [...],
    currentAnswer: [],          // submitted empty (user skipped)
  },
]
```

**Answer:**

```
[YOUR ANSWER HERE]
```

---

## Q12: Should `submitAnswer` allow re-submitting an answer after completion?

**Reason:** Edge case: client has a stale session state and tries to submit after the session was completed (possibly from another device). Should this be rejected, silently ignored, or allowed?

**Common approaches:**

1. **Reject with error** — return `SESSION_ALREADY_COMPLETED`. Client should refresh and see the session is done. Explicit.
2. **Silent no-op** — accept the request, return the existing answer, don't mutate. Reduces error handling on the client. Confusing if the client expects the answer to be saved.
3. **Allow mutation** — effectively re-open and continue. Conflicts with immutability decision.

**Recommendation:** Approach (1). Consistent with "completed = read-only." The error code is actionable — the client can navigate the user to the results view. Silent no-ops hide bugs where the client's state is out of sync.

**Error code:** `SESSION_ALREADY_COMPLETED`

**Example:**

```ts
// Device A completes session
complete({ sessionId: "qse_X" })

// Device B (stale) tries to submit
submitAnswer({ sessionId: "qse_X", quizId: "qiz_A", selectedOptionIds: ["qzo_1"] })
  → SESSION_ALREADY_COMPLETED: "This session has already been completed"
```

**Answer:**

```
[YOUR ANSWER HERE]
```

---

## Q13: For `getResults`, should un-answered quizzes (no `quiz_session_answer` row) appear in the incorrect list?

**Reason:** During scoring, quizzes in scope that have no answer row are neither correct nor incorrect — they're unanswered. Should `getResults` show them as incorrect, or omit them? Affects the `incorrectQuestions` array and the mental model of "incorrect."

**Common approaches:**

1. **Unanswered = incorrect** — include all quizzes lacking a correct answer in `incorrectQuestions`. Score = correct / total. Simplest, but conflates "wrong" with "didn't try."
2. **Unanswered = omitted** — `incorrectQuestions` only includes those with a wrong answer. Score = correct / answered. Separate `unansweredIds`. More nuanced.
3. **Unanswered = scored as wrong, listed separately** — separate fields: `incorrectQuestions` (wrong answers) and `unansweredQuestions` (no attempt). Score = correct / total. Both displayed in review.

**Recommendation:** Approach (1). Matches the earlier decision (Q3) that empty submissions count as answers. The remaining unanswered quizzes (no row at all) should also count as misses — otherwise there's no incentive to answer. "Total" = all quizzes in scope. Score = correct / totalQuestions. The `incorrectQuestions` list includes both wrong answers and unanswered quizzes (with `selectedOptionIds: null` to distinguish).

**Example:**

```ts
// 5 quizzes in scope. 2 answered correctly, 1 answered wrong, 1 submitted empty, 1 unanswered
getResults() → {
  totalQuestions: 5,
  correctCount: 2,
  score: 40,
  incorrectQuestions: [
    { ...quizQ2, selectedOptionIds: ["qzo_wrong"] },  // wrong answer
    { ...quizQ3, selectedOptionIds: [] },             // answered empty
    { ...quizQ4, selectedOptionIds: null },           // unanswered
  ]
}
```

**Answer:**

```
[YOUR ANSWER HERE]
```

---

## Q14: Should `getResults` be callable on an ACTIVE session (live preview)?

**Reason:** A user might want to see their progress mid-session — how many they've answered, how they're doing. Should `getResults` be gated to COMPLETED only, or should it work as a "live stats" query on ACTIVE sessions too?

**Common approaches:**

1. **COMPLETED only** — `getResults` returns the stored completion snapshot. Error on ACTIVE sessions. Clean boundary.
2. **Live computation** — `getResults` on ACTIVE sessions computes current score from existing answers, without sealing. On COMPLETED sessions it returns the stored snapshot.
3. **Separate `getProgress` query** — `getResults` is COMPLETED-only. A separate `getProgress` query returns live stats (answered/total count, no score computation) for ACTIVE sessions.

**Recommendation:** Approach (2). One query, two behaviors. On ACTIVE: compute from current answers (live, no mutation). On COMPLETED: return the stored snapshot. Users don't need to know or care about the difference. The "seal" means mutations stop, not that the query stops working.

**Example:**

```ts
// Mid-session (ACTIVE)
getResults() → {
  score: 50,          // live computation from 2/4 answered
  totalQuestions: 5,
  correctCount: 2,
  incorrectQuestions: [ /* 2 wrong/empty answers */ ],
  // 1 unanswered quiz not in incorrectQuestions? (see Q13)
}

// After completion
getResults() → {
  score: 40,          // stored snapshot (remaining 1 counted as wrong)
  totalQuestions: 5,
  correctCount: 2,
  incorrectQuestions: [ /* 3 wrong/empty/unanswered */ ],
}
```

**Answer:**

```
[YOUR ANSWER HERE]
```

---

## Q15: Should the chapter dependency for `getQuestions`/`complete` go through `chapterGuard` (visibility check) or `quizGuard` (quiz visibility)?

**Reason:** When resolving quizzes for a session, we need to ensure the user can see the quizzes. The quiz-guard checks visibility through the studySet chain. The chapter-guard checks chapter ownership. Which guard is appropriate depends on whether a viewer (non-owner of the studySet) can take a quiz session.

**Common approaches:**

1. **Owner-only** — only the studySet owner can create/use sessions. Use `chapterGuard.assertOwnerOrForbidden`. Sessions are private to the creator.
2. **Viewer-allowed** — anyone who can see the studySet can create sessions on public studySets. Use `quizGuard.assertStudySetVisibleOrNotFound`. Broader but more complex access model.
3. **Owner-only for now** — start with owner-only (approach 1). If public quiz-taking becomes a feature, add viewer support later.

**Recommendation:** Approach (3). Sessions are inherently personal (my answers, my score, my history). Public quiz-taking is a separate feature with different requirements (anonymous sessions? session sharing?). Starting with owner-only keeps the guard simple and aligns with the existing quiz domain's create-guard (owner-only).

**Example:**

```ts
// Owner creates session on their own studySet → OK
create({ chapterId: "chp_A" }, ownerId);

// Non-owner viewer tries to create session on public studySet → FORBIDDEN
create({ chapterId: "chp_A" }, viewerId);
```

**Answer:**

```
[YOUR ANSWER HERE]
```

---

## Q16: What is the ID format for session and answer records?

**Reason:** The codebase uses prefixed nanoid IDs (`qiz_`, `qzo_`, `chp_`, etc.) defined in `src/lib/server/utils/nanoid.ts`. We need to pick prefixes for the two new entities. Affects the ID schema validation and cross-entity consistency.

**Common approaches:**

1. **Short prefixes** — `qse_` (quiz session), `qsa_` (quiz session answer). 3-char, consistent with `qiz_` and `qzo_`.
2. **Descriptive prefixes** — `qses_` (quiz session), `qsan_` (quiz session answer). 4-char, more readable.
3. **Reuse existing** — sessions use UUIDs (no prefix, like Better Auth). Inconsistent with the quiz domain's own pattern.

**Recommendation:** Approach (1). Matches the existing 3-char prefix convention (`qiz`, `qzo`, `chp`, `stc`, `flc`). The server generates IDs with `generateId("qse")` / `generateId("qsa")`. Schemas validate with `createPrefixedIdSchema("qse")`.

**Example:**

```ts
// Generated IDs
generateId("qse") → "qse_abC1dEfGhIjKlMnO"
generateId("qsa") → "qsa_xyZ2aBcDeFgHiJkL"
```

**Answer:**

```
[YOUR ANSWER HERE]
```

---

## Summary of Questions

| #   | Topic                                  | Impact                        |
| --- | -------------------------------------- | ----------------------------- |
| Q1  | Optional `chapterId`                   | Filter scope                  |
| Q2  | Question set resolution timing         | Dynamic vs snapshot semantics |
| Q3  | Empty answer treatment                 | Scoring model                 |
| Q4  | Re-openable sessions                   | State machine                 |
| Q5  | Score precision                        | Output schema                 |
| Q6  | Failing chapters for filtered sessions | Output schema                 |
| Q7  | Incorrect question embedding           | Response shape                |
| Q8  | Results storage model                  | DB schema design              |
| Q9  | Option ID validation                   | Input validation              |
| Q10 | Empty session completion               | Edge case handling            |
| Q11 | Answers in `getQuestions`              | Cross-device sync UX          |
| Q12 | Post-completion mutations              | Error model                   |
| Q13 | Unanswered in results                  | Scoring model                 |
| Q14 | Live vs completed results              | Query semantics               |
| Q15 | Session access model                   | Authorization                 |
| Q16 | ID prefixes                            | Schema consistency            |
