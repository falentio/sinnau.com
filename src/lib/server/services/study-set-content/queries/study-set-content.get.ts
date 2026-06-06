import {
  getStudySetContentInputSchema,
  studySetContentSchema,
} from "$lib/schemas/study-set-content";
import { authorizedProcedure } from "$lib/server/api/base";

import { studySetContentService } from "../index";

const ERRORS = {
  NOT_FOUND: { message: "Content not found" },
} as const;

export const studySetContentGet = authorizedProcedure
  .errors(ERRORS)
  .input(getStudySetContentInputSchema)
  .output(studySetContentSchema)
  .handler(({ input, context }) =>
    studySetContentService.getContent(input, context.user.id)
  );
