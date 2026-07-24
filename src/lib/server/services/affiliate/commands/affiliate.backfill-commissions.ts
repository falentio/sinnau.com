import {
  backfillAffiliateCommissionsInputSchema,
  backfillAffiliateCommissionsOutputSchema,
} from "$lib/schemas/affiliate";
import { adminProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {} as const;

export const affiliateBackfillCommissions = adminProcedure
  .errors(ERRORS)
  .input(backfillAffiliateCommissionsInputSchema)
  .output(backfillAffiliateCommissionsOutputSchema)
  .handler(
    async ({ input, context }) =>
      await affiliateService.backfillCommissions(input, context.user.id)
  );
