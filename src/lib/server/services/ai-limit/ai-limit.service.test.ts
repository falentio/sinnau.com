import { AI_LIMIT_ID_PREFIX } from "$lib/schemas/ai-limit.constant";
import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import { generateId } from "../../utils/nanoid.ts";
import type { AiLimitGuard } from "./ai-limit.guard.ts";
import type { AiLimitPlan } from "./ai-limit.service.ts";
import { AiLimitService } from "./ai-limit.service.ts";
import {
  captureError,
  createAiUsageLogFixture,
  createMockGuard,
  createMockRepository,
} from "./ai-limit.testing.ts";

const defaultPlan: AiLimitPlan = {
  daily: 5000,
  planKey: "FREE",
  weekly: 20_000,
};

const setupService = (plan: AiLimitPlan = defaultPlan) => {
  const repo = createMockRepository();
  const guard = createMockGuard();

  repo.consumeIfWithinQuota.mockResolvedValue({
    dailyTotal: 1,
    id: generateId(AI_LIMIT_ID_PREFIX),
    weeklyTotal: 1,
  });
  repo.sumUsageInWindow.mockResolvedValue(0);
  repo.findUsageLogById.mockResolvedValue(null);
  repo.markRefunded.mockResolvedValue(true);

  guard.requireOwner.mockImplementation((id) => {
    if (id === null || id === undefined) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "Authentication is required",
      });
    }
    return id;
  });

  const log = createAiUsageLogFixture();
  guard.assertLogOwnerOrForbidden.mockResolvedValue(log);

  // eslint-disable-next-line promise-function-async
  const lookupPlan = () => Promise.resolve(plan);
  // oxlint-disable-next-line no-unsafe-type-assertion
  const service = new AiLimitService(
    repo,
    // oxlint-disable-next-line no-unsafe-type-assertion
    guard as unknown as AiLimitGuard,
    lookupPlan
  );
  return { guard, repo, service };
};

const lookupPlanUnavailable = async (): Promise<AiLimitPlan> => {
  throw new Error("Plan service unavailable");
};

const throwUnauthorized = (): never => {
  throw new ORPCError("UNAUTHORIZED", {
    message: "Authentication is required",
  });
};

const throwForbidden = (): never => {
  throw new ORPCError("FORBIDDEN", {
    message: "Cannot modify this usage log",
  });
};

describe.concurrent(AiLimitService, () => {
  describe("getUsage", () => {
    it("returns daily and weekly usage with plan key and zero used when no logs", async ({
      expect,
    }) => {
      const { service } = setupService();

      const usage = await service.getUsage("owner-1");

      expect(usage.planKey).toBe("FREE");
      expect(usage.daily.limit).toBe(5000);
      expect(usage.daily.used).toBe(0);
      expect(usage.daily.remaining).toBe(5000);
      expect(usage.daily.resetsAt).toBeInstanceOf(Date);
      expect(usage.weekly.limit).toBe(20_000);
      expect(usage.weekly.used).toBe(0);
      expect(usage.weekly.remaining).toBe(20_000);
      expect(usage.weekly.resetsAt).toBeInstanceOf(Date);
    });

    it("returns correct remaining when there is usage", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.sumUsageInWindow.mockResolvedValue(3);

      const usage = await service.getUsage("owner-1");

      expect(usage.daily.used).toBe(3);
      expect(usage.daily.remaining).toBe(4997);
    });

    it("computes daily reset at next midnight UTC", async ({ expect }) => {
      const { service } = setupService();

      const usage = await service.getUsage("owner-1");

      const resetAt = usage.daily.resetsAt;
      expect(resetAt.getUTCHours()).toBe(0);
      expect(resetAt.getUTCMinutes()).toBe(0);
      expect(resetAt.getUTCSeconds()).toBe(0);
      expect(resetAt.getUTCMilliseconds()).toBe(0);
      expect(resetAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("computes weekly reset at next Monday midnight UTC", async ({
      expect,
    }) => {
      const { service } = setupService();

      const usage = await service.getUsage("owner-1");

      const resetAt = usage.weekly.resetsAt;
      expect(resetAt.getUTCDay()).toBe(1);
      expect(resetAt.getUTCHours()).toBe(0);
      expect(resetAt.getUTCMinutes()).toBe(0);
    });

    it("throws UNAUTHORIZED when guard rejects", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireOwner.mockImplementation(() => {
        throwUnauthorized();
        return "";
      });

      const err = await captureError(service.getUsage("any-user"));
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("propagates error when lookupPlan fails", async ({ expect }) => {
      const repo = createMockRepository();
      const guard = createMockGuard();
      guard.requireOwner.mockReturnValue("owner-1");
      guard.assertLogOwnerOrForbidden.mockResolvedValue(
        createAiUsageLogFixture()
      );
      repo.consumeIfWithinQuota.mockResolvedValue({
        dailyTotal: 0,
        id: generateId(AI_LIMIT_ID_PREFIX),
        weeklyTotal: 0,
      });
      repo.sumUsageInWindow.mockResolvedValue(0);
      repo.markRefunded.mockResolvedValue(true);

      // oxlint-disable-next-line no-unsafe-type-assertion
      const service = new AiLimitService(
        repo,
        // oxlint-disable-next-line no-unsafe-type-assertion
        guard as unknown as AiLimitGuard,
        lookupPlanUnavailable
      );

      const err = await captureError(service.getUsage("owner-1"));
      expect(err).toBeInstanceOf(Error);
      // oxlint-disable-next-line no-unsafe-type-assertion
      expect((err as { message: string }).message).toBe(
        "Plan service unavailable"
      );
    });
  });

  describe("consume", () => {
    it("consumes quota and returns logId with updated usage", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.consumeIfWithinQuota.mockResolvedValue({
        dailyTotal: 1,
        id: generateId(AI_LIMIT_ID_PREFIX),
        weeklyTotal: 1,
      });

      const result = await service.consume(
        { amount: 1, featureKey: "generate" },
        "owner-1"
      );

      expect(result).toHaveProperty("logId");
      expect(result.logId).toMatch(/^aiu_/u);
      expect(result.usage.daily.used).toBe(1);
      expect(result.usage.daily.remaining).toBe(4999);
      expect(result.usage.weekly.used).toBe(1);
      expect(result.usage.weekly.remaining).toBe(19_999);
      expect(result.usage.planKey).toBe("FREE");
    });

    it("computes the correct window boundaries for consumption", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const result = await service.consume(
        { amount: 1, featureKey: "generate" },
        "owner-1"
      );

      expect(repo.consumeIfWithinQuota).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1,
          dailyLimit: 5000,
          featureKey: "generate",
          ownerId: "owner-1",
          weeklyLimit: 20_000,
        })
      );

      const call = repo.consumeIfWithinQuota.mock.calls[0]?.[0];
      expect(call?.dailyWindowStart).toBeInstanceOf(Date);
      expect(call?.dailyWindowEnd).toBeInstanceOf(Date);
      expect(call?.weeklyWindowStart).toBeInstanceOf(Date);
      expect(call?.weeklyWindowEnd).toBeInstanceOf(Date);
      expect(result.usage).toBeDefined();
      expect(result.usage.daily.resetsAt).toBeInstanceOf(Date);
      expect(result.usage.weekly.resetsAt).toBeInstanceOf(Date);
    });

    it("throws AI_LIMIT_EXCEEDED when repo returns EXCEEDED", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.consumeIfWithinQuota.mockResolvedValue("EXCEEDED");

      const err = await captureError(
        service.consume({ amount: 1, featureKey: "generate" }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "AI_LIMIT_EXCEEDED" });
    });

    it("passes optional referenceId to the repository", async ({ expect }) => {
      const { repo, service } = setupService();
      await service.consume(
        { amount: 2, featureKey: "summarize", referenceId: "gen_ref_123" },
        "owner-1"
      );
      const call = repo.consumeIfWithinQuota.mock.calls[0]?.[0];
      expect(call?.amount).toBe(2);
      expect(call?.featureKey).toBe("summarize");
      expect(call?.referenceId).toBe("gen_ref_123");
    });

    it("throws AI_LIMIT_EXCEEDED with details when amount exceeds a plan limit", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const err = await captureError(
        service.consume({ amount: 5001, featureKey: "generate" }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "AI_LIMIT_EXCEEDED" });
      // eslint-disable-next-line no-unsafe-type-assertion
      const { data } = err as {
        data?: {
          requestedAmount: number;
          daily: { limit: number };
          weekly: { limit: number };
        };
      };
      expect(data?.requestedAmount).toBe(5001);
      expect(data?.daily).toMatchObject({ limit: 5000 });
      expect(data?.weekly).toMatchObject({ limit: 20_000 });
      expect(repo.consumeIfWithinQuota).not.toHaveBeenCalled();
    });

    it("throws AI_LIMIT_EXCEEDED when amount exceeds only the weekly limit", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const err = await captureError(
        service.consume({ amount: 20_001, featureKey: "generate" }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "AI_LIMIT_EXCEEDED" });
      expect(repo.consumeIfWithinQuota).not.toHaveBeenCalled();
    });

    it("throws UNAUTHORIZED when guard rejects", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireOwner.mockImplementation(() => {
        throwUnauthorized();
        return "";
      });

      const err = await captureError(
        service.consume({ amount: 1, featureKey: "generate" }, "any-user")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe("refund", () => {
    it("refunds a log and returns updated usage", async ({ expect }) => {
      const { repo, guard, service } = setupService();
      const log = createAiUsageLogFixture({
        ownerId: "owner-1",
      });
      guard.assertLogOwnerOrForbidden.mockResolvedValue(log);
      repo.markRefunded.mockResolvedValue(true);

      const result = await service.refund({ logId: log.id }, "owner-1");

      expect(repo.markRefunded).toHaveBeenCalledWith(log.id, "owner-1");
      expect(result.refundedLogId).toBe(log.id);
      expect(result.usage).toBeDefined();
    });

    it("throws FORBIDDEN when log does not belong to the user", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertLogOwnerOrForbidden.mockImplementation(throwForbidden);

      const err = await captureError(
        service.refund(
          { logId: generateId(AI_LIMIT_ID_PREFIX) },
          "someone-else"
        )
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
    });

    it("throws UNAUTHORIZED when guard rejects", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireOwner.mockImplementation(() => {
        throwUnauthorized();
        return "";
      });

      const err = await captureError(
        service.refund({ logId: generateId(AI_LIMIT_ID_PREFIX) }, "any-user")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws AI_LIMIT_ALREADY_REFUNDED when refund already applied", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.markRefunded.mockResolvedValue(false);

      const err = await captureError(
        service.refund({ logId: generateId(AI_LIMIT_ID_PREFIX) }, "owner-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "AI_LIMIT_ALREADY_REFUNDED" });
      // eslint-disable-next-line no-unsafe-type-assertion
      expect((err as { message: string }).message).toBe(
        "Usage log has already been refunded"
      );
    });
  });
});
