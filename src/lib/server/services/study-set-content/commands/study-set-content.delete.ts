import {
	deleteStudySetContentInputSchema,
	studySetContentDeleteOutputSchema
} from '$lib/schemas/study-set-content';
import { authorizedProcedure } from '$lib/server/api/base';
import { studySetContentService } from '../index';

const ERRORS = {
	FORBIDDEN: { message: 'Cannot delete content you do not own' },
	NOT_FOUND: { message: 'Content not found' }
} as const;

export const studySetContentDelete = authorizedProcedure
	.errors(ERRORS)
	.input(deleteStudySetContentInputSchema)
	.output(studySetContentDeleteOutputSchema)
	.handler(async ({ input, context }) => {
		await studySetContentService.deleteContent(input, context.user.id);
		return { success: true } as const;
	});
