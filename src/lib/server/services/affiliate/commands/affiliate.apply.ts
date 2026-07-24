import {
  affiliateApplicationSchema,
  applyAffiliateInputSchema,
} from "$lib/schemas/affiliate";
import { authorizedProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {
  AFFILIATE_ALREADY_APPROVED: {
    message: "You already have an affiliate profile",
  },
  AFFILIATE_APPLICATION_PENDING: {
    message: "You already have a pending application",
  },
} as const;

export const affiliateApply = authorizedProcedure
  .errors(ERRORS)
  .input(applyAffiliateInputSchema)
  .output(affiliateApplicationSchema)
  .handler(
    async ({ input, context }) =>
      await affiliateService.apply(input, context.user.id)
  );
