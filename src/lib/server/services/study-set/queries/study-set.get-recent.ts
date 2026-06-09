import {
  getRecentStudySetsInputSchema,
  studySetSchema,
} from "$lib/schemas/study-set";
import { authorizedProcedure } from "$lib/server/api/base";
import * as v from "valibot";

import { studySetService } from "../index";

export const studySetGetRecent = authorizedProcedure
  .input(getRecentStudySetsInputSchema)
  .output(v.array(studySetSchema))
  .handler(
    async ({ input, context }) =>
      await studySetService.getRecentStudySets(input, context.user.id)
  );
