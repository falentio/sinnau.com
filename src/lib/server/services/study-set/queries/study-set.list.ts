import { authorizedProcedure } from '$lib/server/api/base';
import { getStudySetsInputSchema, studySetListResultSchema } from '$lib/schemas/study-set';
import { studySetService } from '../study-set.service';

export const studySetList = authorizedProcedure
	.input(getStudySetsInputSchema)
	.output(studySetListResultSchema)
	.handler(async ({ input, context }) => studySetService.getStudySets(input, context.user.id));
