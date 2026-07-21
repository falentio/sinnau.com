import {
  aiLimitUsageSchema,
  getAiLimitUsageInputSchema,
} from "$lib/schemas/ai-limit";
import { authorizedProcedure } from "$lib/server/api/base";

import { aiLimitService } from "../index";

const ERRORS = {
  UNAUTHORIZED: { message: "Authentication is required" },
} as const;

export const aiLimitGetUsage = authorizedProcedure
  .errors(ERRORS)
  .input(getAiLimitUsageInputSchema)
  .output(aiLimitUsageSchema)
  .handler(
    async ({ context }) => await aiLimitService.getUsage(context.user.id)
  );
