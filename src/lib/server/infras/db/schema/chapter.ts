import { relations, sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth-schema.ts';
import { flashcard } from './flashcard.ts';
import { quiz } from './quiz.ts';
import { studySetContentToChapter } from './study-set-content.ts';
import { studySet } from './study-set.ts';

export const chapter = sqliteTable(
	'chapter',
	{
		id: text('id').primaryKey(),
		slug: text('slug').notNull(),
		title: text('title').notNull(),
		description: text('description'),
		studySetId: text('study_set_id')
			.notNull()
			.references(() => studySet.id, { onDelete: 'cascade' }),
		ownerId: text('owner_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		uniqueIndex('chapter_studySetId_slug_unique').on(sql`lower(${table.slug})`, table.studySetId),
		index('chapter_studySetId_idx').on(table.studySetId),
		index('chapter_ownerId_idx').on(table.ownerId)
	]
);

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

export type Chapter = typeof chapter.$inferSelect;
export type NewChapter = typeof chapter.$inferInsert;
