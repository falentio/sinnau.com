import {
  affiliatePayoutAccountSchema,
  getMyPayoutAccountInputSchema,
} from "$lib/schemas/affiliate";
import { authorizedProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {
  NOT_FOUND: { message: "Payout account not found" },
} as const;

export const affiliateGetMyPayoutAccount = authorizedProcedure
  .errors(ERRORS)
  .input(getMyPayoutAccountInputSchema)
  .output(affiliatePayoutAccountSchema)
  .handler(
    async ({ context }) =>
      await affiliateService.getMyPayoutAccount(context.user.id)
  );
