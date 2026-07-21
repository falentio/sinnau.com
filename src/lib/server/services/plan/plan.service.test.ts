import type { GrantPlanInput, ListGrantsInput } from "$lib/schemas/plan";
import {
  PLAN_DAILY_DIVISOR,
  PLAN_MONTHLY_LIMIT,
  PLAN_WEEKLY_DIVISOR,
} from "$lib/schemas/plan.constant";
import { ORPCError } from "@orpc/server";
import { describe, it, vi } from "vitest";

import type { MidtransClient } from "../../infras/midtrans/client.ts";
import type {
  CreateQrisInput,
  QrisChargeResponse,
  WebhookBody,
} from "../../infras/midtrans/types.ts";
import type { AuthUser } from "../user/user.repository.ts";
import { PlanGuard } from "./plan.guard.ts";
import { deriveUserPlan, PlanService } from "./plan.service.ts";
import {
  createAdminGrantFixture,
  createMockRepository,
  createMockUserRepository,
  createOrderFixture,
  createPaymentFixture,
  createUserPlanFixture,
  EMPTY_ADMIN_GRANT_LIST,
  EMPTY_ORDER_LIST,
  captureError,
} from "./plan.testing.ts";

class MockPlanGuard extends PlanGuard {
  requireOwner = vi.fn<PlanGuard["requireOwner"]>();
  requireAdmin = vi.fn<PlanGuard["requireAdmin"]>();
  assertUserExistsOrNotFound = vi.fn<PlanGuard["assertUserExistsOrNotFound"]>();
  assertOrderVisibleByIdOrNotFound =
    vi.fn<PlanGuard["assertOrderVisibleByIdOrNotFound"]>();

  constructor() {
    super(createMockRepository(), createMockUserRepository());
  }
}

const makeWebhookBody = (
  overrides: Partial<WebhookBody> = {}
): WebhookBody => ({
  currency: "IDR",
  fraud_status: "accept",
  gross_amount: "30000",
  merchant_id: "mid",
  order_id: "ord_test",
  payment_type: "qris",
  signature_key: "sig",
  status_code: "200",
  status_message: "OK",
  transaction_id: "txn-1",
  transaction_status: "settlement",
  transaction_time: "2024-01-01 00:00:00",
  ...overrides,
});

const createMockMidtrans = (): MidtransClient => {
  const createQris = vi
    .fn<(input: CreateQrisInput) => Promise<QrisChargeResponse>>()
    .mockResolvedValue({
      acquirer: "gopay",
      actions: [{ method: "GET", name: "generate-qr-code", url: "https://qr" }],
      currency: "IDR",
      expiry_time: undefined,
      fraud_status: "accept",
      gross_amount: "30000",
      merchant_id: "mid",
      order_id: "ord_test",
      payment_type: "qris",
      qr_string: "QRCODE",
      status_code: "201",
      status_message: "OK",
      transaction_id: "txn-1",
      transaction_status: "pending",
      transaction_time: "2024-01-01 00:00:00",
    } satisfies QrisChargeResponse);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return { createQris } as unknown as MidtransClient;
};

const setupService = (midtrans = createMockMidtrans()) => {
  const repo = createMockRepository();
  const guard = new MockPlanGuard();
  guard.requireOwner.mockImplementation((id) => id ?? "fallback");
  guard.assertOrderVisibleByIdOrNotFound.mockImplementation(
    async (id, _userId) => {
      const order = await repo.findOrderById(id);
      if (!order || order.userId !== _userId) {
        throw new ORPCError("NOT_FOUND", { message: "Order not found" });
      }
      return order;
    }
  );

  guard.requireAdmin.mockImplementation((id) => {
    if (id === null || id === undefined || id === "") {
      throw new ORPCError("FORBIDDEN", { message: "Admin access required" });
    }
    return id;
  });
  guard.assertUserExistsOrNotFound.mockImplementation(async (id) => {
    if (id === "missing-user") {
      throw new ORPCError("NOT_FOUND", { message: "User not found" });
    }
    const now = new Date();
    const user: AuthUser = {
      affiliatedBy: null,
      banExpires: null,
      banReason: null,
      banned: false,
      createdAt: now,
      email: `${id}@e.com`,
      emailVerified: true,
      id,
      image: null,
      lastLoginMethod: null,
      name: "User",
      role: null,
      updatedAt: now,
    };
    // oxlint-disable-next-line typescript/no-unsafe-return
    return user;
  });

  repo.findActiveUserPlan.mockResolvedValue(null);
  repo.findOrdersByUser.mockResolvedValue(EMPTY_ORDER_LIST);
  repo.findOrderById.mockResolvedValue(null);
  repo.findPaymentByTransactionId.mockResolvedValue(null);
  repo.findPaymentByOrderId.mockResolvedValue(null);
  repo.findPaidOrdersForUser.mockResolvedValue([]);
  repo.findActiveAdminGrantsForUser.mockResolvedValue([]);
  repo.insertOrder.mockImplementation(async (row) => createOrderFixture(row));
  repo.insertPayment.mockImplementation(async (row) =>
    createPaymentFixture(row)
  );
  repo.insertAdminGrant.mockImplementation(async (row) =>
    createAdminGrantFixture(row)
  );
  repo.listAdminGrants.mockResolvedValue(EMPTY_ADMIN_GRANT_LIST);
  repo.updateOrderStatus.mockImplementation(async (id, status) =>
    createOrderFixture({ id, status })
  );
  repo.setOrderAppliedAt.mockImplementation(async (id, ms) =>
    createOrderFixture({ appliedAt: new Date(ms), id })
  );
  repo.updatePayment.mockImplementation(async (id, patch) =>
    createPaymentFixture({ id, ...patch })
  );
  repo.upsertUserPlan.mockImplementation(async (row) =>
    createUserPlanFixture(row)
  );

  const service = new PlanService(repo, guard, midtrans);
  return { guard, midtrans, repo, service };
};

describe.concurrent("PlanService unit tests", () => {
  describe("checkout", () => {
    it("throws UNAUTHORIZED when the caller is not authenticated", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.requireOwner.mockImplementation(() => {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Authentication is required",
        });
      });
      const err = await captureError(
        service.checkout({ durationMonths: 1, planKey: "LITE" }, null)
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("rejects a downgrade from an active higher-tier plan", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findActiveUserPlan.mockResolvedValue(
        createUserPlanFixture({ planKey: "PREMIUM", userId: "user-1" })
      );
      const err = await captureError(
        service.checkout({ durationMonths: 1, planKey: "LITE" }, "user-1")
      );
      expect(err).toMatchObject({ code: "DOWNGRADE_NOT_ALLOWED" });
    });

    it("creates a pending order and payment, then returns QRIS instructions", async ({
      expect,
    }) => {
      const { midtrans, repo, service } = setupService();
      const result = await service.checkout(
        { durationMonths: 1, planKey: "LITE" },
        "user-1"
      );

      expect(result.currency).toBe("IDR");
      expect(result.paymentType).toBe("QRIS");
      expect(result.grossAmount).toBe(30_000);
      expect(result.paymentData.qrString).toBe("QRCODE");
      expect(result.orderId).toMatch(/^ord_/u);

      const insertedOrder = repo.insertOrder.mock.calls[0]?.[0];
      expect(insertedOrder).toMatchObject({
        grossAmount: 30_000,
        planKey: "LITE",
        sku: "lite-1m",
        status: "PENDING",
      });

      const insertedPayment = repo.insertPayment.mock.calls[0]?.[0];
      expect(insertedPayment).toMatchObject({
        amount: 30_000,
        gateway: "midtrans",
        gatewayOrderId: result.orderId,
        orderId: result.orderId,
        status: "PENDING",
      });

      // oxlint-disable-next-line typescript/unbound-method
      const { createQris } = midtrans;
      expect(createQris).toHaveBeenCalledWith({
        custom_expiry: {
          expiry_duration: 15,
          unit: "minute",
        },
        payment_type: "qris",
        transaction_details: { gross_amount: 30_000, order_id: result.orderId },
      });
      expect(repo.updatePayment).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          gatewayTransactionId: "txn-1",
        })
      );
    });

    it("computes the 6-month discounted gross amount", async ({ expect }) => {
      const { repo, service } = setupService();
      const result = await service.checkout(
        { durationMonths: 6, planKey: "PLUS" },
        "user-1"
      );
      expect(result.grossAmount).toBe(250_000);
      expect(repo.insertOrder.mock.calls[0]?.[0].sku).toBe("plus-6m");
    });

    it("throws PAYMENT_GATEWAY_ERROR when Midtrans fails", async ({
      expect,
    }) => {
      const midtrans = createMockMidtrans();
      vi.mocked(midtrans).createQris.mockRejectedValue(
        new Error("network down")
      );
      const { service } = setupService(midtrans);
      const err = await captureError(
        service.checkout({ durationMonths: 1, planKey: "LITE" }, "user-1")
      );
      expect(err).toMatchObject({ code: "PAYMENT_GATEWAY_ERROR" });
    });
  });

  describe("listOrders", () => {
    it("requires authentication", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireOwner.mockImplementation(() => {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Authentication is required",
        });
      });
      const err = await captureError(service.listOrders({ page: 1 }, null));
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("delegates to the repository with the page and owner id", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const list = await service.listOrders({ page: 2 }, "user-1");
      expect(list).toBe(EMPTY_ORDER_LIST);
      expect(repo.findOrdersByUser).toHaveBeenCalledWith(
        "user-1",
        2,
        undefined
      );
    });

    it("plumbs excludeStatuses through to the repository", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      await service.listOrders(
        { excludeStatuses: ["PENDING"], page: 1 },
        "user-1"
      );
      expect(repo.findOrdersByUser).toHaveBeenCalledWith("user-1", 1, [
        "PENDING",
      ]);
    });
  });

  describe("listPlans", () => {
    it("returns the full hardcoded catalog with discounted prices", async ({
      expect,
    }) => {
      const { service } = setupService();
      const plans = service.listPlans();
      expect(plans).toHaveLength(3);
      const lite = plans.find((p) => p.key === "LITE");
      const premium = plans.find((p) => p.key === "PREMIUM");
      expect(lite?.monthlyPrice).toBe(30_000);
      expect(lite?.durations).toEqual([
        // oxlint-disable-next-line typescript/no-unsafe-assignment
        { discountLabel: expect.any(String), grossAmount: 30_000, months: 1 },
        // oxlint-disable-next-line typescript/no-unsafe-assignment
        { discountLabel: expect.any(String), grossAmount: 150_000, months: 6 },
        // oxlint-disable-next-line typescript/no-unsafe-assignment
        { discountLabel: expect.any(String), grossAmount: 270_000, months: 12 },
      ]);
      expect(premium?.durations.find((d) => d.months === 12)?.grossAmount).toBe(
        900_000
      );
    });
  });

  describe("getAiLimitPlanForUser", () => {
    it("requires authentication", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireOwner.mockImplementation(() => {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Authentication is required",
        });
      });
      const err = await captureError(service.getAiLimitPlanForUser(null));
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws NO_ACTIVE_PLAN when the user has no active plan", async ({
      expect,
    }) => {
      const { service } = setupService();
      const err = await captureError(service.getAiLimitPlanForUser("user-1"));
      expect(err).toMatchObject({ code: "NO_ACTIVE_PLAN" });
    });

    it("maps the monthly limit to daily and weekly windows", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findActiveUserPlan.mockResolvedValue(
        createUserPlanFixture({ planKey: "LITE", userId: "user-1" })
      );
      const lite = await service.getAiLimitPlanForUser("user-1");
      expect(lite).toEqual({
        daily: Math.ceil(PLAN_MONTHLY_LIMIT.LITE / PLAN_DAILY_DIVISOR),
        planKey: "LITE",
        weekly: Math.ceil(PLAN_MONTHLY_LIMIT.LITE / PLAN_WEEKLY_DIVISOR),
      });

      repo.findActiveUserPlan.mockResolvedValue(
        createUserPlanFixture({ planKey: "PREMIUM", userId: "user-1" })
      );
      const premium = await service.getAiLimitPlanForUser("user-1");
      expect(premium).toEqual({
        daily: Math.ceil(PLAN_MONTHLY_LIMIT.PREMIUM / PLAN_DAILY_DIVISOR),
        planKey: "PREMIUM",
        weekly: Math.ceil(PLAN_MONTHLY_LIMIT.PREMIUM / PLAN_WEEKLY_DIVISOR),
      });
    });
  });

  describe("handleWebhook", () => {
    it("returns undefined when the order does not exist", async ({
      expect,
    }) => {
      const { service } = setupService();
      const result = await service.handleWebhook(makeWebhookBody());
      expect(result).toBeUndefined();
    });

    it("ignores an unrecognized transaction status", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findOrderById.mockResolvedValue(
        createOrderFixture({ id: "ord_test" })
      );
      await service.handleWebhook(
        makeWebhookBody({ transaction_status: "frobnicate" })
      );
      expect(repo.updateOrderStatus).not.toHaveBeenCalled();
    });

    it("skips reprocessing an already-applied settlement", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findOrderById.mockResolvedValue(
        createOrderFixture({ id: "ord_test", status: "PAID" })
      );
      repo.findPaymentByTransactionId.mockResolvedValue(
        createPaymentFixture({
          gatewayTransactionId: "txn-1",
          status: "SUCCESS",
        })
      );
      await service.handleWebhook(makeWebhookBody());
      expect(repo.updateOrderStatus).not.toHaveBeenCalled();
      expect(repo.upsertUserPlan).not.toHaveBeenCalled();
    });

    it("ignores webhooks for a terminal order", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findOrderById.mockResolvedValue(
        createOrderFixture({ id: "ord_test", status: "CANCELLED" })
      );
      await service.handleWebhook(
        makeWebhookBody({ transaction_status: "expire" })
      );
      expect(repo.updateOrderStatus).not.toHaveBeenCalled();
    });

    it("ignores an invalid status transition", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findOrderById.mockResolvedValue(
        createOrderFixture({ id: "ord_test", status: "PAID" })
      );
      await service.handleWebhook(
        makeWebhookBody({ transaction_status: "expire" })
      );
      expect(repo.updateOrderStatus).not.toHaveBeenCalled();
    });

    it("does not update payment on a pending notification", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findOrderById.mockResolvedValue(
        createOrderFixture({ id: "ord_test", status: "PENDING" })
      );
      await service.handleWebhook(
        makeWebhookBody({ transaction_status: "pending" })
      );
      expect(repo.updateOrderStatus).not.toHaveBeenCalled();
      expect(repo.updatePayment).not.toHaveBeenCalled();
    });

    it("applies the plan on settlement", async ({ expect }) => {
      const { repo, service } = setupService();
      const order = createOrderFixture({
        durationMonths: 6,
        id: "ord_test",
        planKey: "PLUS",
        status: "PENDING",
      });
      repo.findOrderById.mockResolvedValue(order);
      repo.findPaymentByOrderId.mockResolvedValue(
        createPaymentFixture({ orderId: "ord_test" })
      );
      const appliedAt = Date.now();
      repo.findPaidOrdersForUser.mockResolvedValue([
        createOrderFixture({
          appliedAt: new Date(appliedAt),
          durationMonths: 6,
          planKey: "PLUS",
          status: "PAID",
        }),
      ]);

      await service.handleWebhook(makeWebhookBody());

      expect(repo.updateOrderStatus).toHaveBeenCalledWith("ord_test", "PAID");
      expect(repo.setOrderAppliedAt).toHaveBeenCalledWith(
        "ord_test",
        expect.any(Number)
      );
      expect(repo.updatePayment).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          gatewayTransactionId: "txn-1",
          status: "SUCCESS",
        })
      );
      expect(repo.upsertUserPlan).toHaveBeenCalledWith(
        expect.objectContaining({ planKey: "PLUS", userId: order.userId })
      );
    });

    it("revokes the plan on a reversal (refund) of a paid order", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findOrderById.mockResolvedValue(
        createOrderFixture({ id: "ord_test", status: "PAID" })
      );
      repo.findPaidOrdersForUser.mockResolvedValue([]);

      await service.handleWebhook(
        makeWebhookBody({ transaction_status: "refund" })
      );

      expect(repo.updateOrderStatus).toHaveBeenCalledWith(
        "ord_test",
        "CANCELLED"
      );
      expect(repo.deleteUserPlan).toHaveBeenCalledWith(expect.any(String));
      expect(repo.upsertUserPlan).not.toHaveBeenCalled();
    });
  });

  describe.concurrent("getOrder", () => {
    const validPayload = JSON.stringify({
      actions: [
        { method: "GET", name: "generate-qr-code", url: "https://qr.example" },
        { method: "GET", name: "deeplink-redirect", url: "https://deeplink" },
      ],
    });

    it("throws UNAUTHORIZED when the caller is not authenticated", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.requireOwner.mockImplementation(() => {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Authentication is required",
        });
      });
      const err = await captureError(
        service.getOrder({ orderId: "ord_x" }, null)
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("returns the order with qrUrl when a payment row with a valid QRIS payload exists", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const order = createOrderFixture({
        id: "ord_test",
        userId: "user-1",
      });
      repo.findOrderById.mockResolvedValue(order);
      repo.findPaymentByOrderId.mockResolvedValue(
        createPaymentFixture({ orderId: "ord_test", payload: validPayload })
      );

      const result = await service.getOrder({ orderId: "ord_test" }, "user-1");

      expect(result).toEqual({ ...order, qrUrl: "https://qr.example" });
    });

    it("returns qrUrl null when there is no payment row for the order", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const order = createOrderFixture({
        id: "ord_test",
        userId: "user-1",
      });
      repo.findOrderById.mockResolvedValue(order);
      repo.findPaymentByOrderId.mockResolvedValue(null);

      const result = await service.getOrder({ orderId: "ord_test" }, "user-1");

      expect(result.qrUrl).toBeNull();
      expect(result.id).toBe(order.id);
    });

    it("returns qrUrl null when the payment payload is null", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const order = createOrderFixture({
        id: "ord_test",
        userId: "user-1",
      });
      repo.findOrderById.mockResolvedValue(order);
      repo.findPaymentByOrderId.mockResolvedValue(
        createPaymentFixture({ orderId: "ord_test", payload: null })
      );

      const result = await service.getOrder({ orderId: "ord_test" }, "user-1");

      expect(result.qrUrl).toBeNull();
    });

    it("returns qrUrl null when the payment payload is malformed JSON", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const order = createOrderFixture({
        id: "ord_test",
        userId: "user-1",
      });
      repo.findOrderById.mockResolvedValue(order);
      repo.findPaymentByOrderId.mockResolvedValue(
        createPaymentFixture({
          orderId: "ord_test",
          payload: "not-json{",
        })
      );

      const result = await service.getOrder({ orderId: "ord_test" }, "user-1");

      expect(result.qrUrl).toBeNull();
    });

    it("returns qrUrl null when the payload has no generate-qr-code action", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const order = createOrderFixture({
        id: "ord_test",
        userId: "user-1",
      });
      repo.findOrderById.mockResolvedValue(order);
      repo.findPaymentByOrderId.mockResolvedValue(
        createPaymentFixture({
          orderId: "ord_test",
          payload: JSON.stringify({
            actions: [{ method: "GET", name: "deeplink-redirect", url: "x" }],
          }),
        })
      );

      const result = await service.getOrder({ orderId: "ord_test" }, "user-1");

      expect(result.qrUrl).toBeNull();
    });

    it("throws NOT_FOUND when findOrderById returns null", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findOrderById.mockResolvedValue(null);
      const err = await captureError(
        service.getOrder({ orderId: "ord_missing" }, "user-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws NOT_FOUND when the order is owned by a different user (leak-prevention)", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findOrderById.mockResolvedValue(
        createOrderFixture({ id: "ord_other", userId: "user-2" })
      );
      const err = await captureError(
        service.getOrder({ orderId: "ord_other" }, "user-1")
      );
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe.concurrent("grantPlan", () => {
    it("throws FORBIDDEN when admin id is null", async ({ expect }) => {
      const { service } = setupService();
      const input: GrantPlanInput = {
        durationMonths: 1,
        planKey: "LITE",
        userId: "user-1",
      };
      const err = await captureError(service.grantPlan(input, null));
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
    });

    it("throws FORBIDDEN when admin id is undefined", async ({ expect }) => {
      const { service } = setupService();
      const input: GrantPlanInput = {
        durationMonths: 1,
        planKey: "LITE",
        userId: "user-1",
      };
      const err = await captureError(service.grantPlan(input, null));
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
    });

    it("throws NOT_FOUND when the target user does not exist", async ({
      expect,
    }) => {
      const { guard, service } = setupService();
      guard.assertUserExistsOrNotFound.mockRejectedValue(
        new ORPCError("NOT_FOUND", { message: "User not found" })
      );
      const input: GrantPlanInput = {
        durationMonths: 1,
        planKey: "LITE",
        userId: "missing-user",
      };
      const err = await captureError(service.grantPlan(input, "admin-1"));
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("inserts the grant first, then re-derives the user plan", async ({
      expect,
    }) => {
      const { guard, repo, service } = setupService();
      guard.assertUserExistsOrNotFound.mockImplementation(async (id) => {
        if (id === "missing-user") {
          throw new ORPCError("NOT_FOUND", { message: "User not found" });
        }
        const now = new Date();
        const user: AuthUser = {
          affiliatedBy: null,
          banExpires: null,
          banReason: null,
          banned: false,
          createdAt: now,
          email: `${id}@e.com`,
          emailVerified: true,
          id,
          image: null,
          lastLoginMethod: null,
          name: "User",
          role: null,
          updatedAt: now,
        };
        // oxlint-disable-next-line typescript/no-unsafe-return
        return user;
      });

      const input: GrantPlanInput = {
        durationMonths: 3,
        planKey: "PREMIUM",
        userId: "target-user",
      };

      repo.findActiveAdminGrantsForUser.mockResolvedValue([
        createAdminGrantFixture({
          durationMonths: 3,
          planKey: "PREMIUM",
          userId: "target-user",
        }),
      ]);

      await service.grantPlan(input, "admin-1");

      expect(repo.insertAdminGrant).toHaveBeenCalledWith(
        expect.objectContaining({
          durationMonths: 3,
          grantedBy: "admin-1",
          userId: "target-user",
        })
      );
      expect(repo.findPaidOrdersForUser).toHaveBeenCalledWith("target-user");
      expect(repo.findActiveAdminGrantsForUser).toHaveBeenCalledWith(
        "target-user",
        expect.any(Number)
      );
      expect(repo.upsertUserPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          planKey: "PREMIUM",
          userId: "target-user",
        })
      );
    });
  });

  describe.concurrent("listGrants", () => {
    it("throws FORBIDDEN when admin id is null", async ({ expect }) => {
      const { service } = setupService();
      const input: ListGrantsInput = { page: 1 };
      const err = await captureError(service.listGrants(input, null));
      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "FORBIDDEN" });
    });

    it("returns the paginated grant list from the repository", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const row = createAdminGrantFixture({
        durationMonths: 1,
        grantedBy: "admin-1",
        id: "grant-1",
        userId: "user-1",
      });
      repo.listAdminGrants.mockResolvedValue({
        data: [row],
        pagination: {
          limit: 10,
          page: 1,
          total: 1,
          totalPages: 1,
        },
      });

      const result = await service.listGrants({ page: 1 }, "admin-1");

      expect(repo.listAdminGrants).toHaveBeenCalledWith({
        grantedBy: undefined,
        page: 1,
        planKey: undefined,
        userId: undefined,
      });
      expect(result).toEqual({
        data: [expect.objectContaining({ id: "grant-1" })],
        pagination: { limit: 10, page: 1, total: 1, totalPages: 1 },
      });
    });
  });
});

describe.concurrent("PlanService.parseQrisUrl", () => {
  it("returns the URL of the generate-qr-code action for a valid payload", async ({
    expect,
  }) => {
    const payload = JSON.stringify({
      actions: [
        { method: "GET", name: "generate-qr-code", url: "https://qr.example" },
        { method: "GET", name: "deeplink-redirect", url: "https://deeplink" },
      ],
    });
    expect(PlanService.parseQrisUrl(payload)).toBe("https://qr.example");
  });

  it("returns null when the payload is null", async ({ expect }) => {
    expect(PlanService.parseQrisUrl(null)).toBeNull();
  });

  it("returns null and warns when the payload is malformed JSON", async ({
    expect,
  }) => {
    expect(PlanService.parseQrisUrl("not-json{")).toBeNull();
  });

  it("returns null and warns when the payload has no generate-qr-code action", async ({
    expect,
  }) => {
    const payload = JSON.stringify({
      actions: [{ method: "GET", name: "deeplink-redirect", url: "x" }],
    });
    expect(PlanService.parseQrisUrl(payload)).toBeNull();
  });
});

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

describe.concurrent(deriveUserPlan, () => {
  it("returns null for an empty entry list", async ({ expect }) => {
    const result = deriveUserPlan([], Date.now());
    expect(result).toBeNull();
  });

  it("starts a fresh plan from a single grant", async ({ expect }) => {
    const appliedAt = 1_000_000;
    const result = deriveUserPlan(
      [
        {
          alwaysApply: true,
          appliedAt,
          durationMonths: 3,
          planKey: "PLUS",
        },
      ],
      appliedAt + 1
    );
    expect(result).toEqual({
      expiresAt: appliedAt + 3 * MONTH_MS,
      planKey: "PLUS",
      startedAt: appliedAt,
    });
  });

  it("extends same-tier via alwaysApply when grant has lower rank than current", async ({
    expect,
  }) => {
    const day0 = 1_000_000;
    const day15 = day0 + 15 * 24 * 60 * 60 * 1000;
    const result = deriveUserPlan(
      [
        {
          alwaysApply: false,
          appliedAt: day0,
          durationMonths: 1,
          planKey: "PREMIUM",
        },
        {
          alwaysApply: true,
          appliedAt: day15,
          durationMonths: 2,
          planKey: "LITE",
        },
      ],
      day0
    );
    expect(result).toEqual({
      expiresAt: day0 + MONTH_MS + 2 * MONTH_MS,
      planKey: "PREMIUM",
      startedAt: day0,
    });
  });

  it("skips lower-tier order without alwaysApply on downgrade", async ({
    expect,
  }) => {
    const day0 = 1_000_000;
    const day15 = day0 + 15 * 24 * 60 * 60 * 1000;
    const result = deriveUserPlan(
      [
        {
          alwaysApply: false,
          appliedAt: day0,
          durationMonths: 1,
          planKey: "PREMIUM",
        },
        {
          alwaysApply: false,
          appliedAt: day15,
          durationMonths: 1,
          planKey: "LITE",
        },
      ],
      day0
    );
    expect(result).toEqual({
      expiresAt: day0 + MONTH_MS,
      planKey: "PREMIUM",
      startedAt: day0,
    });
  });

  it("upgrades immediately when grant has a higher tier than current", async ({
    expect,
  }) => {
    const day0 = 1_000_000;
    const day15 = day0 + 15 * 24 * 60 * 60 * 1000;
    const result = deriveUserPlan(
      [
        {
          alwaysApply: false,
          appliedAt: day0,
          durationMonths: 1,
          planKey: "LITE",
        },
        {
          alwaysApply: true,
          appliedAt: day15,
          durationMonths: 3,
          planKey: "PREMIUM",
        },
      ],
      day0
    );
    expect(result).toEqual({
      expiresAt: day15 + 3 * MONTH_MS,
      planKey: "PREMIUM",
      startedAt: day15,
    });
  });

  it("grants extend the current plan even when interleaved with orders", async ({
    expect,
  }) => {
    const day0 = 1_000_000;
    const day5 = day0 + 5 * 24 * 60 * 60 * 1000;
    const day10 = day0 + 10 * 24 * 60 * 60 * 1000;
    const result = deriveUserPlan(
      [
        {
          alwaysApply: false,
          appliedAt: day0,
          durationMonths: 1,
          planKey: "PREMIUM",
        },
        {
          alwaysApply: true,
          appliedAt: day5,
          durationMonths: 1,
          planKey: "LITE",
        },
        {
          alwaysApply: false,
          appliedAt: day10,
          durationMonths: 1,
          planKey: "PLUS",
        },
      ],
      day0
    );
    expect(result).toEqual({
      expiresAt: day0 + MONTH_MS + MONTH_MS,
      planKey: "PREMIUM",
      startedAt: day0,
    });
  });

  it("returns null when all entries have expired", async ({ expect }) => {
    const appliedAt = 1_000_000;
    const now = appliedAt + 2 * MONTH_MS + 1;
    const result = deriveUserPlan(
      [
        {
          alwaysApply: true,
          appliedAt,
          durationMonths: 1,
          planKey: "LITE",
        },
      ],
      now
    );
    expect(result).toBeNull();
  });
});
