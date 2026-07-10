import { planCheckout } from "./commands/plan.checkout.ts";
import { planGetAiLimit } from "./queries/plan.get-ai-limit.ts";
import { planListOrders } from "./queries/plan.list-orders.ts";
import { planListPlans } from "./queries/plan.list-plans.ts";

export const planRouter = {
  checkout: planCheckout,
  getAiLimit: planGetAiLimit,
  listOrders: planListOrders,
  listPlans: planListPlans,
};

export type PlanRouter = typeof planRouter;
