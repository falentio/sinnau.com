import { relations, sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth-schema.ts';
import { chapter } from './chapter.ts';
import { studySet } from './study-set.ts';

export const QUIZ_TYPES = ['MULTIPLE_CHOICE', 'MULTIPLE_SELECT', 'FILL_IN_THE_BLANK'] as const;
export type QuizType = (typeof QUIZ_TYPES)[number];

export const quiz = sqliteTable(
	'quiz',
	{
		id: text('id').primaryKey(),
		chapterId: text('chapter_id').references(() => chapter.id, { onDelete: 'set null' }),
		studySetId: text('study_set_id')
			.notNull()
			.references(() => studySet.id, { onDelete: 'cascade' }),
		type: text('type', { enum: QUIZ_TYPES }).notNull(),
		questionText: text('question_text').notNull(),
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
		index('quiz_ownerId_idx').on(table.ownerId),
		index('quiz_studySetId_idx').on(table.studySetId),
		index('quiz_chapterId_idx').on(table.chapterId)
	]
);

export const quizOption = sqliteTable(
	'quiz_option',
	{
		id: text('id').primaryKey(),
		quizId: text('quiz_id')
			.notNull()
			.references(() => quiz.id, { onDelete: 'cascade' }),
		optionText: text('option_text').notNull(),
		isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
		explanation: text('explanation'),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.notNull(),
		updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
			.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [index('quiz_option_quizId_idx').on(table.quizId)]
);

export const quizRelations = relations(quiz, ({ one, many }) => ({
	owner: one(user, {
		fields: [quiz.ownerId],
		references: [user.id]
	}),
	studySet: one(studySet, {
		fields: [quiz.studySetId],
		references: [studySet.id]
	}),
	chapter: one(chapter, {
		fields: [quiz.chapterId],
		references: [chapter.id]
	}),
	options: many(quizOption)
}));

export const quizOptionRelations = relations(quizOption, ({ one }) => ({
	quiz: one(quiz, {
		fields: [quizOption.quizId],
		references: [quiz.id]
	})
}));

export type Quiz = typeof quiz.$inferSelect;
export type NewQuiz = typeof quiz.$inferInsert;
export type QuizOption = typeof quizOption.$inferSelect;
export type NewQuizOption = typeof quizOption.$inferInsert;
