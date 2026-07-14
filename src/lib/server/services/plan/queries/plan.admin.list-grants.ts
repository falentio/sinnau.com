import {
  listGrantsInputSchema,
  listGrantsOutputSchema,
} from "$lib/schemas/plan";
import { adminProcedure } from "$lib/server/api/base";

import { planService } from "../index";

const ERRORS = {
  FORBIDDEN: { message: "Admin access required" },
} as const;

export const planAdminListGrants = adminProcedure
  .errors(ERRORS)
  .input(listGrantsInputSchema)
  .output(listGrantsOutputSchema)
  .handler(async ({ input, context }) =>
    planService.listGrants(input, context.user.id)
  );
