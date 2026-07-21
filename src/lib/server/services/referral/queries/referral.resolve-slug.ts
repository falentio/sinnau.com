import {
  referralProfileSchema,
  resolveReferralSlugInputSchema,
} from "$lib/schemas/referral";
import { publicProcedure } from "$lib/server/api/base";

import { referralService } from "../index";

const ERRORS = {
  REFERRAL_SLUG_NOT_FOUND: { message: "Referral slug not found" },
} as const;

export const referralResolveSlug = publicProcedure
  .errors(ERRORS)
  .input(resolveReferralSlugInputSchema)
  .output(referralProfileSchema)
  .handler(
    async ({ input }) => await referralService.resolveReferralSlug(input)
  );
