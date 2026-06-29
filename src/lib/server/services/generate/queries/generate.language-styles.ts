import { getLanguageStylesOutputSchema } from "$lib/schemas/generate";
import { authorizedProcedure } from "$lib/server/api/base";

import { generateService } from "../index";

export const generateLanguageStyles = authorizedProcedure
  .output(getLanguageStylesOutputSchema)
  .handler(() => generateService.getLanguageStyles());
