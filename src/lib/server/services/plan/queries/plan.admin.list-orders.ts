import {
  adminListOrdersInputSchema,
  listOrdersOutputSchema,
} from "$lib/schemas/plan";
import { adminProcedure } from "$lib/server/api/base";

import { planService } from "../index";

const ERRORS = {
  FORBIDDEN: { message: "Admin access required" },
} as const;

export const planAdminListOrders = adminProcedure
  .errors(ERRORS)
  .input(adminListOrdersInputSchema)
  .output(listOrdersOutputSchema)
  .handler(
    async ({ input, context }) =>
      await planService.listAdminOrders(input, context.user.id)
  );
