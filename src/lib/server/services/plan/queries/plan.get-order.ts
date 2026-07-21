import { getOrderInputSchema, getOrderOutputSchema } from "$lib/schemas/plan";
import { authorizedProcedure } from "$lib/server/api/base";

import { planService } from "../index";

const ERRORS = {
  NOT_FOUND: { message: "Order not found" },
} as const;

export const planGetOrder = authorizedProcedure
  .errors(ERRORS)
  .input(getOrderInputSchema)
  .output(getOrderOutputSchema)
  .handler(
    async ({ input, context }) =>
      await planService.getOrder(input, context.user.id)
  );
