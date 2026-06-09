import {
  restoreStudySetInputSchema,
  restoreStudySetOutputSchema,
} from "$lib/schemas/study-set";
import { authorizedProcedure } from "$lib/server/api/base";

import { studySetService } from "../index";

const ERRORS = {
  FORBIDDEN: { message: "Cannot modify a study set you do not own" },
  NOT_FOUND: { message: "Study set not found" },
} as const;

export const studySetRestore = authorizedProcedure
  .errors(ERRORS)
  .input(restoreStudySetInputSchema)
  .output(restoreStudySetOutputSchema)
  .handler(({ input, context }) =>
    studySetService.restoreStudySet(input, context.user.id)
  );
