import { authorizedProcedure } from '$lib/server/api/base';
import { chapterListOutputSchema, getChaptersInputSchema } from '$lib/schemas/chapter';
import { chapterService } from '../index';

export const chapterList = authorizedProcedure
	.input(getChaptersInputSchema)
	.output(chapterListOutputSchema)
	.handler(async ({ input, context }) => chapterService.getChapters(input, context.user.id));
