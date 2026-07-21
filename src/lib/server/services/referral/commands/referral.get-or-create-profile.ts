import {
  getOrCreateReferralProfileInputSchema,
  referralProfileSchema,
} from "$lib/schemas/referral";
import { authorizedProcedure } from "$lib/server/api/base";

import { referralService } from "../index";

const ERRORS = {
  REFERRAL_SLUG_GENERATION_FAILED: {
    message: "Failed to generate a unique slug after maximum retries",
  },
  VALIDATION_FAILED: { message: "User must have a name" },
} as const;

export const referralGetOrCreateProfile = authorizedProcedure
  .errors(ERRORS)
  .input(getOrCreateReferralProfileInputSchema)
  .output(referralProfileSchema)
  .handler(
    async ({ input, context }) =>
      await referralService.getOrCreateReferralProfile(
        input,
        context.user?.id,
        context.user?.name ?? ""
      )
  );
