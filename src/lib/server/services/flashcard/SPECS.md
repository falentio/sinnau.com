# Flashcard Service Specs

Source specs:

- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-specs.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v2.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v3.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v4.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v5.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v6.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v7.md`
- `docs/superpowers/specs/2026-05-11-flashcard-rating-buttons-design.md`

## Domain Boundary

Flashcard is a question-answer content item inside one Chapter.

Flashcard is responsible for:

- flashcard creation, updates, reads, and deletion
- front/back/hint/importance validation
- batch create and batch delete semantics
- flashcard session rating UI requirements where they affect flashcard presentation

Flashcard is not responsible for:

- StudySet visibility storage
- Chapter lifecycle management
- moving flashcards between chapters
- rich text, markdown, images, cloze deletion, tags, or import/export
- spaced repetition persistence or scheduling logic

## Entity

```typescript
interface Flashcard {
  id: UUID;
  chapterId?: UUID;
  studySetId: UUID;
  front: string;
  back: string;
  hint?: string;
  importance: number;
  ownerId: UUID;
  createdAt: number;
  updatedAt: number;
}
```

## Field Rules

- `id` is server-generated with `crypto.randomUUID()`; clients never provide IDs.
- `chapterId` is optional; when provided must reference an existing Chapter owned by the authenticated user.
- `studySetId` is required and must reference an existing StudySet owned by the authenticated user.
- `front` is required, plain text only, non-empty, and limited to roughly 4 sentences.
- `back` is required, plain text only, non-empty, and limited to roughly 4 sentences.
- `front` and `back` may contain the same content.
- `hint` is optional, plain text only, and maximum 500 characters.
- `importance` is an integer greater than or equal to 0.
- `importance` defaults to 0, where 0 means lowest priority and can be explicitly set.
- `importance` is unbounded above and displayed by consumers as a 0-100 percentile based on relative ranking.
- `ownerId` is inferred from auth context and is never client-provided.
- `createdAt` and `updatedAt` are Unix timestamps in milliseconds.
- Unknown fields are ignored for all Flashcard request payloads.

## Visibility And Authorization

- All Flashcard commands require authentication.
- Flashcards inherit visibility from their parent StudySet.
- Flashcards do not have their own visibility field.
- Query access is based on the parent StudySet: owned private StudySets or visible public StudySets.
- Create requires ownership of the target StudySet/Chapter.
- Non-owner modification attempts return `FORBIDDEN`.

## Commands

### CreateFlashcards

```typescript
interface CreateFlashcardsCommand {
  studySetId: UUID;
  flashcards: Array<{
    chapterId?: UUID;
    front: string;
    back: string;
    hint?: string;
    importance?: number;
  }>;
}
```

- Creates one or more flashcards in a batch inside an owned StudySet.
- Uses all-or-nothing transaction semantics.
- If any item fails validation, no flashcards are created.
- Batch response order must match request order.
- Batch timestamps are created per record, not forced to the same timestamp.
- Returns `{ success: true, data: Flashcard[] }`.

### UpdateFlashcard

```typescript
interface UpdateFlashcardCommand {
  id: UUID;
  front: string;
  back: string;
  hint?: string;
  importance?: number;
}
```

- Updates one flashcard.
- Uses replace semantics for content fields; the client must provide `front` and `back`.
- Supports updating `front`, `back`, `hint`, and `importance`.
- `importance` can be updated at any time when provided.
- Does not support updating `chapterId`.
- Does not support moving a flashcard between chapters.
- Does not provide a dedicated swap operation; if swap behavior is needed, it must be represented as a normal update by the client.
- Returns `{ success: true, data: Flashcard }`.

### DeleteFlashcards

```typescript
interface DeleteFlashcardsCommand {
  ids: UUID[];
}
```

- Deletes one or more flashcards in a batch.
- Checks ownership of all requested IDs before deleting any records.
- Uses all-or-nothing semantics.
- If any ID is not owned or not deletable, no flashcards are deleted and `PARTIAL_FORBIDDEN` includes the blocked `ids`.
- Returns `{ success: true }`.

## Queries

### GetFlashcards

```typescript
interface GetFlashcardsQuery {
  studySetId: UUID;
}
```

- Returns flashcards for the given StudySet.
- No filters are supported.
- Empty result returns `[]`.
- Default order is `createdAt` descending.
- Returns `{ success: true, data: Flashcard[] }`.

### GetFlashcard

```typescript
interface GetFlashcardQuery {
  id: UUID;
}
```

- Fetches one flashcard if the parent StudySet is visible to the authenticated user.
- Returns `{ success: true, data: Flashcard }`.

## Persistence

- Use standard Drizzle schema definitions.
- Index commonly filtered fields, including `ownerId`, `chapterId`, and `studySetId`.
- Flashcard content is stored as plain text.

## Flashcard Session Rating UI

This UI requirement belongs to flashcard presentation, not flashcard persistence.

- The flashcard session rating panel remains below the flashcard.
- The panel title is `Seberapa paham kamu?`.
- The panel may include helper text or a right-aligned label `Jadwal ulang`.
- The four rating choices must be visible at the same time on mobile and desktop.
- The four rating buttons are equal-width buttons in one row.
- Each button stacks emotion icon, rating label, and interval vertically.
- Each interval is shown with a time/hour icon and interval text.
- The row preserves the existing visual language: rounded corners, card background, subtle shadow, and color-coded choices.
- Buttons must remain actual button elements through the existing `Button` component or equivalent accessible markup.
- The accessible label must include the visible interval text so keyboard and screen-reader users understand the consequence.

Default rating intervals:

| Rating | Interval |
| ------ | -------- |
| Lupa   | 1 jam    |
| Sulit  | 6 jam    |
| Cukup  | 1 hari   |
| Mudah  | 3 hari   |

The rating UI scope excludes saving ratings, implementing spaced-repetition logic, navigating to the next card, and loading real session data.

## Errors

- `VALIDATION_FAILED`: invalid front, back, hint, importance, ID, chapter ID, or request payload.
- `BATCH_VALIDATION_FAILED`: batch create validation failed; no flashcards were created.
- `UNAUTHORIZED`: missing authenticated user.
- `FORBIDDEN`: authenticated user cannot modify the flashcard.
- `PARTIAL_FORBIDDEN`: batch delete includes IDs the authenticated user cannot delete; the error payload includes those blocked `ids`.
- `NOT_FOUND`: flashcard or parent Chapter/StudySet does not exist or is not visible to the user.

## Deferred Or Out Of Scope

- Markdown/rich text is not supported.
- Images are not supported.
- Cloze deletion is not supported.
- Tags/categories are not supported.
- Import/export is not supported.
- Spaced repetition metadata belongs to another domain and is not stored here.
