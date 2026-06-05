import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth-schema.ts';
import { chapter } from './chapter.ts';
import { studySet } from './study-set.ts';

export const flashcard = sqliteTable(
	'flashcard',
	{
		id: text('id').primaryKey(),
		chapterId: text('chapter_id').references(() => chapter.id, { onDelete: 'set null' }),
		studySetId: text('study_set_id')
			.notNull()
			.references(() => studySet.id, { onDelete: 'cascade' }),
		front: text('front').notNull(),
		back: text('back').notNull(),
		hint: text('hint'),
		importance: integer('importance').notNull().default(0),
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
		index('flashcard_ownerId_idx').on(table.ownerId),
		index('flashcard_studySetId_idx').on(table.studySetId),
		index('flashcard_chapterId_idx').on(table.chapterId)
	]
);

export type Flashcard = typeof flashcard.$inferSelect;
export type NewFlashcard = typeof flashcard.$inferInsert;
