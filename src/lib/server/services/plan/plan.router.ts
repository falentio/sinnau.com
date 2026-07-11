import { planCheckout } from "./commands/plan.checkout.ts";
import { planGetAiLimit } from "./queries/plan.get-ai-limit.ts";
import { planGetOrder } from "./queries/plan.get-order.ts";
import { planListOrders } from "./queries/plan.list-orders.ts";
import { planListPlans } from "./queries/plan.list-plans.ts";

export const planRouter = {
  checkout: planCheckout,
  getAiLimit: planGetAiLimit,
  getOrder: planGetOrder,
  listOrders: planListOrders,
  listPlans: planListPlans,
};

export type PlanRouter = typeof planRouter;
