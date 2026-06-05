import { sql } from 'drizzle-orm';
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { chapter } from './chapter.ts';
import { studySet } from './study-set.ts';

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

export type StudySetContent = typeof studySetContent.$inferSelect;
export type NewStudySetContent = typeof studySetContent.$inferInsert;
export type StudySetContentToChapter = typeof studySetContentToChapter.$inferSelect;
export type NewStudySetContentToChapter = typeof studySetContentToChapter.$inferInsert;

export type StudySetContentWithChapters = StudySetContent & { chapterIds: string[] };
