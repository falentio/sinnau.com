import {
  affiliateProfileSchema,
  reviewAffiliateApplicationInputSchema,
} from "$lib/schemas/affiliate";
import { adminProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {
  AFFILIATE_APPLICATION_NOT_PENDING: {
    message: "Application is not pending review",
  },
  AFFILIATE_SLUG_CONFLICT: {
    message: "Failed to generate a unique slug after maximum retries",
  },
  NOT_FOUND: { message: "Application not found" },
} as const;

export const affiliateAcceptApplication = adminProcedure
  .errors(ERRORS)
  .input(reviewAffiliateApplicationInputSchema)
  .output(affiliateProfileSchema)
  .handler(
    async ({ input, context }) =>
      await affiliateService.acceptApplication(input, context.user.id)
  );
