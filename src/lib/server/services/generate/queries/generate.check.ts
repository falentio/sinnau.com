import {
  checkGenerateContentInputSchema,
  checkGenerateContentOutputSchema,
} from "$lib/schemas/generate";
import { authorizedProcedure } from "$lib/server/api/base";

import { generateService } from "../index";

const ERRORS = {
  NOT_FOUND: { message: "Generation not found" },
} as const;

export const generateCheck = authorizedProcedure
  .errors(ERRORS)
  .input(checkGenerateContentInputSchema)
  .output(checkGenerateContentOutputSchema)
  .handler(
    async ({ input, context }) =>
      await generateService.checkGenerateContent(input, context.user.id)
  );
