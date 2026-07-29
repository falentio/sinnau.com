import { hasAccessOutputSchema } from "$lib/schemas/generate";
import { authorizedProcedure } from "$lib/server/api/base";

import { generateService } from "../index";

export const generateHasAccess = authorizedProcedure
  .output(hasAccessOutputSchema)
  .handler(
    async ({ context }) => await generateService.hasAccess(context.user.id)
  );
