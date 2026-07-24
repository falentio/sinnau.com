import {
  reconcileAffiliateCommissionsInputSchema,
  reconcileAffiliateCommissionsOutputSchema,
} from "$lib/schemas/affiliate";
import { adminProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {} as const;

export const affiliateReconcileCommissions = adminProcedure
  .errors(ERRORS)
  .input(reconcileAffiliateCommissionsInputSchema)
  .output(reconcileAffiliateCommissionsOutputSchema)
  .handler(
    async ({ input, context }) =>
      await affiliateService.reconcileCommissions(input, context.user.id)
  );
