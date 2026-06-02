import { authorizedProcedure } from '$lib/server/api/base';
import { deleteQuizzesInputSchema, quizDeleteOutputSchema } from '$lib/schemas/quiz';
import { quizService } from '../index';

const ERRORS = {
	NOT_FOUND: { message: 'Some quizzes could not be found' }
} as const;

export const quizDelete = authorizedProcedure
	.errors(ERRORS)
	.input(deleteQuizzesInputSchema)
	.output(quizDeleteOutputSchema)
	.handler(async ({ input, context }) => {
		await quizService.deleteQuizzes(input, context.user.id);
		return { success: true } as const;
	});
