import {
  listStudySetContentInputSchema,
  studySetContentListOutputSchema,
} from "$lib/schemas/study-set-content";
import { authorizedProcedure } from "$lib/server/api/base";

import { studySetContentService } from "../index";

const ERRORS = {
  NOT_FOUND: { message: "Study set not found" },
} as const;

export const studySetContentList = authorizedProcedure
  .errors(ERRORS)
  .input(listStudySetContentInputSchema)
  .output(studySetContentListOutputSchema)
  .handler(
    async ({ input, context }) =>
      await studySetContentService.listContentsByStudySet(
        input,
        context.user.id
      )
  );
