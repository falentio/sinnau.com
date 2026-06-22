import {
  searchStudySetsInputSchema,
  searchStudySetsListOutputSchema,
} from "$lib/schemas/study-set-search";
import { authorizedProcedure } from "$lib/server/api/base";

import { studySetSearchService } from "../index.ts";

export const studySetSearch = authorizedProcedure
  .input(searchStudySetsInputSchema)
  .output(searchStudySetsListOutputSchema)
  .handler(
    async ({ input, context }) =>
      await studySetSearchService.search(input.query, context.user.id)
  );
