# StudySet Service Specs

Source specs:

- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-specs.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v2.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v3.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v4.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v5.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v6.md`
- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-questions-v7.md`

## Domain Boundary

StudySet is the top-level container for learning content. It owns visibility, sharing, and deletion scope for chapters, flashcards, quizzes, and quiz options.

StudySet is responsible for:

- study set creation, updates, reads, soft-deletion, and restoration
- title, description, visibility, ownership, and slug rules
- visibility rules inherited by child entities
- soft-deletion with access preserved for linked users

StudySet is not responsible for:

- chapter content validation beyond cascade/visibility ownership rules
- flashcard or quiz content validation
- ownership transfer
- import/export
- spaced repetition scheduling
- public discovery/search listings

## Entity

```typescript
interface StudySet {
  id: UUID;
  slug: string;
  title: string;
  description?: string;
  visibility: "PUBLIC" | "PRIVATE";
  ownerId: UUID;
  files: string[];
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}
```

## Field Rules

- `id` is server-generated with `crypto.randomUUID()`; clients never provide IDs.
- `slug` is auto-generated only; users cannot customize or update it.
- `title` is trimmed before validation.
- `title` must be non-empty after trim, minimum 5 characters, maximum 50 characters.
- `description` is optional and maximum 2000 characters.
- `visibility` is stored and returned as uppercase string enum: `PUBLIC` or `PRIVATE`.
- `visibility` defaults to `PUBLIC` when omitted.
- `ownerId` is inferred from auth context and is never client-provided.
- `files` is an array of filenames (strings).
- `files` is optional but defaults to `[]` (empty array), never `undefined` or `null`.
- Each filename can be up to 255 characters.
- Maximum 32 files per study set.
- Any characters are allowed in filenames.
- On update, the `files` array is completely replaced with the new array.
- `createdAt` and `updatedAt` are Unix timestamps in milliseconds.
- Unknown fields are ignored for all StudySet request payloads.

## Slug Rules

- Generate the slug from the title with transliteration to ASCII.
- Sanitize by lowercasing, replacing whitespace with hyphens, and removing non-alphanumeric/non-hyphen characters.
- Valid slug characters are lowercase alphanumeric characters and hyphens only.
- If the sanitized slug is shorter than 5 characters, use a random 12-character base32 slug without a dash prefix.
- Otherwise append `-` plus 6 random base32 characters.
- Always include random entropy in generated slugs.
- On collision, retry generation with new entropy.
- Slug uniqueness checks are case-insensitive.
- Title changes do not regenerate the slug.
- Slug update is not supported.

## Visibility And Authorization

- All StudySet commands require authentication.
- Private study sets are visible only to the owner.
- Public study sets are visible to authenticated users who can access the study set by ID or slug.
- Public listing/search is not supported; public study sets are direct-access only and must not be enumerated by `GetStudySets` solely because they are public.
- List queries return study sets owned by the authenticated user, excluding soft-deleted sets.
- Read-by-ID/slug queries return owned study sets and directly requested public study sets.
- Non-owner modification attempts return `FORBIDDEN`.
- Soft-deleted study sets are visible only to the owner and users who have a `studySetVisit` record.
- Soft-deleted study sets do not appear in the owner's listing (`GetStudySets`).

## Commands

### CreateStudySet

```typescript
interface CreateStudySetCommand {
  title: string;
  description?: string;
  visibility?: "PUBLIC" | "PRIVATE";
  files?: string[];
}
```

- Creates a study set for the authenticated user.
- Generates and returns the slug in the create response.
- Returns `{ success: true, data: StudySet }`.

### UpdateStudySet

```typescript
interface UpdateStudySetCommand {
  id: UUID;
  title?: string;
  description?: string;
  visibility?: "PUBLIC" | "PRIVATE";
  files?: string[];
}
```

- Supports updating `title`, `description`, and `visibility`.
- Changing visibility from public to private is allowed.
- Changing visibility from private to public is allowed.
- Does not update or regenerate slug.
- Returns `{ success: true, data: StudySet }`.

### DeleteStudySet

```typescript
interface DeleteStudySetCommand {
  id: UUID;
}
```

- Soft-deletes only study sets owned by the authenticated user.
- Sets `deletedAt` timestamp instead of removing the row.
- Previously deleted study sets are ignored (cannot be re-deleted).
- Returns the updated study set with `deletedAt` set.
- Soft-deleted study sets remain accessible to:
  - The owner (for restore purposes).
  - Users who have previously visited the study set (have a `studySetVisit` record).
- Soft-deleted study sets are invisible to other users (return `NOT_FOUND`).

### RestoreStudySet

```typescript
interface RestoreStudySetCommand {
  id: UUID;
}
```

- Restores a soft-deleted study set owned by the authenticated user.
- Clears the `deletedAt` timestamp.
- Throws `FORBIDDEN` if the caller is not the owner.
- Throws `NOT_FOUND` if the study set does not exist or is not soft-deleted.
- Returns the restored study set with `deletedAt` set to `null`.

## Queries

### GetStudySets

```typescript
interface GetStudySetsQuery {
  pagination?: {
    orderBy?: "createdAt" | "updatedAt";
    orderDirection?: "asc" | "desc";
    page?: number;
  };
}
```

- Returns all study sets owned by the authenticated user.
- `pagination.orderBy` defaults to `createdAt`.
- `pagination.orderDirection` defaults to `desc`.
- `pagination.page` defaults to `1`.
- Fixed limit of 10 items per page.
- Returns `{ success: true, data: StudySet[], pagination: { page, limit, total, totalPages } }`.

### GetStudySet

```typescript
type GetStudySetQuery = { id: UUID } | { slug: string };
```

- Fetches one accessible study set by ID or slug.
- A public study set can be fetched by any authenticated user with direct ID/slug access.
- Returns `{ success: true, data: StudySet }`.

## Persistence

- Use standard Drizzle schema definitions.
- Enforce StudySet slug uniqueness with a database-level unique index or constraint.
- Index commonly filtered fields, including `ownerId` and `visibility`.

## Errors

- `VALIDATION_FAILED`: invalid title, description, visibility, ID, slug, or request payload.
- `UNAUTHORIZED`: missing authenticated user.
- `FORBIDDEN`: authenticated user cannot modify the study set.
- `NOT_FOUND`: study set does not exist or is not visible to the user.
- `SLUG_CONFLICT`: generated slug collides after retry exhaustion.

## Deferred Or Out Of Scope

- Ownership transfer is not supported.
- Import/export is not supported.
- ETags/resource versioning are not supported.
- API versioning is not supported.
- CORS, rate limiting, logging, monitoring, and health checks are out of scope for this domain spec.

## Last Visited StudySet

### Entity

```typescript
interface StudySetVisit {
  id: UUID;
  userId: UUID;
  studySetId: UUID;
  visitedAt: number;
}
```

### Field Rules

- `id` is server-generated with `crypto.randomUUID()`; clients never provide IDs.
- `userId` references authenticated user; never client-provided.
- `studySetId` references the visited study set.
- `visitedAt` is Unix timestamp in milliseconds.
- Unique constraint on `(userId, studySetId)` ensures one visit record per user-study-set pair.

### Commands

#### RefreshStudySetVisit

```typescript
interface RefreshStudySetVisitCommand {
  studySetId: UUID;
}
```

- Updates `visitedAt` to current time for user-study-set pair.
- Creates new record if none exists (upsert behavior).
- Returns `{ success: true, data: { visitedAt: number } }`.
- Throws `NOT_FOUND` if study set does not exist or user has no access.

#### CleanupOldStudySetVisits

```typescript
interface CleanupOldStudySetVisitsCommand {}
```

- Admin-only command.
- Deletes all visit records older than 90 days.
- Returns `{ success: true, data: { deletedCount: number } }`.

### Queries

#### GetRecentStudySets

```typescript
interface GetRecentStudySetsQuery {
  count: number;
}
```

- Returns up to `count` study sets recently visited by authenticated user.
- `count` must be between 1 and 100.
- Returns only study sets the user can currently access (public or owned, including soft-deleted sets the user has visited).
- Ordered by `visitedAt` descending.
- Returns `{ success: true, data: StudySet[] }`.

### Persistence

- `studySetVisit` table with indexes on `userId`, `studySetId`, `visitedAt`.
- Unique index on `(userId, studySetId)` for upsert.
- Cascade delete when study set is deleted (soft-delete only — rows are preserved via `deletedAt`; no cascade removal of visits or child entities on soft-delete).
