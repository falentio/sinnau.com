import { authorizedProcedure } from '$lib/server/api/base';
import { getStudySetInputSchema, studySetSchema } from '$lib/schemas/study-set';
import { studySetService } from '../study-set.service';

const ERRORS = {
	NOT_FOUND: { message: 'Study set not found' }
} as const;

export const studySetGet = authorizedProcedure
	.errors(ERRORS)
	.input(getStudySetInputSchema)
	.output(studySetSchema)
	.handler(async ({ input, context }) => studySetService.getStudySet(input, context.user.id));
