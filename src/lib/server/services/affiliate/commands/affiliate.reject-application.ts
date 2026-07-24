import {
  affiliateApplicationSchema,
  reviewAffiliateApplicationInputSchema,
} from "$lib/schemas/affiliate";
import { adminProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {
  AFFILIATE_APPLICATION_NOT_PENDING: {
    message: "Application is not pending review",
  },
  FORBIDDEN: { message: "Admin access required" },
  NOT_FOUND: { message: "Application not found" },
} as const;

export const affiliateRejectApplication = adminProcedure
  .errors(ERRORS)
  .input(reviewAffiliateApplicationInputSchema)
  .output(affiliateApplicationSchema)
  .handler(
    async ({ input, context }) =>
      await affiliateService.rejectApplication(input, context.user.id)
  );
