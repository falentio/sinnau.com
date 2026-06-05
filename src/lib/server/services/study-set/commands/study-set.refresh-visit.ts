import {
	refreshStudySetVisitInputSchema,
	studySetRefreshVisitOutputSchema
} from '$lib/schemas/study-set';
import { authorizedProcedure } from '$lib/server/api/base';
import { studySetService } from '../index';

const ERRORS = {
	NOT_FOUND: { message: 'Study set not found' }
} as const;

export const studySetRefreshVisit = authorizedProcedure
	.errors(ERRORS)
	.input(refreshStudySetVisitInputSchema)
	.output(studySetRefreshVisitOutputSchema)
	.handler(async ({ input, context }) =>
		studySetService.refreshStudySetVisit(input, context.user.id)
	);
