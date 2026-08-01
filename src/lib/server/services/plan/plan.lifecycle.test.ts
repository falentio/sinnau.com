/* oxlint-disable typescript/no-non-null-assertion */
import { describe, it, vi } from "vitest";

import type { MidtransClient } from "../../infras/midtrans/client.ts";
import type { WebhookBody } from "../../infras/midtrans/types.ts";
import { PlanService } from "./plan.service.ts";
import {
  captureError,
  createMockGuard,
  PlanTestEnv,
  toPlanGuard,
} from "./plan.testing.ts";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

const makeWebhook = (
  orderId: string,
  transactionId: string,
  status: string
): WebhookBody => ({
  currency: "IDR",
  fraud_status: "accept",
  gross_amount: "30000",
  merchant_id: "mid",
  order_id: orderId,
  payment_type: "qris",
  signature_key: "sig",
  status_code: "200",
  status_message: "OK",
  transaction_id: transactionId,
  transaction_status: status,
  transaction_time: "2024-01-01 00:00:00",
});

const createStubMidtrans = (): MidtransClient =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  ({ createQris: vi.fn<() => void>() }) as unknown as MidtransClient;

describe.concurrent("PlanService lifecycle (integration)", () => {
  it("extends the same tier from the current expiry", async ({ expect }) => {
    await using env = new PlanTestEnv();
    const service = new PlanService(
      env.repo,
      env.createGuard(),
      createStubMidtrans()
    );

    const o1 = await env.seedOrder({
      durationMonths: 1,
      id: "ord_1",
      planKey: "LITE",
      status: "PENDING",
      userId: env.ownerId,
    });
    await service.handleWebhook(makeWebhook("ord_1", "txn_1", "settlement"));

    const o2 = await env.seedOrder({
      durationMonths: 1,
      id: "ord_2",
      planKey: "LITE",
      status: "PENDING",
      userId: env.ownerId,
    });
    await service.handleWebhook(makeWebhook("ord_2", "txn_2", "settlement"));

    const plan = await env.repo.findActiveUserPlan(env.ownerId, Date.now());
    expect(plan).not.toBeNull();
    expect(plan?.planKey).toBe("LITE");
    const span = plan!.expiresAt.getTime() - plan!.startedAt.getTime();
    expect(span).toBeCloseTo(2 * MONTH_MS, -3);
    expect(o1).toBeDefined();
    expect(o2).toBeDefined();
  });

  it("replaces with a higher tier immediately", async ({ expect }) => {
    await using env = new PlanTestEnv();
    const service = new PlanService(
      env.repo,
      env.createGuard(),
      createStubMidtrans()
    );

    await env.seedOrder({
      durationMonths: 1,
      id: "ord_lite",
      planKey: "LITE",
      status: "PENDING",
      userId: env.ownerId,
    });
    await service.handleWebhook(makeWebhook("ord_lite", "txn_l", "settlement"));

    const beforeUpgrade = await env.repo.findActiveUserPlan(
      env.ownerId,
      Date.now()
    );
    expect(beforeUpgrade).not.toBeNull();
    const upgradeStart = beforeUpgrade!.startedAt.getTime();

    await env.seedOrder({
      durationMonths: 1,
      id: "ord_prem",
      planKey: "PREMIUM",
      status: "PENDING",
      userId: env.ownerId,
    });
    await service.handleWebhook(makeWebhook("ord_prem", "txn_p", "settlement"));

    const plan = await env.repo.findActiveUserPlan(env.ownerId, Date.now());
    expect(plan?.planKey).toBe("PREMIUM");
    expect(plan?.startedAt.getTime()).toBeGreaterThanOrEqual(upgradeStart);
  });

  it("starts fresh after the previous plan expired", async ({ expect }) => {
    await using env = new PlanTestEnv();
    const service = new PlanService(
      env.repo,
      env.createGuard(),
      createStubMidtrans()
    );

    // Seeded directly as an already-expired paid LITE plan
    const oldStart = Date.now() - 2 * MONTH_MS;
    await env.repo.insertOrder({
      appliedAt: new Date(oldStart),
      createdAt: new Date(oldStart),
      durationMonths: 1,
      expiresAt: null,
      grossAmount: 30_000,
      id: "ord_old",
      planKey: "LITE",
      sku: "lite-1m",
      status: "PAID",
      updatedAt: new Date(oldStart),
      userId: env.ownerId,
    });

    const newStart = Date.now();
    await env.seedOrder({
      durationMonths: 1,
      id: "ord_new",
      planKey: "PREMIUM",
      status: "PENDING",
      userId: env.ownerId,
    });
    await service.handleWebhook(makeWebhook("ord_new", "txn_n", "settlement"));

    const plan = await env.repo.findActiveUserPlan(env.ownerId, Date.now());
    expect(plan?.planKey).toBe("PREMIUM");
    expect(plan?.startedAt.getTime()).toBeGreaterThanOrEqual(newStart);
  });

  it("revokes the plan on reversal when no other paid order exists", async ({
    expect,
  }) => {
    await using env = new PlanTestEnv();
    const service = new PlanService(
      env.repo,
      env.createGuard(),
      createStubMidtrans()
    );

    await env.seedOrder({
      durationMonths: 1,
      id: "ord_1",
      planKey: "LITE",
      status: "PENDING",
      userId: env.ownerId,
    });
    await service.handleWebhook(makeWebhook("ord_1", "txn_1", "settlement"));
    expect(
      await env.repo.findActiveUserPlan(env.ownerId, Date.now())
    ).not.toBeNull();

    await service.handleWebhook(makeWebhook("ord_1", "txn_1", "refund"));
    expect(
      await env.repo.findActiveUserPlan(env.ownerId, Date.now())
    ).toBeNull();
  });

  describe("acceptPayment", () => {
    const createService = (env: PlanTestEnv) => {
      const guard = createMockGuard();
      guard.requireAdmin.mockImplementation((id) => id ?? "admin-1");
      return new PlanService(
        env.repo,
        toPlanGuard(guard),
        createStubMidtrans()
      );
    };

    it("marks a PENDING order PAID, records the admin, derives the plan, and emits order:paid", async ({
      expect,
    }) => {
      await using env = new PlanTestEnv();
      const service = createService(env);

      const order = await env.seedOrder({
        durationMonths: 1,
        id: "ord_accept",
        planKey: "LITE",
        status: "PENDING",
        userId: env.ownerId,
      });
      await env.seedPayment({
        gatewayTransactionId: "txn_accept",
        orderId: order.id,
        userId: env.ownerId,
      });

      let emitted: unknown = null;
      service.events.on("order:paid", (payload) => {
        emitted = payload;
      });

      const updated = await service.acceptPayment(
        { orderId: order.id },
        "admin-1"
      );

      expect(updated.status).toBe("PAID");
      const stored = await env.repo.findOrderById(order.id);
      expect(stored?.status).toBe("PAID");
      expect(stored?.appliedAt).not.toBeNull();

      const payment = await env.repo.findPaymentByOrderId(order.id);
      expect(payment?.status).toBe("SUCCESS");
      expect(JSON.parse(payment?.payload ?? "{}")).toEqual({
        // oxlint-disable-next-line typescript/no-unsafe-assignment -- expect.any returns any which is safe in test assertions
        acceptedAt: expect.any(String),
        acceptedBy: "admin-1",
        type: "admin-accept",
      });

      const plan = await env.repo.findActiveUserPlan(env.ownerId, Date.now());
      expect(plan?.planKey).toBe("LITE");
      expect(emitted).toEqual({
        grossAmount: order.grossAmount,
        transactionId: "txn_accept",
        userId: env.ownerId,
      });
    });

    it("rejects an EXPIRED order and leaves the state unchanged", async ({
      expect,
    }) => {
      await using env = new PlanTestEnv();
      const service = createService(env);

      const order = await env.seedOrder({
        id: "ord_expired",
        status: "EXPIRED",
        userId: env.ownerId,
      });

      const thrown = await captureError(
        service.acceptPayment({ orderId: order.id }, "admin-1")
      );
      expect(thrown).toMatchObject({ code: "ORDER_NOT_ACCEPTABLE" });
      const refreshed = await env.repo.findOrderById(order.id);
      expect(refreshed?.status).toBe("EXPIRED");
      expect(
        await env.repo.findActiveUserPlan(env.ownerId, Date.now())
      ).toBeNull();
    });
  });
});
