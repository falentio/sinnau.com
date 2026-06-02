import { authorizedProcedure } from '$lib/server/api/base';
import { flashcardSchema, getFlashcardInputSchema } from '$lib/schemas/flashcard';
import { flashcardService } from '../index';

const ERRORS = {
	NOT_FOUND: { message: 'Flashcard not found' }
} as const;

export const flashcardGet = authorizedProcedure
	.errors(ERRORS)
	.input(getFlashcardInputSchema)
	.output(flashcardSchema)
	.handler(async ({ input, context }) => flashcardService.getFlashcard(input, context.user.id));
