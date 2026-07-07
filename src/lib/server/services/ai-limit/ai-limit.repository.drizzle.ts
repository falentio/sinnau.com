import { AI_LIMIT_ID_PREFIX } from "$lib/schemas/ai-limit.constant";
import { ORPCError } from "@orpc/server";
import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";

import type { DB } from "../../infras/db/client.ts";
import { db as defaultDb } from "../../infras/db/client.ts";
import { aiUsageLog } from "../../infras/db/schema/ai-limit.ts";
import { generateId } from "../../utils/nanoid.ts";
import type {
  AiLimitConsumeParams,
  AiLimitConsumeResult,
  AiLimitRepository,
} from "./ai-limit.repository.ts";

export class AiLimitDrizzleRepository implements AiLimitRepository {
  private readonly dbInstance: DB;

  constructor(db: DB = defaultDb) {
    this.dbInstance = db;
  }

  static withDatabase(db: DB): AiLimitDrizzleRepository {
    return new AiLimitDrizzleRepository(db);
  }

  async sumUsageInWindow(
    ownerId: string,
    start: Date,
    end: Date
  ): Promise<number> {
    try {
      const [row] = await this.dbInstance
        .select({
          total: sql<number>`COALESCE(SUM(${aiUsageLog.amount}), 0)`,
        })
        .from(aiUsageLog)
        .where(
          and(
            eq(aiUsageLog.ownerId, ownerId),
            gte(aiUsageLog.createdAt, start),
            lt(aiUsageLog.createdAt, end),
            isNull(aiUsageLog.refundedAt)
          )
        );
      return row?.total ?? 0;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async findUsageLogById(id: string, ownerId: string) {
    try {
      const [row] = await this.dbInstance
        .select()
        .from(aiUsageLog)
        .where(and(eq(aiUsageLog.id, id), eq(aiUsageLog.ownerId, ownerId)));
      return row ?? null;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  async markRefunded(id: string, ownerId: string): Promise<boolean> {
    try {
      const result = await this.dbInstance
        .update(aiUsageLog)
        .set({ refundedAt: new Date() })
        .where(
          and(
            eq(aiUsageLog.id, id),
            eq(aiUsageLog.ownerId, ownerId),
            isNull(aiUsageLog.refundedAt)
          )
        );
      return result.changes > 0;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }

  // eslint-disable-next-line require-await
  async consumeIfWithinQuota(
    params: AiLimitConsumeParams
  ): Promise<AiLimitConsumeResult | "EXCEEDED"> {
    try {
      if (params.referenceId !== null) {
        const [existing] = await this.dbInstance
          .select({ id: aiUsageLog.id })
          .from(aiUsageLog)
          .where(
            and(
              eq(aiUsageLog.ownerId, params.ownerId),
              eq(aiUsageLog.featureKey, params.featureKey),
              eq(aiUsageLog.referenceId, params.referenceId)
            )
          );
        if (existing) {
          const [dailyRow] = await this.dbInstance
            .select({
              total: sql<number>`COALESCE(SUM(${aiUsageLog.amount}), 0)`,
            })
            .from(aiUsageLog)
            .where(
              and(
                eq(aiUsageLog.ownerId, params.ownerId),
                gte(aiUsageLog.createdAt, params.dailyWindowStart),
                lt(aiUsageLog.createdAt, params.dailyWindowEnd),
                isNull(aiUsageLog.refundedAt)
              )
            );
          const [weeklyRow] = await this.dbInstance
            .select({
              total: sql<number>`COALESCE(SUM(${aiUsageLog.amount}), 0)`,
            })
            .from(aiUsageLog)
            .where(
              and(
                eq(aiUsageLog.ownerId, params.ownerId),
                gte(aiUsageLog.createdAt, params.weeklyWindowStart),
                lt(aiUsageLog.createdAt, params.weeklyWindowEnd),
                isNull(aiUsageLog.refundedAt)
              )
            );
          return {
            dailyTotal: dailyRow?.total ?? 0,
            id: existing.id,
            weeklyTotal: weeklyRow?.total ?? 0,
          };
        }
      }

      const id = generateId(AI_LIMIT_ID_PREFIX);

      const withinQuota = this.dbInstance.transaction((tx) => {
        const [dailyRow] = tx
          .select({
            total: sql<number>`COALESCE(SUM(${aiUsageLog.amount}), 0)`,
          })
          .from(aiUsageLog)
          .where(
            and(
              eq(aiUsageLog.ownerId, params.ownerId),
              gte(aiUsageLog.createdAt, params.dailyWindowStart),
              lt(aiUsageLog.createdAt, params.dailyWindowEnd),
              isNull(aiUsageLog.refundedAt)
            )
          )
          .all();

        const dailyTotal = dailyRow?.total ?? 0;
        if (dailyTotal + params.amount > params.dailyLimit) {
          return false;
        }

        const [weeklyRow] = tx
          .select({
            total: sql<number>`COALESCE(SUM(${aiUsageLog.amount}), 0)`,
          })
          .from(aiUsageLog)
          .where(
            and(
              eq(aiUsageLog.ownerId, params.ownerId),
              gte(aiUsageLog.createdAt, params.weeklyWindowStart),
              lt(aiUsageLog.createdAt, params.weeklyWindowEnd),
              isNull(aiUsageLog.refundedAt)
            )
          )
          .all();

        const weeklyTotal = weeklyRow?.total ?? 0;
        if (weeklyTotal + params.amount > params.weeklyLimit) {
          return false;
        }

        tx.insert(aiUsageLog)
          .values({
            amount: params.amount,
            createdAt: new Date(),
            featureKey: params.featureKey,
            id,
            ownerId: params.ownerId,
            referenceId: params.referenceId,
          })
          .run();

        return {
          id,
          dailyTotal: dailyTotal + params.amount,
          weeklyTotal: weeklyTotal + params.amount,
        };
      });

      if (withinQuota === false) {
        return "EXCEEDED";
      }

      return withinQuota;
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Internal server error",
      });
    }
  }
}
