import {
  updateStudySetContentInputSchema,
  studySetContentSchema,
} from "$lib/schemas/study-set-content";
import { authorizedProcedure } from "$lib/server/api/base";

import { studySetContentService } from "../index";

const ERRORS = {
  FORBIDDEN: { message: "Cannot modify content you do not own" },
  NOT_FOUND: { message: "Content not found" },
} as const;

export const studySetContentUpdate = authorizedProcedure
  .errors(ERRORS)
  .input(updateStudySetContentInputSchema)
  .output(studySetContentSchema)
  .handler(async ({ input, context }) =>
    studySetContentService.updateContent(input, context.user.id)
  );
