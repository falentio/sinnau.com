import {
  affiliateDashboardSummarySchema,
  getAffiliateDashboardInputSchema,
} from "$lib/schemas/affiliate";
import { authorizedProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {} as const;

export const affiliateGetDashboardSummary = authorizedProcedure
  .errors(ERRORS)
  .input(getAffiliateDashboardInputSchema)
  .output(affiliateDashboardSummarySchema)
  .handler(
    async ({ context }) =>
      await affiliateService.getDashboardSummary(context.user.id)
  );
