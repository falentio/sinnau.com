import { getStudySetInputSchema, studySetSchema } from "$lib/schemas/study-set";
import { authorizedProcedure } from "$lib/server/api/base";

import { studySetService } from "../index";

const ERRORS = {
  NOT_FOUND: { message: "Study set not found" },
} as const;

export const studySetGet = authorizedProcedure
  .errors(ERRORS)
  .input(getStudySetInputSchema)
  .output(studySetSchema)
  .handler(
    async ({ input, context }) =>
      await studySetService.getStudySet(input, context.user.id)
  );
