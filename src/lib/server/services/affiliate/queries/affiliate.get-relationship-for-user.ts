import {
  affiliateRelationshipSchema,
  getAffiliateRelationshipForUserInputSchema,
} from "$lib/schemas/affiliate";
import { adminProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {
  NOT_FOUND: { message: "Affiliate relationship not found" },
} as const;

export const affiliateGetRelationshipForUser = adminProcedure
  .errors(ERRORS)
  .input(getAffiliateRelationshipForUserInputSchema)
  .output(affiliateRelationshipSchema)
  .handler(
    async ({ input, context }) =>
      await affiliateService.getRelationshipForUser(input, context.user.id)
  );
