import { authorizedProcedure } from '$lib/server/api/base';
import { studySetSchema, updateStudySetInputSchema } from '$lib/schemas/study-set';
import { studySetService } from '../study-set.service';

const ERRORS = {
	FORBIDDEN: { message: 'Cannot modify a study set you do not own' },
	NOT_FOUND: { message: 'Study set not found' }
} as const;

export const studySetUpdate = authorizedProcedure
	.errors(ERRORS)
	.input(updateStudySetInputSchema)
	.output(studySetSchema)
	.handler(async ({ input, context }) => studySetService.updateStudySet(input, context.user.id));
