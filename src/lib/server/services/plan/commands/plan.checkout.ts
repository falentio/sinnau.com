import { checkoutInputSchema, checkoutOutputSchema } from "$lib/schemas/plan";
import { authorizedProcedure } from "$lib/server/api/base";

import { planService } from "../index";

const ERRORS = {
  DOWNGRADE_NOT_ALLOWED: {
    message: "Cannot downgrade from an active higher-tier plan",
  },
  PAYMENT_GATEWAY_ERROR: { message: "Failed to initiate QRIS payment" },
} as const;

export const planCheckout = authorizedProcedure
  .errors(ERRORS)
  .input(checkoutInputSchema)
  .output(checkoutOutputSchema)
  .handler(
    async ({ input, context }) =>
      await planService.checkout(input, context.user.id)
  );
