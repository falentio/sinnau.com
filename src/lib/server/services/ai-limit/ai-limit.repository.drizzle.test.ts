import { AI_LIMIT_ID_PREFIX } from "$lib/schemas/ai-limit.constant";
import { aiUsageLog } from "$lib/server/infras/db/schema/ai-limit";
import { eq } from "drizzle-orm";
import { describe, it } from "vitest";

import { generateId } from "../../utils/nanoid.ts";
import { AiLimitTestEnv } from "./ai-limit.testing.ts";

describe.concurrent("AiLimitDrizzleRepository", () => {
  describe("sumUsageInWindow", () => {
    it("returns the sum of non-refunded amount for the owner within the window", async ({
      expect,
    }) => {
      await using env = new AiLimitTestEnv();

      const before = new Date("2026-01-01T00:00:00Z");
      const inWindow = new Date("2026-01-01T06:00:00Z");
      const after = new Date("2026-01-02T00:00:00Z");

      env.seedUsageLog({
        amount: 3,
        createdAt: inWindow,
        ownerId: env.ownerId,
      });
      env.seedUsageLog({
        amount: 2,
        createdAt: inWindow,
        ownerId: env.ownerId,
      });

      const total = await env.repo.sumUsageInWindow(env.ownerId, before, after);

      expect(total).toBe(5);
    });

    it("excludes refunded rows", async ({ expect }) => {
      await using env = new AiLimitTestEnv();

      const windowStart = new Date("2026-01-01T00:00:00Z");
      const windowEnd = new Date("2026-01-02T00:00:00Z");
      const inWindow = new Date("2026-01-01T06:00:00Z");

      env.seedUsageLog({
        amount: 3,
        createdAt: inWindow,
        ownerId: env.ownerId,
      });
      env.seedUsageLog({
        amount: 2,
        createdAt: inWindow,
        ownerId: env.ownerId,
        refundedAt: new Date(),
      });

      const total = await env.repo.sumUsageInWindow(
        env.ownerId,
        windowStart,
        windowEnd
      );

      expect(total).toBe(3);
    });

    it("excludes rows outside the window", async ({ expect }) => {
      await using env = new AiLimitTestEnv();

      env.seedUsageLog({
        amount: 5,
        createdAt: new Date("2025-12-31T23:59:59Z"),
        ownerId: env.ownerId,
      });
      env.seedUsageLog({
        amount: 1,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        ownerId: env.ownerId,
      });

      const total = await env.repo.sumUsageInWindow(
        env.ownerId,
        new Date("2026-01-01T00:00:00Z"),
        new Date("2026-01-02T00:00:00Z")
      );

      expect(total).toBe(1);
    });

    it("excludes rows from other owners", async ({ expect }) => {
      await using env = new AiLimitTestEnv();

      const inWindow = new Date("2026-01-01T06:00:00Z");
      const windowStart = new Date("2026-01-01T00:00:00Z");
      const windowEnd = new Date("2026-01-02T00:00:00Z");

      env.seedUsageLog({
        amount: 3,
        createdAt: inWindow,
        ownerId: env.ownerId,
      });
      env.seedUsageLog({
        amount: 10,
        createdAt: inWindow,
        ownerId: env.otherId,
      });

      const total = await env.repo.sumUsageInWindow(
        env.ownerId,
        windowStart,
        windowEnd
      );

      expect(total).toBe(3);
    });
  });

  describe("findUsageLogById", () => {
    it("returns the log when it exists", async ({ expect }) => {
      await using env = new AiLimitTestEnv();

      const log = env.seedUsageLog();

      const found = await env.repo.findUsageLogById(log.id, env.ownerId);

      expect(found).not.toBeNull();
      expect(found).toHaveProperty("id", log.id);
      expect(found).toHaveProperty("ownerId", log.ownerId);
    });

    it("returns null when the log does not exist", async ({ expect }) => {
      await using env = new AiLimitTestEnv();

      const found = await env.repo.findUsageLogById(
        generateId(AI_LIMIT_ID_PREFIX),
        env.ownerId
      );

      expect(found).toBeNull();
    });

    it("returns null when owner does not match", async ({ expect }) => {
      await using env = new AiLimitTestEnv();

      const log = env.seedUsageLog({ ownerId: env.ownerId });

      const found = await env.repo.findUsageLogById(log.id, env.otherId);

      expect(found).toBeNull();
    });
  });

  describe("markRefunded", () => {
    it("sets refundedAt when id and ownerId match", async ({ expect }) => {
      await using env = new AiLimitTestEnv();

      const log = env.seedUsageLog({ ownerId: env.ownerId });

      const result = await env.repo.markRefunded(log.id, env.ownerId);

      expect(result).toBe(true);

      const [updated] = env.db
        .select()
        .from(aiUsageLog)
        .where(eq(aiUsageLog.id, log.id))
        .all();

      expect(updated).not.toBeUndefined();
      expect(updated?.refundedAt).toBeInstanceOf(Date);
    });

    it("returns false when the log does not exist", async ({ expect }) => {
      await using env = new AiLimitTestEnv();

      const result = await env.repo.markRefunded(
        generateId(AI_LIMIT_ID_PREFIX),
        env.ownerId
      );

      expect(result).toBe(false);
    });

    it("returns false when ownerId does not match", async ({ expect }) => {
      await using env = new AiLimitTestEnv();

      const log = env.seedUsageLog({ ownerId: env.ownerId });

      const result = await env.repo.markRefunded(log.id, env.otherId);

      expect(result).toBe(false);

      const [still] = env.db
        .select()
        .from(aiUsageLog)
        .where(eq(aiUsageLog.id, log.id))
        .all();

      expect(still?.refundedAt).toBeNull();
    });

    it("returns false when called twice on the same log", async ({
      expect,
    }) => {
      await using env = new AiLimitTestEnv();

      const log = env.seedUsageLog({ ownerId: env.ownerId });

      const first = await env.repo.markRefunded(log.id, env.ownerId);
      expect(first).toBe(true);

      const second = await env.repo.markRefunded(log.id, env.ownerId);
      expect(second).toBe(false);

      const [row] = env.db
        .select()
        .from(aiUsageLog)
        .where(eq(aiUsageLog.id, log.id))
        .all();
      expect(row?.refundedAt).toBeInstanceOf(Date);
    });
  });

  describe("consumeIfWithinQuota", () => {
    it("inserts a log and returns the id when within limits", async ({
      expect,
    }) => {
      await using env = new AiLimitTestEnv();

      const result = await env.repo.consumeIfWithinQuota({
        amount: 1,
        dailyLimit: 5000,
        dailyWindowEnd: new Date("2026-01-02T00:00:00Z"),
        dailyWindowStart: new Date("2026-01-01T00:00:00Z"),
        featureKey: "generate",
        ownerId: env.ownerId,
        referenceId: null,
        weeklyLimit: 20_000,
        weeklyWindowEnd: new Date("2026-01-05T00:00:00Z"),
        weeklyWindowStart: new Date("2026-01-01T00:00:00Z"),
      });

      expect(result).not.toBe("EXCEEDED");
      expect(result).toHaveProperty("id");
      if (result !== "EXCEEDED") {
        expect(result.id).toMatch(/^aiu_/u);
      }
    });

    it("returns EXCEEDED when daily limit is reached", async ({ expect }) => {
      await using env = new AiLimitTestEnv();

      const dailyStart = new Date("2026-01-01T00:00:00Z");
      const dailyEnd = new Date("2026-01-02T00:00:00Z");
      const weeklyStart = new Date("2026-01-01T00:00:00Z");
      const weeklyEnd = new Date("2026-01-05T00:00:00Z");
      const withinWindow = new Date("2026-01-01T06:00:00Z");

      env.seedUsageLog({
        amount: 3,
        createdAt: withinWindow,
        ownerId: env.ownerId,
      });

      const result = await env.repo.consumeIfWithinQuota({
        amount: 2,
        dailyLimit: 3,
        dailyWindowEnd: dailyEnd,
        dailyWindowStart: dailyStart,
        featureKey: "generate",
        ownerId: env.ownerId,
        referenceId: null,
        weeklyLimit: 20_000,
        weeklyWindowEnd: weeklyEnd,
        weeklyWindowStart: weeklyStart,
      });

      expect(result).toBe("EXCEEDED");
    });

    it("returns EXCEEDED when weekly limit is reached", async ({ expect }) => {
      await using env = new AiLimitTestEnv();

      const dailyStart = new Date("2026-01-01T00:00:00Z");
      const dailyEnd = new Date("2026-01-02T00:00:00Z");
      const weeklyStart = new Date("2026-01-01T00:00:00Z");
      const weeklyEnd = new Date("2026-01-05T00:00:00Z");
      const withinWindow = new Date("2026-01-01T06:00:00Z");

      env.seedUsageLog({
        amount: 5,
        createdAt: withinWindow,
        ownerId: env.ownerId,
      });

      const result = await env.repo.consumeIfWithinQuota({
        amount: 1,
        dailyLimit: 5000,
        dailyWindowEnd: dailyEnd,
        dailyWindowStart: dailyStart,
        featureKey: "generate",
        ownerId: env.ownerId,
        referenceId: null,
        weeklyLimit: 5,
        weeklyWindowEnd: weeklyEnd,
        weeklyWindowStart: weeklyStart,
      });

      expect(result).toBe("EXCEEDED");
    });

    it("returns dailyTotal and weeklyTotal after successful consume", async ({
      expect,
    }) => {
      await using env = new AiLimitTestEnv();

      env.seedUsageLog({
        amount: 3,
        createdAt: new Date("2026-01-01T06:00:00Z"),
        ownerId: env.ownerId,
      });

      const result = await env.repo.consumeIfWithinQuota({
        amount: 2,
        dailyLimit: 5000,
        dailyWindowEnd: new Date("2026-01-02T00:00:00Z"),
        dailyWindowStart: new Date("2026-01-01T00:00:00Z"),
        featureKey: "generate",
        ownerId: env.ownerId,
        referenceId: null,
        weeklyLimit: 20_000,
        weeklyWindowEnd: new Date("2026-01-05T00:00:00Z"),
        weeklyWindowStart: new Date("2026-01-01T00:00:00Z"),
      });

      expect(result).not.toBe("EXCEEDED");
      if (result !== "EXCEEDED") {
        expect(result.dailyTotal).toBe(5);
        expect(result.weeklyTotal).toBe(5);
      }
    });

    it("returns the same id when the same referenceId is reused", async ({
      expect,
    }) => {
      await using env = new AiLimitTestEnv();

      const referenceId = "dedup_test_001";

      const first = await env.repo.consumeIfWithinQuota({
        amount: 1,
        dailyLimit: 5000,
        dailyWindowEnd: new Date("2026-01-02T00:00:00Z"),
        dailyWindowStart: new Date("2026-01-01T00:00:00Z"),
        featureKey: "generate",
        ownerId: env.ownerId,
        referenceId,
        weeklyLimit: 20_000,
        weeklyWindowEnd: new Date("2026-01-05T00:00:00Z"),
        weeklyWindowStart: new Date("2026-01-01T00:00:00Z"),
      });

      expect(first).not.toBe("EXCEEDED");

      const second = await env.repo.consumeIfWithinQuota({
        amount: 1,
        dailyLimit: 5000,
        dailyWindowEnd: new Date("2026-01-02T00:00:00Z"),
        dailyWindowStart: new Date("2026-01-01T00:00:00Z"),
        featureKey: "generate",
        ownerId: env.ownerId,
        referenceId,
        weeklyLimit: 20_000,
        weeklyWindowEnd: new Date("2026-01-05T00:00:00Z"),
        weeklyWindowStart: new Date("2026-01-01T00:00:00Z"),
      });

      expect(second).not.toBe("EXCEEDED");
      if (first !== "EXCEEDED" && second !== "EXCEEDED") {
        expect(second.id).toBe(first.id);

        const allLogs = env.db.select().from(aiUsageLog).all();
        expect(allLogs).toHaveLength(1);
      }
    });

    it("does not insert a log when EXCEEDED", async ({ expect }) => {
      await using env = new AiLimitTestEnv();

      const dailyStart = new Date("2026-01-01T00:00:00Z");
      const dailyEnd = new Date("2026-01-02T00:00:00Z");
      const weeklyStart = new Date("2026-01-01T00:00:00Z");
      const weeklyEnd = new Date("2026-01-05T00:00:00Z");
      const withinWindow = new Date("2026-01-01T06:00:00Z");

      env.seedUsageLog({
        amount: 3,
        createdAt: withinWindow,
        ownerId: env.ownerId,
      });

      const result = await env.repo.consumeIfWithinQuota({
        amount: 2,
        dailyLimit: 3,
        dailyWindowEnd: dailyEnd,
        dailyWindowStart: dailyStart,
        featureKey: "generate",
        ownerId: env.ownerId,
        referenceId: null,
        weeklyLimit: 20_000,
        weeklyWindowEnd: weeklyEnd,
        weeklyWindowStart: weeklyStart,
      });

      expect(result).toBe("EXCEEDED");

      const allLogs = env.db.select().from(aiUsageLog).all();
      expect(allLogs).toHaveLength(1);
    });

    it("returns EXCEEDED when daily passes but weekly limit is reached", async ({
      expect,
    }) => {
      await using env = new AiLimitTestEnv();

      const windowDate = new Date("2026-01-04T06:00:00Z");
      const dailyStart = new Date("2026-01-04T00:00:00Z");
      const dailyEnd = new Date("2026-01-05T00:00:00Z");
      const weeklyStart = new Date("2026-01-01T00:00:00Z");
      const weeklyEnd = new Date("2026-01-05T00:00:00Z");

      env.seedUsageLog({
        amount: 19_999,
        createdAt: windowDate,
        ownerId: env.ownerId,
      });

      const result = await env.repo.consumeIfWithinQuota({
        amount: 2,
        dailyLimit: 5000,
        dailyWindowEnd: dailyEnd,
        dailyWindowStart: dailyStart,
        featureKey: "generate",
        ownerId: env.ownerId,
        referenceId: null,
        weeklyLimit: 20_000,
        weeklyWindowEnd: weeklyEnd,
        weeklyWindowStart: weeklyStart,
      });

      expect(result).toBe("EXCEEDED");

      const allLogs = env.db.select().from(aiUsageLog).all();
      expect(allLogs).toHaveLength(1);
    });

    it("creates two separate rows when referenceId is null on consecutive calls", async ({
      expect,
    }) => {
      await using env = new AiLimitTestEnv();

      const dayStart = new Date("2026-07-07T00:00:00Z");
      const dayEnd = new Date("2026-07-08T00:00:00Z");
      const weekStart = new Date("2026-07-06T00:00:00Z");
      const weekEnd = new Date("2026-07-13T00:00:00Z");

      const first = await env.repo.consumeIfWithinQuota({
        amount: 1,
        dailyLimit: 5000,
        dailyWindowEnd: dayEnd,
        dailyWindowStart: dayStart,
        featureKey: "generate",
        ownerId: env.ownerId,
        referenceId: null,
        weeklyLimit: 20_000,
        weeklyWindowEnd: weekEnd,
        weeklyWindowStart: weekStart,
      });

      expect(first).not.toBe("EXCEEDED");

      const second = await env.repo.consumeIfWithinQuota({
        amount: 1,
        dailyLimit: 5000,
        dailyWindowEnd: dayEnd,
        dailyWindowStart: dayStart,
        featureKey: "generate",
        ownerId: env.ownerId,
        referenceId: null,
        weeklyLimit: 20_000,
        weeklyWindowEnd: weekEnd,
        weeklyWindowStart: weekStart,
      });

      expect(second).not.toBe("EXCEEDED");

      if (first !== "EXCEEDED" && second !== "EXCEEDED") {
        expect(second.id).not.toBe(first.id);
        expect(second.dailyTotal).toBe(2);
        expect(second.weeklyTotal).toBe(2);

        const allLogs = env.db.select().from(aiUsageLog).all();
        expect(allLogs).toHaveLength(2);
      }
    });

    it("returns the same id when referenceId is reused after the original log is refunded", async ({
      expect,
    }) => {
      await using env = new AiLimitTestEnv();

      const referenceId = "reuse_after_refund_001";
      const dayStart = new Date("2026-07-07T00:00:00Z");
      const dayEnd = new Date("2026-07-08T00:00:00Z");
      const weekStart = new Date("2026-07-06T00:00:00Z");
      const weekEnd = new Date("2026-07-13T00:00:00Z");

      const first = await env.repo.consumeIfWithinQuota({
        amount: 1,
        dailyLimit: 5000,
        dailyWindowEnd: dayEnd,
        dailyWindowStart: dayStart,
        featureKey: "generate",
        ownerId: env.ownerId,
        referenceId,
        weeklyLimit: 20_000,
        weeklyWindowEnd: weekEnd,
        weeklyWindowStart: weekStart,
      });

      expect(first).not.toBe("EXCEEDED");
      if (first === "EXCEEDED") return;

      const refunded = await env.repo.markRefunded(first.id, env.ownerId);
      expect(refunded).toBe(true);

      const second = await env.repo.consumeIfWithinQuota({
        amount: 1,
        dailyLimit: 5000,
        dailyWindowEnd: dayEnd,
        dailyWindowStart: dayStart,
        featureKey: "generate",
        ownerId: env.ownerId,
        referenceId,
        weeklyLimit: 20_000,
        weeklyWindowEnd: weekEnd,
        weeklyWindowStart: weekStart,
      });

      expect(second).not.toBe("EXCEEDED");
      if (second !== "EXCEEDED") {
        expect(second.id).toBe(first.id);
        expect(second.dailyTotal).toBe(0);
        expect(second.weeklyTotal).toBe(0);
      }

      const allLogs = env.db.select().from(aiUsageLog).all();
      expect(allLogs).toHaveLength(1);
    });
  });
});
