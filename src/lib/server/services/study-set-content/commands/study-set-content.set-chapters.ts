import {
  setContentChaptersInputSchema,
  linkChapterOutputSchema,
} from "$lib/schemas/study-set-content";
import { authorizedProcedure } from "$lib/server/api/base";

import { studySetContentService } from "../index";

const ERRORS = {
  FORBIDDEN: {
    message:
      "Cannot modify content you do not own or a chapter is in a different study set",
  },
  NOT_FOUND: { message: "Content or chapter not found" },
} as const;

export const studySetContentSetChapters = authorizedProcedure
  .errors(ERRORS)
  .input(setContentChaptersInputSchema)
  .output(linkChapterOutputSchema)
  .handler(async ({ input, context }) => {
    await studySetContentService.setChapters(input, context.user.id);
    return { success: true } as const;
  });
