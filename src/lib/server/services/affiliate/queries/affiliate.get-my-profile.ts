import {
  affiliateProfileSchema,
  getMyAffiliateProfileInputSchema,
} from "$lib/schemas/affiliate";
import { authorizedProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {
  NOT_FOUND: { message: "Affiliate profile not found" },
} as const;

export const affiliateGetMyProfile = authorizedProcedure
  .errors(ERRORS)
  .input(getMyAffiliateProfileInputSchema)
  .output(affiliateProfileSchema)
  .handler(
    async ({ context }) => await affiliateService.getMyProfile(context.user.id)
  );
