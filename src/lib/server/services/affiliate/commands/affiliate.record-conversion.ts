import {
  recordAffiliateConversionInputSchema,
  recordAffiliateConversionOutputSchema,
} from "$lib/schemas/affiliate";
import { authorizedProcedure } from "$lib/server/api/base";

import { affiliateService } from "../index";

const ERRORS = {} as const;

export const affiliateRecordConversion = authorizedProcedure
  .errors(ERRORS)
  .input(recordAffiliateConversionInputSchema)
  .output(recordAffiliateConversionOutputSchema)
  .handler(async ({ input }) => await affiliateService.recordConversion(input));
