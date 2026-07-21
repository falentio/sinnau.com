import {
  affiliatePayoutSchema,
  recordAffiliatePayoutInputSchema,
} from "$lib/schemas/affiliate";
import { adminProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {
  AFFILIATE_NO_PENDING_BALANCE: {
    message: "No pending balance to payout",
  },
} as const;

export const affiliateRecordPayout = adminProcedure
  .errors(ERRORS)
  .input(recordAffiliatePayoutInputSchema)
  .output(affiliatePayoutSchema)
  .handler(
    async ({ input, context }) =>
      await affiliateService.recordPayout(
        input.affiliateUserId,
        context.user.id,
        input.method ?? undefined,
        input.reference ?? undefined,
        input.note ?? undefined
      )
  );
