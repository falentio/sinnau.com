import { getAiLimitPlanForUserOutputSchema } from "$lib/schemas/plan";
import { authorizedProcedure } from "$lib/server/api/base";

import { planService } from "../index";

const ERRORS = {
  NO_ACTIVE_PLAN: { message: "User has no active plan" },
} as const;

export const planGetAiLimit = authorizedProcedure
  .errors(ERRORS)
  .output(getAiLimitPlanForUserOutputSchema)
  .handler(
    async ({ context }) =>
      await planService.getAiLimitPlanForUser(context.user.id)
  );
