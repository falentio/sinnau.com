import {
  recordAffiliateConversionInputSchema,
  recordAffiliateConversionOutputSchema,
} from "$lib/schemas/affiliate";
import { adminProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {
  AFFILIATE_SELF_REFERRAL: { message: "Cannot refer yourself" },
} as const;

export const affiliateRecordConversion = adminProcedure
  .errors(ERRORS)
  .input(recordAffiliateConversionInputSchema)
  .output(recordAffiliateConversionOutputSchema)
  .handler(
    async ({ input, context }) =>
      await affiliateService.recordConversion(input, context.user.id)
  );
