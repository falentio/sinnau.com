import {
  listOrdersInputSchema,
  listOrdersOutputSchema,
} from "$lib/schemas/plan";
import { authorizedProcedure } from "$lib/server/api/base";

import { planService } from "../index";

export const planListOrders = authorizedProcedure
  .input(listOrdersInputSchema)
  .output(listOrdersOutputSchema)
  .handler(
    async ({ input, context }) =>
      await planService.listOrders(input, context.user.id)
  );
