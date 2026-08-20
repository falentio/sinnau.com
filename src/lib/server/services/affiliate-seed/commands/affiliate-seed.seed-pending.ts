import {
  seedAffiliatePendingPayoutsInputSchema,
  seedAffiliatePendingPayoutsOutputSchema,
} from "$lib/schemas/affiliate";
import { adminProcedure } from "$lib/server/api/base";

import { affiliateSeedService } from "../index";

const ERRORS = {
  AFFILIATE_NO_PROFILE: { message: "Affiliate profile not found" },
  FORBIDDEN: { message: "Dev only" },
  UNAUTHORIZED: { message: "Authentication is required" },
} as const;

export const affiliateSeedPending = adminProcedure
  .errors(ERRORS)
  .input(seedAffiliatePendingPayoutsInputSchema)
  .output(seedAffiliatePendingPayoutsOutputSchema)
  .handler(
    async ({ input, context }) =>
      await affiliateSeedService.seedPendingPayouts(input, context.user.id)
  );
