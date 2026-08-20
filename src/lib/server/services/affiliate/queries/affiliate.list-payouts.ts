import {
  listAffiliatePayoutsInputSchema,
  listAffiliatePayoutsOutputSchema,
} from "$lib/schemas/affiliate";
import { adminProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {} as const;

export const affiliateListPayouts = adminProcedure
  .errors(ERRORS)
  .input(listAffiliatePayoutsInputSchema)
  .output(listAffiliatePayoutsOutputSchema)
  .handler(
    async ({ input, context }) =>
      await affiliateService.listPayouts(input, context.user.id)
  );
