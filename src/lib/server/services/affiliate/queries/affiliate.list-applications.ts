import {
  listAffiliateApplicationsInputSchema,
  listAffiliateApplicationsOutputSchema,
} from "$lib/schemas/affiliate";
import { adminProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {} as const;

export const affiliateListApplications = adminProcedure
  .errors(ERRORS)
  .input(listAffiliateApplicationsInputSchema)
  .output(listAffiliateApplicationsOutputSchema)
  .handler(
    async ({ input, context }) =>
      await affiliateService.listApplications(input, context.user.id)
  );
