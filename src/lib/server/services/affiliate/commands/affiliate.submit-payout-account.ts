import {
  affiliatePayoutAccountSchema,
  submitPayoutAccountInputSchema,
} from "$lib/schemas/affiliate";
import { authorizedProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {
  AFFILIATE_NO_PROFILE: {
    message: "You must have an approved affiliate profile",
  },
} as const;

export const affiliateSubmitPayoutAccount = authorizedProcedure
  .errors(ERRORS)
  .input(submitPayoutAccountInputSchema)
  .output(affiliatePayoutAccountSchema)
  .handler(
    async ({ input, context }) =>
      await affiliateService.submitPayoutAccount(input, context.user.id)
  );
