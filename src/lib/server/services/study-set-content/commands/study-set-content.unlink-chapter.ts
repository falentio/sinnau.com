import {
  unlinkChapterFromContentInputSchema,
  linkChapterOutputSchema,
} from "$lib/schemas/study-set-content";
import { authorizedProcedure } from "$lib/server/api/base";

import { studySetContentService } from "../index";

const ERRORS = {
  FORBIDDEN: { message: "Cannot modify content you do not own" },
  NOT_FOUND: { message: "Link not found" },
} as const;

export const studySetContentUnlinkChapter = authorizedProcedure
  .errors(ERRORS)
  .input(unlinkChapterFromContentInputSchema)
  .output(linkChapterOutputSchema)
  .handler(async ({ input, context }) => {
    await studySetContentService.unlinkChapter(input, context.user.id);
    return { success: true } as const;
  });
