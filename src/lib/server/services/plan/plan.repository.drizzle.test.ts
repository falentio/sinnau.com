import { user } from "$lib/server/infras/db/schema/auth-schema";
import { order, payment, userPlan } from "$lib/server/infras/db/schema/plan";
import { eq } from "drizzle-orm";
import { describe, it } from "vitest";

import { PlanTestEnv } from "./plan.testing.ts";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

describe.concurrent("PlanDrizzleRepository", () => {
  describe("order table", () => {
    it("inserts and reads back an order", async ({ expect }) => {
      await using env = new PlanTestEnv();
      const created = await env.repo.insertOrder({
        appliedAt: null,
        createdAt: new Date(),
        durationMonths: 6,
        expiresAt: null,
        grossAmount: 150_000,
        id: "ord_abc123",
        planKey: "LITE",
        sku: "lite-6m",
        status: "PENDING",
        updatedAt: new Date(),
        userId: env.ownerId,
      });
      expect(created.id).toBe("ord_abc123");
      expect(created.grossAmount).toBe(150_000);

      const found = await env.repo.findOrderById("ord_abc123");
      expect(found).not.toBeNull();
      expect(found?.planKey).toBe("LITE");
    });

    it("returns null for a missing order", async ({ expect }) => {
      await using env = new PlanTestEnv();
      expect(await env.repo.findOrderById("missing")).toBeNull();
    });

    it("updates the order status", async ({ expect }) => {
      await using env = new PlanTestEnv();
      await env.seedOrder({ id: "ord_1", status: "PENDING" });
      const updated = await env.repo.updateOrderStatus("ord_1", "PAID");
      expect(updated?.status).toBe("PAID");
      const missing = await env.repo.updateOrderStatus("nope", "PAID");
      expect(missing).toBeNull();
    });

    it("sets the applied timestamp", async ({ expect }) => {
      await using env = new PlanTestEnv();
      await env.seedOrder({ id: "ord_1" });
      const appliedAt = Date.now();
      const updated = await env.repo.setOrderAppliedAt("ord_1", appliedAt);
      expect(updated?.appliedAt?.getTime()).toBe(appliedAt);
    });

    it("returns only PAID orders for a user", async ({ expect }) => {
      await using env = new PlanTestEnv();
      await env.seedOrder({ id: "ord_paid", status: "PAID" });
      await env.seedOrder({ id: "ord_pending", status: "PENDING" });
      const paid = await env.repo.findPaidOrdersForUser(env.ownerId);
      expect(paid).toHaveLength(1);
      expect(paid[0]?.id).toBe("ord_paid");
    });

    it("paginates orders for a user", async ({ expect }) => {
      await using env = new PlanTestEnv();
      for (let i = 0; i < 25; i += 1) {
        await env.seedOrder({
          id: `ord_${i.toString().padStart(2, "0")}`,
          userId: env.ownerId,
        });
      }
      const page1 = await env.repo.findOrdersByUser(env.ownerId, 1);
      expect(page1.data).toHaveLength(20);
      expect(page1.pagination).toMatchObject({
        limit: 20,
        page: 1,
        total: 25,
        totalPages: 2,
      });
      const page2 = await env.repo.findOrdersByUser(env.ownerId, 2);
      expect(page2.data).toHaveLength(5);
    });

    describe("findOrdersByUser with excludeStatuses", () => {
      it("returns all orders when excludeStatuses is omitted", async ({
        expect,
      }) => {
        await using env = new PlanTestEnv();
        await env.seedOrder({ id: "ord_paid", status: "PAID" });
        await env.seedOrder({ id: "ord_pending", status: "PENDING" });
        const result = await env.repo.findOrdersByUser(env.ownerId, 1);
        expect(result.data).toHaveLength(2);
        expect(result.pagination.total).toBe(2);
      });

      it("filters out a single excluded status from both data and count", async ({
        expect,
      }) => {
        await using env = new PlanTestEnv();
        await env.seedOrder({ id: "ord_paid", status: "PAID" });
        await env.seedOrder({ id: "ord_pending", status: "PENDING" });
        const result = await env.repo.findOrdersByUser(env.ownerId, 1, [
          "PENDING",
        ]);
        expect(result.data.map((o) => o.id)).toEqual(["ord_paid"]);
        expect(result.pagination.total).toBe(1);
        expect(result.pagination.totalPages).toBe(1);
      });

      it("filters out multiple excluded statuses", async ({ expect }) => {
        await using env = new PlanTestEnv();
        await env.seedOrder({ id: "ord_paid", status: "PAID" });
        await env.seedOrder({ id: "ord_pending", status: "PENDING" });
        await env.seedOrder({ id: "ord_expired", status: "EXPIRED" });
        await env.seedOrder({ id: "ord_cancelled", status: "CANCELLED" });
        const result = await env.repo.findOrdersByUser(env.ownerId, 1, [
          "PENDING",
          "EXPIRED",
        ]);
        expect(result.data.map((o) => o.id).toSorted()).toEqual([
          "ord_cancelled",
          "ord_paid",
        ]);
        expect(result.pagination.total).toBe(2);
      });

      it("treats an empty excludeStatuses array as no filter", async ({
        expect,
      }) => {
        await using env = new PlanTestEnv();
        await env.seedOrder({ id: "ord_paid", status: "PAID" });
        await env.seedOrder({ id: "ord_pending", status: "PENDING" });
        const result = await env.repo.findOrdersByUser(env.ownerId, 1, []);
        expect(result.data).toHaveLength(2);
        expect(result.pagination.total).toBe(2);
      });

      it("returns empty data and zero total when every row is excluded", async ({
        expect,
      }) => {
        await using env = new PlanTestEnv();
        await env.seedOrder({ id: "ord_pending1", status: "PENDING" });
        await env.seedOrder({ id: "ord_pending2", status: "PENDING" });
        const result = await env.repo.findOrdersByUser(env.ownerId, 1, [
          "PENDING",
        ]);
        expect(result.data).toEqual([]);
        expect(result.pagination).toMatchObject({
          limit: 20,
          page: 1,
          total: 0,
          totalPages: 1,
        });
      });

      it("paginates filtered results correctly", async ({ expect }) => {
        await using env = new PlanTestEnv();
        for (let i = 0; i < 25; i += 1) {
          await env.seedOrder({
            id: `ord_paid_${i.toString().padStart(2, "0")}`,
            status: "PAID",
          });
        }
        for (let i = 0; i < 5; i += 1) {
          await env.seedOrder({
            id: `ord_pending_${i.toString().padStart(2, "0")}`,
            status: "PENDING",
          });
        }
        const page1 = await env.repo.findOrdersByUser(env.ownerId, 1, [
          "PENDING",
        ]);
        expect(page1.data).toHaveLength(20);
        expect(page1.pagination).toMatchObject({
          limit: 20,
          page: 1,
          total: 25,
          totalPages: 2,
        });
        const page2 = await env.repo.findOrdersByUser(env.ownerId, 2, [
          "PENDING",
        ]);
        expect(page2.data).toHaveLength(5);
      });
    });
  });

  describe("payment table", () => {
    it("inserts and finds a payment by order id", async ({ expect }) => {
      await using env = new PlanTestEnv();
      await env.seedOrder({ id: "ord_1" });
      const created = await env.repo.insertPayment({
        amount: 30_000,
        createdAt: new Date(),
        gateway: "midtrans",
        gatewayOrderId: "ord_1",
        gatewayTransactionId: "txn_1",
        id: "pay_1",
        orderId: "ord_1",
        payload: null,
        status: "PENDING",
        updatedAt: new Date(),
        userId: env.ownerId,
      });
      expect(created.id).toBe("pay_1");
      const byOrder = await env.repo.findPaymentByOrderId("ord_1");
      expect(byOrder?.id).toBe("pay_1");
      const byTx = await env.repo.findPaymentByTransactionId(
        "midtrans",
        "txn_1"
      );
      expect(byTx?.id).toBe("pay_1");
    });

    it("updates a payment", async ({ expect }) => {
      await using env = new PlanTestEnv();
      await env.seedOrder({ id: "ord_1", userId: env.ownerId });
      await env.seedPayment({
        gatewayOrderId: "ord_1",
        id: "pay_1",
        orderId: "ord_1",
      });
      const updated = await env.repo.updatePayment("pay_1", {
        gatewayTransactionId: "txn_x",
        status: "SUCCESS",
      });
      expect(updated?.gatewayTransactionId).toBe("txn_x");
      expect(updated?.status).toBe("SUCCESS");
      expect(updated?.id).toBe("pay_1");
    });
  });

  describe("user_plan", () => {
    it("upserts and reads the active plan", async ({ expect }) => {
      await using env = new PlanTestEnv();
      const startedAt = Date.now();
      const expiresAt = startedAt + MONTH_MS;
      await env.repo.upsertUserPlan({
        createdAt: new Date(),
        expiresAt: new Date(expiresAt),
        id: "usp_1",
        planKey: "LITE",
        startedAt: new Date(startedAt),
        updatedAt: new Date(),
        userId: env.ownerId,
      });
      const active = await env.repo.findActiveUserPlan(
        env.ownerId,
        startedAt + 1000
      );
      expect(active?.planKey).toBe("LITE");
    });

    it("does not return an expired plan as active", async ({ expect }) => {
      await using env = new PlanTestEnv();
      const startedAt = Date.now() - 2 * MONTH_MS;
      const expiresAt = Date.now() - MONTH_MS;
      await env.repo.upsertUserPlan({
        createdAt: new Date(),
        expiresAt: new Date(expiresAt),
        id: "usp_1",
        planKey: "LITE",
        startedAt: new Date(startedAt),
        updatedAt: new Date(),
        userId: env.ownerId,
      });
      const active = await env.repo.findActiveUserPlan(env.ownerId, Date.now());
      expect(active).toBeNull();
    });

    it("updates the same row on conflict instead of inserting a second", async ({
      expect,
    }) => {
      await using env = new PlanTestEnv();
      await env.repo.upsertUserPlan({
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + MONTH_MS),
        id: "usp_1",
        planKey: "LITE",
        startedAt: new Date(),
        updatedAt: new Date(),
        userId: env.ownerId,
      });
      await env.repo.upsertUserPlan({
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 12 * MONTH_MS),
        id: "usp_2",
        planKey: "PREMIUM",
        startedAt: new Date(),
        updatedAt: new Date(),
        userId: env.ownerId,
      });
      const rows = env.db.select().from(userPlan).all();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.planKey).toBe("PREMIUM");
    });

    it("deletes the user plan", async ({ expect }) => {
      await using env = new PlanTestEnv();
      await env.seedUserPlan();
      expect(await env.repo.deleteUserPlan(env.ownerId)).toBe(true);
      expect(
        await env.repo.findActiveUserPlan(env.ownerId, Date.now())
      ).toBeNull();
    });
  });

  describe("schema constraints", () => {
    it("cascades order deletion to payments when the user is removed", async ({
      expect,
    }) => {
      await using env = new PlanTestEnv();
      await env.seedOrder({ id: "ord_1", userId: env.ownerId });
      await env.seedPayment({
        gatewayOrderId: "ord_1",
        id: "pay_1",
        orderId: "ord_1",
        userId: env.ownerId,
      });
      env.db.delete(user).where(eq(user.id, env.ownerId)).run();
      expect(env.db.select().from(order).all()).toHaveLength(0);
      expect(env.db.select().from(payment).all()).toHaveLength(0);
    });

    it("rejects a duplicate (gateway, transaction_id) payment", async ({
      expect,
    }) => {
      await using env = new PlanTestEnv();
      await env.seedOrder({ id: "ord_1", userId: env.ownerId });
      const base = {
        amount: 30_000,
        createdAt: new Date(),
        gateway: "midtrans" as const,
        gatewayOrderId: "ord_1",
        gatewayTransactionId: "dup_txn",
        id: "pay_1",
        orderId: "ord_1",
        payload: null,
        status: "PENDING" as const,
        updatedAt: new Date(),
        userId: env.ownerId,
      };
      await env.repo.insertPayment(base);
      await expect(
        env.repo.insertPayment({ ...base, id: "pay_2" })
      ).rejects.toThrow();
    });
  });
});
