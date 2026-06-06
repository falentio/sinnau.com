import {
  createStudySetContentInputSchema,
  studySetContentSchema,
} from "$lib/schemas/study-set-content";
import { authorizedProcedure } from "$lib/server/api/base";

import { studySetContentService } from "../index";

const ERRORS = {
  FORBIDDEN: { message: "Cannot create content in a study set you do not own" },
} as const;

export const studySetContentCreate = authorizedProcedure
  .errors(ERRORS)
  .input(createStudySetContentInputSchema)
  .output(studySetContentSchema)
  .handler(({ input, context }) =>
    studySetContentService.createContent(input, context.user.id)
  );
