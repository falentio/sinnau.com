import { chapterSchema, getChapterInputSchema } from "$lib/schemas/chapter";
import { authorizedProcedure } from "$lib/server/api/base";

import { chapterService } from "../index";

const ERRORS = {
  NOT_FOUND: { message: "Chapter not found" },
} as const;

export const chapterGet = authorizedProcedure
  .errors(ERRORS)
  .input(getChapterInputSchema)
  .output(chapterSchema)
  .handler(async ({ input, context }) =>
    chapterService.getChapter(input, context.user.id)
  );
