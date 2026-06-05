import {
	linkChapterToContentInputSchema,
	linkChapterOutputSchema
} from '$lib/schemas/study-set-content';
import { authorizedProcedure } from '$lib/server/api/base';
import { studySetContentService } from '../index';

const ERRORS = {
	FORBIDDEN: {
		message: 'Cannot modify content you do not own or chapter is in a different study set'
	},
	NOT_FOUND: { message: 'Content or chapter not found' }
} as const;

export const studySetContentLinkChapter = authorizedProcedure
	.errors(ERRORS)
	.input(linkChapterToContentInputSchema)
	.output(linkChapterOutputSchema)
	.handler(async ({ input, context }) => {
		await studySetContentService.linkChapter(input, context.user.id);
		return { success: true } as const;
	});
