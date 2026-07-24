import {
  affiliateApplicationSchema,
  getMyAffiliateApplicationInputSchema,
} from "$lib/schemas/affiliate";
import { authorizedProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {
  NOT_FOUND: { message: "Affiliate application not found" },
} as const;

export const affiliateGetMyApplication = authorizedProcedure
  .errors(ERRORS)
  .input(getMyAffiliateApplicationInputSchema)
  .output(affiliateApplicationSchema)
  .handler(
    async ({ context }) =>
      await affiliateService.getMyApplication(context.user.id)
  );
