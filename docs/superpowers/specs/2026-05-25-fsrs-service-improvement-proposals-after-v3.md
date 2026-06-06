# FSRS Service - Improvement Proposals After Three Discussion Files

Source reviewed:

- `docs/superpowers/specs/2026-05-25-fsrs-service-questions.md`
- `docs/superpowers/specs/2026-05-25-fsrs-service-questions-v2.md`
- `docs/superpowers/specs/2026-05-25-fsrs-service-questions-v3.md`

This document does not ask more questions. It reviews the decisions from the three FSRS discussion files and proposes improvements before writing the final FSRS service spec.

---

## 1. Replace ambiguous `remainingCards` with split remaining counters

### Current decision

The discussions first used `remainingCards`, then decided `remainingCards` is manually set by the application layer. Later, `StartSession` removed `totalCards`, `remainingCards`, and `newCardsCount`, but the final v3 answer also says to store both new and due counters.

### Improvement

Remove the aggregate `remainingCards` field from the stored session model. Store two explicit counters instead:

```typescript
interface ReviewSession {
  newCardsRemaining: number;
  dueCardsRemaining: number;
}
```

If the UI needs a total, compute it as `newCardsRemaining + dueCardsRemaining` in the response layer.

### Reason

The aggregate `remainingCards` field became ambiguous. Sometimes it meant never-reviewed cards. Sometimes it meant new plus due cards. Split counters make the session state readable and remove hidden assumptions.

### Recommendation

Use `newCardsRemaining` and `dueCardsRemaining` as stored columns. Do not store `totalCards` and do not store aggregate `remainingCards`.

### Answer

Accepted

---

## 2. Stabilize session card selection with `startedAt` instead of a full snapshot table

### Current decision

The v2 discussion chose snapshot-at-session-creation, but v3 removed `totalCards` and avoids returning flashcard content from FSRS. There is no explicit decision to add a `review_session_card` membership table.

### Improvement

Use `review_session.startedAt` as the session boundary:

- New cards in the session are flashcards created at or before `startedAt` with no `flashcard_state` for the user.
- Due cards in the session are cards with `flashcard_state.due <= startedAt`.
- Cards already reviewed in the same session are excluded by `review_log.sessionId`.

### Reason

This gives stable session behavior without storing every session-card membership row. New flashcards added after session start do not unexpectedly appear mid-session. Cards that become due after session start also wait for the next session.

### Recommendation

Do not add `review_session_card` for the MVP. Use `startedAt` as the snapshot boundary and document this rule clearly in `GetSessionCards`.

### Answer

Accept

---

## 3. Make `ResetSession` required, not optional

### Current decision

There is one session per study set per user on any status. `StartSession` on an already completed session returns the existing completed session.

### Improvement

Make `ResetSession(studySetId)` a required command in the FSRS service, not an optional future command.

### Reason

With one session per user-study-set across all statuses, a completed session blocks a fresh session unless there is a reset path. Returning the completed session from `StartSession` is explicit, but it only works if the client has a supported way to start again.

### Recommendation

Use this flow:

```typescript
StartSession(studySetId);
```

Returns the existing session for that user-study-set, regardless of status.

```typescript
ResetSession(studySetId);
```

Reuses the same session row, sets `status = 'active'`, refreshes `startedAt`, clears `completedAt`, recomputes `newCardsRemaining` and `dueCardsRemaining`, and allows the user to study again.

### Answer

Accepted

---

## 4. Rename the dashboard query to match the actual meaning of "available"

### Current decision

The early requirement named the query "available flashcard today." Later decisions removed the flat available-card query and redefined "available" as cards that were reviewed before and are due again. Never-reviewed cards are excluded.

### Improvement

Rename the study-set dashboard query from `GetStudySetsWithAvailableCards` to `GetStudySetsWithDueCards`.

### Reason

The word "available" is now overloaded. It could mean new cards, due cards, or all cards a user may study. The actual query only means due-for-review cards.

### Recommendation

Use this final query name:

```typescript
getStudySetsWithDueCards();
```

It returns the 10 latest user-specific study-set/session entries with due cards, ordered by session activity and due count.

### Answer

Accepted

---

## 5. Tighten the due-card dashboard response shape

### Current decision

The v3 answer says `GetStudySetsWithAvailableCards` returns 10 latest entries ordered by `lastReviewedAt`, each containing `studySet`, `session`, and cards needing review. A later answer says shape should be `{ studySet: StudySet, session: Session }` and order by `session.lastReviewedAt` then `dueCount`.

### Improvement

Do not return full card lists from the dashboard query. Return the study set, session, and count metadata only.

### Reason

The FSRS service later decided `GetSessionCards` returns only card IDs and state, and the client already has flashcards. Returning full card lists from the dashboard would duplicate `GetSessionCards` and make the dashboard query heavier than necessary.

### Recommendation

Use this response shape:

```typescript
interface StudySetWithDueCards {
  studySet: StudySet;
  session: ReviewSession;
  dueCardsCount: number;
}
```

Limit to 10 entries. Order by `session.lastReviewedAt` descending first, then `dueCardsCount` descending. If `lastReviewedAt` is null, fall back to `session.startedAt`.

### Answer

Accept

---

## 6. Keep `StartSession` metadata small but include the two counters

### Current decision

`StartSession` returns metadata only. It should not return cards. v3 removed `totalCards`, aggregate `remainingCards`, and `newCardsCount` from the proposed response.

### Improvement

Return the session object only, but the session object should include `newCardsRemaining` and `dueCardsRemaining`.

### Reason

The client needs enough metadata to decide whether it should call `GetSessionCards` and whether the session is already complete. Removing all counts makes `StartSession` too weak as an entry point.

### Recommendation

Use this session shape:

```typescript
interface ReviewSession {
  id: ReviewSessionId;
  userId: UserId;
  studySetId: StudySetId;
  status: "ACTIVE" | "COMPLETED" | "ABANDONED";
  newCardsRemaining: number;
  dueCardsRemaining: number;
  completedCards: number;
  startedAt: Date;
  lastReviewedAt?: Date;
  completedAt?: Date;
}
```

No `totalCards`, no `remainingCards`, and no `currentBatchIndex`.

### Answer

Accept

---

## 7. Add a `kind` field to `SessionCard`

### Current decision

`GetSessionCards` returns a flat, unpaginated list. Each item contains only `flashcardId`, `state`, and `previewState`. It does not include flashcard content because the client already has flashcards.

### Improvement

Add a lightweight `kind` field to tell the client why the card is in the session.

### Reason

The client can infer some information from `state`, but an explicit `kind` is simpler and avoids UI mistakes. A `State.New` card is a new card. A `State.Review`, `State.Learning`, or `State.Relearning` card may be due for different reasons, but the session only needs to tell whether it is new or due.

### Recommendation

Use this shape:

```typescript
interface SessionCard {
  flashcardId: FlashcardId;
  kind: "NEW" | "DUE";
  state: FsrsCardState;
  previewState: Record<FsrsRating, FsrsCardState>;
}
```

Order cards by `kind` first (`NEW` before `DUE`), then by due date ascending for due cards, then by flashcard creation date for new cards.

### Answer

Accept

---

## 8. Reconsider upserting `review_log` rows

### Current decision

The v3 answer chooses a unique constraint on `(userId, flashcardId, sessionId)` with upsert behavior for duplicate reviews.

### Improvement

Keep `review_log` append-only and add idempotency separately.

### Reason

The review log is intended to be history. Updating an existing review log destroys audit history and weakens future re-scheduling from historical reviews. Duplicate prevention and retry safety are valid needs, but they should be solved with an idempotency key, not by overwriting historical records.

### Recommendation

Use:

```typescript
interface ReviewLog {
  id: ReviewLogId;
  userId: UserId;
  flashcardId: FlashcardId;
  sessionId: ReviewSessionId;
  rating: FsrsRating;
  previousState: FsrsCardStateJson;
  newState: FsrsCardStateJson;
  reviewedAt: Date;
  idempotencyKey?: string;
}
```

Make `id` the primary key. If retry protection is needed, add a unique index on `(userId, idempotencyKey)` where `idempotencyKey` is present. Do not make `(userId, flashcardId, sessionId)` unique.

### Answer

Keep review log as append only

---

## 9. Keep `flashcard_state` as the operational source of truth

### Current decision

Both `flashcard_state` and `review_log` exist. `flashcard_state` stores current state, and `review_log` stores history.

### Improvement

Document the source-of-truth split explicitly.

### Reason

Future implementers need to know which table to use for which behavior. Due-card queries should never scan `review_log`. Review history and analytics should never mutate `flashcard_state` directly.

### Recommendation

Use this rule:

```md
`flashcard_state` is the operational source of truth for current scheduling and due-card queries. `review_log` is append-only history used for audit, analytics, and future rescheduling. Review commands write both in the same transaction.
```

### Answer

Accept

---

## 10. Add parameter version tracking before user tuning exists

### Current decision

FSRS parameters are per-user in the long term, but users cannot tune parameters yet.

### Improvement

Add a small parameter-version field now, without building the full settings UI.

### Reason

If parameters become per-user later, historical logs need to know which parameter set created a state. Without versioning, future rescheduling and debugging become harder.

### Recommendation

Do not add a full `fsrs_user_config` table unless implementation needs it now. Add `parametersVersion` to `review_log` and optionally `flashcard_state`, defaulting to a constant such as `default-v1`.

### Answer

I think the version should be stored in the session
but instead of version, we should call it "preset"

---

## 11. Store ts-fsrs enum values consistently

### Current decision

The specs use labels such as `again`, `hard`, `good`, `easy` and states such as `new`, `learning`, `review`, `relearning`. ts-fsrs itself exposes `Rating` and `State` enums.

### Improvement

Pick one persisted representation and define service-boundary mapping.

### Reason

Mixing lowercase strings, uppercase strings, and numeric enums will create validation and migration bugs. The DB should be consistent, and the remote API should be clear.

### Recommendation

Persist state and rating as uppercase strings at the service boundary:

```typescript
type FsrsState = "NEW" | "LEARNING" | "REVIEW" | "RELEARNING";
type FsrsRating = "AGAIN" | "HARD" | "GOOD" | "EASY";
```

Map these to ts-fsrs `State` and `Rating` enums inside the FSRS service only.

### Answer

Accepted, with additional mapper function

---

## 12. Define ID prefixes for FSRS entities now

### Current decision

The discussions use `UUID` placeholders, but the project uses prefixed IDs.

### Improvement

Add FSRS-specific ID prefixes before implementation.

### Reason

This keeps FSRS consistent with `sst_`, `chp_`, `flc_`, and other existing service IDs.

### Recommendation

Add prefixes to `ID_PREFIX` for:

```typescript
FSRS_SESSION: "frs";
FLASHCARD_STATE: "fst";
REVIEW_LOG: "frl";
```

Use the final names consistently in schema validators and service specs.

### Answer

Use prefixed UUID

---

## 13. Define transaction boundaries for review writes

### Current decision

Reviewing a flashcard updates current state, writes review history, and updates session progress.

### Improvement

Make this a required all-or-nothing transaction.

### Reason

A partial write would corrupt learning state. For example, if `flashcard_state` updates but `review_log` fails, the audit trail is incomplete. If session counters update but state fails, progress is wrong.

### Recommendation

`ReviewFlashcard` must atomically:

- Validate authenticated user and StudySet access.
- Validate the session belongs to the user and study set.
- Load or create the current FSRS card state.
- Compute the next state using ts-fsrs.
- Upsert `flashcard_state`.
- Insert `review_log`.
- Update session counters, `lastReviewedAt`, and maybe `status`/`completedAt`.

If any step fails, none of the writes persist.

### Answer

Accept

---

## 14. Make session completion depend on both counters

### Current decision

The service supports auto-complete when remaining reaches zero and explicit `CompleteSession`.

### Improvement

Auto-complete only when both `newCardsRemaining` and `dueCardsRemaining` are zero.

### Reason

After splitting counters, completion should not depend on one vague aggregate field. The rule should be deterministic.

### Recommendation

Use this completion rule:

```typescript
if (session.newCardsRemaining === 0 && session.dueCardsRemaining === 0) {
  session.status = "COMPLETED";
  session.completedAt = now;
}
```

`CompleteSession(sessionId)` may still complete early by explicit user action, even when counters are not zero.

### Answer

Accepted

---

## 15. Clarify how public study-set sessions appear in dashboard queries

### Current decision

Users can review public study sets they do not own. There is no cross-user visibility of FSRS state.

### Improvement

Make dashboard queries user-specific even when study sets are public.

### Reason

Public visibility allows direct access to the study set content. It does not make other users' review state visible. A public study set should appear in a user's due dashboard only if that user has an FSRS session or state for it.

### Recommendation

Document this rule:

```md
FSRS dashboard queries list user-specific sessions and due states. Public study sets owned by other users are included only when the authenticated user has created their own session/state for that study set.
```

### Answer

FSRS state are per user only, no other user can view other user fsrs state

---

## 16. Keep FSRS service output content-free by design

### Current decision

The FSRS service should not return flashcard content in `GetSessionCards`; the client already has all flashcards.

### Improvement

Make this a formal service boundary.

### Reason

Returning only IDs and scheduling state keeps FSRS focused on session and learning state. It avoids duplicating flashcard service response shapes and reduces coupling.

### Recommendation

Document the boundary:

```md
FSRS returns flashcard IDs, FSRS state, preview state, session state, and due counts. Flashcard content remains owned by the Flashcard service and is fetched separately by consumers.
```

### Answer

Yes add document

---

## Recommended final spec changes

Before writing `src/lib/services/fsrs/SPECS.md`, apply these changes to the FSRS design:

1. Use split counters: `newCardsRemaining` and `dueCardsRemaining`.
2. Use `startedAt` as the session boundary instead of a session-card snapshot table.
3. Make `ResetSession` a required command.
4. Rename dashboard query to `GetStudySetsWithDueCards`.
5. Keep dashboard response count-based, not card-list-based.
6. Add `kind` to `SessionCard` while keeping it content-free.
7. Change `review_log` from upserted-per-card to append-only with optional idempotency.
8. Add `parametersVersion` for future per-user FSRS parameter support.
9. Define FSRS ID prefixes.
10. Require atomic writes for `ReviewFlashcard`.
