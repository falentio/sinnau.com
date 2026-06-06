import { chapterSchema, createChapterInputSchema } from "$lib/schemas/chapter";
import { authorizedProcedure } from "$lib/server/api/base";

import { chapterService } from "../index";

const ERRORS = {
  CHAPTER_SLUG_CONFLICT: {
    message: "Failed to generate a unique chapter slug after maximum retries",
  },
  FORBIDDEN: {
    message: "Cannot create a chapter in a study set you do not own",
  },
} as const;

export const chapterCreate = authorizedProcedure
  .errors(ERRORS)
  .input(createChapterInputSchema)
  .output(chapterSchema)
  .handler(({ input, context }) =>
    chapterService.createChapter(input, context.user.id)
  );
