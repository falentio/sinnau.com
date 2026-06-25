import {
  createGenerateInputSchema,
  createGenerateOutputSchema,
} from "$lib/schemas/generate";
import { authorizedProcedure } from "$lib/server/api/base";

import { generateService } from "../index";

const ERRORS = {
  CONCURRENCY_LIMIT: {
    message: "A generation is already in progress",
  },
  LITEPARSE_FAILED: {
    message: "Failed to parse the PDF file",
  },
  STUDY_SET_SLUG_CONFLICT: {
    message: "Failed to generate a unique slug after maximum retries",
  },
} as const;

export const generateCreate = authorizedProcedure
  .errors(ERRORS)
  .input(createGenerateInputSchema)
  .output(createGenerateOutputSchema)
  .handler(
    async ({ input, context }) =>
      await generateService.createGenerate(input, context.user.id)
  );
