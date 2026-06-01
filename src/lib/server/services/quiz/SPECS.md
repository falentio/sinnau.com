# Quiz Service Specs

Source specs:

- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-specs.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v2.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v3.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v4.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v5.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v6.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v7.md`

## Domain Boundary

Quiz is an assessment content item inside one Chapter. QuizOption belongs to Quiz and is managed inside the quiz service domain.

Quiz is responsible for:

- quiz creation, updates, reads, and deletion
- quiz option creation, updates, reads through quiz responses, and deletion
- quiz type constraints and answer option validation
- cascade deletion from quiz to quiz options

Quiz is not responsible for:

- StudySet visibility storage
- Chapter lifecycle management
- moving quizzes between chapters
- quiz attempt tracking, progress tracking, scoring sessions, or spaced repetition
- rich text, markdown, images, cloze deletion, tags, or import/export

## Entities

```typescript
type QuizType = 'MULTIPLE_CHOICE' | 'MULTIPLE_SELECT' | 'FILL_IN_THE_BLANK';

interface Quiz {
	id: UUID;
	chapterId?: UUID;
	studySetId: UUID;
	type: QuizType;
	questionText: string;
	options: QuizOption[];
	ownerId: UUID;
	createdAt: number;
	updatedAt: number;
}

interface QuizOption {
	id: UUID;
	quizId: UUID;
	optionText: string;
	isCorrect: boolean;
	explanation?: string;
	createdAt: number;
	updatedAt: number;
}
```

## Quiz Field Rules

- `id` is server-generated with `crypto.randomUUID()`; clients never provide IDs.
- `chapterId` is optional; when provided must reference an existing Chapter owned by the authenticated user.
- `studySetId` is required and must reference an existing StudySet owned by the authenticated user.
- `type` is required, immutable after creation, and stored/returned as uppercase string enum.
- `questionText` is required, plain text only, and non-empty.
- Quiz has no title field and is identified by ID only.
- `options` are embedded in Quiz responses.
- Quiz can be created without options; responses return `options: []` when no options exist.
- `ownerId` is inferred from auth context and is never client-provided.
- `createdAt` and `updatedAt` are Unix timestamps in milliseconds.
- Unknown fields are ignored for all Quiz and QuizOption request payloads.

## QuizOption Field Rules

- `id` is server-generated with `crypto.randomUUID()`; clients never provide IDs.
- `quizId` is required.
- `optionText` is required, plain text only, non-empty, and limited to roughly 4 sentences.
- Duplicate option text within the same quiz is allowed.
- `isCorrect` is required.
- `explanation` is optional.
- Quiz options are returned in creation order.
- Quiz options are hard-deleted when removed.

## Quiz Type Rules

- `MULTIPLE_CHOICE` quizzes require 2-6 options when complete and exactly one correct option.
- `MULTIPLE_SELECT` quizzes require 2-10 options when complete and at least one correct option.
- `FILL_IN_THE_BLANK` quizzes require exactly one option with `isCorrect: true`.
- A quiz is valid to create without options so options can be added later.
- Option create/update/delete commands must not leave `MULTIPLE_SELECT` quizzes with zero correct options once options exist.
- Option create/update/delete commands must preserve the `FILL_IN_THE_BLANK` invariant of exactly one correct option.
- Quiz type cannot be changed after creation.
- Multiple acceptable answers for fill-in-the-blank are not supported.
- Fill-in-the-blank uses the unified QuizOption model, not a separate `correctAnswer` field.

## Visibility And Authorization

- All Quiz and QuizOption commands require authentication.
- Quizzes inherit visibility from their parent StudySet.
- QuizOptions inherit visibility through Quiz -> Chapter -> StudySet.
- Query access is based on the parent StudySet: owned private StudySets or visible public StudySets.
- Create requires ownership of the target StudySet/Chapter or Quiz.
- Non-owner modification attempts return `FORBIDDEN`.

## Quiz Commands

### CreateQuiz

```typescript
interface CreateQuizCommand {
	studySetId: UUID;
	chapterId?: UUID;
	type: QuizType;
	questionText: string;
	options?: Array<{
		optionText: string;
		isCorrect: boolean;
		explanation?: string;
	}>;
}
```

- Creates a quiz inside an owned StudySet.
- May create options in the same operation.
- Embedded option creation is atomic with quiz creation.
- Validates option constraints when options are provided.
- If options are omitted, the quiz is created with `options: []`.
- Returns `{ success: true, data: Quiz }` with embedded options.

### UpdateQuiz

```typescript
interface UpdateQuizCommand {
	id: UUID;
	questionText: string;
}
```

- Updates `questionText` only.
- Does not support updating options through the quiz update command.
- Does not support changing quiz type.
- Does not support moving a quiz between chapters.
- Returns `{ success: true, data: Quiz }` with embedded options.

### DeleteQuizzes

```typescript
interface DeleteQuizzesCommand {
	ids: UUID[];
}
```

- Deletes one or more quizzes in a batch.
- Checks ownership of all requested IDs before deleting any records.
- Uses all-or-nothing semantics.
- Cascades deletion to all QuizOptions belonging to deleted quizzes.
- If any ID is not owned or not deletable, no quizzes are deleted and `PARTIAL_FORBIDDEN` includes the blocked `ids`.
- Returns `{ success: true }`.

## QuizOption Commands

### CreateQuizOptions

```typescript
interface CreateQuizOptionsCommand {
	options: Array<{
		quizId: UUID;
		optionText: string;
		isCorrect: boolean;
		explanation?: string;
	}>;
}
```

- Creates one or more quiz options in a batch.
- Uses all-or-nothing transaction semantics.
- Validates each option against the owning quiz type.
- For `MULTIPLE_CHOICE`, creating a second correct option is blocked with `MC_ALREADY_HAS_CORRECT`.
- For `MULTIPLE_SELECT`, the resulting option set must include at least one correct option when options exist.
- For `FILL_IN_THE_BLANK`, creating a second option is blocked with `FITB_MULTIPLE_OPTIONS`.
- For `FILL_IN_THE_BLANK`, the single option must be correct.
- Batch timestamps are created per record, not forced to the same timestamp.
- Returns `{ success: true, data: QuizOption[] }`.

### UpdateQuizOption

```typescript
interface UpdateQuizOptionCommand {
	id: UUID;
	optionText?: string;
	isCorrect?: boolean;
	explanation?: string;
}
```

- Partially updates only provided fields.
- For `MULTIPLE_CHOICE`, changing the correct answer requires explicitly unchecking the old correct option before checking a new one.
- For `MULTIPLE_CHOICE`, attempting to set a second correct option is blocked with `MC_ALREADY_HAS_CORRECT`.
- For `MULTIPLE_SELECT`, updating `isCorrect` is blocked when it would leave the quiz with zero correct options.
- For `FILL_IN_THE_BLANK`, adding or changing state in a way that produces multiple options is blocked with `FITB_MULTIPLE_OPTIONS`.
- For `FILL_IN_THE_BLANK`, updating the only option to `isCorrect: false` is blocked.
- Returns `{ success: true, data: QuizOption }`.

### DeleteQuizOptions

```typescript
interface DeleteQuizOptionsCommand {
	ids: UUID[];
}
```

- Deletes one or more quiz options in a batch.
- Checks ownership of all requested IDs before deleting any records.
- Uses all-or-nothing semantics.
- Blocks deleting the last correct option from a `MULTIPLE_CHOICE` quiz with `CANNOT_DELETE_LAST_CORRECT`.
- Blocks deleting the last correct option from a `MULTIPLE_SELECT` quiz with `CANNOT_DELETE_LAST_CORRECT`.
- Blocks deleting the only `FILL_IN_THE_BLANK` option with `CANNOT_DELETE_LAST_CORRECT`.
- If any ID is not owned or not deletable, no quiz options are deleted and `PARTIAL_FORBIDDEN` includes the blocked `ids`.
- Returns `{ success: true }`.

## Queries

### GetQuizzes

```typescript
interface GetQuizzesQuery {
	studySetId: UUID;
}
```

- Returns quizzes for the given StudySet.
- No filters are supported.
- Empty result returns `[]`.
- Default order is `createdAt` descending.
- Every quiz includes embedded `options`.
- Returns `{ success: true, data: Quiz[] }`.

### GetQuiz

```typescript
interface GetQuizQuery {
	id: UUID;
}
```

- Fetches one quiz if the parent StudySet is visible to the authenticated user.
- Always includes embedded `options`; empty options are returned as `[]`.
- Returns `{ success: true, data: Quiz }`.

## Persistence

- Use standard Drizzle schema definitions.
- Store quiz type as an uppercase string and validate allowed values in TypeScript/Valibot.
- Use DB-level unique constraints where possible for simple uniqueness guarantees.
- Index commonly filtered fields, including `ownerId`, `chapterId`, `studySetId`, and `quizId`.

## Errors

- `VALIDATION_FAILED`: invalid quiz, quiz option, ID, chapter ID, quiz ID, type, or request payload.
- `BATCH_VALIDATION_FAILED`: batch validation failed; no records were created or deleted.
- `UNAUTHORIZED`: missing authenticated user.
- `FORBIDDEN`: authenticated user cannot modify the quiz or option.
- `PARTIAL_FORBIDDEN`: batch delete includes IDs the authenticated user cannot delete; the error payload includes those blocked `ids`.
- `NOT_FOUND`: quiz, quiz option, or parent Chapter/StudySet does not exist or is not visible to the user.
- `MC_ALREADY_HAS_CORRECT`: multiple-choice quiz already has a correct option.
- `FITB_MULTIPLE_OPTIONS`: fill-in-the-blank quiz cannot have multiple options.
- `CANNOT_DELETE_LAST_CORRECT`: deleting would leave a quiz without its required correct option.

## Deferred Or Out Of Scope

- Quiz attempts and progress tracking are deferred to a separate domain.
- Scoring sessions and spaced repetition are not handled here.
- Multiple acceptable fill-in-the-blank answers are not supported.
- Markdown/rich text is not supported.
- Images are not supported.
- Cloze deletion is not supported.
- Tags/categories are not supported.
- Import/export is not supported.
