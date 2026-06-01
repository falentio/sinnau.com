import * as v from 'valibot';
import { authorizedProcedure } from '$lib/server/api/base';
import { getRecentStudySetsInputSchema, studySetSchema } from '$lib/schemas/study-set';
import { studySetService } from '../study-set.service';

export const studySetGetRecent = authorizedProcedure
	.input(getRecentStudySetsInputSchema)
	.output(v.array(studySetSchema))
	.handler(async ({ input, context }) =>
		studySetService.getRecentStudySets(input, context.user.id)
	);
