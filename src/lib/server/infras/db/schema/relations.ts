import { relations } from 'drizzle-orm';
import { chapter } from './chapter.ts';
import { flashcard } from './flashcard.ts';
import { quiz, quizOption } from './quiz.ts';
import { studySet, studySetVisit } from './study-set.ts';
import { studySetContent, studySetContentToChapter } from './study-set-content.ts';
import { user } from './auth-schema.ts';

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

export const flashcardRelations = relations(flashcard, ({ one }) => ({
	owner: one(user, {
		fields: [flashcard.ownerId],
		references: [user.id]
	}),
	studySet: one(studySet, {
		fields: [flashcard.studySetId],
		references: [studySet.id]
	}),
	chapter: one(chapter, {
		fields: [flashcard.chapterId],
		references: [chapter.id]
	})
}));

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

export const studySetVisitRelations = relations(studySetVisit, ({ one }) => ({
	user: one(user, {
		fields: [studySetVisit.userId],
		references: [user.id]
	}),
	studySet: one(studySet, {
		fields: [studySetVisit.studySetId],
		references: [studySet.id]
	})
}));

export const studySetContentRelations = relations(studySetContent, ({ one, many }) => ({
	studySet: one(studySet, {
		fields: [studySetContent.studySetId],
		references: [studySet.id]
	}),
	chapterJunctions: many(studySetContentToChapter)
}));

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
