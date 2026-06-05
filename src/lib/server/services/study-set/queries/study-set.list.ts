import { getStudySetsInputSchema, studySetListResultSchema } from '$lib/schemas/study-set';
import { authorizedProcedure } from '$lib/server/api/base';
import { studySetService } from '../index';

export const studySetList = authorizedProcedure
	.input(getStudySetsInputSchema)
	.output(studySetListResultSchema)
	.handler(async ({ input, context }) => studySetService.getStudySets(input, context.user.id));
