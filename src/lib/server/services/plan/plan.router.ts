import { planAdminGrantPlan } from "./commands/plan.admin.grant-plan.ts";
import { planCheckout } from "./commands/plan.checkout.ts";
import { planAdminListGrants } from "./queries/plan.admin.list-grants.ts";
import { planGetAiLimit } from "./queries/plan.get-ai-limit.ts";
import { planGetOrder } from "./queries/plan.get-order.ts";
import { planListOrders } from "./queries/plan.list-orders.ts";
import { planListPlans } from "./queries/plan.list-plans.ts";

export const planRouter = {
  admin: {
    grantPlan: planAdminGrantPlan,
    listGrants: planAdminListGrants,
  },
  checkout: planCheckout,
  getAiLimit: planGetAiLimit,
  getOrder: planGetOrder,
  listOrders: planListOrders,
  listPlans: planListPlans,
};

export type PlanRouter = typeof planRouter;
