import {
  resolveAffiliateSlugInputSchema,
  resolveAffiliateSlugOutputSchema,
} from "$lib/schemas/affiliate";
import { publicProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {
  NOT_FOUND: { message: "Affiliate link not found" },
} as const;

export const affiliateResolveSlug = publicProcedure
  .errors(ERRORS)
  .input(resolveAffiliateSlugInputSchema)
  .output(resolveAffiliateSlugOutputSchema)
  .handler(async ({ input }) => await affiliateService.resolveSlug(input.slug));
