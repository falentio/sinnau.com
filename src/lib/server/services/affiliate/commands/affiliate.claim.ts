import {
  affiliateProfileSchema,
  claimAffiliateProfileInputSchema,
} from "$lib/schemas/affiliate";
import { authorizedProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {
  AFFILIATE_PROFILE_ALREADY_EXISTS: {
    message: "You already have an affiliate profile",
  },
  AFFILIATE_SLUG_CONFLICT: {
    message: "Failed to generate a unique slug after maximum retries",
  },
} as const;

export const affiliateClaim = authorizedProcedure
  .errors(ERRORS)
  .input(claimAffiliateProfileInputSchema)
  .output(affiliateProfileSchema)
  .handler(
    async ({ context }) => await affiliateService.claim(context.user.id)
  );
