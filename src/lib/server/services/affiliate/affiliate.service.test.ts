import { ORPCError } from "@orpc/server";
import { describe, it } from "vitest";

import type { AffiliateGuard } from "./affiliate.guard";
import { AffiliateService } from "./affiliate.service";
import {
  captureError,
  createMockGuard,
  createMockRepository,
} from "./affiliate.testing";

const throwUnauthorized = (): never => {
  throw new ORPCError("UNAUTHORIZED", {
    message: "Authentication is required",
  });
};

const setupService = () => {
  const repo = createMockRepository();
  const guard = createMockGuard();

  guard.requireUser.mockReturnValue("user-1");
  guard.requireAdmin.mockResolvedValue("admin-1");

  const service = new AffiliateService(
    repo,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- mock to impl cast in tests
    guard as unknown as AffiliateGuard
  );

  return { guard, repo, service };
};

describe.concurrent("affiliate service", () => {
  describe.concurrent("claim", () => {
    it("creates profile with auto-generated slug from user name", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findProfileByUserId.mockResolvedValue(null);
      repo.findProfileBySlug.mockResolvedValue(null);
      repo.findUserById.mockResolvedValue({
        id: "user-1",
        name: "Test User",
      });
      repo.insertProfile.mockResolvedValue({
        createdAt: new Date(),
        id: "aff_abc123def456",
        nameSnapshot: "Test User",
        points: 0,
        slug: "test-user-ab12cd34",
        updatedAt: new Date(),
        userId: "user-1",
        version: 1,
      });

      const profile = await service.claim("user-1");

      expect(profile.slug).toMatch(/^test-user-[0-9A-Za-z]{8}$/u);
      expect(profile.userId).toBe("user-1");
      expect(profile.nameSnapshot).toBe("Test User");
    });

    it("returns existing profile when one exists", async ({ expect }) => {
      const { repo, service } = setupService();
      const existing = {
        createdAt: new Date(),
        id: "aff_existing",
        nameSnapshot: "Existing",
        points: 0,
        slug: "existing",
        updatedAt: new Date(),
        userId: "user-1",
        version: 1,
      };
      repo.findProfileByUserId.mockResolvedValue(existing);

      const result = await service.claim("user-1");

      expect(result).toEqual(existing);
    });

    it("throws NOT_FOUND when user does not exist", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findProfileByUserId.mockResolvedValue(null);
      repo.findUserById.mockResolvedValue(null);

      const err = await captureError(service.claim("user-1"));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws UNAUTHORIZED when guard rejects", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireUser.mockImplementation(throwUnauthorized);

      const err = await captureError(service.claim(null));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws AFFILIATE_SLUG_CONFLICT when slug generation fails", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findProfileByUserId.mockResolvedValue(null);
      repo.findUserById.mockResolvedValue({
        id: "user-1",
        name: "Test User",
      });
      repo.findProfileBySlug.mockResolvedValue({
        createdAt: new Date(),
        id: "aff_existing",
        nameSnapshot: "Other",
        points: 0,
        slug: "existing",
        updatedAt: new Date(),
        userId: "other",
        version: 1,
      });

      const err = await captureError(service.claim("user-1"));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "AFFILIATE_SLUG_CONFLICT" });
    });

    it("throws AFFILIATE_SLUG_CONFLICT when insertProfile returns null", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findProfileByUserId.mockResolvedValue(null);
      repo.findProfileBySlug.mockResolvedValue(null);
      repo.findUserById.mockResolvedValue({
        id: "user-1",
        name: "Test User",
      });
      repo.insertProfile.mockResolvedValue(null);

      const err = await captureError(service.claim("user-1"));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "AFFILIATE_SLUG_CONFLICT" });
    });
  });

  describe.concurrent("resolveSlug", () => {
    it("returns userId for a valid slug", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findProfileBySlug.mockResolvedValue({
        createdAt: new Date(),
        id: "aff_abc",
        nameSnapshot: "Test",
        points: 0,
        slug: "test-slug",
        updatedAt: new Date(),
        userId: "user-1",
        version: 1,
      });

      const result = await service.resolveSlug("test-slug");

      expect(result).toEqual({ userId: "user-1" });
      expect(repo.findProfileBySlug).toHaveBeenCalledWith("test-slug");
    });

    it("throws NOT_FOUND for unknown slug", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findProfileBySlug.mockResolvedValue(null);

      const err = await captureError(service.resolveSlug("unknown"));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("sanitizes slug input before querying", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findProfileBySlug.mockResolvedValue(null);

      await captureError(service.resolveSlug("Test Slug!"));

      expect(repo.findProfileBySlug).toHaveBeenCalledWith("test-slug");
    });
  });

  describe.concurrent("recordConversion", () => {
    const validInput = {
      commissionAmount: 30_000,
      purchaseAmount: 100_000,
      purchaserUserId: "buyer-1",
      transactionId: "txn-1",
    };

    it("records new conversion when affiliate is found", async ({ expect }) => {
      const { repo, service } = setupService();
      const commission = {
        affiliateUserId: "referrer-1",
        commissionAmount: 30_000,
        createdAt: new Date(),
        id: "afc_abc",
        payoutId: null,
        purchaseAmount: 100_000,
        purchaserUserId: "buyer-1",
        status: "PENDING" as const,
        transactionId: "txn-1",
      };

      repo.findAffiliatedByUserId.mockResolvedValue("referrer-1");
      repo.findConversionByTransactionId.mockResolvedValue(null);
      repo.insertConversion.mockResolvedValue(commission);

      const result = await service.recordConversion(validInput, "admin-1");

      expect(result.created).toBe(true);
      expect(result.commission).toEqual(commission);
      expect(repo.insertConversion).toHaveBeenCalledWith({
        affiliateUserId: "referrer-1",
        commissionAmount: 30_000,
        purchaseAmount: 100_000,
        purchaserUserId: "buyer-1",
        transactionId: "txn-1",
      });
    });

    it("returns no-op when purchaser has no affiliate", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findAffiliatedByUserId.mockResolvedValue(null);

      const result = await service.recordConversion(validInput, "admin-1");

      expect(result.created).toBe(false);
      expect(result.commission).toBeNull();
      expect(repo.insertConversion).not.toHaveBeenCalled();
    });

    it("returns existing conversion on duplicate transactionId", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const existing = {
        affiliateUserId: "referrer-1",
        commissionAmount: 30_000,
        createdAt: new Date(),
        id: "afc_abc",
        payoutId: null,
        purchaseAmount: 100_000,
        purchaserUserId: "buyer-1",
        status: "PENDING" as const,
        transactionId: "txn-1",
      };

      repo.findAffiliatedByUserId.mockResolvedValue("referrer-1");
      repo.findConversionByTransactionId.mockResolvedValue(existing);

      const result = await service.recordConversion(validInput, "admin-1");

      expect(result.created).toBe(false);
      expect(result.commission).toEqual(existing);
      expect(repo.insertConversion).not.toHaveBeenCalled();
    });

    it("throws AFFILIATE_SELF_REFERRAL on self-referral", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findAffiliatedByUserId.mockResolvedValue("buyer-1");

      const err = await captureError(
        service.recordConversion(validInput, "admin-1")
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "AFFILIATE_SELF_REFERRAL" });
      expect(repo.insertConversion).not.toHaveBeenCalled();
    });

    it("returns no-op when insertConversion returns null", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findAffiliatedByUserId.mockResolvedValue("referrer-1");
      repo.findConversionByTransactionId.mockResolvedValue(null);
      repo.insertConversion.mockResolvedValue(null);

      const result = await service.recordConversion(validInput, "admin-1");

      expect(result.created).toBe(false);
      expect(result.commission).toBeNull();
    });

    it("throws UNAUTHORIZED when adminId is null", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireAdmin.mockImplementation(throwUnauthorized);

      const err = await captureError(
        service.recordConversion(validInput, null)
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe.concurrent("recordPayout", () => {
    const validInput = {
      affiliateUserId: "user-1",
      method: "bank_transfer",
      reference: "REF-001",
    };

    it("records full payout and marks commissions as paid", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      const payout = {
        affiliateUserId: "user-1",
        amount: 50_000,
        createdAt: new Date(),
        id: "afp_abc",
        method: "bank_transfer",
        note: null,
        processedByAdminId: "admin-1",
        reference: "REF-001",
      };

      repo.getDashboardSummary.mockResolvedValue({
        conversionCount: 5,
        profile: {
          createdAt: new Date(),
          id: "aff_abc",
          nameSnapshot: "Test",
          points: 0,
          slug: "test",
          updatedAt: new Date(),
          userId: "user-1",
          version: 1,
        },
        totalEarned: 50_000,
        totalPaid: 0,
      });
      repo.insertPayout.mockResolvedValue(payout);
      repo.markCommissionsAsPaid.mockResolvedValue(5);

      const result = await service.recordPayout(validInput, "admin-1");

      expect(result).toEqual(payout);
      expect(repo.insertPayout).toHaveBeenCalledWith({
        affiliateUserId: "user-1",
        amount: 50_000,
        method: "bank_transfer",
        note: null,
        processedByAdminId: "admin-1",
        reference: "REF-001",
      });
      expect(repo.markCommissionsAsPaid).toHaveBeenCalledWith(
        "user-1",
        "afp_abc"
      );
    });

    it("forwards note parameter to insertPayout", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.getDashboardSummary.mockResolvedValue({
        conversionCount: 1,
        profile: null,
        totalEarned: 50_000,
        totalPaid: 0,
      });
      repo.insertPayout.mockResolvedValue({
        affiliateUserId: "user-1",
        amount: 50_000,
        createdAt: new Date(),
        id: "afp_note",
        method: null,
        note: "First payout",
        processedByAdminId: "admin-1",
        reference: null,
      });
      repo.markCommissionsAsPaid.mockResolvedValue(1);

      await service.recordPayout(
        { affiliateUserId: "user-1", note: "First payout" },
        "admin-1"
      );

      expect(repo.insertPayout).toHaveBeenCalledWith(
        expect.objectContaining({ note: "First payout" })
      );
    });

    it("throws UNAUTHORIZED when adminId is null", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireAdmin.mockImplementation(throwUnauthorized);

      const err = await captureError(service.recordPayout(validInput, null));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });

    it("throws AFFILIATE_NO_PENDING_BALANCE when balance is zero", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.getDashboardSummary.mockResolvedValue({
        conversionCount: 0,
        profile: null,
        totalEarned: 0,
        totalPaid: 0,
      });

      const err = await captureError(
        service.recordPayout(validInput, "admin-1")
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "AFFILIATE_NO_PENDING_BALANCE" });
    });

    it("throws INTERNAL_SERVER_ERROR when insertPayout returns null", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.getDashboardSummary.mockResolvedValue({
        conversionCount: 1,
        profile: null,
        totalEarned: 50_000,
        totalPaid: 0,
      });
      repo.insertPayout.mockResolvedValue(null);

      const err = await captureError(
        service.recordPayout(validInput, "admin-1")
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    });
  });

  describe.concurrent("recordRelationship", () => {
    it("creates relationship between two users", async ({ expect }) => {
      const { repo, service } = setupService();
      const relationship = {
        createdAt: new Date(),
        id: "afr_abc",
        referredUserId: "user-2",
        referrerUserId: "user-1",
      };
      repo.findRelationshipByReferredUserId.mockResolvedValue(null);
      repo.insertRelationship.mockResolvedValue(relationship);

      const result = await service.recordRelationship(
        { referredUserId: "user-2", referrerUserId: "user-1" },
        "admin-1"
      );

      expect(result).toEqual(relationship);
      expect(repo.insertRelationship).toHaveBeenCalledWith("user-1", "user-2");
    });

    it("throws AFFILIATE_SELF_REFERRAL on self-referral", async ({
      expect,
    }) => {
      const { service } = setupService();

      const err = await captureError(
        service.recordRelationship(
          { referredUserId: "user-1", referrerUserId: "user-1" },
          "admin-1"
        )
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "AFFILIATE_SELF_REFERRAL" });
    });

    it("throws AFFILIATE_RELATIONSHIP_ALREADY_EXISTS when duplicate", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findRelationshipByReferredUserId.mockResolvedValue({
        createdAt: new Date(),
        id: "afr_existing",
        referredUserId: "user-2",
        referrerUserId: "user-3",
      });

      const err = await captureError(
        service.recordRelationship(
          { referredUserId: "user-2", referrerUserId: "user-1" },
          "admin-1"
        )
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({
        code: "AFFILIATE_RELATIONSHIP_ALREADY_EXISTS",
      });
    });

    it("throws UNAUTHORIZED when adminId is null", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireAdmin.mockImplementation(throwUnauthorized);

      const err = await captureError(
        service.recordRelationship(
          { referredUserId: "user-2", referrerUserId: "user-1" },
          null
        )
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe.concurrent("getDashboardSummary", () => {
    it("returns dashboard summary for authenticated user", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.getDashboardSummary.mockResolvedValue({
        conversionCount: 10,
        profile: {
          createdAt: new Date(),
          id: "aff_abc",
          nameSnapshot: "Test",
          points: 0,
          slug: "test-slug",
          updatedAt: new Date(),
          userId: "user-1",
          version: 1,
        },
        totalEarned: 100_000,
        totalPaid: 70_000,
      });

      const result = await service.getDashboardSummary("user-1");

      expect(result).toEqual({
        conversionCount: 10,
        pendingBalance: 30_000,
        // oxlint-disable-next-line typescript/no-unsafe-assignment -- vitest asymmetric matcher
        profile: expect.anything(),
        totalEarned: 100_000,
        totalPaid: 70_000,
      });
      expect(repo.getDashboardSummary).toHaveBeenCalledWith("user-1");
    });

    it("throws UNAUTHORIZED when userId is null", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireUser.mockImplementation(throwUnauthorized);

      const err = await captureError(service.getDashboardSummary(null));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe.concurrent("getRelationshipForUser", () => {
    it("returns relationship for referred user", async ({ expect }) => {
      const { repo, service } = setupService();
      const relationship = {
        createdAt: new Date(),
        id: "afr_abc",
        referredUserId: "user-2",
        referrerUserId: "user-1",
      };
      repo.findRelationshipByReferredUserId.mockResolvedValue(relationship);

      const result = await service.getRelationshipForUser(
        { referredUserId: "user-2" },
        "admin-1"
      );

      expect(result).toEqual(relationship);
    });

    it("throws NOT_FOUND when no relationship exists", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findRelationshipByReferredUserId.mockResolvedValue(null);

      const err = await captureError(
        service.getRelationshipForUser({ referredUserId: "user-2" }, "admin-1")
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws UNAUTHORIZED when adminId is null", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireAdmin.mockImplementation(throwUnauthorized);

      const err = await captureError(
        service.getRelationshipForUser({ referredUserId: "user-2" }, null)
      );

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });

  describe.concurrent("handlePaymentSuccess", () => {
    it("inserts conversion with 35% commission on happy path", async ({
      expect,
    }) => {
      const { repo, service } = setupService();
      repo.findAffiliatedByUserId.mockResolvedValue("referrer-1");
      repo.findConversionByTransactionId.mockResolvedValue(null);
      repo.insertConversion.mockResolvedValue({
        affiliateUserId: "referrer-1",
        commissionAmount: 35_000,
        createdAt: new Date(),
        id: "afc_abc",
        payoutId: null,
        purchaseAmount: 100_000,
        purchaserUserId: "buyer-1",
        status: "PENDING" as const,
        transactionId: "txn-1",
      });

      await service.handlePaymentSuccess({
        purchaseAmount: 100_000,
        purchaserUserId: "buyer-1",
        transactionId: "txn-1",
      });

      expect(repo.insertConversion).toHaveBeenCalledWith({
        affiliateUserId: "referrer-1",
        commissionAmount: 35_000,
        purchaseAmount: 100_000,
        purchaserUserId: "buyer-1",
        transactionId: "txn-1",
      });
    });

    it("does nothing when purchaser has no referrer", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findAffiliatedByUserId.mockResolvedValue(null);

      await service.handlePaymentSuccess({
        purchaseAmount: 100_000,
        purchaserUserId: "buyer-1",
        transactionId: "txn-1",
      });

      expect(repo.insertConversion).not.toHaveBeenCalled();
    });

    it("does nothing on self-referral", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findAffiliatedByUserId.mockResolvedValue("buyer-1");

      await service.handlePaymentSuccess({
        purchaseAmount: 100_000,
        purchaserUserId: "buyer-1",
        transactionId: "txn-1",
      });

      expect(repo.insertConversion).not.toHaveBeenCalled();
    });

    it("does nothing on duplicate transactionId", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.findAffiliatedByUserId.mockResolvedValue("referrer-1");
      repo.findConversionByTransactionId.mockResolvedValue({
        affiliateUserId: "referrer-1",
        commissionAmount: 35_000,
        createdAt: new Date(),
        id: "afc_existing",
        payoutId: null,
        purchaseAmount: 100_000,
        purchaserUserId: "buyer-1",
        status: "PENDING" as const,
        transactionId: "txn-1",
      });

      await service.handlePaymentSuccess({
        purchaseAmount: 100_000,
        purchaserUserId: "buyer-1",
        transactionId: "txn-1",
      });

      expect(repo.insertConversion).not.toHaveBeenCalled();
    });
  });

  describe.concurrent("listPendingPayouts", () => {
    it("returns pending payouts list for admin", async ({ expect }) => {
      const { repo, service } = setupService();
      const list = {
        data: [
          {
            affiliateUserId: "user-1",
            conversionCount: 5,
            pendingBalance: 30_000,
            slug: "test",
          },
        ],
        pagination: { limit: 10, page: 1, total: 1, totalPages: 1 },
      };
      repo.listPendingPayouts.mockResolvedValue(list);

      const result = await service.listPendingPayouts({}, "admin-1");

      expect(result).toEqual(list);
      expect(repo.listPendingPayouts).toHaveBeenCalledWith(1, 10);
    });

    it("forwards custom page and limit to repo", async ({ expect }) => {
      const { repo, service } = setupService();
      repo.listPendingPayouts.mockResolvedValue({
        data: [],
        pagination: { limit: 5, page: 2, total: 0, totalPages: 1 },
      });

      await service.listPendingPayouts({ limit: 5, page: 2 }, "admin-1");

      expect(repo.listPendingPayouts).toHaveBeenCalledWith(2, 5);
    });

    it("throws UNAUTHORIZED when adminId is null", async ({ expect }) => {
      const { guard, service } = setupService();
      guard.requireAdmin.mockImplementation(throwUnauthorized);

      const err = await captureError(service.listPendingPayouts({}, null));

      expect(err).toBeInstanceOf(ORPCError);
      expect(err).toMatchObject({ code: "UNAUTHORIZED" });
    });
  });
});
