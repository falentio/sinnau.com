import {
  setAffiliateReferrerInputSchema,
  setAffiliateReferrerOutputSchema,
} from "$lib/schemas/affiliate";
import { adminProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {
  AFFILIATE_SELF_REFERRAL: { message: "Cannot refer yourself" },
  NOT_FOUND: { message: "User not found" },
} as const;

export const affiliateSetReferrer = adminProcedure
  .errors(ERRORS)
  .input(setAffiliateReferrerInputSchema)
  .output(setAffiliateReferrerOutputSchema)
  .handler(
    async ({ input, context }) =>
      await affiliateService.setReferrer(input, context.user.id)
  );
