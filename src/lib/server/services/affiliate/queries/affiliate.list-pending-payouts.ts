import {
  listPendingPayoutsInputSchema,
  pendingPayoutsListSchema,
} from "$lib/schemas/affiliate";
import { adminProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {
  FORBIDDEN: { message: "Admin access required" },
  UNAUTHORIZED: { message: "Authentication is required" },
} as const;

export const affiliateListPendingPayouts = adminProcedure
  .errors(ERRORS)
  .input(listPendingPayoutsInputSchema)
  .output(pendingPayoutsListSchema)
  .handler(
    async ({ input, context }) =>
      await affiliateService.listPendingPayouts(input, context.user.id)
  );
