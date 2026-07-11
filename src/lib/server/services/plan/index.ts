import { midtrans } from "../../infras/midtrans/index.ts";
import { PlanGuard } from "./plan.guard.ts";
import { PlanDrizzleRepository } from "./plan.repository.drizzle.ts";
import { PlanService } from "./plan.service.ts";

const planRepo = new PlanDrizzleRepository();
export const planGuard = new PlanGuard(planRepo);
export const planService = new PlanService(planRepo, planGuard, midtrans);

// eslint-disable-next-line promise-function-async
export const lookupAiLimitPlan = (userId: string) =>
  planService.getAiLimitPlanForUser(userId);

midtrans.on("webhook:received", (body) => {
  void planService.handleWebhook(body);
});
