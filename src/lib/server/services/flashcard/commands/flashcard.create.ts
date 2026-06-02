import { authorizedProcedure } from '$lib/server/api/base';
import { createFlashcardsInputSchema, flashcardCreateOutputSchema } from '$lib/schemas/flashcard';
import { flashcardService } from '../index';

const ERRORS = {
	FORBIDDEN: { message: 'Cannot create flashcards in a study set you do not own' },
	NOT_FOUND: { message: 'Study set or chapter not found' },
	VALIDATION_FAILED: { message: 'Invalid flashcard payload' },
	BATCH_VALIDATION_FAILED: {
		message: 'Batch flashcard validation failed; no flashcards were created'
	}
} as const;

export const flashcardCreate = authorizedProcedure
	.errors(ERRORS)
	.input(createFlashcardsInputSchema)
	.output(flashcardCreateOutputSchema)
	.handler(async ({ input, context }) => {
		const data = await flashcardService.createFlashcards(input, context.user.id);
		return { success: true as const, data };
	});
