import { authorizedProcedure } from '$lib/server/api/base';
import {
	deleteFlashcardsInputSchema,
	flashcardDeleteOutputSchema,
	flashcardPartialForbiddenDataSchema
} from '$lib/schemas/flashcard';
import { flashcardService } from '../index';

const ERRORS = {
	PARTIAL_FORBIDDEN: {
		message: 'Some flashcards cannot be deleted by the current user',
		data: flashcardPartialForbiddenDataSchema
	}
} as const;

export const flashcardDelete = authorizedProcedure
	.errors(ERRORS)
	.input(deleteFlashcardsInputSchema)
	.output(flashcardDeleteOutputSchema)
	.handler(async ({ input, context }) => {
		await flashcardService.deleteFlashcards(input, context.user.id);
		return { success: true } as const;
	});
