import {
  AI_LIMIT_DEFAULT_DAILY_LIMIT,
  AI_LIMIT_DEFAULT_PLAN_KEY,
  AI_LIMIT_DEFAULT_WEEKLY_LIMIT,
} from "$lib/schemas/ai-limit.constant";

import { AiLimitGuard } from "./ai-limit.guard.ts";
import { AiLimitDrizzleRepository } from "./ai-limit.repository.drizzle.ts";
import { AiLimitService } from "./ai-limit.service.ts";
import type { LookupAiLimitPlan } from "./ai-limit.service.ts";

const aiLimitRepo = new AiLimitDrizzleRepository();

// eslint-disable-next-line promise-function-async
const defaultLookupPlan: LookupAiLimitPlan = (_userId) =>
  Promise.resolve({
    daily: AI_LIMIT_DEFAULT_DAILY_LIMIT,
    planKey: AI_LIMIT_DEFAULT_PLAN_KEY,
    weekly: AI_LIMIT_DEFAULT_WEEKLY_LIMIT,
  });

export const aiLimitGuard = new AiLimitGuard(aiLimitRepo);
export const aiLimitService = new AiLimitService(
  aiLimitRepo,
  aiLimitGuard,
  defaultLookupPlan
);
