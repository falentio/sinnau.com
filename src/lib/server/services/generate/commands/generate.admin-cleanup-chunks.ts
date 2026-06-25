import {
  deleteOldChunksInputSchema,
  deleteOldChunksOutputSchema,
} from "$lib/schemas/generate";
import { adminProcedure } from "$lib/server/api/base";

import { generateService } from "../index";

export const generateAdminCleanupChunks = adminProcedure
  .input(deleteOldChunksInputSchema)
  .output(deleteOldChunksOutputSchema)
  .handler(
    async ({ input }) =>
      await generateService.cleanupChunks(input.olderThanDays)
  );
