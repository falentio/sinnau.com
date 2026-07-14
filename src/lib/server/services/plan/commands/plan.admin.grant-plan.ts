import {
  grantPlanInputSchema,
  grantPlanOutputSchema,
  type GrantPlanOutput,
} from "$lib/schemas/plan";
import { adminProcedure } from "$lib/server/api/base";

import { planService } from "../index";

const ERRORS = {
  FORBIDDEN: { message: "Admin access required" },
  NOT_FOUND: { message: "User not found" },
} as const;

export const planAdminGrantPlan = adminProcedure
  .errors(ERRORS)
  .input(grantPlanInputSchema)
  .output(grantPlanOutputSchema)
  .handler(
    async ({ input, context }) =>
      planService.grantPlan(input, context.user.id) as Promise<GrantPlanOutput>
  );
