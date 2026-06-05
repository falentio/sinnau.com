import { createQuizOptionsInputSchema, quizOptionSchema } from '$lib/schemas/quiz';
import { authorizedProcedure } from '$lib/server/api/base';
import * as v from 'valibot';
import { quizService } from '../index';

const ERRORS = {
	FORBIDDEN: { message: 'Cannot create options for a quiz you do not own' },
	NOT_FOUND: { message: 'Quiz not found' },
	VALIDATION_FAILED: { message: 'Quiz options violate type constraints' },
	MC_ALREADY_HAS_CORRECT: { message: 'Multiple choice quiz already has a correct option' },
	FITB_MULTIPLE_OPTIONS: { message: 'Fill-in-the-blank quiz cannot have multiple options' }
} as const;

export const quizOptionCreate = authorizedProcedure
	.errors(ERRORS)
	.input(createQuizOptionsInputSchema)
	.output(v.array(quizOptionSchema))
	.handler(async ({ input, context }) => quizService.createQuizOptions(input, context.user.id));
