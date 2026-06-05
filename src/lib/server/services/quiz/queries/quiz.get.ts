import { getQuizInputSchema, quizSchema } from '$lib/schemas/quiz';
import { authorizedProcedure } from '$lib/server/api/base';
import { quizService } from '../index';

const ERRORS = {
	NOT_FOUND: { message: 'Quiz not found' }
} as const;

export const quizGet = authorizedProcedure
	.errors(ERRORS)
	.input(getQuizInputSchema)
	.output(quizSchema)
	.handler(async ({ input, context }) => quizService.getQuiz(input, context.user.id));
