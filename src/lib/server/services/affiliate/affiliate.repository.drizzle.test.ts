import {
  affiliateCommission,
  affiliatePayout,
  affiliateProfile,
} from "$lib/server/infras/db/schema/affiliate";
import { user } from "$lib/server/infras/db/schema/auth-schema";
import { eq } from "drizzle-orm";
import { describe, it } from "vitest";

import { AffiliateTestEnv } from "./affiliate.testing";

describe.concurrent("AffiliateDrizzleRepository", () => {
  describe("insertProfile", () => {
    it("persists the row and returns it", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const before = Date.now();

      const profile = await env.repo.insertProfile(
        env.userId,
        "test-slug",
        "Test Name"
      );

      expect(profile).not.toBeNull();
      expect(profile?.userId).toBe(env.userId);
      expect(profile?.slug).toBe("test-slug");
      expect(profile?.nameSnapshot).toBe("Test Name");
      expect(profile?.createdAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(profile?.updatedAt.getTime()).toBeGreaterThanOrEqual(before);

      const rows = env.db
        .select()
        .from(affiliateProfile)
        .where(eq(affiliateProfile.userId, env.userId))
        .all();
      expect(rows).toHaveLength(1);
    });

    it("returns null when userId already has a profile", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      await env.repo.insertProfile(env.userId, "slug-1", "Name");

      const duplicate = await env.repo.insertProfile(
        env.userId,
        "slug-2",
        "Name"
      );

      expect(duplicate).toBeNull();
    });

    it("returns null when slug already exists", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      await env.repo.insertProfile(env.userId, "same-slug", "Name");

      const duplicate = await env.repo.insertProfile(
        env.otherId,
        "same-slug",
        "Name"
      );

      expect(duplicate).toBeNull();
    });
  });

  describe("findProfileByUserId", () => {
    it("returns profile when found", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      await env.repo.insertProfile(env.userId, "test-slug", "Test");

      const profile = await env.repo.findProfileByUserId(env.userId);

      expect(profile).not.toBeNull();
      expect(profile?.userId).toBe(env.userId);
      expect(profile?.slug).toBe("test-slug");
    });

    it("returns null when not found", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const profile = await env.repo.findProfileByUserId("non-existent");
      expect(profile).toBeNull();
    });
  });

  describe("findProfileBySlug", () => {
    it("returns profile when found", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      await env.repo.insertProfile(env.userId, "test-slug", "Test");

      const profile = await env.repo.findProfileBySlug("test-slug");

      expect(profile).not.toBeNull();
      expect(profile?.userId).toBe(env.userId);
    });

    it("returns null when not found", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const profile = await env.repo.findProfileBySlug("non-existent");
      expect(profile).toBeNull();
    });
  });

  describe("insertConversion", () => {
    it("persists the conversion and returns it", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedPurchaser();
      await env.repo.insertProfile(referrer, "ref-slug", "Referrer");
      const before = Date.now();

      const conversion = await env.repo.insertConversion({
        affiliateUserId: referrer,
        purchaserUserId: purchaser,
        purchaseAmount: 100000,
        commissionAmount: 30000,
        transactionId: "txn-123",
      });

      expect(conversion).not.toBeNull();
      expect(conversion?.affiliateUserId).toBe(referrer);
      expect(conversion?.purchaserUserId).toBe(purchaser);
      expect(conversion?.purchaseAmount).toBe(100000);
      expect(conversion?.commissionAmount).toBe(30000);
      expect(conversion?.transactionId).toBe("txn-123");
      expect(conversion?.status).toBe("PENDING");
      expect(conversion?.createdAt.getTime()).toBeGreaterThanOrEqual(before);

      const rows = env.db
        .select()
        .from(affiliateCommission)
        .where(eq(affiliateCommission.transactionId, "txn-123"))
        .all();
      expect(rows).toHaveLength(1);
    });

    it("returns null on duplicate transactionId", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedPurchaser();
      await env.repo.insertProfile(referrer, "ref-slug", "Referrer");
      await env.repo.insertConversion({
        affiliateUserId: referrer,
        purchaserUserId: purchaser,
        purchaseAmount: 100000,
        commissionAmount: 30000,
        transactionId: "txn-123",
      });

      const duplicate = await env.repo.insertConversion({
        affiliateUserId: referrer,
        purchaserUserId: purchaser,
        purchaseAmount: 200000,
        commissionAmount: 50000,
        transactionId: "txn-123",
      });

      expect(duplicate).toBeNull();
    });
  });

  describe("findConversionByTransactionId", () => {
    it("returns conversion when found", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedPurchaser();
      await env.repo.insertProfile(referrer, "ref-slug", "Referrer");
      await env.repo.insertConversion({
        affiliateUserId: referrer,
        purchaserUserId: purchaser,
        purchaseAmount: 100000,
        commissionAmount: 30000,
        transactionId: "txn-find",
      });

      const found = await env.repo.findConversionByTransactionId("txn-find");

      expect(found).not.toBeNull();
      expect(found?.transactionId).toBe("txn-find");
    });

    it("returns null when not found", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const found = await env.repo.findConversionByTransactionId("missing");
      expect(found).toBeNull();
    });
  });

  describe("getDashboardSummary", () => {
    it("returns summary with pending and paid breakdown", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser1 = env.seedPurchaser();
      const purchaser2 = env.seedUser({ name: "Purchaser 2" });
      const admin = env.seedUser({ name: "Admin" });
      await env.repo.insertProfile(referrer, "ref-slug", "Referrer");

      // Insert 3 commissions
      await env.repo.insertConversion({
        affiliateUserId: referrer,
        purchaserUserId: purchaser1,
        purchaseAmount: 100000,
        commissionAmount: 30000,
        transactionId: "txn-1",
      });
      await env.repo.insertConversion({
        affiliateUserId: referrer,
        purchaserUserId: purchaser2,
        purchaseAmount: 200000,
        commissionAmount: 50000,
        transactionId: "txn-2",
      });
      await env.repo.insertConversion({
        affiliateUserId: referrer,
        purchaserUserId: purchaser1,
        purchaseAmount: 150000,
        commissionAmount: 45000,
        transactionId: "txn-3",
      });

      // Pay out full balance via insertPayout + markCommissionsAsPaid
      const payout = await env.repo.insertPayout({
        affiliateUserId: referrer,
        amount: 125000,
        method: "bank_transfer",
        reference: null,
        note: null,
        processedByAdminId: admin,
      });
      expect(payout).not.toBeNull();

      await env.repo.markCommissionsAsPaid(referrer, payout!.id);

      const summary = await env.repo.getDashboardSummary(referrer);

      expect(summary.profile).not.toBeNull();
      expect(summary.profile?.slug).toBe("ref-slug");
      expect(summary.totalEarned).toBe(125000);
      expect(summary.totalPaid).toBe(125000);
      expect(summary.pendingBalance).toBe(0);
      expect(summary.conversionCount).toBe(3);
    });

    it("returns zero values when no commissions exist", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      await env.repo.insertProfile(referrer, "ref-slug", "Referrer");

      const summary = await env.repo.getDashboardSummary(referrer);

      expect(summary.totalEarned).toBe(0);
      expect(summary.totalPaid).toBe(0);
      expect(summary.pendingBalance).toBe(0);
      expect(summary.conversionCount).toBe(0);
    });

    it("returns null profile when user has no profile", async ({ expect }) => {
      await using env = new AffiliateTestEnv();

      const summary = await env.repo.getDashboardSummary(env.userId);

      expect(summary.profile).toBeNull();
      expect(summary.totalEarned).toBe(0);
      expect(summary.conversionCount).toBe(0);
    });
  });

  describe("listPendingPayouts", () => {
    it("returns affiliates with pending balance", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const referrer1 = env.seedReferrer();
      const referrer2 = env.seedUser({ name: "Referrer 2" });
      const purchaser = env.seedPurchaser();

      await env.repo.insertProfile(referrer1, "slug-1", "R1");
      await env.repo.insertProfile(referrer2, "slug-2", "R2");

      await env.repo.insertConversion({
        affiliateUserId: referrer1,
        purchaserUserId: purchaser,
        purchaseAmount: 100000,
        commissionAmount: 30000,
        transactionId: "txn-list-1",
      });

      // referrer2 has profile but no commissions
      // referrer2 should NOT appear in pending payouts

      const result = await env.repo.listPendingPayouts(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.affiliateUserId).toBe(referrer1);
      expect(result.data[0]?.slug).toBe("slug-1");
      expect(result.data[0]?.pendingBalance).toBe(30000);
      expect(result.data[0]?.conversionCount).toBe(1);
      expect(result.pagination.total).toBe(1);
    });

    it("excludes affiliates with zero pending balance", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedPurchaser();
      const admin = env.seedUser({ name: "Admin" });
      await env.repo.insertProfile(referrer, "slug", "R");

      await env.repo.insertConversion({
        affiliateUserId: referrer,
        purchaserUserId: purchaser,
        purchaseAmount: 100000,
        commissionAmount: 30000,
        transactionId: "txn-zero-1",
      });

      const payout = await env.repo.insertPayout({
        affiliateUserId: referrer,
        amount: 30000,
        method: null,
        reference: null,
        note: null,
        processedByAdminId: admin,
      });
      await env.repo.markCommissionsAsPaid(referrer, payout!.id);

      const result = await env.repo.listPendingPayouts(1, 10);

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it("paginates results", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const purchaser = env.seedPurchaser();

      for (let i = 0; i < 3; i += 1) {
        const ref = env.seedUser({ name: `Ref ${i}` });
        await env.repo.insertProfile(ref, `slug-${i}`, `R${i}`);
        await env.repo.insertConversion({
          affiliateUserId: ref,
          purchaserUserId: purchaser,
          purchaseAmount: 100000,
          commissionAmount: 30000,
          transactionId: `txn-page-${i}`,
        });
      }

      const page1 = await env.repo.listPendingPayouts(1, 2);
      expect(page1.data).toHaveLength(2);
      expect(page1.pagination.page).toBe(1);
      expect(page1.pagination.totalPages).toBe(2);

      const page2 = await env.repo.listPendingPayouts(2, 2);
      expect(page2.data).toHaveLength(1);
      expect(page2.pagination.page).toBe(2);
    });
  });

  describe("insertPayout", () => {
    it("persists the payout and returns it", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const admin = env.seedUser({ name: "Admin" });
      const before = Date.now();

      const payout = await env.repo.insertPayout({
        affiliateUserId: referrer,
        amount: 100000,
        method: "bank_transfer",
        reference: "REF-001",
        note: "Monthly payout",
        processedByAdminId: admin,
      });

      expect(payout).not.toBeNull();
      expect(payout?.affiliateUserId).toBe(referrer);
      expect(payout?.amount).toBe(100000);
      expect(payout?.method).toBe("bank_transfer");
      expect(payout?.reference).toBe("REF-001");
      expect(payout?.note).toBe("Monthly payout");
      expect(payout?.processedByAdminId).toBe(admin);
      expect(payout?.createdAt.getTime()).toBeGreaterThanOrEqual(before);

      const rows = env.db
        .select()
        .from(affiliatePayout)
        .where(eq(affiliatePayout.affiliateUserId, referrer))
        .all();
      expect(rows).toHaveLength(1);
    });
  });

  describe("markCommissionsAsPaid", () => {
    it("marks all pending commissions for a user as PAID", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedPurchaser();
      const admin = env.seedUser({ name: "Admin" });
      await env.repo.insertProfile(referrer, "slug", "R");

      await env.repo.insertConversion({
        affiliateUserId: referrer,
        purchaserUserId: purchaser,
        purchaseAmount: 100000,
        commissionAmount: 30000,
        transactionId: "txn-pay-1",
      });
      await env.repo.insertConversion({
        affiliateUserId: referrer,
        purchaserUserId: purchaser,
        purchaseAmount: 200000,
        commissionAmount: 50000,
        transactionId: "txn-pay-2",
      });

      const payout = await env.repo.insertPayout({
        affiliateUserId: referrer,
        amount: 80000,
        method: null,
        reference: null,
        note: null,
        processedByAdminId: admin,
      });

      const updatedCount = await env.repo.markCommissionsAsPaid(
        referrer,
        payout!.id
      );

      expect(updatedCount).toBe(2);

      const commissions = env.db
        .select()
        .from(affiliateCommission)
        .where(eq(affiliateCommission.affiliateUserId, referrer))
        .all();

      expect(commissions).toHaveLength(2);
      for (const c of commissions) {
        expect(c.status).toBe("PAID");
        expect(c.payoutId).toBe(payout!.id);
      }
    });
  });
});
