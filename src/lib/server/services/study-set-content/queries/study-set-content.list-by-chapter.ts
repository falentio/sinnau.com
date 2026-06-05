import {
	listByChapterStudySetContentInputSchema,
	studySetContentListOutputSchema
} from '$lib/schemas/study-set-content';
import { authorizedProcedure } from '$lib/server/api/base';
import { studySetContentService } from '../index';

const ERRORS = {
	NOT_FOUND: { message: 'Chapter not found' }
} as const;

export const studySetContentListByChapter = authorizedProcedure
	.errors(ERRORS)
	.input(listByChapterStudySetContentInputSchema)
	.output(studySetContentListOutputSchema)
	.handler(async ({ input, context }) =>
		studySetContentService.listContentsByChapter(input, context.user.id)
	);
