import { aiLimitGetUsage } from "./queries/ai-limit.get-usage.ts";

export const aiLimitRouter = {
  getUsage: aiLimitGetUsage,
};

export type AiLimitRouter = typeof aiLimitRouter;
