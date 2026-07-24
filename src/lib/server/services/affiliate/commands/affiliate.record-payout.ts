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
  AFFILIATE_RECONCILE_BEFORE_PAYOUT: {
    message: "Reconcile commissions before paying out this affiliate",
  },
} as const;

export const affiliateRecordPayout = adminProcedure
  .errors(ERRORS)
  .input(recordAffiliatePayoutInputSchema)
  .output(affiliatePayoutSchema)
  .handler(
    async ({ input, context }) =>
      await affiliateService.recordPayout(input, context.user.id)
  );
