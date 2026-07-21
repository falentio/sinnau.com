import {
  affiliateRelationshipSchema,
  recordAffiliateRelationshipInputSchema,
} from "$lib/schemas/affiliate";
import { adminProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {
  AFFILIATE_RELATIONSHIP_ALREADY_EXISTS: {
    message: "User already has a referrer",
  },
  AFFILIATE_SELF_REFERRAL: { message: "Cannot refer yourself" },
} as const;

export const affiliateRecordRelationship = adminProcedure
  .errors(ERRORS)
  .input(recordAffiliateRelationshipInputSchema)
  .output(affiliateRelationshipSchema)
  .handler(
    async ({ input, context }) =>
      await affiliateService.recordRelationship(input, context.user.id)
  );
