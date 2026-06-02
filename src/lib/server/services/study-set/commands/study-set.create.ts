import { authorizedProcedure } from '$lib/server/api/base';
import { createStudySetInputSchema, studySetSchema } from '$lib/schemas/study-set';
import { studySetService } from '../index';

const ERRORS = {
	STUDY_SET_SLUG_CONFLICT: { message: 'Failed to generate a unique slug after maximum retries' }
} as const;

export const studySetCreate = authorizedProcedure
	.errors(ERRORS)
	.input(createStudySetInputSchema)
	.output(studySetSchema)
	.handler(async ({ input, context }) => studySetService.createStudySet(input, context.user.id));
