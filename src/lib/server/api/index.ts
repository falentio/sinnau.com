import { publicProcedure, authorizedProcedure, adminProcedure, requireAuth } from './base.ts';
import { studySetRouter } from '$lib/server/services/study-set/study-set.router';
import { chapterRouter } from '$lib/server/services/chapter/chapter.router';
import { flashcardRouter } from '$lib/server/services/flashcard/flashcard.router';
import { quizRouter } from '$lib/server/services/quiz/quiz.router';

export { publicProcedure, authorizedProcedure, adminProcedure, requireAuth };

export const router = {
	studySet: studySetRouter,
	chapter: chapterRouter,
	flashcard: flashcardRouter,
	quiz: quizRouter
};

export type Router = typeof router;
