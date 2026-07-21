import { lookupAiLimitPlan } from "../plan/index.ts";
import { AiLimitGuard } from "./ai-limit.guard.ts";
import { AiLimitDrizzleRepository } from "./ai-limit.repository.drizzle.ts";
import { AiLimitService } from "./ai-limit.service.ts";

const aiLimitRepo = new AiLimitDrizzleRepository();

export const aiLimitGuard = new AiLimitGuard(aiLimitRepo);
export const aiLimitService = new AiLimitService(
  aiLimitRepo,
  aiLimitGuard,
  lookupAiLimitPlan
);
