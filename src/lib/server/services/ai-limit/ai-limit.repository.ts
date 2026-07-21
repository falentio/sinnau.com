import type { AiUsageLog } from "../../infras/db/schema/ai-limit.ts";

export interface AiLimitConsumeParams {
  amount: number;
  dailyLimit: number;
  dailyWindowEnd: Date;
  dailyWindowStart: Date;
  featureKey: string;
  ownerId: string;
  referenceId: string | null;
  weeklyLimit: number;
  weeklyWindowEnd: Date;
  weeklyWindowStart: Date;
}

export interface AiLimitConsumeResult {
  id: string;
  dailyTotal: number;
  weeklyTotal: number;
}

export interface AiLimitRepository {
  consumeIfWithinQuota(
    params: AiLimitConsumeParams
  ): Promise<AiLimitConsumeResult | "EXCEEDED">;
  findUsageLogById(id: string, ownerId: string): Promise<AiUsageLog | null>;
  markRefunded(id: string, ownerId: string): Promise<boolean>;
  sumUsageInWindow(ownerId: string, start: Date, end: Date): Promise<number>;
}
