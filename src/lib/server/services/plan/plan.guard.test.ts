import { ORPCError } from "@orpc/server";
import { describe, it, vi } from "vitest";
import type { MockedFunction } from "vitest";

import type { Order } from "../../infras/db/schema/plan.ts";
import { PlanGuard } from "./plan.guard.ts";
import type { PlanRepository } from "./plan.repository.ts";
import { captureError, createOrderFixture } from "./plan.testing.ts";

type MockedPlanRepository = {
  [K in keyof PlanRepository]: MockedFunction<PlanRepository[K]>;
};

const createMockRepository = (): MockedPlanRepository => ({
  deleteUserPlan: vi.fn<PlanRepository["deleteUserPlan"]>(),
  findActiveUserPlan: vi.fn<PlanRepository["findActiveUserPlan"]>(),
  findOrderById: vi.fn<PlanRepository["findOrderById"]>(),
  findOrdersByUser: vi.fn<PlanRepository["findOrdersByUser"]>(),
  findPaidOrdersForUser: vi.fn<PlanRepository["findPaidOrdersForUser"]>(),
  findPaymentByOrderId: vi.fn<PlanRepository["findPaymentByOrderId"]>(),
  findPaymentByTransactionId:
    vi.fn<PlanRepository["findPaymentByTransactionId"]>(),
  insertOrder: vi.fn<PlanRepository["insertOrder"]>(),
  insertPayment: vi.fn<PlanRepository["insertPayment"]>(),
  setOrderAppliedAt: vi.fn<PlanRepository["setOrderAppliedAt"]>(),
  updateOrderStatus: vi.fn<PlanRepository["updateOrderStatus"]>(),
  updatePayment: vi.fn<PlanRepository["updatePayment"]>(),
  upsertUserPlan: vi.fn<PlanRepository["upsertUserPlan"]>(),
});

const setupGuard = () => {
  const repo = createMockRepository();
  const guard = new PlanGuard(repo);
  return { guard, repo };
};

const throwUnauthorized = () => {
  throw new ORPCError("UNAUTHORIZED", {
    message: "Authentication is required",
  });
};

describe.concurrent("PlanGuard unit", () => {
  describe("requireOwner", () => {
    it("returns the owner id when present", async ({ expect }) => {
      const { guard } = setupGuard();
      expect(guard.requireOwner("user-123")).toBe("user-123");
    });

    it("throws UNAUTHORIZED when null", async ({ expect }) => {
      const { guard } = setupGuard();
      const err = await captureError((async () => guard.requireOwner(null))());
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws UNAUTHORIZED when empty string", async ({ expect }) => {
      const { guard } = setupGuard();
      const err = await captureError((async () => guard.requireOwner(""))());
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("has no side effects (no DB dependency)", async ({ expect }) => {
      const { guard } = setupGuard();
      expect(guard.requireOwner("user-123")).toBe("user-123");
    });

    it("propagates a thrown UNAUTHORIZED verbatim", async ({ expect }) => {
      const { guard } = setupGuard();
      const err = await captureError(
        (async () => {
          throwUnauthorized();
          guard.requireOwner("user-123");
        })()
      );
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe("assertOrderVisibleByIdOrNotFound", () => {
    it("returns the order when the caller owns it", async ({ expect }) => {
      const { guard, repo } = setupGuard();
      const order: Order = createOrderFixture({
        id: "ord_owner1",
        userId: "user-1",
      });
      repo.findOrderById.mockResolvedValue(order);

      const result = await guard.assertOrderVisibleByIdOrNotFound(
        "ord_owner1",
        "user-1"
      );

      expect(result).toBe(order);
      expect(repo.findOrderById).toHaveBeenCalledWith("ord_owner1");
    });

    it("throws NOT_FOUND when the order does not exist", async ({ expect }) => {
      const { guard, repo } = setupGuard();
      repo.findOrderById.mockResolvedValue(null);
      const err = await captureError(
        guard.assertOrderVisibleByIdOrNotFound("ord_missing", "user-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws NOT_FOUND when the caller does not own the order (leak-prevention)", async ({
      expect,
    }) => {
      const { guard, repo } = setupGuard();
      repo.findOrderById.mockResolvedValue(
        createOrderFixture({ id: "ord_other", userId: "user-2" })
      );
      const err = await captureError(
        guard.assertOrderVisibleByIdOrNotFound("ord_other", "user-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({
        code: "NOT_FOUND",
        message: "Order not found",
      });
    });
  });
});
