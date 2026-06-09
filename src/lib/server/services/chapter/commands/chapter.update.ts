import { chapterSchema, updateChapterInputSchema } from "$lib/schemas/chapter";
import { authorizedProcedure } from "$lib/server/api/base";

import { chapterService } from "../index";

const ERRORS = {
  FORBIDDEN: { message: "Cannot modify a chapter you do not own" },
  NOT_FOUND: { message: "Chapter not found" },
} as const;

export const chapterUpdate = authorizedProcedure
  .errors(ERRORS)
  .input(updateChapterInputSchema)
  .output(chapterSchema)
  .handler(async ({ input, context }) =>
    chapterService.updateChapter(input, context.user.id)
  );
