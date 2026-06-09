import {
  chapterListOutputSchema,
  getChaptersInputSchema,
} from "$lib/schemas/chapter";
import { authorizedProcedure } from "$lib/server/api/base";

import { chapterService } from "../index";

export const chapterList = authorizedProcedure
  .input(getChaptersInputSchema)
  .output(chapterListOutputSchema)
  .handler(
    async ({ input, context }) =>
      await chapterService.getChaptersByStudySet(input, context.user.id)
  );
