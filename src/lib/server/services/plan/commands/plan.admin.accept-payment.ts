import { acceptPaymentInputSchema, orderSchema } from "$lib/schemas/plan";
import { adminProcedure } from "$lib/server/api/base";

import { planService } from "../index";

const ERRORS = {
  FORBIDDEN: { message: "Admin access required" },
  INTERNAL_SERVER_ERROR: { message: "Payment record not found for order" },
  NOT_FOUND: { message: "Order not found" },
  ORDER_NOT_ACCEPTABLE: {
    message: "Order cannot be accepted in its current status",
  },
} as const;

export const planAdminAcceptPayment = adminProcedure
  .errors(ERRORS)
  .input(acceptPaymentInputSchema)
  .output(orderSchema)
  .handler(
    async ({ input, context }) =>
      await planService.acceptPayment(input, context.user.id)
  );
