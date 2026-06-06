# FSRS Service - Improvement Proposals After Spec Review

Sources reviewed:

- `src/lib/services/fsrs/SPECS.md`
- `docs/superpowers/specs/2026-05-25-fsrs-service-questions.md`
- `docs/superpowers/specs/2026-05-25-fsrs-service-questions-v2.md`
- `docs/superpowers/specs/2026-05-25-fsrs-service-questions-v3.md`
- `docs/superpowers/specs/2026-05-25-fsrs-service-improvement-proposals-after-v3.md`
- `docs/superpowers/specs/2026-05-25-fsrs-service-questions-v4.md`
- `src/lib/services/flashcard/SPECS.md`
- `src/lib/services/study-set/SPECS.md`
- `src/lib/infras/db/schema/*.ts`
- Current Context7 docs for `ts-fsrs` and Drizzle ORM

This document proposes improvements only. Answer each section before changing `src/lib/services/fsrs/SPECS.md`.

---

## 1. Reconcile FSRS `parametersVersion` with the accepted `preset` wording

### Current spec

`FlashcardState` and `ReviewLog` store `parametersVersion: string`, defaulting to values like `default-v1`.

### Concern

The accepted proposal in `2026-05-25-fsrs-service-improvement-proposals-after-v3.md` says the value should be stored in the session and called `preset`, not `version`.

### Improvement

Use one canonical term and decide whether it belongs only on `ReviewSession` or is copied to state/log rows for auditability.

### Recommendation

Use `fsrsPreset` as the canonical field name.

Store it on `ReviewSession` as the source for reviews in that session, and copy it to `ReviewLog` and `FlashcardState` as denormalized audit metadata. This keeps the accepted session-level decision while preserving enough history to debug or reschedule without relying on joins.

### Answer

use fsrsPreset

---

## 2. Remove stored card counters from long-lived sessions

### Current spec

`ReviewSession` stores `newCardsRemaining` only. Due-card remaining counts are computed from `FlashcardState` when needed.

### Concern

The clarified model makes a session a long-lived per-user StudySet state container, not a per-run review boundary. Stored card counters become stale when flashcards are created or deleted, and due counts naturally change as time passes.

### Improvement

Remove stored card-remaining counters from `ReviewSession`.

### Recommendation

Do not store `newCardsRemaining`, `dueCardsRemaining`, or aggregate `remainingCards` on `ReviewSession`.

Compute current counts live:

- `newCardsCount`: flashcards in the StudySet with no `FlashcardState` for the user.
- `dueCardsCount`: flashcards in the StudySet with `FlashcardState.due <= now` for the user.

If the UI needs progress metadata, return computed counts from `GetSession`, `GetSessionCards`, or dashboard queries rather than persisting them on the session row.

### Answer

I misss typed, it should be newCardRemaining that removed, because it hard to keep with study set flashcard creation

---

## 3. Replace run-boundary card recovery with a live worklist

### Current spec

`GetSessionCards` returns every card eligible for the session boundary, even if it already has a `ReviewLog` in the session. The client may track reviewed cards locally. `ReviewFlashcard` rejects duplicate reviews.

### Concern

The clarified session model is not a review run. A card can be reviewed more than once in the same long-lived session, so `reviewedInSession` and run-boundary recovery are the wrong concepts.

### Improvement

Make `GetSessionCards` return the current live worklist for the long-lived session.

### Recommendation

Remove `reviewedInSession` from the proposal.

`GetSessionCards` should return currently reviewable cards only:

- `NEW`: flashcards in the StudySet with no `FlashcardState` for the user.
- `DUE`: flashcards in the StudySet with `FlashcardState.due <= now` for the user.

Previously reviewed cards that are not currently due should not be returned by `GetSessionCards`. If the UI needs a history or summary view, add a separate review-log query later.

### Answer

---

## 4. Allow repeated reviews within a long-lived session

### Current spec

A flashcard may be reviewed at most once per session. Session membership is fixed by `session.startedAt`, and cards that become due after `startedAt` wait for a later session.

### Concern

The clarified model says a session can re-review the same flashcard more than once. The session is an actor/state container, not a per-day or per-run review boundary.

### Improvement

Remove duplicate-review restrictions from the FSRS session model.

### Recommendation

Allow multiple `ReviewLog` rows for the same `(sessionId, flashcardId)`.

Remove the unique constraint or service guard that prevents duplicate review logs for `(sessionId, flashcardId)`. A review is valid when the flashcard belongs to the session's StudySet, the user has current access, and the card is currently reviewable (`NEW` or `due <= now`).

Learning and relearning repeats can happen in the same long-lived session whenever ts-fsrs schedules the card as due again.

### Answer

Let me clarify, the session would able to re-review flashcard for more than once, it session are just entity to remember who review the flashcard and organize that actor state, not per review session, not per day, it has lifetime until deleted manually or all completed

---

## 5. Clarify what `GetStudySetsWithDueCards.session` represents

### Current spec

`GetStudySetsWithDueCards` returns `{ studySet, session, dueCardsCount }` for StudySets with due cards.

### Concern

A StudySet should have at most one long-lived FSRS session per user. The previous distinction between active/latest/historical sessions no longer fits.

### Improvement

Rename or define the field so dashboard behavior is deterministic.

### Recommendation

Keep the response shape `{ studySet, session, dueCardsCount }`.

`session` means the user's long-lived FSRS session for that StudySet. If no session exists yet, the StudySet should not appear in `GetStudySetsWithDueCards` unless we explicitly decide to synthesize one.

### Answer

---

## 6. Replace active-session uniqueness with lifetime session uniqueness

### Current spec

At most one `ACTIVE` session may exist per `(userId, studySetId)`, enforced with a partial unique index or equivalent application-level guarantee.

### Concern

The clarified model does not need multiple historical sessions or active-session filtering. The invariant is stricter: one long-lived session per `(userId, studySetId)` until manually deleted.

### Improvement

Prefer a database-level uniqueness guarantee and use application-level checks only as a fallback.

### Recommendation

Require a database-level unique constraint on `(userId, studySetId)` for `review_session`.

```typescript
uniqueIndex("review_session_user_study_set_idx").on(
  table.userId,
  table.studySetId
);
```

`StartSession` becomes get-or-create for that pair. `ResetSession` should be removed or redefined as manual session deletion/recreation.

### Answer

---

## 7. Revisit retry behavior now that repeated reviews are valid

### Current spec

No idempotency key is required. The old duplicate-review guard rejected repeated reviews for the same `(sessionId, flashcardId)`.

### Concern

Once repeated reviews are valid, retrying after a network timeout can apply FSRS twice. There is no longer a duplicate-review error to use for recovery.

### Improvement

Document retry semantics without relying on duplicate-review recovery.

### Recommendation

If we still do not want idempotency keys for MVP, document the tradeoff explicitly: each accepted `ReviewFlashcard` call is a real review event and may advance FSRS state, including accidental retries.

The client must prevent double submission with UI locking. Server-side idempotency can remain deferred, but `CARD_ALREADY_REVIEWED_IN_SESSION` should be removed because repeated reviews are allowed.

### Answer

---

## 8. Clarify first-review `ReviewLog.previousState`

### Current spec

`ReviewLog.previousState` is always a `ReviewLogStateSnapshot`, but a never-reviewed card has no persisted `FlashcardState`. Public `FsrsCardState.due` may be `null` for never-reviewed cards.

### Concern

Implementers may either snapshot an in-memory empty ts-fsrs card or store `null` for the first review. Both are defensible, but the spec currently implies a non-null snapshot without explaining the first-review case.

### Improvement

Define the first-review snapshot explicitly.

### Recommendation

Use `previousState: ReviewLogStateSnapshot | null` and set it to `null` when no persisted `FlashcardState` existed before the review. `newState` remains required.

### Answer

---

## 9. Add FSRS validation and testing sections

### Current spec

FSRS lists entities, commands, queries, persistence, and errors, but it does not have explicit `Validation` or `Testing` sections like newer service specs.

### Concern

FSRS has more invariants than many services: prefixed IDs, enum mappings, session ownership, current StudySet visibility, transaction atomicity, computed preview state, repeated review semantics, live worklist computation, and live completion calculation. Without a testing checklist, implementation can satisfy the shape while missing critical behavior.

### Improvement

Add explicit validation and testing requirements.

### Recommendation

Add a `Validation` section requiring Valibot schemas, `prefixedIdValidator(...)`, `v.picklist` enums, unknown-field behavior, and Date-to-Unix-ms response conversion.

Add a `Testing` section covering long-lived session lifecycle, authorization, `GetSessionCards` live worklist ordering, preview generation, first review, repeated due review, learning-step repeats, transaction rollback, and dashboard due-card filtering.

### Answer

---

## 10. Align Flashcard rating UI specs with FSRS dynamic intervals

### Current spec

`src/lib/services/flashcard/SPECS.md` still lists static default rating intervals: Lupa 1 jam, Sulit 6 jam, Cukup 1 hari, Mudah 3 hari.

### Concern

The first FSRS question file explicitly answered that these intervals should be removed because FSRS provides dynamic intervals. Keeping static defaults in Flashcard specs conflicts with the FSRS boundary and can cause the UI to show stale fixed labels instead of `previewState` values.

### Improvement

Update the Flashcard spec to treat those labels as presentation labels only, with interval text supplied by FSRS when scheduling is active.

### Recommendation

Remove the static interval table from `src/lib/services/flashcard/SPECS.md` or replace it with: `Rating interval text is provided by FSRS preview state when reviewing scheduled cards; Flashcard owns only the visual placement and accessibility of the rating buttons.`

### Answer

---

## 11. Clarify FSRS visibility error semantics

### Current spec

The error list includes both `FORBIDDEN` for inaccessible StudySets/sessions/flashcards and `NOT_FOUND` for resources that do not exist or are not visible.

### Concern

StudySet specs generally hide inaccessible read resources as `NOT_FOUND`, while mutation authorization failures may use `FORBIDDEN`. FSRS has a special case: a user can own an FSRS session row for a public StudySet that later becomes private.

### Improvement

Define when FSRS uses `NOT_FOUND` versus `FORBIDDEN`.

### Recommendation

Use `NOT_FOUND` when the requested StudySet, session, or flashcard cannot be resolved through current visibility rules. Use `FORBIDDEN` when the resource is known to belong to the authenticated user but current StudySet visibility blocks the operation, such as a stored session for a public StudySet that became private.

### Answer

---

## 12. Replace lazy stored-counter refresh with live completion calculation

### Current spec

`GetSession` and `GetSessionCards` lazily refresh `newCardsRemaining` if flashcard deletion made the stored counter stale.

### Concern

With long-lived sessions, stored counters are the wrong source of truth. Completion depends on live content and due state, which can change when flashcards are added, deleted, or become due again.

### Improvement

Compute completion from live data rather than refreshing stored counters.

### Recommendation

Remove lazy `newCardsRemaining` refresh rules.

Define `isComplete` or `status = 'COMPLETED'` from the live condition: the StudySet has no `NEW` cards for the user and no currently due cards for the user.

If `status` is persisted, it must be allowed to move back from `COMPLETED` to `ACTIVE` when new flashcards are added or previously reviewed cards become due again. If we do not want that lifecycle complexity, make completion a derived response field instead of a stored status.

### Answer

---

## 13. Specify Drizzle/D1 storage modes for FSRS fields

### Current spec

The persistence section names tables, constraints, and indexes, but does not specify Drizzle column modes for timestamps or JSON snapshots.

### Concern

Existing schema files use `integer(..., { mode: 'timestamp_ms' })` for Date-backed timestamps and `text(..., { mode: 'json' })` for JSON values. FSRS has many date fields and JSON snapshots, so inconsistent storage choices would make repository conversion harder.

### Improvement

Add storage-mode guidance to the persistence section.

### Recommendation

Use `integer(..., { mode: 'timestamp_ms' })` for persisted Date fields, `real` for `stability` and `difficulty`, `integer` for counters and enum-independent numeric fields, `text(..., { enum })` for uppercase state/rating/status values, and `text(..., { mode: 'json' })` for review-log snapshots.

### Answer
