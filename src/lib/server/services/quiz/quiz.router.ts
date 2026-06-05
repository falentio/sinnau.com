import { quizCreate } from './commands/quiz.create.ts';
import { quizDelete } from './commands/quiz.delete.ts';
import { quizOptionCreate } from './commands/quiz.option-create.ts';
import { quizOptionDelete } from './commands/quiz.option-delete.ts';
import { quizOptionUpdate } from './commands/quiz.option-update.ts';
import { quizUpdate } from './commands/quiz.update.ts';
import { quizGet } from './queries/quiz.get.ts';
import { quizList } from './queries/quiz.list.ts';

export const quizRouter = {
	create: quizCreate,
	update: quizUpdate,
	delete: quizDelete,
	list: quizList,
	get: quizGet,
	option: {
		create: quizOptionCreate,
		update: quizOptionUpdate,
		delete: quizOptionDelete
	}
};

export type QuizRouter = typeof quizRouter;
