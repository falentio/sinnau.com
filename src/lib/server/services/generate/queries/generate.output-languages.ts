import { getOutputLanguagesOutputSchema } from "$lib/schemas/generate";
import { authorizedProcedure } from "$lib/server/api/base";

import { generateService } from "../index";

export const generateOutputLanguages = authorizedProcedure
  .output(getOutputLanguagesOutputSchema)
  .handler(() => generateService.getOutputLanguages());
