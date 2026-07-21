import {
  recordAffiliateConversionInputSchema,
  recordAffiliateConversionOutputSchema,
} from "$lib/schemas/affiliate";
import { adminProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {} as const;

export const affiliateRecordConversion = adminProcedure
  .errors(ERRORS)
  .input(recordAffiliateConversionInputSchema)
  .output(recordAffiliateConversionOutputSchema)
  .handler(async ({ input }) => await affiliateService.recordConversion(input));
