import {
  affiliateApplication,
  affiliateCommission,
  affiliatePayout,
  affiliateProfile,
} from "$lib/server/infras/db/schema/affiliate";
import { user } from "$lib/server/infras/db/schema/auth-schema";
import { eq } from "drizzle-orm";
import { describe, it } from "vitest";

import { AffiliateTestEnv } from "./affiliate.testing";

/* oxlint-disable typescript/no-unsafe-assignment, typescript/no-unsafe-member-access -- Drizzle user table propagates any */
describe.concurrent("AffiliateDrizzleRepository", () => {
  describe.concurrent("insertProfile", () => {
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

  describe.concurrent("findProfileByUserId", () => {
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

  describe.concurrent("findProfileBySlug", () => {
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

  describe.concurrent("insertConversion", () => {
    it("persists the conversion and returns it", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedPurchaser();
      await env.repo.insertProfile(referrer, "ref-slug", "Referrer");
      const before = Date.now();

      const conversion = await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 30_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser,
        transactionId: "txn-123",
      });

      expect(conversion).not.toBeNull();
      expect(conversion?.affiliateUserId).toBe(referrer);
      expect(conversion?.purchaserUserId).toBe(purchaser);
      expect(conversion?.purchaseAmount).toBe(100_000);
      expect(conversion?.commissionAmount).toBe(30_000);
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
        commissionAmount: 30_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser,
        transactionId: "txn-123",
      });

      const duplicate = await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 50_000,
        purchaseAmount: 200_000,
        purchaserUserId: purchaser,
        transactionId: "txn-123",
      });

      expect(duplicate).toBeNull();
    });
  });

  describe.concurrent("findConversionByTransactionId", () => {
    it("returns conversion when found", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedPurchaser();
      await env.repo.insertProfile(referrer, "ref-slug", "Referrer");
      await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 30_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser,
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

  describe.concurrent("getDashboardSummary", () => {
    it("returns summary with pending and paid breakdown", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser1 = env.seedPurchaser();
      const purchaser2 = env.seedUser({ name: "Purchaser 2" });
      const admin = env.seedUser({ name: "Admin" });
      await env.repo.insertProfile(referrer, "ref-slug", "Referrer");

      await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 30_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser1,
        transactionId: "txn-1",
      });
      await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 50_000,
        purchaseAmount: 200_000,
        purchaserUserId: purchaser2,
        transactionId: "txn-2",
      });
      await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 45_000,
        purchaseAmount: 150_000,
        purchaserUserId: purchaser1,
        transactionId: "txn-3",
      });

      const payout = await env.repo.createPayoutForAffiliate({
        affiliateUserId: referrer,
        method: "bank_transfer",
        note: null,
        processedByAdminId: admin,
        reference: null,
      });
      expect(payout).not.toBeNull();

      const summary = await env.repo.getDashboardSummary(referrer);

      expect(summary.profile).not.toBeNull();
      expect(summary.profile?.slug).toBe("ref-slug");
      expect(summary.totalEarned).toBe(125_000);
      expect(summary.totalPaid).toBe(125_000);
      expect(summary.conversionCount).toBe(3);
    });

    it("returns zero values when no commissions exist", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      await env.repo.insertProfile(referrer, "ref-slug", "Referrer");

      const summary = await env.repo.getDashboardSummary(referrer);

      expect(summary.totalEarned).toBe(0);
      expect(summary.totalPaid).toBe(0);
      expect(summary.conversionCount).toBe(0);
    });

    it("returns null profile when user has no profile", async ({ expect }) => {
      await using env = new AffiliateTestEnv();

      const summary = await env.repo.getDashboardSummary(env.userId);

      expect(summary.profile).toBeNull();
      expect(summary.totalEarned).toBe(0);
      expect(summary.conversionCount).toBe(0);
    });

    it("excludes VOID commissions from totals", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedPurchaser();
      await env.repo.insertProfile(referrer, "ref-slug", "Referrer");

      await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 30_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser,
        transactionId: "txn-valid",
      });
      const voided = await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 50_000,
        purchaseAmount: 200_000,
        purchaserUserId: purchaser,
        transactionId: "txn-voided",
      });
      env.db
        .update(affiliateCommission)
        .set({ status: "VOID" })
        .where(eq(affiliateCommission.id, voided?.id ?? ""))
        .run();

      const summary = await env.repo.getDashboardSummary(referrer);

      expect(summary.totalEarned).toBe(30_000);
      expect(summary.conversionCount).toBe(1);
    });
  });

  describe.concurrent("listPendingPayouts", () => {
    it("returns affiliates with pending balance", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const referrer1 = env.seedReferrer();
      const referrer2 = env.seedUser({ name: "Referrer 2" });
      const purchaser = env.seedPurchaser();

      await env.repo.insertProfile(referrer1, "slug-1", "R1");
      await env.repo.insertProfile(referrer2, "slug-2", "R2");

      await env.repo.insertConversion({
        affiliateUserId: referrer1,
        commissionAmount: 30_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser,
        transactionId: "txn-list-1",
      });

      const result = await env.repo.listPendingPayouts(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.affiliateUserId).toBe(referrer1);
      expect(result.data[0]?.slug).toBe("slug-1");
      expect(result.data[0]?.pendingBalance).toBe(30_000);
      expect(result.data[0]?.conversionCount).toBe(1);
      expect(result.pagination.total).toBe(1);
    });

    it("falls back to 'unknown' slug when profile is missing", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedPurchaser();

      await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 30_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser,
        transactionId: "txn-no-profile",
      });

      const result = await env.repo.listPendingPayouts(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.slug).toBe("unknown");
    });

    it("excludes affiliates with zero pending balance", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedPurchaser();
      const admin = env.seedUser({ name: "Admin" });
      await env.repo.insertProfile(referrer, "slug", "R");

      await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 30_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser,
        transactionId: "txn-zero-1",
      });

      const payout = await env.repo.createPayoutForAffiliate({
        affiliateUserId: referrer,
        method: null,
        note: null,
        processedByAdminId: admin,
        reference: null,
      });
      expect(payout).not.toBeNull();

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
          commissionAmount: 30_000,
          purchaseAmount: 100_000,
          purchaserUserId: purchaser,
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

  describe.concurrent("createPayoutForAffiliate", () => {
    it("creates a payout for the full pending balance and marks those commissions PAID", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedPurchaser();
      const admin = env.seedUser({ name: "Admin" });
      await env.repo.insertProfile(referrer, "slug", "R");
      await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 30_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser,
        transactionId: "txn-cp-1",
      });
      await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 50_000,
        purchaseAmount: 200_000,
        purchaserUserId: purchaser,
        transactionId: "txn-cp-2",
      });
      const before = Date.now();

      const payout = await env.repo.createPayoutForAffiliate({
        affiliateUserId: referrer,
        method: "bank_transfer",
        note: "Monthly",
        processedByAdminId: admin,
        reference: "REF-1",
      });

      expect(payout).not.toBeNull();
      expect(payout?.affiliateUserId).toBe(referrer);
      expect(payout?.amount).toBe(80_000);
      expect(payout?.method).toBe("bank_transfer");
      expect(payout?.reference).toBe("REF-1");
      expect(payout?.note).toBe("Monthly");
      expect(payout?.processedByAdminId).toBe(admin);
      expect(payout?.createdAt.getTime()).toBeGreaterThanOrEqual(before);

      const commissions = env.db
        .select()
        .from(affiliateCommission)
        .where(eq(affiliateCommission.affiliateUserId, referrer))
        .all();
      expect(commissions).toHaveLength(2);
      for (const c of commissions) {
        expect(c.status).toBe("PAID");
        expect(c.payoutId).toBe(payout?.id);
      }
    });

    it("returns null when the affiliate has no pending commissions", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const admin = env.seedUser({ name: "Admin" });
      await env.repo.insertProfile(referrer, "slug", "R");

      const payout = await env.repo.createPayoutForAffiliate({
        affiliateUserId: referrer,
        method: null,
        note: null,
        processedByAdminId: admin,
        reference: null,
      });

      expect(payout).toBeNull();

      const payouts = env.db
        .select()
        .from(affiliatePayout)
        .where(eq(affiliatePayout.affiliateUserId, referrer))
        .all();
      expect(payouts).toHaveLength(0);
    });

    it("pays only pending commissions, leaving already-PAID ones untouched", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedPurchaser();
      const admin = env.seedUser({ name: "Admin" });
      await env.repo.insertProfile(referrer, "slug", "R");
      await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 30_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser,
        transactionId: "txn-already",
      });
      // First payout marks txn-already as PAID.
      await env.repo.createPayoutForAffiliate({
        affiliateUserId: referrer,
        method: null,
        note: null,
        processedByAdminId: admin,
        reference: null,
      });
      // A new pending commission arrives.
      await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 20_000,
        purchaseAmount: 80_000,
        purchaserUserId: purchaser,
        transactionId: "txn-new",
      });

      const payout2 = await env.repo.createPayoutForAffiliate({
        affiliateUserId: referrer,
        method: null,
        note: null,
        processedByAdminId: admin,
        reference: null,
      });

      expect(payout2?.amount).toBe(20_000);

      const [already] = env.db
        .select()
        .from(affiliateCommission)
        .where(eq(affiliateCommission.transactionId, "txn-already"))
        .all();
      expect(already?.status).toBe("PAID");
      expect(already?.payoutId).not.toBe(payout2?.id);

      const [fresh] = env.db
        .select()
        .from(affiliateCommission)
        .where(eq(affiliateCommission.transactionId, "txn-new"))
        .all();
      expect(fresh?.status).toBe("PAID");
      expect(fresh?.payoutId).toBe(payout2?.id);
    });
  });

  describe.concurrent("findMissingCommissions", () => {
    it("flags a PAID order whose referred purchaser has no commission", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedUser({ affiliatedBy: referrer, name: "Buyer" });
      const orderId = env.seedOrder({
        grossAmount: 100_000,
        status: "PAID",
        userId: purchaser,
      });
      env.seedPayment({
        gatewayTransactionId: "txn-miss-1",
        orderId,
        userId: purchaser,
      });

      const missing = await env.repo.findMissingCommissions();

      expect(missing).toEqual([
        {
          affiliateUserId: referrer,
          purchaseAmount: 100_000,
          purchaserUserId: purchaser,
          transactionId: "txn-miss-1",
        },
      ]);
    });

    it("excludes orders that already have a matching commission", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedUser({ affiliatedBy: referrer, name: "Buyer" });
      await env.repo.insertProfile(referrer, "slug", "R");
      const orderId = env.seedOrder({
        grossAmount: 100_000,
        status: "PAID",
        userId: purchaser,
      });
      env.seedPayment({
        gatewayTransactionId: "txn-has",
        orderId,
        userId: purchaser,
      });
      await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 35_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser,
        transactionId: "txn-has",
      });

      const missing = await env.repo.findMissingCommissions();

      expect(missing).toEqual([]);
    });

    it("excludes purchasers with no referrer", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const purchaser = env.seedUser({ name: "NoRef" });
      const orderId = env.seedOrder({
        grossAmount: 100_000,
        status: "PAID",
        userId: purchaser,
      });
      env.seedPayment({
        gatewayTransactionId: "txn-noref",
        orderId,
        userId: purchaser,
      });

      const missing = await env.repo.findMissingCommissions();

      expect(missing).toEqual([]);
    });

    it("excludes self-referrals", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const purchaser = env.seedUser({ name: "Self" });
      env.db
        .update(user)
        .set({ affiliatedBy: purchaser })
        .where(eq(user.id, purchaser))
        .run();
      const orderId = env.seedOrder({
        grossAmount: 100_000,
        status: "PAID",
        userId: purchaser,
      });
      env.seedPayment({
        gatewayTransactionId: "txn-self",
        orderId,
        userId: purchaser,
      });

      const missing = await env.repo.findMissingCommissions();

      expect(missing).toEqual([]);
    });

    it("excludes orders that are not PAID", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedUser({ affiliatedBy: referrer, name: "Buyer" });
      const orderId = env.seedOrder({
        grossAmount: 100_000,
        status: "CANCELLED",
        userId: purchaser,
      });
      env.seedPayment({
        gatewayTransactionId: "txn-cancel",
        orderId,
        userId: purchaser,
      });

      const missing = await env.repo.findMissingCommissions();

      expect(missing).toEqual([]);
    });

    it("excludes payments with null gatewayTransactionId", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedUser({ affiliatedBy: referrer, name: "Buyer" });
      const orderId = env.seedOrder({
        grossAmount: 100_000,
        status: "PAID",
        userId: purchaser,
      });
      env.seedPayment({
        gatewayTransactionId: null,
        orderId,
        userId: purchaser,
      });

      const missing = await env.repo.findMissingCommissions();

      expect(missing).toEqual([]);
    });

    it("scopes to a single affiliate when provided", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const referrerA = env.seedReferrer();
      const referrerB = env.seedUser({ name: "Referrer B" });
      const buyerA = env.seedUser({ affiliatedBy: referrerA, name: "Buyer A" });
      const buyerB = env.seedUser({ affiliatedBy: referrerB, name: "Buyer B" });
      const orderA = env.seedOrder({
        grossAmount: 100_000,
        status: "PAID",
        userId: buyerA,
      });
      env.seedPayment({
        gatewayTransactionId: "txn-a",
        orderId: orderA,
        userId: buyerA,
      });
      const orderB = env.seedOrder({
        grossAmount: 200_000,
        status: "PAID",
        userId: buyerB,
      });
      env.seedPayment({
        gatewayTransactionId: "txn-b",
        orderId: orderB,
        userId: buyerB,
      });

      const missing = await env.repo.findMissingCommissions(referrerA);

      expect(missing).toHaveLength(1);
      expect(missing[0]?.affiliateUserId).toBe(referrerA);
      expect(missing[0]?.transactionId).toBe("txn-a");
    });
  });

  describe.concurrent("findInvalidCommissions", () => {
    it("flags a PENDING commission whose order is no longer PAID", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedUser({ affiliatedBy: referrer, name: "Buyer" });
      await env.repo.insertProfile(referrer, "slug", "R");
      const orderId = env.seedOrder({
        grossAmount: 100_000,
        status: "CANCELLED",
        userId: purchaser,
      });
      env.seedPayment({
        gatewayTransactionId: "txn-inv-1",
        orderId,
        userId: purchaser,
      });
      const commission = await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 35_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser,
        transactionId: "txn-inv-1",
      });

      const invalid = await env.repo.findInvalidCommissions();

      expect(invalid).toEqual([
        {
          affiliateUserId: referrer,
          commissionAmount: 35_000,
          commissionId: commission?.id,
          orderStatus: "CANCELLED",
          purchaserUserId: purchaser,
          transactionId: "txn-inv-1",
        },
      ]);
    });

    it("excludes commissions whose order is still PAID", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedUser({ affiliatedBy: referrer, name: "Buyer" });
      await env.repo.insertProfile(referrer, "slug", "R");
      const orderId = env.seedOrder({
        grossAmount: 100_000,
        status: "PAID",
        userId: purchaser,
      });
      env.seedPayment({
        gatewayTransactionId: "txn-paid",
        orderId,
        userId: purchaser,
      });
      await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 35_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser,
        transactionId: "txn-paid",
      });

      const invalid = await env.repo.findInvalidCommissions();

      expect(invalid).toEqual([]);
    });

    it("excludes commissions with no matching order (admin-recorded)", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedPurchaser();
      await env.repo.insertProfile(referrer, "slug", "R");
      await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 35_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser,
        transactionId: "txn-orphan-admin",
      });

      const invalid = await env.repo.findInvalidCommissions();

      expect(invalid).toEqual([]);
    });

    it("excludes commissions that are already VOID", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedUser({ affiliatedBy: referrer, name: "Buyer" });
      await env.repo.insertProfile(referrer, "slug", "R");
      const orderId = env.seedOrder({
        grossAmount: 100_000,
        status: "CANCELLED",
        userId: purchaser,
      });
      env.seedPayment({
        gatewayTransactionId: "txn-void",
        orderId,
        userId: purchaser,
      });
      const commission = await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 35_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser,
        transactionId: "txn-void",
      });
      env.db
        .update(affiliateCommission)
        .set({ status: "VOID" })
        .where(eq(affiliateCommission.id, commission?.id ?? ""))
        .run();

      const invalid = await env.repo.findInvalidCommissions();

      expect(invalid).toEqual([]);
    });

    it("scopes to a single affiliate when provided", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const referrerA = env.seedReferrer();
      const referrerB = env.seedUser({ name: "Referrer B" });
      const buyerA = env.seedUser({ affiliatedBy: referrerA, name: "Buyer A" });
      const buyerB = env.seedUser({ affiliatedBy: referrerB, name: "Buyer B" });
      await env.repo.insertProfile(referrerA, "slug-a", "A");
      await env.repo.insertProfile(referrerB, "slug-b", "B");
      const orderA = env.seedOrder({
        grossAmount: 100_000,
        status: "CANCELLED",
        userId: buyerA,
      });
      env.seedPayment({
        gatewayTransactionId: "txn-inva",
        orderId: orderA,
        userId: buyerA,
      });
      await env.repo.insertConversion({
        affiliateUserId: referrerA,
        commissionAmount: 35_000,
        purchaseAmount: 100_000,
        purchaserUserId: buyerA,
        transactionId: "txn-inva",
      });
      const orderB = env.seedOrder({
        grossAmount: 200_000,
        status: "CANCELLED",
        userId: buyerB,
      });
      env.seedPayment({
        gatewayTransactionId: "txn-invb",
        orderId: orderB,
        userId: buyerB,
      });
      await env.repo.insertConversion({
        affiliateUserId: referrerB,
        commissionAmount: 70_000,
        purchaseAmount: 200_000,
        purchaserUserId: buyerB,
        transactionId: "txn-invb",
      });

      const invalid = await env.repo.findInvalidCommissions(referrerA);

      expect(invalid).toHaveLength(1);
      expect(invalid[0]?.affiliateUserId).toBe(referrerA);
      expect(invalid[0]?.transactionId).toBe("txn-inva");
    });
  });

  describe.concurrent("backfillCommissions", () => {
    it("creates the provided commissions and reports the created count", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedPurchaser();
      await env.repo.insertProfile(referrer, "slug", "R");

      const result = await env.repo.backfillCommissions(
        [
          {
            affiliateUserId: referrer,
            commissionAmount: 35_000,
            purchaseAmount: 100_000,
            purchaserUserId: purchaser,
            transactionId: "txn-bf-1",
          },
          {
            affiliateUserId: referrer,
            commissionAmount: 70_000,
            purchaseAmount: 200_000,
            purchaserUserId: purchaser,
            transactionId: "txn-bf-2",
          },
        ],
        []
      );

      expect(result).toEqual({ created: 2, voided: 0 });

      const commissions = env.db
        .select()
        .from(affiliateCommission)
        .where(eq(affiliateCommission.affiliateUserId, referrer))
        .all();
      expect(commissions).toHaveLength(2);
      for (const c of commissions) {
        expect(c.status).toBe("PENDING");
      }
    });

    it("voids the provided PENDING commissions and reports the voided count", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedPurchaser();
      await env.repo.insertProfile(referrer, "slug", "R");
      const c1 = await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 35_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser,
        transactionId: "txn-void-1",
      });
      const c2 = await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 70_000,
        purchaseAmount: 200_000,
        purchaserUserId: purchaser,
        transactionId: "txn-void-2",
      });

      const result = await env.repo.backfillCommissions(
        [],
        [c1?.id ?? "", c2?.id ?? ""]
      );

      expect(result).toEqual({ created: 0, voided: 2 });

      const commissions = env.db
        .select()
        .from(affiliateCommission)
        .where(eq(affiliateCommission.affiliateUserId, referrer))
        .all();
      for (const c of commissions) {
        expect(c.status).toBe("VOID");
      }
    });

    it("is idempotent: skips commissions whose transactionId already exists", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedPurchaser();
      await env.repo.insertProfile(referrer, "slug", "R");
      await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 35_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser,
        transactionId: "txn-dup",
      });

      const result = await env.repo.backfillCommissions(
        [
          {
            affiliateUserId: referrer,
            commissionAmount: 35_000,
            purchaseAmount: 100_000,
            purchaserUserId: purchaser,
            transactionId: "txn-dup",
          },
        ],
        []
      );

      expect(result).toEqual({ created: 0, voided: 0 });

      const commissions = env.db
        .select()
        .from(affiliateCommission)
        .where(eq(affiliateCommission.transactionId, "txn-dup"))
        .all();
      expect(commissions).toHaveLength(1);
    });

    it("only voids PENDING commissions, leaving PAID ones untouched", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedPurchaser();
      await env.repo.insertProfile(referrer, "slug", "R");
      const pending = await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 35_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser,
        transactionId: "txn-still-pending",
      });
      const paid = await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 70_000,
        purchaseAmount: 200_000,
        purchaserUserId: purchaser,
        transactionId: "txn-already-paid",
      });
      env.db
        .update(affiliateCommission)
        .set({ status: "PAID" })
        .where(eq(affiliateCommission.id, paid?.id ?? ""))
        .run();

      const result = await env.repo.backfillCommissions(
        [],
        [pending?.id ?? "", paid?.id ?? ""]
      );

      expect(result).toEqual({ created: 0, voided: 1 });

      const [voided] = env.db
        .select()
        .from(affiliateCommission)
        .where(eq(affiliateCommission.id, pending?.id ?? ""))
        .all();
      expect(voided?.status).toBe("VOID");
      const [untouched] = env.db
        .select()
        .from(affiliateCommission)
        .where(eq(affiliateCommission.id, paid?.id ?? ""))
        .all();
      expect(untouched?.status).toBe("PAID");
    });

    it("returns zeros for empty inputs", async ({ expect }) => {
      await using env = new AffiliateTestEnv();

      const result = await env.repo.backfillCommissions([], []);

      expect(result).toEqual({ created: 0, voided: 0 });
    });
  });

  describe.concurrent("findAffiliatedByUserId", () => {
    it("returns affiliatedBy when set", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedUser({ name: "Purchaser" });

      env.db
        .update(user)
        .set({ affiliatedBy: referrer })
        .where(eq(user.id, purchaser))
        .run();

      const result = await env.repo.findAffiliatedByUserId(purchaser);

      expect(result).toBe(referrer);
    });

    it("returns null when user has no affiliate", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const purchaser = env.seedUser({ name: "Purchaser" });

      const result = await env.repo.findAffiliatedByUserId(purchaser);

      expect(result).toBeNull();
    });

    it("returns null when user does not exist", async ({ expect }) => {
      await using env = new AffiliateTestEnv();

      const result = await env.repo.findAffiliatedByUserId("non-existent");

      expect(result).toBeNull();
    });
  });

  describe.concurrent("findUserById", () => {
    it("returns user when found", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const userId = env.seedUser({ name: "Alice" });

      const result = await env.repo.findUserById(userId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(userId);
      expect(result?.name).toBe("Alice");
    });

    it("returns null when user does not exist", async ({ expect }) => {
      await using env = new AffiliateTestEnv();

      const result = await env.repo.findUserById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe.concurrent("updateUserAffiliatedBy", () => {
    it("sets affiliatedBy and returns the updated user", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedUser({ name: "Purchaser" });

      const result = await env.repo.updateUserAffiliatedBy(purchaser, referrer);

      expect(result).toEqual({ affiliatedBy: referrer, id: purchaser });
      expect(await env.repo.findAffiliatedByUserId(purchaser)).toBe(referrer);
    });

    it("clears affiliatedBy when referrerUserId is null", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedUser({ name: "Purchaser" });
      env.db
        .update(user)
        .set({ affiliatedBy: referrer })
        .where(eq(user.id, purchaser))
        .run();

      const result = await env.repo.updateUserAffiliatedBy(purchaser, null);

      expect(result).toEqual({ affiliatedBy: null, id: purchaser });
      expect(await env.repo.findAffiliatedByUserId(purchaser)).toBeNull();
    });

    it("returns null when user does not exist", async ({ expect }) => {
      await using env = new AffiliateTestEnv();

      const result = await env.repo.updateUserAffiliatedBy(
        "non-existent",
        "referrer"
      );

      expect(result).toBeNull();
    });
  });

  describe.concurrent("updateProfileBalance", () => {
    it("updates points and increments version when version matches", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const profile = await env.repo.insertProfile(
        env.userId,
        "test-slug",
        "Test"
      );
      expect(profile).not.toBeNull();
      // oxlint-disable-next-line typescript/no-non-null-assertion -- safe: non-null checked above
      const p = profile!;

      const updated = await env.repo.updateProfileBalance(p.id, 150, p.version);

      expect(updated).not.toBeNull();
      expect(updated?.points).toBe(150);
      expect(updated?.version).toBe(p.version + 1);
    });

    it("returns null when expectedVersion does not match", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const profile = await env.repo.insertProfile(
        env.userId,
        "test-slug",
        "Test"
      );
      expect(profile).not.toBeNull();
      // oxlint-disable-next-line typescript/no-non-null-assertion -- safe: non-null checked above
      const p = profile!;

      const result = await env.repo.updateProfileBalance(
        p.id,
        150,
        p.version + 99
      );

      expect(result).toBeNull();

      const unchanged = await env.repo.findProfileByUserId(env.userId);
      expect(unchanged?.points).toBe(0);
      expect(unchanged?.version).toBe(p.version);
    });

    it("returns null when profile does not exist", async ({ expect }) => {
      await using env = new AffiliateTestEnv();

      const result = await env.repo.updateProfileBalance(
        "aff_nonexistent",
        100,
        1
      );

      expect(result).toBeNull();
    });
  });
});

describe.concurrent("AffiliateDrizzleRepository (schema constraints)", () => {
  describe.concurrent("foreign keys", () => {
    it("rejects inserting an application for a non-existent user", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();

      const insertOrphan = async () =>
        env.db
          .insert(affiliateApplication)
          .values({
            advantage: "I want to be an affiliate",
            id: "afa_orphan_user",
            instagramHandle: null,
            reviewedAt: null,
            reviewedByAdminId: null,
            status: "PENDING",
            tiktokHandle: null,
            userId: "does-not-exist",
            youtubeHandle: null,
          })
          .run();

      await expect(insertOrphan()).rejects.toThrow();
    });

    it("rejects inserting a payout for a non-existent user", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const admin = env.seedUser({ name: "Admin" });

      const insertOrphan = async () =>
        env.db
          .insert(affiliatePayout)
          .values({
            affiliateUserId: "does-not-exist",
            amount: 100_000,
            id: "afp_orphan_user",
            method: null,
            note: null,
            processedByAdminId: admin,
            reference: null,
          })
          .run();

      await expect(insertOrphan()).rejects.toThrow();
    });

    it("rejects inserting a payout for a non-existent admin", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();

      const insertOrphan = async () =>
        env.db
          .insert(affiliatePayout)
          .values({
            affiliateUserId: referrer,
            amount: 100_000,
            id: "afp_orphan_admin",
            method: null,
            note: null,
            processedByAdminId: "does-not-exist",
            reference: null,
          })
          .run();

      await expect(insertOrphan()).rejects.toThrow();
    });
  });

  describe.concurrent("cascade from user deletion", () => {
    it("removes affiliate profile when the user is deleted", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      await env.repo.insertProfile(referrer, "slug", "R");

      env.db.delete(user).where(eq(user.id, referrer)).run();

      const result = await env.repo.findProfileByUserId(referrer);
      expect(result).toBeNull();
    });

    it("removes commissions when the affiliate user is deleted", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedPurchaser();
      await env.repo.insertProfile(referrer, "slug", "R");
      await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 30_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser,
        transactionId: "txn-cascade",
      });

      env.db.delete(user).where(eq(user.id, referrer)).run();

      const result =
        await env.repo.findConversionByTransactionId("txn-cascade");
      expect(result).toBeNull();
    });

    it("removes applications when the user is deleted", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const id = env.seedApplication({ userId: env.userId });

      env.db.delete(user).where(eq(user.id, env.userId)).run();

      const result = await env.repo.findApplicationById(id);
      expect(result).toBeNull();
    });

    it("sets payoutId to null on commissions when the payout is deleted", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      const referrer = env.seedReferrer();
      const purchaser = env.seedPurchaser();
      const admin = env.seedUser({ name: "Admin" });
      await env.repo.insertProfile(referrer, "slug", "R");
      await env.repo.insertConversion({
        affiliateUserId: referrer,
        commissionAmount: 30_000,
        purchaseAmount: 100_000,
        purchaserUserId: purchaser,
        transactionId: "txn-payout-del",
      });

      const payout = await env.repo.createPayoutForAffiliate({
        affiliateUserId: referrer,
        method: null,
        note: null,
        processedByAdminId: admin,
        reference: null,
      });
      expect(payout).not.toBeNull();
      // oxlint-disable-next-line typescript/no-non-null-assertion -- safe: non-null checked above
      const p = payout!;

      const [before] = env.db
        .select()
        .from(affiliateCommission)
        .where(eq(affiliateCommission.transactionId, "txn-payout-del"))
        .all();
      expect(before?.payoutId).toBe(p?.id);
      expect(before?.status).toBe("PAID");

      env.db.delete(affiliatePayout).where(eq(affiliatePayout.id, p.id)).run();

      const [after] = env.db
        .select()
        .from(affiliateCommission)
        .where(eq(affiliateCommission.transactionId, "txn-payout-del"))
        .all();
      expect(after?.payoutId).toBeNull();
      expect(after?.status).toBe("PAID");
    });
  });

  describe.concurrent("insertApplication", () => {
    it("persists the application and returns it", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const before = Date.now();

      const app = await env.repo.insertApplication({
        advantage: "I have a large following",
        instagramHandle: "@test",
        tiktokHandle: null,
        userId: env.userId,
        youtubeHandle: null,
      });

      expect(app).not.toBeNull();
      expect(app?.userId).toBe(env.userId);
      expect(app?.advantage).toBe("I have a large following");
      expect(app?.instagramHandle).toBe("@test");
      expect(app?.status).toBe("PENDING");
      expect(app?.createdAt.getTime()).toBeGreaterThanOrEqual(before);

      const rows = env.db
        .select()
        .from(affiliateApplication)
        .where(eq(affiliateApplication.userId, env.userId))
        .all();
      expect(rows).toHaveLength(1);
    });

    it("allows multiple applications per user", async ({ expect }) => {
      await using env = new AffiliateTestEnv();

      const first = await env.repo.insertApplication({
        advantage: "First application",
        instagramHandle: null,
        tiktokHandle: null,
        userId: env.userId,
        youtubeHandle: null,
      });
      const second = await env.repo.insertApplication({
        advantage: "Second application",
        instagramHandle: null,
        tiktokHandle: null,
        userId: env.userId,
        youtubeHandle: null,
      });

      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      expect(first?.id).not.toBe(second?.id);
    });
  });

  describe.concurrent("findApplicationById", () => {
    it("returns application when found", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const id = env.seedApplication({ userId: env.userId });

      const app = await env.repo.findApplicationById(id);

      expect(app).not.toBeNull();
      expect(app?.id).toBe(id);
      expect(app?.userId).toBe(env.userId);
    });

    it("returns null when not found", async ({ expect }) => {
      await using env = new AffiliateTestEnv();

      const app = await env.repo.findApplicationById("afa_nonexistent");

      expect(app).toBeNull();
    });
  });

  describe.concurrent("findPendingApplicationByUserId", () => {
    it("returns the pending application", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const id = env.seedApplication({ status: "PENDING", userId: env.userId });

      const app = await env.repo.findPendingApplicationByUserId(env.userId);

      expect(app).not.toBeNull();
      expect(app?.id).toBe(id);
      expect(app?.status).toBe("PENDING");
    });

    it("returns null when no pending application exists", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      env.seedApplication({ status: "ACCEPTED", userId: env.userId });

      const app = await env.repo.findPendingApplicationByUserId(env.userId);

      expect(app).toBeNull();
    });

    it("returns null when user has no applications", async ({ expect }) => {
      await using env = new AffiliateTestEnv();

      const app = await env.repo.findPendingApplicationByUserId(env.userId);

      expect(app).toBeNull();
    });
  });

  describe.concurrent("findLatestApplicationByUserId", () => {
    it("returns the most recent application", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      env.seedApplication({
        id: "afa_old",
        status: "REJECTED",
        userId: env.userId,
      });
      env.seedApplication({
        id: "afa_new",
        status: "PENDING",
        userId: env.userId,
      });

      const app = await env.repo.findLatestApplicationByUserId(env.userId);

      expect(app).not.toBeNull();
      expect(app?.id).toBe("afa_new");
    });

    it("returns null when user has no applications", async ({ expect }) => {
      await using env = new AffiliateTestEnv();

      const app = await env.repo.findLatestApplicationByUserId(env.userId);

      expect(app).toBeNull();
    });
  });

  describe.concurrent("updateApplicationStatus", () => {
    it("updates status and sets reviewer info", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const admin = env.seedUser({ name: "Admin" });
      const id = env.seedApplication({ status: "PENDING", userId: env.userId });

      const updated = await env.repo.updateApplicationStatus(
        id,
        "ACCEPTED",
        admin
      );

      expect(updated).not.toBeNull();
      expect(updated?.id).toBe(id);
      expect(updated?.status).toBe("ACCEPTED");
      expect(updated?.reviewedByAdminId).toBe(admin);
      expect(updated?.reviewedAt).not.toBeNull();
    });

    it("returns null for nonexistent application", async ({ expect }) => {
      await using env = new AffiliateTestEnv();

      const updated = await env.repo.updateApplicationStatus(
        "afa_ghost",
        "ACCEPTED",
        env.userId
      );

      expect(updated).toBeNull();
    });

    it("updates status to REJECTED", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      const admin = env.seedUser({ name: "Admin" });
      const id = env.seedApplication({ status: "PENDING", userId: env.userId });

      const updated = await env.repo.updateApplicationStatus(
        id,
        "REJECTED",
        admin
      );

      expect(updated).not.toBeNull();
      expect(updated?.id).toBe(id);
      expect(updated?.status).toBe("REJECTED");
      expect(updated?.reviewedByAdminId).toBe(admin);
      expect(updated?.reviewedAt).not.toBeNull();
    });
  });

  describe.concurrent("listApplications", () => {
    it("returns all applications without status filter", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      env.seedApplication({ status: "PENDING", userId: env.userId });
      env.seedApplication({ status: "ACCEPTED", userId: env.otherId });

      const result = await env.repo.listApplications(undefined, 1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.totalPages).toBe(1);
    });

    it("filters by status", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      env.seedApplication({ status: "PENDING", userId: env.userId });
      env.seedApplication({ status: "ACCEPTED", userId: env.otherId });

      const result = await env.repo.listApplications("PENDING", 1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.status).toBe("PENDING");
      expect(result.pagination.total).toBe(1);
    });

    it("paginates results", async ({ expect }) => {
      await using env = new AffiliateTestEnv();
      env.seedApplication({ status: "PENDING", userId: env.userId });
      env.seedApplication({ status: "PENDING", userId: env.otherId });

      const page1 = await env.repo.listApplications(undefined, 1, 1);
      const page2 = await env.repo.listApplications(undefined, 2, 1);

      expect(page1.data).toHaveLength(1);
      expect(page2.data).toHaveLength(1);
      expect(page1.data[0]?.id).not.toBe(page2.data[0]?.id);
      expect(page1.pagination.totalPages).toBe(2);
    });

    it("returns empty list when no applications match", async ({ expect }) => {
      await using env = new AffiliateTestEnv();

      const result = await env.repo.listApplications("REJECTED", 1, 10);

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });

    it("returns results ordered by createdAt descending", async ({
      expect,
    }) => {
      await using env = new AffiliateTestEnv();
      env.seedApplication({
        createdAt: new Date("2026-01-01T00:00:00Z"),
        id: "afa_older",
        status: "PENDING",
        userId: env.userId,
      });
      env.seedApplication({
        createdAt: new Date("2026-01-02T00:00:00Z"),
        id: "afa_newer",
        status: "PENDING",
        userId: env.otherId,
      });

      const result = await env.repo.listApplications(undefined, 1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.data[0]?.id).toBe("afa_newer");
      expect(result.data[1]?.id).toBe("afa_older");
    });
  });
});
