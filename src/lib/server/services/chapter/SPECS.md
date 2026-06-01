# Chapter Service Specs

Source specs:

- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-specs.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v2.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v3.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v4.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v5.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v6.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v7.md`

## Domain Boundary

Chapter is an organizational unit inside one StudySet. Flashcards and quizzes must belong to a chapter.

Chapter is responsible for:

- chapter creation, updates, reads, and deletion
- chapter title, description, study set ownership, and slug rules
- blocking deletion while flashcards or quizzes exist in the chapter

Chapter is not responsible for:

- StudySet visibility storage
- flashcard or quiz content validation
- moving flashcards or quizzes between chapters
- page ranges or nested sub-chapters

## Entity

```typescript
interface Chapter {
	id: UUID;
	slug: string;
	title: string;
	description?: string;
	studySetId: UUID;
	ownerId: UUID;
	createdAt: number;
	updatedAt: number;
}
```

## Field Rules

- `id` is server-generated with `crypto.randomUUID()`; clients never provide IDs.
- `studySetId` is required and must reference an existing StudySet owned by the authenticated user for creation.
- `slug` is auto-generated only; users cannot customize or update it.
- `title` is trimmed before validation.
- `title` must be non-empty after trim, minimum 5 characters, maximum 50 characters.
- `description` is optional and maximum 1000 characters.
- `ownerId` is inferred from auth context and is never client-provided.
- `createdAt` and `updatedAt` are Unix timestamps in milliseconds.
- Unknown fields are ignored for all Chapter request payloads.

## Slug Rules

- Chapter slug generation uses the same algorithm as StudySet slug generation.
- Generate from title with transliteration, lowercase normalization, whitespace-to-hyphen replacement, and special character removal.
- Valid slug characters are lowercase alphanumeric characters and hyphens only.
- If the sanitized slug is shorter than 5 characters, use a random 12-character base32 slug without a dash prefix.
- Otherwise append `-` plus 6 random base32 characters.
- On collision, retry generation with new entropy.
- Chapter slug uniqueness is scoped to the parent StudySet, not global.
- Slug uniqueness checks are case-insensitive.
- Title changes do not regenerate the slug.
- Slug update is not supported.

## Visibility And Authorization

- All Chapter commands require authentication.
- Chapters inherit visibility from their parent StudySet.
- Chapters do not have their own visibility field.
- Query access is based on the parent StudySet: owned private StudySets or visible public StudySets.
- Non-owner modification attempts return `FORBIDDEN`.

## Commands

### CreateChapter

```typescript
interface CreateChapterCommand {
	studySetId: UUID;
	title: string;
	description?: string;
}
```

- Creates a chapter inside an owned StudySet.
- Generates a slug scoped to the parent StudySet.
- Returns `{ success: true, data: Chapter }`.

### UpdateChapter

```typescript
interface UpdateChapterCommand {
	id: UUID;
	title?: string;
	description?: string;
}
```

- Supports updating `title` and `description`.
- Does not support moving the chapter to another StudySet.
- Does not update or regenerate slug.
- Returns `{ success: true, data: Chapter }`.

### DeleteChapter

```typescript
interface DeleteChapterCommand {
	id: UUID;
}
```

- Deletes only chapters owned by the authenticated user.
- Blocks deletion if the chapter contains any flashcards or quizzes.
- Uses error code `CHAPTER_NOT_EMPTY` for non-empty chapters.
- Returns `{ success: true }`.

## Queries

### GetChapters

```typescript
interface GetChaptersQuery {}
```

- Returns chapters in StudySets the authenticated user owns or can view.
- No filters are supported.
- Empty result returns `[]`.
- Default order is `createdAt` descending.
- Returns `{ success: true, data: Chapter[] }`.

### GetChapter

```typescript
interface GetChapterQuery {
	id: UUID;
}
```

- Fetches one chapter if the parent StudySet is visible to the authenticated user.
- Returns `{ success: true, data: Chapter }`.

## Persistence

- Use standard Drizzle schema definitions.
- Enforce chapter slug uniqueness with a composite unique index or constraint on `(studySetId, slug)`.
- Index commonly filtered fields, including `ownerId` and `studySetId`.
- Parent StudySet deletion cascades through Chapters as part of the StudySet service deletion flow.

## Errors

- `VALIDATION_FAILED`: invalid title, description, ID, study set ID, slug, or request payload.
- `UNAUTHORIZED`: missing authenticated user.
- `FORBIDDEN`: authenticated user cannot modify the chapter.
- `NOT_FOUND`: chapter or parent StudySet does not exist or is not visible to the user.
- `CHAPTER_NOT_EMPTY`: chapter cannot be deleted because it contains flashcards or quizzes.
- `SLUG_CONFLICT`: generated slug collides after retry exhaustion.

## Deferred Or Out Of Scope

- Nested sub-chapters are not supported.
- Page ranges are not supported.
- Moving child flashcards or quizzes out of a chapter is not supported by this domain.
