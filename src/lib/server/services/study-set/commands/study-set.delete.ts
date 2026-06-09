import {
  deleteStudySetInputSchema,
  studySetSchema,
} from "$lib/schemas/study-set";
import { authorizedProcedure } from "$lib/server/api/base";

import { studySetService } from "../index";

const ERRORS = {
  NOT_FOUND: { message: "Study set not found" },
} as const;

export const studySetDelete = authorizedProcedure
  .errors(ERRORS)
  .input(deleteStudySetInputSchema)
  .output(studySetSchema)
  .handler(({ input, context }) =>
    studySetService.deleteStudySet(input, context.user.id)
  );
