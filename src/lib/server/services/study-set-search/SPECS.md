# StudySetSearch Service Specs

Source specs:

- `docs/superpowers/specs/2026-05-05-quiz-flashcard-domain-specs.md` (downstream consumer of the public-discovery gap)

## Domain Boundary

StudySetSearch is the public-discovery slice of the study-set domain. It exposes a single full-text search query over public, non-deleted study sets and returns a flat projection that the frontend can render directly.

StudySetSearch is responsible for:

- full-text search over public study-set `slug`, `title`, and `description`
- a flat, fixed-size result projection suitable for a discovery surface
- keeping the FTS5 index in sync with the underlying `study_set` table

StudySetSearch is not responsible for:

- visibility or soft-delete rules (owned by `StudySet`)
- study-set create, update, delete, restore, slug, or ownership-transfer flows
- chapter, flashcard, or quiz content
- private-set search, owner-only search, or soft-deleted-set search
- ranking, faceting, pagination cursors, or filtering beyond `query`
- full-text search over flashcard/quiz/chapter content
- cross-lingual tokenization, stemming, or stop-word configuration
- full-text index management for other domains

## Entity

The result of a search is a flat projection, not a full `StudySet`:

```typescript
interface StudySetSearchResult {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  ownerId: string;
}
```

Every row in the result is a public, non-deleted study set. The FTS index only ever contains rows where `visibility = 'PUBLIC' AND deleted_at IS NULL`, so consumers can rely on that invariant without checking a per-row field. No `visibility`, `createdAt`, or `updatedAt` is included in the projection; callers needing those should fetch the full study set by `id` or `slug`.

## Field Rules

- `id` is the `studySet.id` of the matching row. It is a text-prefixed identifier (`sts_...`); clients receive it as an opaque string.
- `slug` is the existing study-set slug. The search projection does not regenerate, validate, or re-sanitize slugs. `slug` is also a searchable FTS column, so a query that matches the slug can return a row even when `title` and `description` do not contain it.
- `title` is the current `studySet.title` of the matching row. The FTS index is matched case-insensitively, but the returned `title` preserves the stored casing.
- `description` is the current `studySet.description`, or `null` when the underlying row has no description. The FTS index treats `NULL` as the empty string for matching purposes.
- `ownerId` is the `studySet.ownerId` of the matching row. It is not used to filter the result; the index-level visibility filter is the only filter that applies.

## Visibility And Authorization

- `searchStudySets` requires an authenticated user; the procedure uses `authorizedProcedure`.
- The service guards the call with `requireUser(userId)`, which throws `UNAUTHORIZED` when `userId` is `null` or `undefined`.
- The FTS query always filters to `visibility = 'PUBLIC' AND deleted_at IS NULL`; the filter is part of the query itself, not of the application layer, so an FTS row that drifts out of the visible set can never be returned.
- The service does not perform any per-row visibility check on the result; the index-level filter is the sole visibility gate.
- There is no FORBIDDEN path: private and soft-deleted rows are simply absent from the index, so the result never reveals their existence.
- `ownerId` is not used to filter results; owners can also search for other users' public study sets.

## Query

### SearchStudySets

```typescript
interface SearchStudySetsQuery {
  query: string;
}
```

- Returns the top 20 matching public study sets ordered by FTS5 `rank` (best match first).
- `query` is trimmed before validation; leading and trailing whitespace is discarded.
- `query` must be between 3 and 100 characters after trimming, where the minimum is the FTS5 trigram tokenizer floor.
- `query` must not contain ASCII control characters (U+0000–U+001F or U+007F).
- `query` is matched against every FTS column simultaneously (`slug`, `title`, `description`); there is no per-field filter or per-field result split. All columns are equally weighted in the default FTS5 ranking — no column has a higher or lower weight than any other.
- The match is case-insensitive and uses trigram substring matching (FTS5 `trigram` tokenizer).
- Special FTS5 syntax characters in `query` are escaped by wrapping the trimmed query in double quotes and doubling any embedded double quotes; the search runs in FTS5 phrase mode.
- There is no pagination; the fixed limit is `STUDY_SET_SEARCH_LIMIT` (20). Callers needing more results must narrow the query.
- The result is the flat array `StudySetSearchResult[]` (no wrapper, no metadata, no pagination cursor).
- An empty result set returns `[]`, not `null` and not `NOT_FOUND`.
- A query that fails the schema (length, control characters) returns `VALIDATION_FAILED`.

## Persistence

- DDL — the `study_set_fts` virtual table and the three synchronization triggers — lives in migration `drizzle/0008_study_set_fts.sql`. The repository owns the data lifecycle, not the schema: its `setup()` method is responsible for the self-healing backfill only.
- `study_set_fts` schema (created by the migration):
  - `study_set_id TEXT UNINDEXED` — the back-reference to `study_set.id`. Declared `UNINDEXED` so the trigram tokenizer does not index id substrings, which would otherwise produce spurious matches for any 3-character substring of any study-set id.
  - `slug TEXT` — the searchable slug.
  - `title TEXT` — the searchable title.
  - `description TEXT` — the searchable description.
  - SQLite FTS5 always provides an implicit integer `rowid`; `study_set_id` is a regular column, not a primary key.
- Synchronization is via SQLite triggers on `study_set`:
  - `AFTER INSERT` on `study_set` → insert a corresponding row into `study_set_fts`, gated by `visibility = 'PUBLIC' AND NEW.deleted_at IS NULL`.
  - `AFTER DELETE` on `study_set` → delete the corresponding row from `study_set_fts` by `study_set_id`.
  - `AFTER UPDATE OF title, description, visibility, deleted_at` on `study_set` → delete-then-insert the row, gated by `WHEN OLD.title IS NOT NEW.title OR OLD.description IS NOT NEW.description OR OLD.visibility IS NOT NEW.visibility OR OLD.deleted_at IS NOT NEW.deleted_at`. The `WHEN` clause keeps updates to unrelated columns from churning the FTS index.
- Triggers are declared `IF NOT EXISTS` so applying the migration is idempotent across restarts and test runs.
- The repository's `setup()` method performs a self-healing backfill: it deletes every FTS row whose `study_set_id` is no longer visible (`visibility = 'PUBLIC' AND deleted_at IS NULL`) and re-inserts the full set of currently visible rows. This recovers from drift where triggers may have failed (e.g. legacy data inserted before the triggers existed): the DELETE removes drifted rows and the INSERT re-populates from the source of truth.
- `setup()` is a public method that must be called explicitly at boot from the singleton wiring in `index.ts`; the constructor does not invoke it. Tests call `setup()` after constructing the repository against a fresh in-memory DB.
- The repository interface is the only public surface for persistence. The service does not run raw SQL.
- The repository's `search()` accepts a `StudySetSearchParams` payload (`{ query, limit }`). It does not take a `userId` parameter because visibility is enforced at the index level. The service builds the payload from the schema-validated input and applies the fixed `STUDY_SET_SEARCH_LIMIT`.

## Errors

- `VALIDATION_FAILED`: query is empty after trim, shorter than 3 characters, longer than 100 characters, or contains control characters.
- `UNAUTHORIZED`: missing authenticated user (raised by the guard's `requireUser`).
- `INTERNAL_SERVER_ERROR`: unexpected Drizzle/SQLite driver error inside the repository; the message is always the literal `"Internal server error"`.

## Deferred Or Out Of Scope

- Pagination (offset, cursor, total count) is not supported.
- Faceting, filters beyond `query`, and result-grouping are not supported.
- Highlighting (snippets around the matched term) is not supported.
- Search over flashcard/quiz/chapter content is not supported.
- Search over private or soft-deleted study sets is not supported.
- Search over owners' own study sets regardless of visibility is not supported.
- Configurable tokenization, stemming, stop-word lists, or per-tenant indexes are not supported.
- A `discover` page or any frontend surface that calls this service is not part of this domain spec.

## Last Visited StudySet

StudySetSearch does not own the `studySetVisit` table. Refresh and cleanup of visit records stay in the `studySet` service.
