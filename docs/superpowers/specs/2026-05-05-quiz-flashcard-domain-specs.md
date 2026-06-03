# Quiz & Flashcard Domain Specifications (CQRS)

Version: 5.0
Date: 2026-05-05
Status: **CONFIRMED** - Ready for implementation
Purpose: CQRS-based API data model and business logic specification

---

## Architecture Overview

**CQRS Pattern** with SvelteKit Remote Functions:

- **Commands**: `command` from `$app/server` — mutate state
- **Queries**: `query` from `$app/server` — read state
- **Validation**: Valibot schemas (Standard Schema)
- **Error Handling**: `error()` from `@sveltejs/kit` with error codes

---

## Project Structure

```
src/lib/services/
├── study-set/
│   ├── study-set.repository.drizzle.ts  # implementation
│   ├── guard.ts                        # shared guards
│   ├── command/
│   │   └── create-study-set.ts
│   ├── query/
│   │   ├── get-study-sets.ts
│   │   └── get-study-set.ts
│   └── index.ts                        # re-exports
├── chapter/
│   ├── chapter.repository.drizzle.ts
│   ├── guard.ts
│   ├── command/
│   └── query/
├── flashcard/
│   ├── flashcard.repository.drizzle.ts
│   ├── guard.ts
│   ├── command/
│   └── query/
├── quiz/
│   ├── quiz.repository.drizzle.ts      # contract + impl
│   ├── quiz-option.repository.drizzle.ts
│   ├── guard.ts
│   ├── command/
│   │   ├── create-quiz.ts
│   │   ├── update-quiz.ts
│   │   └── delete-quizzes.ts
│   └── query/
│       ├── get-quizzes.ts
│       └── get-quiz.ts
└── index.ts
```

**Key Patterns:**

- **Repository**: Class with constructor accepting narrow dependencies (e.g., Drizzle instance, auth context)
- **Guard**: Authorization and validation logic not handled by Valibot (ownership checks, visibility rules)
- **Command/Query**: One file per procedure, using SvelteKit remote functions
- **Contract**: TypeScript interfaces in repository implementation files

---

## Architecture Shift: From HTTP to CQRS

Previous specs used HTTP REST patterns (GET/POST/PATCH/DELETE with endpoints). This version refactors to **CQRS (Command Query Responsibility Segregation)**:

- **Commands**: Operations that mutate state (Create, Update, Delete)
- **Queries**: Operations that read state (Get, List)
- **No HTTP verbs**: Commands and Queries are named by intent
- **No HTTP status codes**: Results include success/failure with error codes

---

## Entities

| Entity     | Description                                                    |
| ---------- | -------------------------------------------------------------- |
| StudySet   | Top-level container grouping chapters, flashcards, and quizzes |
| Chapter    | Organizational unit within a StudySet (no sub-chapters)        |
| Flashcard  | Question-answer pair with optional hint                        |
| Quiz       | Assessment with question text and options                      |
| QuizOption | Answer option for quizzes                                      |

---

## Data Types

### UUID

- Auto-generated using `crypto.randomUUID()`
- Displayed as 36-character lowercase string: `"550e8400-e29b-41d4-a716-446655440000"`

### Timestamp

- Unix timestamp in milliseconds (number)
- Example: `1704364200000`

### Visibility Enum

- `"PUBLIC"` | `"PRIVATE"`
- Default: `"PUBLIC"`

### QuizType Enum

- `"MULTIPLE_CHOICE"` | `"MULTIPLE_SELECT"` | `"FILL_IN_THE_BLANK"`

---

## 1. StudySet

```typescript
interface StudySet {
	id: UUID;
	slug: string; // auto-generated: transliterated + entropy
	title: string; // 5-50 chars, non-empty, trimmed
	description?: string; // max 2000 chars
	visibility: Visibility;
	ownerId: UUID; // from auth context
	createdAt: Timestamp;
	updatedAt: Timestamp;
}
```

**Slug Generation:**

1. Transliterate title to ASCII (remove accents)
2. Sanitize: lowercase, replace spaces with hyphens, remove special chars
3. If result < 5 chars: use 12 random base32 chars (no hyphen)
4. Otherwise: add "-" + 6 random base32 chars at end
5. On collision: retry with new entropy
6. Check is case-insensitive

**Deletion:** Cascade deletes all Chapters, Flashcards, Quizzes

---

## 2. Chapter

```typescript
interface Chapter {
	id: UUID;
	slug: string; // auto-generated, same rules as StudySet
	title: string; // 5-50 chars, non-empty, trimmed
	description?: string; // max 1000 chars
	studySetId: UUID; // required
	ownerId: UUID; // from auth context
	createdAt: Timestamp;
	updatedAt: Timestamp;
}
```

**Slug Uniqueness:** Unique within parent StudySet (not globally)

**Deletion:** Blocked if contains any Flashcards or Quizzes (error: `CHAPTER_NOT_EMPTY`)

---

## 3. Flashcard

```typescript
interface Flashcard {
	id: UUID;
	chapterId: UUID; // required, must exist
	studySetId: UUID; // required
	front: string; // non-empty, max ~4 sentences, plain text
	back: string; // non-empty, max ~4 sentences, plain text
	hint?: string; // max 500 chars, plain text
	importance: number; // integer >= 0, default 0
	ownerId: UUID; // from auth context
	createdAt: Timestamp;
	updatedAt: Timestamp;
}
```

**Content:** Plain text only (no markdown, no images)

**Importance:** Any non-negative integer, displayed as percentile

**Transfer:** Not supported. Must delete and create in new chapter.

---

## 4. Quiz

```typescript
interface Quiz {
	id: UUID;
	chapterId: UUID; // required
	studySetId: UUID; // required
	type: QuizType; // immutable after creation
	questionText: string; // non-empty, plain text
	options: QuizOption[]; // embedded in response, empty array if none
	ownerId: UUID; // from auth context
	createdAt: Timestamp;
	updatedAt: Timestamp;
}
```

**No title field.** Quiz identified by ID only.

**Type Rules:**

- `MULTIPLE_CHOICE`: 2-6 options, exactly 1 with `is_correct=true`
- `MULTIPLE_SELECT`: 2-10 options, 1+ with `is_correct=true`
- `FILL_IN_THE_BLANK`: exactly 1 option with `is_correct=true`

**Options:** Embedded in Quiz response (not separate query). Empty array `[]` if none.

**Deletion:** Cascade deletes all QuizOptions

---

## 5. QuizOption

```typescript
interface QuizOption {
	id: UUID;
	quizId: UUID; // required
	optionText: string; // non-empty, max ~4 sentences
	isCorrect: boolean;
	explanation?: string; // optional
	createdAt: Timestamp;
	updatedAt: Timestamp;
}
```

**Option Text Max:** ~4 sentences (same as Flashcard front/back)

**QuizType Constraints:**

- For `MULTIPLE_CHOICE`: Cannot add second correct option (error: `MC_ALREADY_HAS_CORRECT`)
- For `MULTIPLE_SELECT`: No limit on correct count
- For `FILL_IN_THE_BLANK`: Cannot add second option (error: `FITB_MULTIPLE_OPTIONS`)

**Correct Answer Change (MC):** Must explicitly uncheck old before checking new

**Delete Last Correct:** Blocked for MC quizzes (error: `CANNOT_DELETE_LAST_CORRECT`)

---

## Commands

Commands are operations that mutate state. Use `command` from `$app/server`.

### Command Pattern

```typescript
import { command } from '$app/server';
import { error } from '@sveltejs/kit';
import { guard } from '../guard';
import type { Repository } from '../quiz.repository.drizzle';

export function createQuiz(repo: Repository) {
	return command(QuizSchema, async (data) => {
		// Guard checks
		guard.isAuthenticated();
		guard.canCreateQuiz(data);

		// Create
		const quiz = await repo.createQuiz(data);
		return quiz;
	});
}
```

### Error Handling

Use `error()` from `@sveltejs/kit`:

```typescript
error(400, { code: 'VALIDATION_FAILED', message: '...' });
error(403, { code: 'FORBIDDEN', message: '...' });
error(404, { code: 'NOT_FOUND', message: '...' });
error(409, { code: 'CHAPTER_NOT_EMPTY', message: '...' });
```

### Guard Pattern

Guards handle authorization and complex validation not covered by Valibot:

```typescript
// guard.ts
export const guard = {
	isAuthenticated() {
		const event = getRequestEvent();
		if (!event.locals.user) {
			error(401, { code: 'UNAUTHORIZED', message: '...' });
		}
	},

	isOwner(ownerId: UUID) {
		const event = getRequestEvent();
		if (event.locals.user.id !== ownerId) {
			error(403, { code: 'FORBIDDEN', message: '...' });
		}
	},

	chapterExists(chapterId: UUID) {
		// Check chapter exists and user has access
	}
};
```

### StudySet Commands

**CreateStudySet**

```typescript
interface CreateStudySetCommand {
	title: string; // 5-50 chars
	description?: string;
	visibility?: Visibility; // default: PUBLIC
}
```

Returns: `{ success: true, data: StudySet }` with auto-generated slug

**UpdateStudySet**

```typescript
interface UpdateStudySetCommand {
	id: UUID;
	title?: string;
	description?: string;
	visibility?: Visibility;
}
```

Updatable fields: `title`, `description`, `visibility`
Returns: `{ success: true, data: StudySet }`

**DeleteStudySet**

```typescript
interface DeleteStudySetCommand {
	id: UUID;
}
```

Cascade deletes: Chapters → Flashcards → Quizzes → QuizOptions
Returns: `{ success: true }`

---

### Chapter Commands

**CreateChapter**

```typescript
interface CreateChapterCommand {
	studySetId: UUID;
	title: string; // 5-50 chars
	description?: string;
}
```

Returns: `{ success: true, data: Chapter }`

**UpdateChapter**

```typescript
interface UpdateChapterCommand {
	id: UUID;
	title?: string;
	description?: string;
}
```

Returns: `{ success: true, data: Chapter }`

**DeleteChapter**

```typescript
interface DeleteChapterCommand {
	id: UUID;
}
```

Blocked if has Flashcards or Quizzes (error: `CHAPTER_NOT_EMPTY`)
Returns: `{ success: true }`

---

### Flashcard Commands

**CreateFlashcards**

```typescript
interface CreateFlashcardsCommand {
	flashcards: Array<{
		chapterId: UUID;
		front: string;
		back: string;
		hint?: string;
		importance?: number; // default: 0
	}>;
}
```

Batch operation - all-or-nothing transaction
Returns: `{ success: true, data: Flashcard[] }`

**UpdateFlashcard**

```typescript
interface UpdateFlashcardCommand {
	id: UUID;
	front: string; // required (replace semantics)
	back: string; // required (replace semantics)
	hint?: string;
}
```

Replace semantics - all fields must be provided
Returns: `{ success: true, data: Flashcard }`

**DeleteFlashcards**

```typescript
interface DeleteFlashcardsCommand {
	ids: UUID[];
}
```

All-or-nothing: checks ownership of all before deleting any
Returns: `{ success: true }` with 204 No Content

---

### Quiz Commands

**CreateQuiz**

```typescript
interface CreateQuizCommand {
	chapterId: UUID;
	type: QuizType;
	questionText: string;
	options?: Array<{
		optionText: string;
		isCorrect: boolean;
		explanation?: string;
	}>;
}
```

Options embedded in quiz creation (one-step)
Validation on option count per type
Returns: `{ success: true, data: Quiz }` with embedded options

**UpdateQuiz**

```typescript
interface UpdateQuizCommand {
	id: UUID;
	questionText: string; // required
}
```

Only `questionText` is updatable (type is immutable)
Returns: `{ success: true, data: Quiz }`

**DeleteQuizzes**

```typescript
interface DeleteQuizzesCommand {
	ids: UUID[];
}
```

Cascade deletes QuizOptions
All-or-nothing
Returns: `{ success: true }` with 204 No Content

---

### QuizOption Commands

**CreateQuizOptions**

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

Batch operation
Validation per quiz type rules
Returns: `{ success: true, data: QuizOption[] }`

**UpdateQuizOption**

```typescript
interface UpdateQuizOptionCommand {
	id: UUID;
	optionText?: string;
	isCorrect?: boolean;
	explanation?: string;
}
```

Partial update - only provided fields updated
For MC: must uncheck previous correct before checking new
Returns: `{ success: true, data: QuizOption }`

**DeleteQuizOptions**

```typescript
interface DeleteQuizOptionsCommand {
	ids: UUID[];
}
```

All-or-nothing
Blocked if would leave MC quiz with 0 correct options
Returns: `{ success: true }` with 204 No Content

---

## Queries

Queries are operations that read state. They return a `QueryResult`.

```typescript
interface QueryResult<T> {
	success: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
	};
}
```

### StudySet Queries

**GetStudySets**

```typescript
interface GetStudySetsQuery {
	// No filters - returns all user's study sets
	// Implicitly filtered by auth context (owner) + public visibility
}
```

Returns: `{ success: true, data: StudySet[] }`
Order: by `createdAt` DESC

**GetStudySet**

```typescript
interface GetStudySetQuery {
	id: UUID;
}
```

Or by slug: `{ slug: string }`
Returns: `{ success: true, data: StudySet }`

---

### Chapter Queries

**GetChapters**

```typescript
interface GetChaptersQuery {
	// No filters - returns all chapters for accessible study sets
}
```

Order: by `createdAt` DESC
Returns: `{ success: true, data: Chapter[] }`

**GetChapter**

```typescript
interface GetChapterQuery {
	id: UUID;
}
```

Returns: `{ success: true, data: Chapter }`

---

### Flashcard Queries

**GetFlashcards**

```typescript
interface GetFlashcardsQuery {
	// No filters - returns all flashcards
}
```

Order: by `createdAt` DESC
Returns: `{ success: true, data: Flashcard[] }`

**GetFlashcard**

```typescript
interface GetFlashcardQuery {
	id: UUID;
}
```

Returns: `{ success: true, data: Flashcard }`

---

### Quiz Queries

**GetQuizzes**

```typescript
interface GetQuizzesQuery {
	// No filters - returns all quizzes
}
```

Order: by `createdAt` DESC
Returns: `{ success: true, data: Quiz[] }` with embedded options

**GetQuiz**

```typescript
interface GetQuizQuery {
	id: UUID;
}
```

Returns: `{ success: true, data: Quiz }` with embedded options

---

## Authorization

- All queries return only resources user owns (private) or can view (public)
- All commands require authentication
- ownerId inferred from auth context (never user-provided)
- Non-owner attempt: `{ success: false, error: { code: "FORBIDDEN", message: "..." } }`
- Batch operations: check all ownership first, all-or-nothing

---

## Error Codes

| Code                         | HTTP Equivalent | Description                            |
| ---------------------------- | --------------- | -------------------------------------- |
| `VALIDATION_FAILED`          | 400             | Input validation failed                |
| `NOT_FOUND`                  | 404             | Resource not found                     |
| `FORBIDDEN`                  | 403             | Not owner / no access                  |
| `CHAPTER_NOT_EMPTY`          | 409             | Cannot delete chapter with children    |
| `SLUG_CONFLICT`              | 409             | Slug already in use                    |
| `MC_ALREADY_HAS_CORRECT`     | 409             | MC quiz already has correct option     |
| `FITB_MULTIPLE_OPTIONS`      | 409             | FITB quiz cannot have multiple options |
| `CANNOT_DELETE_LAST_CORRECT` | 409             | Cannot delete last correct option      |
| `BATCH_VALIDATION_FAILED`    | 400             | Batch create failed (all-or-nothing)   |
| `PARTIAL_FORBIDDEN`          | 403             | Some IDs not owned in batch            |

---

## Validation Rules Summary

| Entity     | Field                  | Rule                                      |
| ---------- | ---------------------- | ----------------------------------------- |
| StudySet   | title                  | 5-50 chars, trimmed, non-empty after trim |
| StudySet   | visibility             | PUBLIC or PRIVATE, default PUBLIC         |
| Chapter    | title                  | 5-50 chars, trimmed, non-empty            |
| Chapter    | slug                   | auto-generated only                       |
| Flashcard  | front                  | non-empty, max ~4 sentences               |
| Flashcard  | back                   | non-empty, max ~4 sentences               |
| Flashcard  | hint                   | max 500 chars                             |
| Flashcard  | importance             | integer >= 0                              |
| Flashcard  | chapterId              | must exist                                |
| Quiz       | questionText           | non-empty                                 |
| Quiz       | type                   | immutable after creation                  |
| Quiz       | type=MULTIPLE_CHOICE   | options count 2-6                         |
| Quiz       | type=MULTIPLE_SELECT   | options count 2-10                        |
| Quiz       | type=FILL_IN_THE_BLANK | options count exactly 1                   |
| QuizOption | optionText             | non-empty, max ~4 sentences               |
| QuizOption | isCorrect              | required                                  |
| QuizOption | explanation            | optional                                  |

---

## Slug Generation Algorithm

```
function generateSlug(title: string): string {
  // 1. Transliterate to ASCII
  slug = transliterate(title);

  // 2. Lowercase, replace spaces with hyphens, remove special chars
  slug = slug.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');

  // 3. If result < 5 chars, use random 12 char base32
  if (slug.length < 5) {
    return randomBase32(12); // no hyphen prefix
  }

  // 4. Add random 6 char entropy with hyphen
  return slug + '-' + randomBase32(6);
}

function randomBase32(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz234567';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[crypto.getRandomValues(new Uint8Array(1))[0] % 32];
  }
  return result;
}
```

---

## Deferred Features

- Quiz attempt tracking
- Multiple acceptable answers for FITB
- Image support
- Chapter page ranges
- Tags/categories
- Cloze deletion
- Soft delete
- Spaced repetition metadata
- Import/export
- Ownership transfer
- CORS, rate limiting, health check (out of scope)
