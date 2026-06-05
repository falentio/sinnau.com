# Study Set Content Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `study-set-content` service for raw-text study notes that belong to a study set and can be linked to multiple chapters via a junction table.

**Architecture:** Follows the established four-layer pattern (DB schema → Valibot schemas → repository/guard/service → oRPC router). Content inherits ownership and visibility from its parent study set (no `ownerId` column). Chapter linking is managed through separate endpoints on a `study_set_content_to_chapter` junction table. Guard reuses `StudySetGuard` for visibility/ownership checks (same cross-domain pattern as `chapter`).

**Tech Stack:** Drizzle ORM (SQLite), Valibot v1, oRPC, Vitest, better-sqlite3 (in-memory for tests)

---

## File Manifest

### Created (16 files)

| File                                                                                     | Purpose                                          |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `src/lib/server/services/study-set-content/study-set-content.constant.ts`                | `SSC_ID_PREFIX`, content max length              |
| `src/lib/server/infras/db/schema/study-set-content.ts`                                   | Drizzle tables + relations                       |
| `src/lib/schemas/study-set-content.ts`                                                   | Valibot input/output schemas                     |
| `src/lib/server/services/study-set-content/study-set-content.repository.ts`              | Repository interface                             |
| `src/lib/server/services/study-set-content/study-set-content.repository.drizzle.ts`      | Drizzle implementation                           |
| `src/lib/server/services/study-set-content/study-set-content.repository.drizzle.test.ts` | Integration tests                                |
| `src/lib/server/services/study-set-content/study-set-content.testing.ts`                 | Mocks, fixtures, TestEnv                         |
| `src/lib/server/services/study-set-content/study-set-content.guard.ts`                   | Guard (Cross-domain dependency on StudySetGuard) |
| `src/lib/server/services/study-set-content/study-set-content.guard.test.ts`              | Guard unit tests                                 |
| `src/lib/server/services/study-set-content/study-set-content.service.ts`                 | Service class                                    |
| `src/lib/server/services/study-set-content/study-set-content.service.test.ts`            | Service unit tests                               |
| `src/lib/server/services/study-set-content/study-set-content.router.ts`                  | Router composition                               |
| `src/lib/server/services/study-set-content/commands/study-set-content.create.ts`         | Create command handler                           |
| `src/lib/server/services/study-set-content/commands/study-set-content.update.ts`         | Update command handler                           |
| `src/lib/server/services/study-set-content/commands/study-set-content.delete.ts`         | Delete command handler                           |
| `src/lib/server/services/study-set-content/commands/study-set-content.link-chapter.ts`   | Link chapter to content                          |
| `src/lib/server/services/study-set-content/commands/study-set-content.unlink-chapter.ts` | Unlink chapter from content                      |
| `src/lib/server/services/study-set-content/commands/study-set-content.set-chapters.ts`   | Set all chapter links                            |
| `src/lib/server/services/study-set-content/queries/study-set-content.get.ts`             | Get by ID                                        |
| `src/lib/server/services/study-set-content/queries/study-set-content.list.ts`            | List by study set                                |
| `src/lib/server/services/study-set-content/queries/study-set-content.list-by-chapter.ts` | List by chapter                                  |
| `src/lib/server/services/study-set-content/index.ts`                                     | Singleton wiring                                 |

### Modified (3 files)

| File                                           | Change                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| `src/lib/server/infras/db/schema/index.ts`     | Add barrel export for `study-set-content.ts`                               |
| `src/lib/server/infras/db/schema/study-set.ts` | Add `contents: many(studySetContent)` to studySetRelations                 |
| `src/lib/server/infras/db/schema/chapter.ts`   | Add `contentJunctions: many(studySetContentToChapter)` to chapterRelations |

### Generated (1 file)

| File                 | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `drizzle/0004_*.sql` | Auto-generated migration from `drizzle-kit generate` |

---

### Task 1: Constants

**Files:**

- Create: `src/lib/server/services/study-set-content/study-set-content.constant.ts`

- [ ] **Step 1: Write the constants file**

```typescript
export const STUDY_SET_CONTENT_ID_PREFIX = 'ssc';

export const STUDY_SET_CONTENT_MAX_LENGTH = 50_000;
```

- [ ] **Step 2: Verify file was created**

Run: `ls -la src/lib/server/services/study-set-content/study-set-content.constant.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/services/study-set-content/study-set-content.constant.ts
git commit -m "feat(study-set-content): add constants (prefix, max length)"
```

---

### Task 2: DB Schema

**Files:**

- Create: `src/lib/server/infras/db/schema/study-set-content.ts`
- Modify: `src/lib/server/infras/db/schema/index.ts` (barrel export)
- Modify: `src/lib/server/infras/db/schema/study-set.ts` (add relation)
- Modify: `src/lib/server/infras/db/schema/chapter.ts` (add relation)

- [ ] **Step 1: Write the DB schema file**

```typescript
import { relations, sql } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { studySet } from './study-set.ts';
import { chapter } from './chapter.ts';

export const studySetContent = sqliteTable(
	'study_set_content',
	{
		id: text('id').primaryKey(),
		studySetId: text('study_set_id')
			.notNull()
			.references(() => studySet.id, { onDelete: 'cascade' }),
		content: text('content').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('study_set_content_studySetId_idx').on(table.studySetId)]
);

export const studySetContentRelations = relations(studySetContent, ({ one, many }) => ({
	studySet: one(studySet, {
		fields: [studySetContent.studySetId],
		references: [studySet.id]
	}),
	chapterJunctions: many(studySetContentToChapter)
}));

export const studySetContentToChapter = sqliteTable(
	'study_set_content_to_chapter',
	{
		contentId: text('content_id')
			.notNull()
			.references(() => studySetContent.id, { onDelete: 'cascade' }),
		chapterId: text('chapter_id')
			.notNull()
			.references(() => chapter.id, { onDelete: 'cascade' })
	},
	(table) => [
		primaryKey({ columns: [table.contentId, table.chapterId] }),
		index('ssc_to_chapter_chapterId_idx').on(table.chapterId)
	]
);

export const studySetContentToChapterRelations = relations(studySetContentToChapter, ({ one }) => ({
	content: one(studySetContent, {
		fields: [studySetContentToChapter.contentId],
		references: [studySetContent.id]
	}),
	chapter: one(chapter, {
		fields: [studySetContentToChapter.chapterId],
		references: [chapter.id]
	})
}));

export type StudySetContent = typeof studySetContent.$inferSelect;
export type NewStudySetContent = typeof studySetContent.$inferInsert;
export type StudySetContentToChapter = typeof studySetContentToChapter.$inferSelect;
export type NewStudySetContentToChapter = typeof studySetContentToChapter.$inferInsert;

export type StudySetContentWithChapters = StudySetContent & { chapterIds: string[] };
```

- [ ] **Step 2: Add barrel export to schema index**

In `src/lib/server/infras/db/schema/index.ts`, add this line after line 5 (`export * from './quiz.ts';`):

```typescript
export * from './study-set-content.ts';
```

- [ ] **Step 3: Add relation on studySet**

In `src/lib/server/infras/db/schema/study-set.ts`, add the import at the top (after line 6):

```typescript
import { studySetContent } from './study-set-content.ts';
```

Then in `studySetRelations` (currently lines 38-47), add a new line inside the object after `quizzes: many(quiz),`:

```typescript
	contents: many(studySetContent),
```

The full `studySetRelations` should look like:

```typescript
export const studySetRelations = relations(studySet, ({ one, many }) => ({
	owner: one(user, {
		fields: [studySet.ownerId],
		references: [user.id]
	}),
	visits: many(studySetVisit),
	chapters: many(chapter),
	flashcards: many(flashcard),
	quizzes: many(quiz),
	contents: many(studySetContent)
}));
```

- [ ] **Step 4: Add relation on chapter**

In `src/lib/server/infras/db/schema/chapter.ts`, add the import at the top (after line 6):

```typescript
import { studySetContentToChapter } from './study-set-content.ts';
```

Then in `chapterRelations`, add a new line inside the object after `quizzes: many(quiz),`:

```typescript
	contentJunctions: many(studySetContentToChapter),
```

The full `chapterRelations` should look like:

```typescript
export const chapterRelations = relations(chapter, ({ one, many }) => ({
	owner: one(user, {
		fields: [chapter.ownerId],
		references: [user.id]
	}),
	studySet: one(studySet, {
		fields: [chapter.studySetId],
		references: [studySet.id]
	}),
	flashcards: many(flashcard),
	quizzes: many(quiz),
	contentJunctions: many(studySetContentToChapter)
}));
```

- [ ] **Step 5: Verify schema compiles**

Run: `pnpm run check`
Expected: No type errors related to the new schema files.

- [ ] **Step 6: Generate the migration**

Run: `pnpm drizzle-kit generate`
Expected: Creates a new migration file in `drizzle/` with two `CREATE TABLE` statements (one for `study_set_content`, one for `study_set_content_to_chapter` with indexes).

- [ ] **Step 7: Commit**

```bash
git add src/lib/server/infras/db/schema/study-set-content.ts \
        src/lib/server/infras/db/schema/index.ts \
        src/lib/server/infras/db/schema/study-set.ts \
        src/lib/server/infras/db/schema/chapter.ts \
        drizzle/
git commit -m "feat(study-set-content): add DB schema and migration"
```

---

### Task 3: Valibot Schemas

**Files:**

- Create: `src/lib/schemas/study-set-content.ts`

- [ ] **Step 1: Write the Valibot schemas file**

```typescript
import * as v from 'valibot';
import { createPrefixedIdSchema } from './id-schema.ts';
import { STUDY_SET_CONTENT_ID_PREFIX } from '../server/services/study-set-content/study-set-content.constant.ts';
import { STUDY_SET_CONTENT_MAX_LENGTH } from '../server/services/study-set-content/study-set-content.constant.ts';
import { STUDY_SET_ID_PREFIX } from '../server/services/study-set/study-set.constant.ts';
import { CHAPTER_ID_PREFIX } from '../server/services/chapter/chapter.constant.ts';

const contentIdSchema = createPrefixedIdSchema(STUDY_SET_CONTENT_ID_PREFIX);
const studySetIdSchema = createPrefixedIdSchema(STUDY_SET_ID_PREFIX);
const chapterIdSchema = createPrefixedIdSchema(CHAPTER_ID_PREFIX);

const contentStringSchema = v.pipe(
	v.string(),
	v.minLength(1, 'Content must not be empty'),
	v.maxLength(
		STUDY_SET_CONTENT_MAX_LENGTH,
		`Content must be at most ${STUDY_SET_CONTENT_MAX_LENGTH} characters`
	)
);

export const createStudySetContentInputSchema = v.object({
	studySetId: studySetIdSchema,
	content: contentStringSchema,
	chapterIds: v.optional(
		v.pipe(v.array(chapterIdSchema), v.maxLength(32, 'Maximum 32 chapter IDs'))
	)
});

export const updateStudySetContentInputSchema = v.object({
	id: contentIdSchema,
	content: contentStringSchema
});

export const deleteStudySetContentInputSchema = v.object({
	id: contentIdSchema
});

export const getStudySetContentInputSchema = v.object({
	id: contentIdSchema
});

export const listStudySetContentInputSchema = v.object({
	studySetId: studySetIdSchema
});

export const listByChapterStudySetContentInputSchema = v.object({
	chapterId: chapterIdSchema
});

export const linkChapterToContentInputSchema = v.object({
	contentId: contentIdSchema,
	chapterId: chapterIdSchema
});

export const unlinkChapterFromContentInputSchema = v.object({
	contentId: contentIdSchema,
	chapterId: chapterIdSchema
});

export const setContentChaptersInputSchema = v.object({
	contentId: contentIdSchema,
	chapterIds: v.array(chapterIdSchema)
});

export const studySetContentSchema = v.object({
	id: v.string(),
	studySetId: v.string(),
	content: v.string(),
	chapterIds: v.array(v.string()),
	createdAt: v.date(),
	updatedAt: v.date()
});

export const studySetContentListOutputSchema = v.array(studySetContentSchema);

export const studySetContentDeleteOutputSchema = v.object({ success: v.literal(true) });

export const linkChapterOutputSchema = v.object({ success: v.literal(true) });

export type CreateStudySetContentInput = v.InferOutput<typeof createStudySetContentInputSchema>;
export type UpdateStudySetContentInput = v.InferOutput<typeof updateStudySetContentInputSchema>;
export type DeleteStudySetContentInput = v.InferOutput<typeof deleteStudySetContentInputSchema>;
export type GetStudySetContentInput = v.InferOutput<typeof getStudySetContentInputSchema>;
export type ListStudySetContentInput = v.InferOutput<typeof listStudySetContentInputSchema>;
export type ListByChapterStudySetContentInput = v.InferOutput<
	typeof listByChapterStudySetContentInputSchema
>;
export type LinkChapterToContentInput = v.InferOutput<typeof linkChapterToContentInputSchema>;
export type UnlinkChapterFromContentInput = v.InferOutput<
	typeof unlinkChapterFromContentInputSchema
>;
export type SetContentChaptersInput = v.InferOutput<typeof setContentChaptersInputSchema>;
```

- [ ] **Step 2: Verify schema compiles**

Run: `pnpm run check`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/schemas/study-set-content.ts
git commit -m "feat(study-set-content): add Valibot schemas"
```

---

### Task 4: Repository Interface

**Files:**

- Create: `src/lib/server/services/study-set-content/study-set-content.repository.ts`

- [ ] **Step 1: Write the repository interface**

```typescript
import type {
	StudySetContent,
	StudySetContentToChapter
} from '../../infras/db/schema/study-set-content.ts';

export type StudySetContentUpdatePatch = Partial<Pick<StudySetContent, 'content' | 'updatedAt'>>;

export type StudySetContentWithChapters = StudySetContent & { chapterIds: string[] };

export interface StudySetContentRepository {
	insertContent(row: Omit<StudySetContent, 'createdAt' | 'updatedAt'>): Promise<StudySetContent>;
	updateContent(
		id: string,
		studySetId: string,
		patch: StudySetContentUpdatePatch
	): Promise<StudySetContent | null>;
	deleteContent(id: string, studySetId: string): Promise<boolean>;
	findContentById(id: string): Promise<StudySetContent | null>;
	findContentByIdWithChapters(id: string): Promise<StudySetContentWithChapters | null>;
	findContentsByStudySet(studySetId: string): Promise<StudySetContentWithChapters[]>;
	findContentsByChapter(chapterId: string): Promise<StudySetContentWithChapters[]>;
	linkChapter(contentId: string, chapterId: string): Promise<StudySetContentToChapter | null>;
	unlinkChapter(contentId: string, chapterId: string): Promise<boolean>;
	setChapters(contentId: string, chapterIds: string[]): Promise<void>;
	findChapterById(chapterId: string): Promise<{ id: string; studySetId: string } | null>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/services/study-set-content/study-set-content.repository.ts
git commit -m "feat(study-set-content): add repository interface"
```

---

### Task 5: Repository Drizzle Implementation

**Files:**

- Create: `src/lib/server/services/study-set-content/study-set-content.repository.drizzle.ts`

- [ ] **Step 1: Write the Drizzle repository implementation**

```typescript
import { and, eq, inArray } from 'drizzle-orm';
import { db as defaultDb, type DB } from '../../infras/db/client.ts';
import {
	studySetContent,
	studySetContentToChapter
} from '../../infras/db/schema/study-set-content.ts';
import { chapter } from '../../infras/db/schema/chapter.ts';
import type {
	StudySetContent,
	StudySetContentWithChapters
} from '../../infras/db/schema/study-set-content.ts';
import type {
	StudySetContentRepository,
	StudySetContentUpdatePatch
} from './study-set-content.repository.ts';

export class StudySetContentDrizzleRepository implements StudySetContentRepository {
	constructor(private readonly dbInstance: DB = defaultDb) {}

	static withDatabase(db: DB): StudySetContentDrizzleRepository {
		return new StudySetContentDrizzleRepository(db);
	}

	async insertContent(
		row: Omit<StudySetContent, 'createdAt' | 'updatedAt'>
	): Promise<StudySetContent> {
		const [created] = await this.dbInstance.insert(studySetContent).values(row).returning();
		if (!created) throw new Error('Failed to insert study set content');
		return created;
	}

	async updateContent(
		id: string,
		studySetId: string,
		patch: StudySetContentUpdatePatch
	): Promise<StudySetContent | null> {
		const [updated] = await this.dbInstance
			.update(studySetContent)
			.set(patch)
			.where(and(eq(studySetContent.id, id), eq(studySetContent.studySetId, studySetId)))
			.returning();
		return updated ?? null;
	}

	async deleteContent(id: string, studySetId: string): Promise<boolean> {
		const deleted = await this.dbInstance
			.delete(studySetContent)
			.where(and(eq(studySetContent.id, id), eq(studySetContent.studySetId, studySetId)))
			.returning({ id: studySetContent.id });
		return deleted.length > 0;
	}

	async findContentById(id: string): Promise<StudySetContent | null> {
		const [row] = await this.dbInstance
			.select()
			.from(studySetContent)
			.where(eq(studySetContent.id, id))
			.limit(1);
		return row ?? null;
	}

	async findContentByIdWithChapters(id: string): Promise<StudySetContentWithChapters | null> {
		const [row] = await this.dbInstance
			.select({
				id: studySetContent.id,
				studySetId: studySetContent.studySetId,
				content: studySetContent.content,
				createdAt: studySetContent.createdAt,
				updatedAt: studySetContent.updatedAt,
				chapterId: studySetContentToChapter.chapterId
			})
			.from(studySetContent)
			.leftJoin(
				studySetContentToChapter,
				eq(studySetContent.id, studySetContentToChapter.contentId)
			)
			.where(eq(studySetContent.id, id));
		if (!row) return null;
		return this.buildWithChapters([row])[0] ?? null;
	}

	async findContentsByStudySet(studySetId: string): Promise<StudySetContentWithChapters[]> {
		const rows = await this.dbInstance
			.select({
				id: studySetContent.id,
				studySetId: studySetContent.studySetId,
				content: studySetContent.content,
				createdAt: studySetContent.createdAt,
				updatedAt: studySetContent.updatedAt,
				chapterId: studySetContentToChapter.chapterId
			})
			.from(studySetContent)
			.leftJoin(
				studySetContentToChapter,
				eq(studySetContent.id, studySetContentToChapter.contentId)
			)
			.where(eq(studySetContent.studySetId, studySetId));
		return this.buildWithChapters(rows);
	}

	async findContentsByChapter(chapterId: string): Promise<StudySetContentWithChapters[]> {
		const junctionRows = await this.dbInstance
			.select({ contentId: studySetContentToChapter.contentId })
			.from(studySetContentToChapter)
			.where(eq(studySetContentToChapter.chapterId, chapterId));

		const contentIds = junctionRows.map((r) => r.contentId);
		if (contentIds.length === 0) return [];

		const rows = await this.dbInstance
			.select({
				id: studySetContent.id,
				studySetId: studySetContent.studySetId,
				content: studySetContent.content,
				createdAt: studySetContent.createdAt,
				updatedAt: studySetContent.updatedAt,
				chapterId: studySetContentToChapter.chapterId
			})
			.from(studySetContent)
			.leftJoin(
				studySetContentToChapter,
				eq(studySetContent.id, studySetContentToChapter.contentId)
			)
			.where(inArray(studySetContent.id, contentIds));

		return this.buildWithChapters(rows);
	}

	async linkChapter(
		contentId: string,
		chapterId: string
	): Promise<{ contentId: string; chapterId: string } | null> {
		try {
			const [linked] = await this.dbInstance
				.insert(studySetContentToChapter)
				.values({ contentId, chapterId })
				.returning();
			return linked ?? null;
		} catch {
			return null;
		}
	}

	async unlinkChapter(contentId: string, chapterId: string): Promise<boolean> {
		const deleted = await this.dbInstance
			.delete(studySetContentToChapter)
			.where(
				and(
					eq(studySetContentToChapter.contentId, contentId),
					eq(studySetContentToChapter.chapterId, chapterId)
				)
			)
			.returning({ contentId: studySetContentToChapter.contentId });
		return deleted.length > 0;
	}

	async setChapters(contentId: string, chapterIds: string[]): Promise<void> {
		await this.dbInstance.transaction(async (tx) => {
			await tx
				.delete(studySetContentToChapter)
				.where(eq(studySetContentToChapter.contentId, contentId));

			if (chapterIds.length > 0) {
				await tx
					.insert(studySetContentToChapter)
					.values(chapterIds.map((chapterId) => ({ contentId, chapterId })));
			}
		});
	}

	async findChapterById(chapterId: string): Promise<{ id: string; studySetId: string } | null> {
		const [row] = await this.dbInstance
			.select({ id: chapter.id, studySetId: chapter.studySetId })
			.from(chapter)
			.where(eq(chapter.id, chapterId))
			.limit(1);
		return row ?? null;
	}

	private buildWithChapters(
		rows: (StudySetContent & { chapterId: string | null })[]
	): StudySetContentWithChapters[] {
		const map = new Map<string, StudySetContentWithChapters>();
		for (const row of rows) {
			let entry = map.get(row.id);
			if (!entry) {
				entry = {
					id: row.id,
					studySetId: row.studySetId,
					content: row.content,
					chapterIds: [],
					createdAt: row.createdAt,
					updatedAt: row.updatedAt
				};
				map.set(row.id, entry);
			}
			if (row.chapterId) {
				entry.chapterIds.push(row.chapterId);
			}
		}
		return [...map.values()];
	}
}
```

- [ ] **Step 2: Verify compiles**

Run: `pnpm run check`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/services/study-set-content/study-set-content.repository.drizzle.ts
git commit -m "feat(study-set-content): add Drizzle repository implementation"
```

---

### Task 6: Testing Helpers

**Files:**

- Create: `src/lib/server/services/study-set-content/study-set-content.testing.ts`

- [ ] **Step 1: Write the testing helpers file**

```typescript
import { eq } from 'drizzle-orm';
import { type MockedFunction, vi } from 'vitest';
import { getTestingDb } from '$lib/server/infras/db/testing';
import { user } from '$lib/server/infras/db/schema/auth-schema';
import { studySet } from '$lib/server/infras/db/schema/study-set.ts';
import { chapter } from '$lib/server/infras/db/schema/chapter.ts';
import type {
	StudySetContent,
	StudySetContentWithChapters
} from '../../infras/db/schema/study-set-content.ts';
import type { StudySetVisibility } from '../../infras/db/schema/study-set.ts';
import { StudySetDrizzleRepository } from '../study-set/study-set.repository.drizzle.ts';
import { ChapterDrizzleRepository } from '../chapter/chapter.repository.drizzle.ts';
import { StudySetContentDrizzleRepository } from './study-set-content.repository.drizzle.ts';
import type { StudySetContentGuard } from './study-set-content.guard.ts';
import type { StudySetContentRepository } from './study-set-content.repository.ts';
import { generateId } from '../../utils/nanoid.ts';
import { STUDY_SET_CONTENT_ID_PREFIX } from './study-set-content.constant.ts';
import { STUDY_SET_ID_PREFIX } from '../study-set/study-set.constant.ts';
import { CHAPTER_ID_PREFIX } from '../chapter/chapter.constant.ts';

export type MockedStudySetContentRepository = {
	[K in keyof StudySetContentRepository]: MockedFunction<StudySetContentRepository[K]>;
};

export function createMockRepository(): MockedStudySetContentRepository {
	return {
		insertContent: vi.fn(),
		updateContent: vi.fn(),
		deleteContent: vi.fn(),
		findContentById: vi.fn(),
		findContentByIdWithChapters: vi.fn(),
		findContentsByStudySet: vi.fn(),
		findContentsByChapter: vi.fn(),
		linkChapter: vi.fn(),
		unlinkChapter: vi.fn(),
		setChapters: vi.fn(),
		findChapterById: vi.fn()
	};
}

export type MockedStudySetContentGuard = {
	[K in keyof StudySetContentGuard]: MockedFunction<StudySetContentGuard[K]>;
};

export function createMockGuard(): MockedStudySetContentGuard {
	return {
		assertContentOwnerOrForbidden: vi.fn(),
		assertContentVisibleByIdOrNotFound: vi.fn(),
		assertStudySetOwnerOrForbidden: vi.fn(),
		assertStudySetVisibleByIdOrNotFound: vi.fn()
	};
}

export function createStudySetContentFixture(
	overrides: Partial<StudySetContent> = {}
): StudySetContent {
	return {
		id: generateId(STUDY_SET_CONTENT_ID_PREFIX),
		studySetId: 'set-1',
		content: 'Some study content text',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};
}

export function createStudySetContentWithChaptersFixture(
	overrides: Partial<StudySetContentWithChapters> = {}
): StudySetContentWithChapters {
	return {
		id: generateId(STUDY_SET_CONTENT_ID_PREFIX),
		studySetId: 'set-1',
		content: 'Some study content text',
		chapterIds: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};
}

export const EMPTY_CONTENT_LIST: StudySetContentWithChapters[] = [];

export async function captureError(promise: Promise<unknown>): Promise<unknown> {
	try {
		await promise;
		return null;
	} catch (err) {
		return err;
	}
}

interface SeedUserOptions {
	id?: string;
	email?: string;
	name?: string;
}

interface SeedStudySetOptions {
	id?: string;
	slug?: string;
	visibility?: StudySetVisibility;
	ownerId: string;
}

interface SeedChapterOptions {
	id?: string;
	slug?: string;
	title?: string;
	studySetId: string;
	ownerId: string;
}

export class StudySetContentTestEnv implements AsyncDisposable {
	readonly db: ReturnType<typeof getTestingDb>;
	readonly repo: StudySetContentDrizzleRepository;
	readonly studySetRepo: StudySetDrizzleRepository;
	readonly chapterRepo: ChapterDrizzleRepository;
	readonly ownerId: string;
	readonly otherId: string;
	readonly studySetId: string;
	readonly otherStudySetId: string;

	constructor() {
		this.db = getTestingDb();
		this.repo = new StudySetContentDrizzleRepository(this.db);
		this.studySetRepo = new StudySetDrizzleRepository(this.db);
		this.chapterRepo = new ChapterDrizzleRepository(this.db);
		this.ownerId = this.seedUser({ name: 'Owner' });
		this.otherId = this.seedUser({ name: 'Other' });
		this.studySetId = generateId(STUDY_SET_ID_PREFIX);
		this.otherStudySetId = generateId(STUDY_SET_ID_PREFIX);
		this.insertStudySetSync(this.studySetId, this.ownerId, 'PUBLIC');
		this.insertStudySetSync(this.otherStudySetId, this.otherId, 'PRIVATE');
	}

	private insertStudySetSync(id: string, ownerId: string, visibility: StudySetVisibility): void {
		this.db
			.insert(studySet)
			.values({
				id,
				slug: `set-${id.slice(0, 8)}`,
				title: `Set ${id.slice(0, 8)}`,
				description: null,
				visibility,
				ownerId,
				files: []
			})
			.run();
	}

	seedUser(options: SeedUserOptions = {}): string {
		const id = options.id ?? crypto.randomUUID();
		this.db
			.insert(user)
			.values({
				id,
				email: options.email ?? `${id}@test.local`,
				name: options.name ?? 'Test User',
				emailVerified: true
			})
			.run();
		return id;
	}

	async seedStudySet(options: SeedStudySetOptions): Promise<{
		id: string;
		slug: string;
		visibility: StudySetVisibility;
	}> {
		const id = options.id ?? generateId(STUDY_SET_ID_PREFIX);
		const slug = options.slug ?? `slug-${id.slice(0, 8)}`;
		const visibility: StudySetVisibility = options.visibility ?? 'PUBLIC';
		this.db.delete(studySet).where(eq(studySet.id, id)).run();
		await this.studySetRepo.insertStudySet({
			id,
			slug,
			title: `Set ${slug}`,
			description: null,
			visibility,
			ownerId: options.ownerId,
			files: []
		});
		return { id, slug, visibility };
	}

	seedChapterSync(chapterId: string, studySetId: string, ownerId: string): void {
		this.db
			.insert(chapter)
			.values({
				id: chapterId,
				slug: `ch-${chapterId.slice(0, 8)}`,
				title: `Chapter ${chapterId.slice(0, 8)}`,
				description: null,
				studySetId,
				ownerId
			})
			.run();
	}

	async seedContent(overrides: Partial<StudySetContent> = {}): Promise<StudySetContent> {
		return this.repo.insertContent({
			id: overrides.id ?? generateId(STUDY_SET_CONTENT_ID_PREFIX),
			studySetId: overrides.studySetId ?? this.studySetId,
			content: overrides.content ?? 'Default content text'
		});
	}

	async [Symbol.asyncDispose](): Promise<void> {
		this.db.$client.close();
	}
}
```

- [ ] **Step 2: Verify file compiles (will have guard import error until guard is created—this is expected)**

Run: `pnpm run check 2>&1 | head -20`
Expected: Import error about `./study-set-content.guard.ts` not existing. This is expected and will resolve in the next task.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/services/study-set-content/study-set-content.testing.ts
git commit -m "feat(study-set-content): add testing helpers (mocks, fixtures, TestEnv)"
```

---

### Task 7: Guard

**Files:**

- Create: `src/lib/server/services/study-set-content/study-set-content.guard.ts`
- Create: `src/lib/server/services/study-set-content/study-set-content.guard.test.ts`

- [ ] **Step 1: Write the guard**

```typescript
import { ORPCError } from '@orpc/server';
import type { StudySetContent } from '../../infras/db/schema/study-set-content.ts';
import type { StudySetContentRepository } from './study-set-content.repository.ts';
import type { StudySetGuard } from '../study-set/study-set.guard.ts';

export class StudySetContentGuard {
	private readonly resolvedStudySetGuard: StudySetGuard;

	constructor(
		private readonly repo: StudySetContentRepository,
		studySetGuardInstance: StudySetGuard
	) {
		this.resolvedStudySetGuard = studySetGuardInstance;
	}

	async assertContentOwnerOrForbidden(id: string, ownerId: string): Promise<StudySetContent> {
		const content = await this.repo.findContentById(id);
		if (!content) {
			throw new ORPCError('FORBIDDEN', { message: 'Cannot modify content you do not own' });
		}
		try {
			await this.resolvedStudySetGuard.assertStudySetOwnerOrForbidden(content.studySetId, ownerId);
		} catch (err) {
			if (err instanceof ORPCError && err.code === 'FORBIDDEN') {
				throw new ORPCError('FORBIDDEN', { message: 'Cannot modify content you do not own' });
			}
			throw err;
		}
		return content;
	}

	async assertContentVisibleByIdOrNotFound(id: string, userId: string): Promise<StudySetContent> {
		const content = await this.repo.findContentById(id);
		if (!content) {
			throw new ORPCError('NOT_FOUND', { message: 'Content not found' });
		}
		try {
			await this.resolvedStudySetGuard.assertStudySetVisibleByIdOrNotFound(
				content.studySetId,
				userId
			);
		} catch (err) {
			if (err instanceof ORPCError && err.code === 'NOT_FOUND') {
				throw new ORPCError('NOT_FOUND', { message: 'Content not found' });
			}
			throw err;
		}
		return content;
	}

	async assertStudySetOwnerOrForbidden(studySetId: string, ownerId: string): Promise<void> {
		await this.resolvedStudySetGuard.assertStudySetOwnerOrForbidden(studySetId, ownerId);
	}

	async assertStudySetVisibleByIdOrNotFound(studySetId: string, userId: string): Promise<void> {
		await this.resolvedStudySetGuard.assertStudySetVisibleByIdOrNotFound(studySetId, userId);
	}
}
```

- [ ] **Step 2: Write the guard tests**

```typescript
import { ORPCError } from '@orpc/server';
import { describe, it } from 'vitest';
import {
	createStudySetFixture,
	createMockRepository as createMockStudySetRepo
} from '../study-set/study-set.testing.ts';
import { StudySetGuard } from '../study-set/study-set.guard.ts';
import { StudySetContentGuard } from './study-set-content.guard.ts';
import { createStudySetContentFixture, createMockRepository } from './study-set-content.testing.ts';

function setupGuard() {
	const contentRepo = createMockRepository();
	contentRepo.findContentById.mockResolvedValue(null);

	const studySetRepo = createMockStudySetRepo();
	studySetRepo.findStudySetById.mockResolvedValue(null);
	const studySetGuard = new StudySetGuard(studySetRepo);

	const guard = new StudySetContentGuard(contentRepo, studySetGuard);
	return { contentRepo, studySetRepo, guard };
}

describe.concurrent('StudySetContentGuard', () => {
	describe('assertContentOwnerOrForbidden', () => {
		it('returns the content when the caller owns the parent study set', async ({ expect }) => {
			const { contentRepo, studySetRepo, guard } = setupGuard();
			const content = createStudySetContentFixture({ id: 'ssc-1', studySetId: 'set-1' });
			contentRepo.findContentById.mockResolvedValue(content);
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1' })
			);
			const result = await guard.assertContentOwnerOrForbidden('ssc-1', 'owner-1');
			expect(contentRepo.findContentById).toHaveBeenCalledWith('ssc-1');
			expect(studySetRepo.findStudySetById).toHaveBeenCalledWith('set-1');
			expect(result).toBe(content);
		});

		it('throws FORBIDDEN when content does not exist', async ({ expect }) => {
			const { contentRepo, guard } = setupGuard();
			contentRepo.findContentById.mockResolvedValue(null);
			const err = await captureError(guard.assertContentOwnerOrForbidden('missing', 'owner-1'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'FORBIDDEN' });
		});

		it('throws FORBIDDEN when the study set is not owned', async ({ expect }) => {
			const { contentRepo, studySetRepo, guard } = setupGuard();
			contentRepo.findContentById.mockResolvedValue(
				createStudySetContentFixture({ id: 'ssc-1', studySetId: 'set-1' })
			);
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1' })
			);
			const err = await captureError(guard.assertContentOwnerOrForbidden('ssc-1', 'other'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'FORBIDDEN' });
		});

		it('throws FORBIDDEN when the study set does not exist', async ({ expect }) => {
			const { contentRepo, guard } = setupGuard();
			contentRepo.findContentById.mockResolvedValue(
				createStudySetContentFixture({ id: 'ssc-1', studySetId: 'missing-set' })
			);
			const err = await captureError(guard.assertContentOwnerOrForbidden('ssc-1', 'owner-1'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'FORBIDDEN' });
		});
	});

	describe('assertContentVisibleByIdOrNotFound', () => {
		it('returns the content to the owner even when study set is PRIVATE', async ({ expect }) => {
			const { contentRepo, studySetRepo, guard } = setupGuard();
			const content = createStudySetContentFixture({ id: 'ssc-1', studySetId: 'set-1' });
			contentRepo.findContentById.mockResolvedValue(content);
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1', visibility: 'PRIVATE' })
			);
			const result = await guard.assertContentVisibleByIdOrNotFound('ssc-1', 'owner-1');
			expect(result).toBe(content);
		});

		it('returns the content to a non-owner when study set is PUBLIC', async ({ expect }) => {
			const { contentRepo, studySetRepo, guard } = setupGuard();
			const content = createStudySetContentFixture({ id: 'ssc-1', studySetId: 'set-1' });
			contentRepo.findContentById.mockResolvedValue(content);
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1', visibility: 'PUBLIC' })
			);
			const result = await guard.assertContentVisibleByIdOrNotFound('ssc-1', 'other-user');
			expect(result).toBe(content);
		});

		it('throws NOT_FOUND when content does not exist', async ({ expect }) => {
			const { contentRepo, guard } = setupGuard();
			contentRepo.findContentById.mockResolvedValue(null);
			const err = await captureError(guard.assertContentVisibleByIdOrNotFound('missing', 'user-1'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});

		it('throws NOT_FOUND when study set is PRIVATE and caller is not owner', async ({ expect }) => {
			const { contentRepo, studySetRepo, guard } = setupGuard();
			contentRepo.findContentById.mockResolvedValue(
				createStudySetContentFixture({ id: 'ssc-1', studySetId: 'set-1' })
			);
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1', visibility: 'PRIVATE' })
			);
			const err = await captureError(
				guard.assertContentVisibleByIdOrNotFound('ssc-1', 'other-user')
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});

		it('throws NOT_FOUND when parent study set is missing', async ({ expect }) => {
			const { contentRepo, guard } = setupGuard();
			contentRepo.findContentById.mockResolvedValue(
				createStudySetContentFixture({ id: 'ssc-1', studySetId: 'missing-set' })
			);
			const err = await captureError(guard.assertContentVisibleByIdOrNotFound('ssc-1', 'user-1'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});

		it('does not call study set repo when content is missing', async ({ expect }) => {
			const { contentRepo, studySetRepo, guard } = setupGuard();
			contentRepo.findContentById.mockResolvedValue(null);
			await captureError(guard.assertContentVisibleByIdOrNotFound('missing', 'user-1'));
			expect(studySetRepo.findStudySetById).not.toHaveBeenCalled();
		});
	});

	describe('assertStudySetOwnerOrForbidden', () => {
		it('returns when the caller owns the study set', async ({ expect }) => {
			const { studySetRepo, guard } = setupGuard();
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1' })
			);
			await expect(
				guard.assertStudySetOwnerOrForbidden('set-1', 'owner-1')
			).resolves.toBeUndefined();
		});

		it('throws FORBIDDEN when the caller does not own the study set', async ({ expect }) => {
			const { studySetRepo, guard } = setupGuard();
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1' })
			);
			const err = await captureError(guard.assertStudySetOwnerOrForbidden('set-1', 'other'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'FORBIDDEN' });
		});
	});

	describe('assertStudySetVisibleByIdOrNotFound', () => {
		it('returns when study set is PUBLIC', async ({ expect }) => {
			const { studySetRepo, guard } = setupGuard();
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1', visibility: 'PUBLIC' })
			);
			await expect(
				guard.assertStudySetVisibleByIdOrNotFound('set-1', 'other-user')
			).resolves.toBeUndefined();
		});

		it('returns when caller owns the study set even if PRIVATE', async ({ expect }) => {
			const { studySetRepo, guard } = setupGuard();
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1', visibility: 'PRIVATE' })
			);
			await expect(
				guard.assertStudySetVisibleByIdOrNotFound('set-1', 'owner-1')
			).resolves.toBeUndefined();
		});

		it('throws NOT_FOUND when study set is PRIVATE and caller is not owner', async ({ expect }) => {
			const { studySetRepo, guard } = setupGuard();
			studySetRepo.findStudySetById.mockResolvedValue(
				createStudySetFixture({ id: 'set-1', ownerId: 'owner-1', visibility: 'PRIVATE' })
			);
			const err = await captureError(guard.assertStudySetVisibleByIdOrNotFound('set-1', 'other'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});
	});
});

async function captureError(promise: Promise<unknown>): Promise<unknown> {
	try {
		await promise;
		return null;
	} catch (err) {
		return err;
	}
}
```

- [ ] **Step 3: Run the guard tests**

Run: `rtk pnpm run test:unit -- src/lib/server/services/study-set-content/study-set-content.guard.test.ts`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/services/study-set-content/study-set-content.guard.ts \
        src/lib/server/services/study-set-content/study-set-content.guard.test.ts
git commit -m "feat(study-set-content): add guard with cross-domain StudySetGuard dependency"
```

---

### Task 8: Service

**Files:**

- Create: `src/lib/server/services/study-set-content/study-set-content.service.ts`
- Create: `src/lib/server/services/study-set-content/study-set-content.service.test.ts`

- [ ] **Step 1: Write the service**

```typescript
import { ORPCError } from '@orpc/server';
import { generateId } from '../../utils/nanoid.ts';
import type {
	StudySetContent,
	StudySetContentWithChapters
} from '../../infras/db/schema/study-set-content.ts';
import type {
	CreateStudySetContentInput,
	UpdateStudySetContentInput,
	DeleteStudySetContentInput,
	GetStudySetContentInput,
	ListStudySetContentInput,
	ListByChapterStudySetContentInput,
	LinkChapterToContentInput,
	UnlinkChapterFromContentInput,
	SetContentChaptersInput
} from '../../../schemas/study-set-content.ts';
import { STUDY_SET_CONTENT_ID_PREFIX } from './study-set-content.constant.ts';
import type { StudySetContentRepository } from './study-set-content.repository.ts';
import type { StudySetContentGuard } from './study-set-content.guard.ts';

export type { StudySetContent, StudySetContentWithChapters };

export class StudySetContentService {
	private readonly guard: StudySetContentGuard;

	constructor(
		private readonly repo: StudySetContentRepository,
		guard: StudySetContentGuard
	) {
		this.guard = guard;
	}

	async createContent(
		input: CreateStudySetContentInput,
		ownerId: string
	): Promise<StudySetContentWithChapters> {
		await this.guard.assertStudySetOwnerOrForbidden(input.studySetId, ownerId);

		const content = await this.repo.insertContent({
			id: generateId(STUDY_SET_CONTENT_ID_PREFIX),
			studySetId: input.studySetId,
			content: input.content
		});

		if (input.chapterIds && input.chapterIds.length > 0) {
			await this.repo.setChapters(content.id, input.chapterIds);
		}

		const result = await this.repo.findContentByIdWithChapters(content.id);
		if (!result) throw new ORPCError('NOT_FOUND', { message: 'Content not found' });
		return result;
	}

	async updateContent(
		input: UpdateStudySetContentInput,
		ownerId: string
	): Promise<StudySetContentWithChapters> {
		const existing = await this.guard.assertContentOwnerOrForbidden(input.id, ownerId);

		const updated = await this.repo.updateContent(input.id, existing.studySetId, {
			content: input.content
		});
		if (!updated) {
			throw new ORPCError('NOT_FOUND', { message: 'Content not found' });
		}

		const result = await this.repo.findContentByIdWithChapters(input.id);
		if (!result) throw new ORPCError('NOT_FOUND', { message: 'Content not found' });
		return result;
	}

	async deleteContent(input: DeleteStudySetContentInput, ownerId: string): Promise<void> {
		const content = await this.guard.assertContentOwnerOrForbidden(input.id, ownerId);

		const ok = await this.repo.deleteContent(input.id, content.studySetId);
		if (!ok) {
			throw new ORPCError('NOT_FOUND', { message: 'Content not found' });
		}
	}

	async getContent(
		input: GetStudySetContentInput,
		userId: string
	): Promise<StudySetContentWithChapters> {
		await this.guard.assertContentVisibleByIdOrNotFound(input.id, userId);
		const result = await this.repo.findContentByIdWithChapters(input.id);
		if (!result) throw new ORPCError('NOT_FOUND', { message: 'Content not found' });
		return result;
	}

	async listContentsByStudySet(
		input: ListStudySetContentInput,
		userId: string
	): Promise<StudySetContentWithChapters[]> {
		await this.guard.assertStudySetVisibleByIdOrNotFound(input.studySetId, userId);
		return this.repo.findContentsByStudySet(input.studySetId);
	}

	async listContentsByChapter(
		input: ListByChapterStudySetContentInput,
		userId: string
	): Promise<StudySetContentWithChapters[]> {
		const chapter = await this.repo.findChapterById(input.chapterId);
		if (!chapter) throw new ORPCError('NOT_FOUND', { message: 'Chapter not found' });

		await this.guard.assertStudySetVisibleByIdOrNotFound(chapter.studySetId, userId);
		return this.repo.findContentsByChapter(input.chapterId);
	}

	async linkChapter(input: LinkChapterToContentInput, ownerId: string): Promise<void> {
		const content = await this.guard.assertContentOwnerOrForbidden(input.contentId, ownerId);

		const chapter = await this.repo.findChapterById(input.chapterId);
		if (!chapter) throw new ORPCError('NOT_FOUND', { message: 'Chapter not found' });

		if (chapter.studySetId !== content.studySetId) {
			throw new ORPCError('FORBIDDEN', {
				message: 'Chapter must belong to the same study set as the content'
			});
		}

		const linked = await this.repo.linkChapter(input.contentId, input.chapterId);
		if (!linked) {
			throw new ORPCError('NOT_FOUND', { message: 'Content or chapter not found' });
		}
	}

	async unlinkChapter(input: UnlinkChapterFromContentInput, ownerId: string): Promise<void> {
		await this.guard.assertContentOwnerOrForbidden(input.contentId, ownerId);

		const ok = await this.repo.unlinkChapter(input.contentId, input.chapterId);
		if (!ok) {
			throw new ORPCError('NOT_FOUND', { message: 'Link not found' });
		}
	}

	async setChapters(input: SetContentChaptersInput, ownerId: string): Promise<void> {
		const content = await this.guard.assertContentOwnerOrForbidden(input.contentId, ownerId);

		for (const chapterId of input.chapterIds) {
			const chapter = await this.repo.findChapterById(chapterId);
			if (!chapter) throw new ORPCError('NOT_FOUND', { message: `Chapter ${chapterId} not found` });
			if (chapter.studySetId !== content.studySetId) {
				throw new ORPCError('FORBIDDEN', {
					message: `Chapter ${chapterId} must belong to the same study set as the content`
				});
			}
		}

		await this.repo.setChapters(input.contentId, input.chapterIds);
	}
}
```

- [ ] **Step 2: Write the service tests**

```typescript
import { ORPCError } from '@orpc/server';
import { describe, it } from 'vitest';
import type { StudySetContentGuard } from './study-set-content.guard.ts';
import { StudySetContentService } from './study-set-content.service.ts';
import {
	captureError,
	createStudySetContentFixture,
	createStudySetContentWithChaptersFixture,
	createMockGuard,
	createMockRepository,
	EMPTY_CONTENT_LIST
} from './study-set-content.testing.ts';

function setupService() {
	const repo = createMockRepository();
	const guard = createMockGuard();

	repo.insertContent.mockImplementation(async (row) => createStudySetContentFixture(row));
	repo.updateContent.mockResolvedValue(null);
	repo.deleteContent.mockResolvedValue(false);
	repo.findContentById.mockResolvedValue(null);
	repo.findContentByIdWithChapters.mockResolvedValue(null);
	repo.findContentsByStudySet.mockResolvedValue(EMPTY_CONTENT_LIST);
	repo.findContentsByChapter.mockResolvedValue(EMPTY_CONTENT_LIST);
	repo.linkChapter.mockResolvedValue({ contentId: 'ssc-1', chapterId: 'ch-1' });
	repo.unlinkChapter.mockResolvedValue(false);
	repo.setChapters.mockResolvedValue(undefined);
	repo.findChapterById.mockResolvedValue(null);

	guard.assertContentOwnerOrForbidden.mockResolvedValue(createStudySetContentFixture());
	guard.assertContentVisibleByIdOrNotFound.mockResolvedValue(createStudySetContentFixture());
	guard.assertStudySetOwnerOrForbidden.mockResolvedValue(undefined);
	guard.assertStudySetVisibleByIdOrNotFound.mockResolvedValue(undefined);

	const service = new StudySetContentService(repo, guard as unknown as StudySetContentGuard);
	return { repo, guard, service };
}

function throwForbidden(): never {
	throw new ORPCError('FORBIDDEN', { message: 'Forbidden' });
}

function throwNotFound(): never {
	throw new ORPCError('NOT_FOUND', { message: 'Not found' });
}

const sampleStudySetId = '11111111-1111-1111-1111-111111111111';
const sampleContentId = '22222222-2222-2222-2222-222222222222';
const sampleChapterId = '33333333-3333-3333-3333-333333333333';

describe.concurrent('StudySetContentService', () => {
	describe('createContent', () => {
		it('propagates FORBIDDEN from guard.assertStudySetOwnerOrForbidden', async ({ expect }) => {
			const { guard, repo, service } = setupService();
			guard.assertStudySetOwnerOrForbidden.mockImplementation(throwForbidden);
			const err = await captureError(
				service.createContent({ studySetId: sampleStudySetId, content: 'test content' }, 'owner-1')
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'FORBIDDEN' });
			expect(repo.insertContent).not.toHaveBeenCalled();
		});

		it('creates content and returns it with empty chapterIds', async ({ expect }) => {
			const { repo, service } = setupService();
			const inserted = createStudySetContentFixture({
				id: 'ssc-created',
				studySetId: sampleStudySetId,
				content: 'test content'
			});
			repo.insertContent.mockResolvedValue(inserted);
			repo.findContentByIdWithChapters.mockResolvedValue(
				createStudySetContentWithChaptersFixture({ id: 'ssc-created', chapterIds: [] })
			);
			const result = await service.createContent(
				{ studySetId: sampleStudySetId, content: 'test content' },
				'owner-1'
			);
			expect(repo.insertContent).toHaveBeenCalledOnce();
			expect(result.content).toBe('test content');
			expect(result.chapterIds).toEqual([]);
		});

		it('creates content with initial chapter links when chapterIds provided', async ({
			expect
		}) => {
			const { repo, service } = setupService();
			const inserted = createStudySetContentFixture({
				id: 'ssc-created',
				studySetId: sampleStudySetId
			});
			repo.insertContent.mockResolvedValue(inserted);
			repo.findContentByIdWithChapters.mockResolvedValue(
				createStudySetContentWithChaptersFixture({
					id: 'ssc-created',
					chapterIds: [sampleChapterId]
				})
			);
			const result = await service.createContent(
				{
					studySetId: sampleStudySetId,
					content: 'test content',
					chapterIds: [sampleChapterId]
				},
				'owner-1'
			);
			expect(repo.setChapters).toHaveBeenCalledWith('ssc-created', [sampleChapterId]);
			expect(result.chapterIds).toEqual([sampleChapterId]);
		});
	});

	describe('updateContent', () => {
		it('propagates FORBIDDEN from guard.assertContentOwnerOrForbidden', async ({ expect }) => {
			const { guard, repo, service } = setupService();
			guard.assertContentOwnerOrForbidden.mockImplementation(throwForbidden);
			const err = await captureError(
				service.updateContent({ id: sampleContentId, content: 'updated' }, 'owner-1')
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'FORBIDDEN' });
			expect(repo.updateContent).not.toHaveBeenCalled();
		});

		it('updates content and returns with chapterIds', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			const existing = createStudySetContentFixture({
				id: sampleContentId,
				studySetId: sampleStudySetId
			});
			guard.assertContentOwnerOrForbidden.mockResolvedValue(existing);
			const updated = createStudySetContentFixture({
				id: sampleContentId,
				content: 'updated content'
			});
			repo.updateContent.mockResolvedValue(updated);
			repo.findContentByIdWithChapters.mockResolvedValue(
				createStudySetContentWithChaptersFixture({
					id: sampleContentId,
					content: 'updated content',
					chapterIds: ['ch-1']
				})
			);
			const result = await service.updateContent(
				{ id: sampleContentId, content: 'updated content' },
				'owner-1'
			);
			expect(repo.updateContent).toHaveBeenCalledWith(
				sampleContentId,
				sampleStudySetId,
				expect.objectContaining({ content: 'updated content' })
			);
			expect(result.content).toBe('updated content');
		});

		it('throws NOT_FOUND when repo update returns null', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.assertContentOwnerOrForbidden.mockResolvedValue(
				createStudySetContentFixture({ id: sampleContentId, studySetId: sampleStudySetId })
			);
			repo.updateContent.mockResolvedValue(null);
			const err = await captureError(
				service.updateContent({ id: sampleContentId, content: 'updated' }, 'owner-1')
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});
	});

	describe('deleteContent', () => {
		it('propagates FORBIDDEN from guard.assertContentOwnerOrForbidden', async ({ expect }) => {
			const { guard, repo, service } = setupService();
			guard.assertContentOwnerOrForbidden.mockImplementation(throwForbidden);
			const err = await captureError(service.deleteContent({ id: sampleContentId }, 'owner-1'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'FORBIDDEN' });
			expect(repo.deleteContent).not.toHaveBeenCalled();
		});

		it('deletes the content and succeeds', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.assertContentOwnerOrForbidden.mockResolvedValue(
				createStudySetContentFixture({ id: sampleContentId, studySetId: sampleStudySetId })
			);
			repo.deleteContent.mockResolvedValue(true);
			await expect(
				service.deleteContent({ id: sampleContentId }, 'owner-1')
			).resolves.toBeUndefined();
			expect(repo.deleteContent).toHaveBeenCalledWith(sampleContentId, sampleStudySetId);
		});

		it('throws NOT_FOUND when repo reports nothing was deleted', async ({ expect }) => {
			const { repo, service } = setupService();
			repo.deleteContent.mockResolvedValue(false);
			const err = await captureError(service.deleteContent({ id: sampleContentId }, 'owner-1'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});
	});

	describe('getContent', () => {
		it('returns content with chapterIds after visibility check', async ({ expect }) => {
			const { repo, service } = setupService();
			repo.findContentByIdWithChapters.mockResolvedValue(
				createStudySetContentWithChaptersFixture({
					id: sampleContentId,
					chapterIds: ['ch-1', 'ch-2']
				})
			);
			const result = await service.getContent({ id: sampleContentId }, 'user-1');
			expect(result.id).toBe(sampleContentId);
			expect(result.chapterIds).toEqual(['ch-1', 'ch-2']);
		});

		it('propagates NOT_FOUND from visibility check', async ({ expect }) => {
			const { guard, service } = setupService();
			guard.assertContentVisibleByIdOrNotFound.mockImplementation(throwNotFound);
			const err = await captureError(service.getContent({ id: sampleContentId }, 'user-1'));
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});
	});

	describe('listContentsByStudySet', () => {
		it('returns contents after study set visibility check', async ({ expect }) => {
			const { repo, service } = setupService();
			const list = [
				createStudySetContentWithChaptersFixture({ id: 'ssc-1' }),
				createStudySetContentWithChaptersFixture({ id: 'ssc-2' })
			];
			repo.findContentsByStudySet.mockResolvedValue(list);
			const result = await service.listContentsByStudySet(
				{ studySetId: sampleStudySetId },
				'user-1'
			);
			expect(result).toBe(list);
			expect(repo.findContentsByStudySet).toHaveBeenCalledWith(sampleStudySetId);
		});

		it('propagates NOT_FOUND when study set is not visible', async ({ expect }) => {
			const { guard, service } = setupService();
			guard.assertStudySetVisibleByIdOrNotFound.mockImplementation(throwNotFound);
			const err = await captureError(
				service.listContentsByStudySet({ studySetId: sampleStudySetId }, 'user-1')
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});
	});

	describe('listContentsByChapter', () => {
		it('returns contents after chapter visibility check', async ({ expect }) => {
			const { repo, service } = setupService();
			repo.findChapterById.mockResolvedValue({
				id: sampleChapterId,
				studySetId: sampleStudySetId
			});
			const list = [createStudySetContentWithChaptersFixture({ id: 'ssc-1' })];
			repo.findContentsByChapter.mockResolvedValue(list);
			const result = await service.listContentsByChapter({ chapterId: sampleChapterId }, 'user-1');
			expect(result).toBe(list);
			expect(repo.findContentsByChapter).toHaveBeenCalledWith(sampleChapterId);
		});

		it('throws NOT_FOUND when chapter does not exist', async ({ expect }) => {
			const { repo, service } = setupService();
			repo.findChapterById.mockResolvedValue(null);
			const err = await captureError(
				service.listContentsByChapter({ chapterId: sampleChapterId }, 'user-1')
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});

		it('throws NOT_FOUND when study set is not visible', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			repo.findChapterById.mockResolvedValue({
				id: sampleChapterId,
				studySetId: sampleStudySetId
			});
			guard.assertStudySetVisibleByIdOrNotFound.mockImplementation(throwNotFound);
			const err = await captureError(
				service.listContentsByChapter({ chapterId: sampleChapterId }, 'user-1')
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});
	});

	describe('linkChapter', () => {
		it('links a chapter to content in the same study set', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.assertContentOwnerOrForbidden.mockResolvedValue(
				createStudySetContentFixture({ id: sampleContentId, studySetId: sampleStudySetId })
			);
			repo.findChapterById.mockResolvedValue({
				id: sampleChapterId,
				studySetId: sampleStudySetId
			});
			repo.linkChapter.mockResolvedValue({
				contentId: sampleContentId,
				chapterId: sampleChapterId
			});
			await expect(
				service.linkChapter({ contentId: sampleContentId, chapterId: sampleChapterId }, 'owner-1')
			).resolves.toBeUndefined();
		});

		it('throws FORBIDDEN when chapter is in a different study set', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.assertContentOwnerOrForbidden.mockResolvedValue(
				createStudySetContentFixture({ id: sampleContentId, studySetId: sampleStudySetId })
			);
			repo.findChapterById.mockResolvedValue({
				id: sampleChapterId,
				studySetId: 'other-study-set'
			});
			const err = await captureError(
				service.linkChapter({ contentId: sampleContentId, chapterId: sampleChapterId }, 'owner-1')
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'FORBIDDEN' });
		});

		it('throws NOT_FOUND when chapter does not exist', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.assertContentOwnerOrForbidden.mockResolvedValue(
				createStudySetContentFixture({ id: sampleContentId, studySetId: sampleStudySetId })
			);
			repo.findChapterById.mockResolvedValue(null);
			const err = await captureError(
				service.linkChapter({ contentId: sampleContentId, chapterId: sampleChapterId }, 'owner-1')
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});

		it('throws NOT_FOUND when link returns null (duplicate or missing content)', async ({
			expect
		}) => {
			const { repo, guard, service } = setupService();
			guard.assertContentOwnerOrForbidden.mockResolvedValue(
				createStudySetContentFixture({ id: sampleContentId, studySetId: sampleStudySetId })
			);
			repo.findChapterById.mockResolvedValue({
				id: sampleChapterId,
				studySetId: sampleStudySetId
			});
			repo.linkChapter.mockResolvedValue(null);
			const err = await captureError(
				service.linkChapter({ contentId: sampleContentId, chapterId: sampleChapterId }, 'owner-1')
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});
	});

	describe('unlinkChapter', () => {
		it('removes a chapter link from content', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.assertContentOwnerOrForbidden.mockResolvedValue(
				createStudySetContentFixture({ id: sampleContentId, studySetId: sampleStudySetId })
			);
			repo.unlinkChapter.mockResolvedValue(true);
			await expect(
				service.unlinkChapter({ contentId: sampleContentId, chapterId: sampleChapterId }, 'owner-1')
			).resolves.toBeUndefined();
		});

		it('throws NOT_FOUND when link does not exist', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.assertContentOwnerOrForbidden.mockResolvedValue(
				createStudySetContentFixture({ id: sampleContentId, studySetId: sampleStudySetId })
			);
			repo.unlinkChapter.mockResolvedValue(false);
			const err = await captureError(
				service.unlinkChapter({ contentId: sampleContentId, chapterId: sampleChapterId }, 'owner-1')
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});

		it('propagates FORBIDDEN from guard', async ({ expect }) => {
			const { guard, service } = setupService();
			guard.assertContentOwnerOrForbidden.mockImplementation(throwForbidden);
			const err = await captureError(
				service.unlinkChapter({ contentId: sampleContentId, chapterId: sampleChapterId }, 'owner-1')
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'FORBIDDEN' });
		});
	});

	describe('setChapters', () => {
		it('replaces all chapter links', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.assertContentOwnerOrForbidden.mockResolvedValue(
				createStudySetContentFixture({ id: sampleContentId, studySetId: sampleStudySetId })
			);
			repo.findChapterById.mockResolvedValue({
				id: sampleChapterId,
				studySetId: sampleStudySetId
			});
			await service.setChapters(
				{ contentId: sampleContentId, chapterIds: [sampleChapterId] },
				'owner-1'
			);
			expect(repo.setChapters).toHaveBeenCalledWith(sampleContentId, [sampleChapterId]);
		});

		it('allows empty chapterIds array to clear all links', async ({ expect }) => {
			const { repo, service } = setupService();
			await service.setChapters({ contentId: sampleContentId, chapterIds: [] }, 'owner-1');
			expect(repo.setChapters).toHaveBeenCalledWith(sampleContentId, []);
		});

		it('throws NOT_FOUND when a chapter does not exist', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.assertContentOwnerOrForbidden.mockResolvedValue(
				createStudySetContentFixture({ id: sampleContentId, studySetId: sampleStudySetId })
			);
			repo.findChapterById.mockResolvedValue(null);
			const err = await captureError(
				service.setChapters(
					{ contentId: sampleContentId, chapterIds: [sampleChapterId] },
					'owner-1'
				)
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'NOT_FOUND' });
		});

		it('throws FORBIDDEN when a chapter is in a different study set', async ({ expect }) => {
			const { repo, guard, service } = setupService();
			guard.assertContentOwnerOrForbidden.mockResolvedValue(
				createStudySetContentFixture({ id: sampleContentId, studySetId: sampleStudySetId })
			);
			repo.findChapterById.mockResolvedValue({
				id: sampleChapterId,
				studySetId: 'other-study-set'
			});
			const err = await captureError(
				service.setChapters(
					{ contentId: sampleContentId, chapterIds: [sampleChapterId] },
					'owner-1'
				)
			);
			expect(err).toBeInstanceOf(ORPCError);
			expect(err).toMatchObject({ code: 'FORBIDDEN' });
		});
	});
});
```

- [ ] **Step 3: Run the service tests**

Run: `rtk pnpm run test:unit -- src/lib/server/services/study-set-content/study-set-content.service.test.ts`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/services/study-set-content/study-set-content.service.ts \
        src/lib/server/services/study-set-content/study-set-content.service.test.ts
git commit -m "feat(study-set-content): add service with chapter linking logic"
```

---

### Task 9: Singleton Wiring

**Files:**

- Create: `src/lib/server/services/study-set-content/index.ts`

- [ ] **Step 1: Write the index.ts wiring**

```typescript
import { StudySetContentDrizzleRepository } from './study-set-content.repository.drizzle.ts';
import { StudySetContentGuard } from './study-set-content.guard.ts';
import { StudySetContentService } from './study-set-content.service.ts';
import { studySetGuard } from '../study-set/index.ts';

const studySetContentRepo = new StudySetContentDrizzleRepository();
export const studySetContentGuard = new StudySetContentGuard(studySetContentRepo, studySetGuard);
export const studySetContentService = new StudySetContentService(
	studySetContentRepo,
	studySetContentGuard
);
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/server/services/study-set-content/index.ts
git commit -m "feat(study-set-content): wire singletons in index.ts"
```

---

### Task 10: Router, Commands, and Queries

**Files:**

- Create: `src/lib/server/services/study-set-content/commands/study-set-content.create.ts`
- Create: `src/lib/server/services/study-set-content/commands/study-set-content.update.ts`
- Create: `src/lib/server/services/study-set-content/commands/study-set-content.delete.ts`
- Create: `src/lib/server/services/study-set-content/commands/study-set-content.link-chapter.ts`
- Create: `src/lib/server/services/study-set-content/commands/study-set-content.unlink-chapter.ts`
- Create: `src/lib/server/services/study-set-content/commands/study-set-content.set-chapters.ts`
- Create: `src/lib/server/services/study-set-content/queries/study-set-content.get.ts`
- Create: `src/lib/server/services/study-set-content/queries/study-set-content.list.ts`
- Create: `src/lib/server/services/study-set-content/queries/study-set-content.list-by-chapter.ts`
- Create: `src/lib/server/services/study-set-content/study-set-content.router.ts`

- [ ] **Step 1: Write all 6 command files**

**`commands/study-set-content.create.ts`:**

```typescript
import { authorizedProcedure } from '$lib/server/api/base';
import {
	createStudySetContentInputSchema,
	studySetContentSchema
} from '$lib/schemas/study-set-content';
import { studySetContentService } from '../index';

const ERRORS = {
	FORBIDDEN: { message: 'Cannot create content in a study set you do not own' }
} as const;

export const studySetContentCreate = authorizedProcedure
	.errors(ERRORS)
	.input(createStudySetContentInputSchema)
	.output(studySetContentSchema)
	.handler(async ({ input, context }) =>
		studySetContentService.createContent(input, context.user.id)
	);
```

**`commands/study-set-content.update.ts`:**

```typescript
import { authorizedProcedure } from '$lib/server/api/base';
import {
	updateStudySetContentInputSchema,
	studySetContentSchema
} from '$lib/schemas/study-set-content';
import { studySetContentService } from '../index';

const ERRORS = {
	FORBIDDEN: { message: 'Cannot modify content you do not own' },
	NOT_FOUND: { message: 'Content not found' }
} as const;

export const studySetContentUpdate = authorizedProcedure
	.errors(ERRORS)
	.input(updateStudySetContentInputSchema)
	.output(studySetContentSchema)
	.handler(async ({ input, context }) =>
		studySetContentService.updateContent(input, context.user.id)
	);
```

**`commands/study-set-content.delete.ts`:**

```typescript
import { authorizedProcedure } from '$lib/server/api/base';
import {
	deleteStudySetContentInputSchema,
	studySetContentDeleteOutputSchema
} from '$lib/schemas/study-set-content';
import { studySetContentService } from '../index';

const ERRORS = {
	FORBIDDEN: { message: 'Cannot delete content you do not own' },
	NOT_FOUND: { message: 'Content not found' }
} as const;

export const studySetContentDelete = authorizedProcedure
	.errors(ERRORS)
	.input(deleteStudySetContentInputSchema)
	.output(studySetContentDeleteOutputSchema)
	.handler(async ({ input, context }) => {
		await studySetContentService.deleteContent(input, context.user.id);
		return { success: true } as const;
	});
```

**`commands/study-set-content.link-chapter.ts`:**

```typescript
import { authorizedProcedure } from '$lib/server/api/base';
import {
	linkChapterToContentInputSchema,
	linkChapterOutputSchema
} from '$lib/schemas/study-set-content';
import { studySetContentService } from '../index';

const ERRORS = {
	FORBIDDEN: {
		message: 'Cannot modify content you do not own or chapter is in a different study set'
	},
	NOT_FOUND: { message: 'Content or chapter not found' }
} as const;

export const studySetContentLinkChapter = authorizedProcedure
	.errors(ERRORS)
	.input(linkChapterToContentInputSchema)
	.output(linkChapterOutputSchema)
	.handler(async ({ input, context }) => {
		await studySetContentService.linkChapter(input, context.user.id);
		return { success: true } as const;
	});
```

**`commands/study-set-content.unlink-chapter.ts`:**

```typescript
import { authorizedProcedure } from '$lib/server/api/base';
import {
	unlinkChapterFromContentInputSchema,
	linkChapterOutputSchema
} from '$lib/schemas/study-set-content';
import { studySetContentService } from '../index';

const ERRORS = {
	FORBIDDEN: { message: 'Cannot modify content you do not own' },
	NOT_FOUND: { message: 'Link not found' }
} as const;

export const studySetContentUnlinkChapter = authorizedProcedure
	.errors(ERRORS)
	.input(unlinkChapterFromContentInputSchema)
	.output(linkChapterOutputSchema)
	.handler(async ({ input, context }) => {
		await studySetContentService.unlinkChapter(input, context.user.id);
		return { success: true } as const;
	});
```

**`commands/study-set-content.set-chapters.ts`:**

```typescript
import { authorizedProcedure } from '$lib/server/api/base';
import {
	setContentChaptersInputSchema,
	linkChapterOutputSchema
} from '$lib/schemas/study-set-content';
import { studySetContentService } from '../index';

const ERRORS = {
	FORBIDDEN: {
		message: 'Cannot modify content you do not own or a chapter is in a different study set'
	},
	NOT_FOUND: { message: 'Content or chapter not found' }
} as const;

export const studySetContentSetChapters = authorizedProcedure
	.errors(ERRORS)
	.input(setContentChaptersInputSchema)
	.output(linkChapterOutputSchema)
	.handler(async ({ input, context }) => {
		await studySetContentService.setChapters(input, context.user.id);
		return { success: true } as const;
	});
```

- [ ] **Step 2: Write all 3 query files**

**`queries/study-set-content.get.ts`:**

```typescript
import { authorizedProcedure } from '$lib/server/api/base';
import {
	getStudySetContentInputSchema,
	studySetContentSchema
} from '$lib/schemas/study-set-content';
import { studySetContentService } from '../index';

const ERRORS = {
	NOT_FOUND: { message: 'Content not found' }
} as const;

export const studySetContentGet = authorizedProcedure
	.errors(ERRORS)
	.input(getStudySetContentInputSchema)
	.output(studySetContentSchema)
	.handler(async ({ input, context }) => studySetContentService.getContent(input, context.user.id));
```

**`queries/study-set-content.list.ts`:**

```typescript
import { authorizedProcedure } from '$lib/server/api/base';
import {
	listStudySetContentInputSchema,
	studySetContentListOutputSchema
} from '$lib/schemas/study-set-content';
import { studySetContentService } from '../index';

const ERRORS = {
	NOT_FOUND: { message: 'Study set not found' }
} as const;

export const studySetContentList = authorizedProcedure
	.errors(ERRORS)
	.input(listStudySetContentInputSchema)
	.output(studySetContentListOutputSchema)
	.handler(async ({ input, context }) =>
		studySetContentService.listContentsByStudySet(input, context.user.id)
	);
```

**`queries/study-set-content.list-by-chapter.ts`:**

```typescript
import { authorizedProcedure } from '$lib/server/api/base';
import {
	listByChapterStudySetContentInputSchema,
	studySetContentListOutputSchema
} from '$lib/schemas/study-set-content';
import { studySetContentService } from '../index';

const ERRORS = {
	NOT_FOUND: { message: 'Chapter not found' }
} as const;

export const studySetContentListByChapter = authorizedProcedure
	.errors(ERRORS)
	.input(listByChapterStudySetContentInputSchema)
	.output(studySetContentListOutputSchema)
	.handler(async ({ input, context }) =>
		studySetContentService.listContentsByChapter(input, context.user.id)
	);
```

- [ ] **Step 3: Write the router**

**`study-set-content.router.ts`:**

```typescript
import { studySetContentCreate } from './commands/study-set-content.create.ts';
import { studySetContentUpdate } from './commands/study-set-content.update.ts';
import { studySetContentDelete } from './commands/study-set-content.delete.ts';
import { studySetContentLinkChapter } from './commands/study-set-content.link-chapter.ts';
import { studySetContentUnlinkChapter } from './commands/study-set-content.unlink-chapter.ts';
import { studySetContentSetChapters } from './commands/study-set-content.set-chapters.ts';
import { studySetContentGet } from './queries/study-set-content.get.ts';
import { studySetContentList } from './queries/study-set-content.list.ts';
import { studySetContentListByChapter } from './queries/study-set-content.list-by-chapter.ts';

export const studySetContentRouter = {
	create: studySetContentCreate,
	update: studySetContentUpdate,
	delete: studySetContentDelete,
	get: studySetContentGet,
	list: studySetContentList,
	listByChapter: studySetContentListByChapter,
	chapter: {
		link: studySetContentLinkChapter,
		unlink: studySetContentUnlinkChapter,
		set: studySetContentSetChapters
	}
};

export type StudySetContentRouter = typeof studySetContentRouter;
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm run check`
Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/services/study-set-content/commands/ \
        src/lib/server/services/study-set-content/queries/ \
        src/lib/server/services/study-set-content/study-set-content.router.ts
git commit -m "feat(study-set-content): add oRPC router, commands, and queries"
```

---

### Task 11: Repository Drizzle Integration Tests

**Files:**

- Create: `src/lib/server/services/study-set-content/study-set-content.repository.drizzle.test.ts`

- [ ] **Step 1: Write integration tests**

```typescript
import { eq } from 'drizzle-orm';
import { describe, it } from 'vitest';
import {
	studySetContent,
	studySetContentToChapter
} from '$lib/server/infras/db/schema/study-set-content';
import { chapter } from '$lib/server/infras/db/schema/chapter';
import { studySet } from '$lib/server/infras/db/schema/study-set';
import { generateId } from '$lib/server/utils/nanoid';
import { STUDY_SET_CONTENT_ID_PREFIX } from './study-set-content.constant';
import { CHAPTER_ID_PREFIX } from '../chapter/chapter.constant';
import { StudySetContentTestEnv } from './study-set-content.testing';

describe.concurrent('StudySetContentDrizzleRepository', () => {
	describe('insertContent', () => {
		it('persists the row and returns it with timestamps', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			const before = Date.now();
			const created = await env.repo.insertContent({
				id: 'ssc-1',
				studySetId: env.studySetId,
				content: 'This is study content'
			});
			const after = Date.now();

			expect(created.id).toBe('ssc-1');
			expect(created.studySetId).toBe(env.studySetId);
			expect(created.content).toBe('This is study content');
			expect(created.createdAt.getTime()).toBeGreaterThanOrEqual(before);
			expect(created.createdAt.getTime()).toBeLessThanOrEqual(after);
			expect(created.updatedAt.getTime()).toBeGreaterThanOrEqual(before);

			const rows = env.db
				.select()
				.from(studySetContent)
				.where(eq(studySetContent.id, 'ssc-1'))
				.all();
			expect(rows).toHaveLength(1);
		});

		it('allows inserting the max-length content string', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			const longContent = 'a'.repeat(50_000);
			const created = await env.repo.insertContent({
				id: 'ssc-long',
				studySetId: env.studySetId,
				content: longContent
			});
			expect(created.content).toBe(longContent);
		});
	});

	describe('updateContent', () => {
		it('updates content when id and studySetId match', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			await env.seedContent({ id: 'ssc-1', content: 'Original content' });
			const updated = await env.repo.updateContent('ssc-1', env.studySetId, {
				content: 'Updated content'
			});
			expect(updated).not.toBeNull();
			expect(updated!.content).toBe('Updated content');
		});

		it('returns null when the id does not exist', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			expect(await env.repo.updateContent('missing', env.studySetId, { content: 'X' })).toBeNull();
		});

		it('returns null when studySetId does not match', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			await env.seedContent({ id: 'ssc-1', studySetId: env.studySetId });
			const result = await env.repo.updateContent('ssc-1', env.otherStudySetId, {
				content: 'Hacked'
			});
			expect(result).toBeNull();
			const [row] = env.db
				.select()
				.from(studySetContent)
				.where(eq(studySetContent.id, 'ssc-1'))
				.all();
			expect(row?.content).toBe('Default content text');
		});
	});

	describe('deleteContent', () => {
		it('returns true and removes the row', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			await env.seedContent({ id: 'ssc-1' });
			const ok = await env.repo.deleteContent('ssc-1', env.studySetId);
			expect(ok).toBe(true);
			expect(
				env.db.select().from(studySetContent).where(eq(studySetContent.id, 'ssc-1')).all()
			).toHaveLength(0);
		});

		it('returns false when the id does not exist', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			expect(await env.repo.deleteContent('missing', env.studySetId)).toBe(false);
		});

		it('returns false when studySetId does not match', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			await env.seedContent({ id: 'ssc-1' });
			expect(await env.repo.deleteContent('ssc-1', env.otherStudySetId)).toBe(false);
			expect(
				env.db.select().from(studySetContent).where(eq(studySetContent.id, 'ssc-1')).all()
			).toHaveLength(1);
		});

		it('cascades to junction table', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			env.seedChapterSync('ch-1', env.studySetId, env.ownerId);
			await env.seedContent({ id: 'ssc-1' });
			await env.repo.linkChapter('ssc-1', 'ch-1');

			await env.repo.deleteContent('ssc-1', env.studySetId);

			const junctions = env.db
				.select()
				.from(studySetContentToChapter)
				.where(eq(studySetContentToChapter.contentId, 'ssc-1'))
				.all();
			expect(junctions).toHaveLength(0);
		});
	});

	describe('findContentById', () => {
		it('returns the row when it exists', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			await env.seedContent({ id: 'ssc-1', content: 'Find me' });
			const result = await env.repo.findContentById('ssc-1');
			expect(result?.id).toBe('ssc-1');
			expect(result?.content).toBe('Find me');
		});

		it('returns null when the id does not exist', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			expect(await env.repo.findContentById('missing')).toBeNull();
		});
	});

	describe('findContentByIdWithChapters', () => {
		it('returns content with empty chapterIds when no links', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			await env.seedContent({ id: 'ssc-1', content: 'No chapters' });
			const result = await env.repo.findContentByIdWithChapters('ssc-1');
			expect(result).not.toBeNull();
			expect(result!.id).toBe('ssc-1');
			expect(result!.content).toBe('No chapters');
			expect(result!.chapterIds).toEqual([]);
		});

		it('returns content with chapterIds when links exist', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			env.seedChapterSync('ch-1', env.studySetId, env.ownerId);
			env.seedChapterSync('ch-2', env.studySetId, env.ownerId);
			await env.seedContent({ id: 'ssc-1', content: 'Linked content' });
			await env.repo.linkChapter('ssc-1', 'ch-1');
			await env.repo.linkChapter('ssc-1', 'ch-2');

			const result = await env.repo.findContentByIdWithChapters('ssc-1');
			expect(result).not.toBeNull();
			expect(result!.chapterIds).toContain('ch-1');
			expect(result!.chapterIds).toContain('ch-2');
			expect(result!.chapterIds).toHaveLength(2);
		});

		it('returns null when content does not exist', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			expect(await env.repo.findContentByIdWithChapters('missing')).toBeNull();
		});
	});

	describe('findContentsByStudySet', () => {
		it('returns contents in the study set', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			await env.seedContent({ id: 'ssc-1', studySetId: env.studySetId, content: 'Content A' });
			await env.seedContent({ id: 'ssc-2', studySetId: env.studySetId, content: 'Content B' });

			const results = await env.repo.findContentsByStudySet(env.studySetId);
			const ids = results.map((c) => c.id);
			expect(ids).toContain('ssc-1');
			expect(ids).toContain('ssc-2');
			expect(results).toHaveLength(2);
		});

		it('includes chapterIds in results', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			env.seedChapterSync('ch-1', env.studySetId, env.ownerId);
			await env.seedContent({ id: 'ssc-1', studySetId: env.studySetId });
			await env.repo.linkChapter('ssc-1', 'ch-1');

			const results = await env.repo.findContentsByStudySet(env.studySetId);
			const found = results.find((c) => c.id === 'ssc-1');
			expect(found?.chapterIds).toEqual(['ch-1']);
		});

		it('returns empty array for study set with no content', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			const results = await env.repo.findContentsByStudySet(env.studySetId);
			expect(results).toEqual([]);
		});
	});

	describe('findContentsByChapter', () => {
		it('returns contents linked to the chapter', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			env.seedChapterSync('ch-1', env.studySetId, env.ownerId);
			await env.seedContent({ id: 'ssc-1', studySetId: env.studySetId });
			await env.seedContent({ id: 'ssc-2', studySetId: env.studySetId });
			await env.repo.linkChapter('ssc-1', 'ch-1');

			const results = await env.repo.findContentsByChapter('ch-1');
			expect(results).toHaveLength(1);
			expect(results[0]!.id).toBe('ssc-1');
		});

		it('returns empty array when chapter has no content', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			env.seedChapterSync('ch-1', env.studySetId, env.ownerId);
			const results = await env.repo.findContentsByChapter('ch-1');
			expect(results).toEqual([]);
		});

		it('returns empty array when chapter does not exist', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			const results = await env.repo.findContentsByChapter('does-not-exist');
			expect(results).toEqual([]);
		});
	});

	describe('linkChapter', () => {
		it('creates a junction row', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			env.seedChapterSync('ch-1', env.studySetId, env.ownerId);
			await env.seedContent({ id: 'ssc-1' });
			const result = await env.repo.linkChapter('ssc-1', 'ch-1');
			expect(result).not.toBeNull();
			expect(result!.contentId).toBe('ssc-1');
			expect(result!.chapterId).toBe('ch-1');
		});

		it('returns null on duplicate (composite PK violation)', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			env.seedChapterSync('ch-1', env.studySetId, env.ownerId);
			await env.seedContent({ id: 'ssc-1' });
			await env.repo.linkChapter('ssc-1', 'ch-1');
			const duplicate = await env.repo.linkChapter('ssc-1', 'ch-1');
			expect(duplicate).toBeNull();
		});
	});

	describe('unlinkChapter', () => {
		it('removes the junction row', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			env.seedChapterSync('ch-1', env.studySetId, env.ownerId);
			await env.seedContent({ id: 'ssc-1' });
			await env.repo.linkChapter('ssc-1', 'ch-1');
			const ok = await env.repo.unlinkChapter('ssc-1', 'ch-1');
			expect(ok).toBe(true);
			const rows = env.db
				.select()
				.from(studySetContentToChapter)
				.where(eq(studySetContentToChapter.contentId, 'ssc-1'))
				.all();
			expect(rows).toHaveLength(0);
		});

		it('returns false when link does not exist', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			expect(await env.repo.unlinkChapter('ssc-1', 'ch-1')).toBe(false);
		});
	});

	describe('setChapters', () => {
		it('replaces all existing links with new set', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			env.seedChapterSync('ch-1', env.studySetId, env.ownerId);
			env.seedChapterSync('ch-2', env.studySetId, env.ownerId);
			env.seedChapterSync('ch-3', env.studySetId, env.ownerId);
			await env.seedContent({ id: 'ssc-1' });
			await env.repo.linkChapter('ssc-1', 'ch-1');
			await env.repo.linkChapter('ssc-1', 'ch-2');

			await env.repo.setChapters('ssc-1', ['ch-3']);

			const result = await env.repo.findContentByIdWithChapters('ssc-1');
			expect(result!.chapterIds).toEqual(['ch-3']);
		});

		it('sets empty array to clear all links', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			env.seedChapterSync('ch-1', env.studySetId, env.ownerId);
			await env.seedContent({ id: 'ssc-1' });
			await env.repo.linkChapter('ssc-1', 'ch-1');

			await env.repo.setChapters('ssc-1', []);

			const result = await env.repo.findContentByIdWithChapters('ssc-1');
			expect(result!.chapterIds).toEqual([]);
		});

		it('creates links when content had none before', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			env.seedChapterSync('ch-1', env.studySetId, env.ownerId);
			env.seedChapterSync('ch-2', env.studySetId, env.ownerId);
			await env.seedContent({ id: 'ssc-1' });

			await env.repo.setChapters('ssc-1', ['ch-1', 'ch-2']);

			const result = await env.repo.findContentByIdWithChapters('ssc-1');
			expect(result!.chapterIds).toHaveLength(2);
		});
	});
});

describe.concurrent('StudySetContentDrizzleRepository (schema constraints)', () => {
	describe('foreign keys', () => {
		it('rejects inserting content for a non-existent study set', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			const insertOrphan = () =>
				env.repo.insertContent({
					id: 'ssc-orphan',
					studySetId: 'does-not-exist',
					content: 'Orphan'
				});
			await expect(insertOrphan()).rejects.toThrow();
		});

		it('rejects linking to a non-existent content', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			env.seedChapterSync('ch-1', env.studySetId, env.ownerId);
			await expect(env.repo.linkChapter('does-not-exist', 'ch-1')).rejects.toThrow();
		});

		it('rejects linking to a non-existent chapter', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			await env.seedContent({ id: 'ssc-1' });
			await expect(env.repo.linkChapter('ssc-1', 'does-not-exist')).rejects.toThrow();
		});
	});

	describe('cascade from study set deletion', () => {
		it('removes content when the parent study set is deleted', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			await env.seedContent({ id: 'ssc-1' });
			expect(
				env.db.select().from(studySetContent).where(eq(studySetContent.id, 'ssc-1')).all()
			).toHaveLength(1);

			env.db.delete(studySet).where(eq(studySet.id, env.studySetId)).run();

			expect(
				env.db.select().from(studySetContent).where(eq(studySetContent.id, 'ssc-1')).all()
			).toHaveLength(0);
		});

		it('removes junction rows when the chapter is deleted', async ({ expect }) => {
			await using env = new StudySetContentTestEnv();
			env.seedChapterSync('ch-1', env.studySetId, env.ownerId);
			await env.seedContent({ id: 'ssc-1' });
			await env.repo.linkChapter('ssc-1', 'ch-1');

			env.db.delete(chapter).where(eq(chapter.id, 'ch-1')).run();

			const rows = env.db
				.select()
				.from(studySetContentToChapter)
				.where(eq(studySetContentToChapter.contentId, 'ssc-1'))
				.all();
			expect(rows).toHaveLength(0);
		});
	});
});
```

- [ ] **Step 2: Run the integration tests**

Run: `rtk pnpm run test:unit -- src/lib/server/services/study-set-content/study-set-content.repository.drizzle.test.ts`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/services/study-set-content/study-set-content.repository.drizzle.test.ts
git commit -m "test(study-set-content): add repository integration tests"
```

---

### Task 12: Full Verification

**Files:** None (verification only)

- [ ] **Step 1: Run typecheck**

Run: `pnpm run check`
Expected: No errors.

- [ ] **Step 2: Run all tests for the new service**

Run: `rtk pnpm run test:unit -- src/lib/server/services/study-set-content/`
Expected: All tests from the 3 test files pass (guard, service, repository).

- [ ] **Step 3: Run the full test suite to catch regressions**

Run: `rtk pnpm run test:unit`
Expected: No new failures from existing tests.

- [ ] **Step 4: Run the linter**

Run: `rtk lint`
Expected: No new lint errors.

- [ ] **Step 5: If all clean, final commit (if changes from lint fixes)**

```bash
git add -A
git diff --staged --stat
git commit -m "chore(study-set-content): finalize - lint, typecheck, all tests pass"
```
