import { ORPCError } from "@orpc/server";

import type {
  AiLimitUsage,
  ConsumeAiLimitInput,
  ConsumeAiLimitOutput,
  RefundAiLimitInput,
  RefundAiLimitOutput,
} from "../../../schemas/ai-limit.ts";
import type { AiLimitGuard } from "./ai-limit.guard.ts";
import type { AiLimitRepository } from "./ai-limit.repository.ts";

export interface AiLimitPlan {
  planKey: string;
  daily: number;
  weekly: number;
}

export type LookupAiLimitPlan = (userId: string) => Promise<AiLimitPlan>;

const startOfDayUTC = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const startOfWeekUTC = (date: Date): Date => {
  const d = startOfDayUTC(date);
  const day = d.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + mondayOffset);
  return d;
};

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};

export class AiLimitService {
  private readonly repo: AiLimitRepository;
  private readonly guard: AiLimitGuard;
  private readonly lookupPlan: LookupAiLimitPlan;

  constructor(
    repo: AiLimitRepository,
    guard: AiLimitGuard,
    lookupPlan: LookupAiLimitPlan
  ) {
    this.repo = repo;
    this.guard = guard;
    this.lookupPlan = lookupPlan;
  }

  async getUsage(userId: string | null | undefined): Promise<AiLimitUsage> {
    const owner = this.guard.requireOwner(userId);
    const plan = await this.lookupPlan(owner);

    const now = new Date();
    const dailyStart = startOfDayUTC(now);
    const dailyEnd = addDays(dailyStart, 1);
    const weeklyStart = startOfWeekUTC(now);
    const weeklyEnd = addDays(weeklyStart, 7);

    const [dailyUsed, weeklyUsed] = await Promise.all([
      this.repo.sumUsageInWindow(owner, dailyStart, dailyEnd),
      this.repo.sumUsageInWindow(owner, weeklyStart, weeklyEnd),
    ]);

    return {
      daily: {
        limit: plan.daily,
        remaining: Math.max(0, plan.daily - dailyUsed),
        resetsAt: dailyEnd,
        used: dailyUsed,
      },
      planKey: plan.planKey,
      weekly: {
        limit: plan.weekly,
        remaining: Math.max(0, plan.weekly - weeklyUsed),
        resetsAt: weeklyEnd,
        used: weeklyUsed,
      },
    };
  }

  async consume(
    input: ConsumeAiLimitInput,
    userId: string | null | undefined
  ): Promise<ConsumeAiLimitOutput> {
    const owner = this.guard.requireOwner(userId);
    const plan = await this.lookupPlan(owner);

    if (input.amount > plan.daily || input.amount > plan.weekly) {
      throw new ORPCError("AI_LIMIT_EXCEEDED", {
        message: "Requested amount exceeds plan limit",
        data: {
          daily: { limit: plan.daily },
          requestedAmount: input.amount,
          weekly: { limit: plan.weekly },
        },
      });
    }

    const now = new Date();
    const dailyStart = startOfDayUTC(now);
    const dailyEnd = addDays(dailyStart, 1);
    const weeklyStart = startOfWeekUTC(now);
    const weeklyEnd = addDays(weeklyStart, 7);

    const result = await this.repo.consumeIfWithinQuota({
      amount: input.amount,
      dailyLimit: plan.daily,
      dailyWindowEnd: dailyEnd,
      dailyWindowStart: dailyStart,
      featureKey: input.featureKey,
      ownerId: owner,
      referenceId: input.referenceId ?? null,
      weeklyLimit: plan.weekly,
      weeklyWindowEnd: weeklyEnd,
      weeklyWindowStart: weeklyStart,
    });

    if (result === "EXCEEDED") {
      throw new ORPCError("AI_LIMIT_EXCEEDED", {
        message: "AI usage limit reached for this period",
      });
    }

    const usage: AiLimitUsage = {
      daily: {
        limit: plan.daily,
        remaining: Math.max(0, plan.daily - result.dailyTotal),
        resetsAt: dailyEnd,
        used: result.dailyTotal,
      },
      planKey: plan.planKey,
      weekly: {
        limit: plan.weekly,
        remaining: Math.max(0, plan.weekly - result.weeklyTotal),
        resetsAt: weeklyEnd,
        used: result.weeklyTotal,
      },
    };

    return { logId: result.id, usage };
  }

  async refund(
    input: RefundAiLimitInput,
    userId: string | null | undefined
  ): Promise<RefundAiLimitOutput> {
    const owner = this.guard.requireOwner(userId);
    await this.guard.assertLogOwnerOrForbidden(input.logId, owner);

    const marked = await this.repo.markRefunded(input.logId, owner);
    if (!marked) {
      throw new ORPCError("AI_LIMIT_ALREADY_REFUNDED", {
        message: "Usage log has already been refunded",
      });
    }

    const usage = await this.getUsage(owner);

    return { refundedLogId: input.logId, usage };
  }
}
